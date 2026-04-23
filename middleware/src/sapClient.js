"use strict";

const axios = require("axios");
const qs = require("querystring");
const { CookieJar } = require("tough-cookie");
const { wrapper } = require("axios-cookiejar-support");
const { fromAxios, detectAuthHtml } = require("./util/errors");
const sapSessionStore = require("./sapSessionStore");
const { logSapCall, logLoginResult, logRetry, logAutoRelogin } = require("./util/sessionLog");

const {
  SAP_BASE_URL,
  SAP_SERVICE_PATH,
  SAP_CLIENT = "100",
  SAP_USER,
  SAP_PASSWORD,
  SAP_AUTH_MODE = "basic", // "basic" | "bearer" | "oauth_cc"
  SAP_BEARER_TOKEN,
  SAP_OAUTH_TOKEN_URL,
  SAP_OAUTH_CLIENT_ID,
  SAP_OAUTH_CLIENT_SECRET,
} = process.env;

const authMode = String(SAP_AUTH_MODE).toLowerCase();
const useBearer = authMode === "bearer";
const useOauthCc = authMode === "oauth_cc";

if (!SAP_BASE_URL || !SAP_SERVICE_PATH) {
  console.warn("[sapClient] Missing SAP_BASE_URL / SAP_SERVICE_PATH.");
}
if (useBearer && !SAP_BEARER_TOKEN) {
  console.warn("[sapClient] SAP_AUTH_MODE=bearer but SAP_BEARER_TOKEN is empty.");
} else if (useOauthCc && (!SAP_OAUTH_TOKEN_URL || !SAP_OAUTH_CLIENT_ID || !SAP_OAUTH_CLIENT_SECRET)) {
  console.warn(
    "[sapClient] SAP_AUTH_MODE=oauth_cc but SAP_OAUTH_TOKEN_URL / SAP_OAUTH_CLIENT_ID / SAP_OAUTH_CLIENT_SECRET missing.",
  );
} else if (!useBearer && !useOauthCc && (!SAP_USER || !SAP_PASSWORD)) {
  console.warn("[sapClient] Basic auth selected but SAP_USER / SAP_PASSWORD missing.");
}

console.log(
  `[sapClient] mode=${authMode} ${
    useOauthCc
      ? `tokenUrl=${SAP_OAUTH_TOKEN_URL} clientId=${SAP_OAUTH_CLIENT_ID}`
      : useBearer
        ? "(static bearer token)"
        : `user=${SAP_USER || "(unset)"}`
  }`,
);

const jar = new CookieJar();

// --- OAuth client_credentials token cache ---
let cachedToken = null;
let cachedTokenExp = 0; // epoch ms

async function fetchOauthToken() {
  if (!useOauthCc) return null;
  const now = Date.now();
  if (cachedToken && now < cachedTokenExp - 60_000) return cachedToken;

  const res = await axios.post(
    SAP_OAUTH_TOKEN_URL,
    qs.stringify({ grant_type: "client_credentials" }),
    {
      auth: { username: SAP_OAUTH_CLIENT_ID, password: SAP_OAUTH_CLIENT_SECRET },
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      timeout: 20000,
      validateStatus: () => true,
    },
  );
  if (res.status >= 400 || !res.data?.access_token) {
    const err = new Error(`OAuth token fetch failed (${res.status}): ${JSON.stringify(res.data).slice(0, 300)}`);
    err.code = "sap_oauth_token_failed";
    err.sapStatus = 502;
    err.hint =
      "Check SAP_OAUTH_TOKEN_URL, SAP_OAUTH_CLIENT_ID and SAP_OAUTH_CLIENT_SECRET in middleware/.env. They come from the Communication Arrangement (OAuth 2.0) in your SAP tenant.";
    throw err;
  }
  cachedToken = res.data.access_token;
  const expiresIn = Number(res.data.expires_in || 3600);
  cachedTokenExp = now + expiresIn * 1000;
  return cachedToken;
}

const baseHeaders = { Accept: "application/json" };
if (useBearer && SAP_BEARER_TOKEN) {
  baseHeaders.Authorization = `Bearer ${SAP_BEARER_TOKEN}`;
}

const http = wrapper(
  axios.create({
    baseURL: `${SAP_BASE_URL}${SAP_SERVICE_PATH}`,
    ...(useBearer || useOauthCc
      ? {}
      : { auth: { username: SAP_USER || "", password: SAP_PASSWORD || "" } }),
    timeout: 30000,
    jar,
    withCredentials: true,
    maxRedirects: 0,
    validateStatus: () => true,
    headers: baseHeaders,
  }),
);

// Inject fresh oauth_cc bearer on every request
http.interceptors.request.use(async (config) => {
  if (useOauthCc) {
    const token = await fetchOauthToken();
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let csrfToken = null;
let csrfFetchedAt = 0;
const CSRF_TTL_MS = 25 * 60 * 1000;

/**
 * Build per-request axios config that:
 *  - injects a Cookie header from caller-supplied browser cookies (e.g. JSESSIONID, __VCAP_ID__)
 *  - when cookies are present, drops Basic auth so SAP uses the browser session instead
 */
function buildRequestConfig(extraCookies, extraHeaders = {}) {
  const cfg = { headers: { ...extraHeaders } };
  if (extraCookies && String(extraCookies).trim()) {
    cfg.headers.Cookie = String(extraCookies).trim();
    // When forwarding a real browser session, do NOT send Basic auth alongside it.
    if (!useBearer && !useOauthCc) {
      cfg.auth = null;
      // Explicitly drop the instance-level Authorization header so SAP only sees the cookie session.
      cfg.headers.Authorization = undefined;
    }
  }
  return cfg;
}

function ensureJson(res, path, hadCookies = false) {
  const authErr = detectAuthHtml(res);
  if (authErr) {
    if (hadCookies && authErr.code === "sap_auth_redirect") {
      authErr.code = "sap_session_expired";
      authErr.message =
        "SAP browser session expired or invalid. Re-paste fresh JSESSIONID and __VCAP_ID__ from Chrome DevTools.";
      authErr.hint =
        "Open the SAP OData URL in Chrome, log in, then DevTools → Application → Cookies → copy JSESSIONID and __VCAP_ID__ into SAP Settings → SAP Browser Session.";
    }
    console.error(`[sapClient] ${path} -> non-JSON (${authErr.code})`);
    throw authErr;
  }
}

async function ensureCsrf(force = false, extraCookies = "") {
  const stale = Date.now() - csrfFetchedAt > CSRF_TTL_MS;
  if (csrfToken && !force && !stale) return csrfToken;

  const cfg = buildRequestConfig(extraCookies, { "x-csrf-token": "fetch" });
  const res = await http.get(`/GateHeader?$top=0&sap-client=${SAP_CLIENT}`, cfg);
  ensureJson(res, "CSRF fetch", Boolean(extraCookies));
  if (res.status >= 400) {
    const err = new Error(`CSRF fetch failed (${res.status})`);
    err.sapStatus = res.status;
    err.sapBody = res.data;
    err.code = "csrf_fetch_failed";
    throw err;
  }
  csrfToken = res.headers["x-csrf-token"] || null;
  csrfFetchedAt = Date.now();
  return csrfToken;
}

function withClient(path) {
  if (path.includes("sap-client=")) return path;
  return path + (path.includes("?") ? "&" : "?") + `sap-client=${SAP_CLIENT}`;
}

/**
 * Returns true if this error indicates the SAP session cookies are invalid/expired
 * and we should attempt a silent middleware re-login.
 * Triggered when:
 *  - we used cached middleware cookies (not caller-supplied), AND
 *  - SAP responded with the auth-redirect / expired-session marker.
 */
function shouldAutoRelogin(err, cookieSource) {
  if (cookieSource !== "cache") return false;
  return err?.code === "sap_session_expired" || err?.code === "sap_auth_redirect";
}

async function sapGet(path, extraCookies = "") {
  let cfg = buildRequestConfig(extraCookies);
  const cookieSource = cfg.__cookieSource;
  logSapCall({ method: "GET", path, source: cookieSource || "none" });

  const send = () => http.get(withClient(path), cfg);
  let res = await send();
  if (res.status === 401 && useOauthCc) {
    cachedToken = null;
    res = await send();
  }
  try {
    ensureJson(res, `GET ${path}`, Boolean(cfg.headers.Cookie));
  } catch (err) {
    if (shouldAutoRelogin(err, cookieSource)) {
      logAutoRelogin("GET", path);
      const ok = await tryAutoRelogin();
      if (ok) {
        cfg = buildRequestConfig(extraCookies);
        res = await http.get(withClient(path), cfg);
        try {
          ensureJson(res, `GET ${path}`, Boolean(cfg.headers.Cookie));
          if (res.status < 400) {
            logRetry("GET", path, true);
            return res.data;
          }
        } catch (retryErr) {
          logRetry("GET", path, false);
          throw retryErr;
        }
      } else {
        logRetry("GET", path, false);
      }
    }
    throw err;
  }
  if (res.status >= 400) {
    throw fromAxios({ message: `GET ${path} failed`, response: res });
  }
  return res.data;
}

async function sapWrite(method, path, body, extraHeaders = {}, extraCookies = "") {
  // Stringify body ourselves so Axios cannot re-serialize and SAP always
  // receives application/json on the wire (otherwise SAP defaults to XML and
  // throws CX_SXML_PARSE_ERROR).
  const serialized = body === undefined || body === null ? undefined : JSON.stringify(body);

  let lastCookieSource = null;
  const doRequest = async () => {
    const token = await ensureCsrf(false, extraCookies);
    const cfg = buildRequestConfig(extraCookies, {
      "x-csrf-token": token,
      "If-Match": "*",
      ...extraHeaders,
      // Force these LAST so callers/extras cannot override them.
      "Content-Type": "application/json",
      Accept: "application/json",
    });
    lastCookieSource = cfg.__cookieSource;
    return http.request({
      method,
      url: withClient(path),
      data: serialized,
      transformRequest: [(d) => d],
      ...cfg,
    });
  };

  logSapCall({ method, path, source: "pending" });
  let res = await doRequest();
  if (res.status === 401 && useOauthCc) {
    cachedToken = null;
    res = await doRequest();
  }
  if (
    res.status === 403 &&
    /csrf/i.test(res.headers["x-csrf-token"] || res.data?.toString?.() || "")
  ) {
    csrfToken = null;
    res = await doRequest();
  }
  try {
    ensureJson(res, `${method} ${path}`, true);
  } catch (err) {
    if (shouldAutoRelogin(err, lastCookieSource)) {
      logAutoRelogin(method, path);
      const ok = await tryAutoRelogin();
      if (ok) {
        csrfToken = null; // CSRF tied to old session
        res = await doRequest();
        try {
          ensureJson(res, `${method} ${path}`, true);
          if (res.status < 400) {
            logRetry(method, path, true);
            return res.data;
          }
        } catch (retryErr) {
          logRetry(method, path, false);
          throw retryErr;
        }
      } else {
        logRetry(method, path, false);
      }
    }
    throw err;
  }
  if (res.status >= 400) {
    throw fromAxios({ message: `${method} ${path} failed`, response: res });
  }
  return res.data;
}

async function sapBatch(multipartBody, boundary, extraCookies = "") {
  let lastCookieSource = null;
  const doRequest = async () => {
    const token = await ensureCsrf(false, extraCookies);
    const cfg = buildRequestConfig(extraCookies, {
      "x-csrf-token": token,
      "Content-Type": `multipart/mixed; boundary=${boundary}`,
      Accept: "multipart/mixed",
    });
    lastCookieSource = cfg.__cookieSource;
    return http.request({
      method: "POST",
      url: withClient(`/$batch`),
      data: multipartBody,
      ...cfg,
      transformRequest: [(d) => d],
    });
  };

  logSapCall({ method: "POST", path: "/$batch", source: "pending" });
  let res = await doRequest();
  if (res.status === 401 && useOauthCc) {
    cachedToken = null;
    res = await doRequest();
  }
  if (res.status === 403) {
    csrfToken = null;
    res = await doRequest();
  }
  try {
    ensureJson(res, "$batch", true);
  } catch (err) {
    if (shouldAutoRelogin(err, lastCookieSource)) {
      logAutoRelogin("POST", "/$batch");
      const ok = await tryAutoRelogin();
      if (ok) {
        csrfToken = null;
        res = await doRequest();
        try {
          ensureJson(res, "$batch", true);
          if (res.status < 400) {
            logRetry("POST", "/$batch", true);
            return res.data;
          }
        } catch (retryErr) {
          logRetry("POST", "/$batch", false);
          throw retryErr;
        }
      } else {
        logRetry("POST", "/$batch", false);
      }
    }
    throw err;
  }
  if (res.status >= 400) {
    throw fromAxios({ message: `$batch failed`, response: res });
  }
  return res.data;
}

function getAuthInfo() {
  return {
    authMode,
    user: useOauthCc || useBearer ? null : SAP_USER || null,
    tokenUrl: useOauthCc ? SAP_OAUTH_TOKEN_URL : null,
    clientId: useOauthCc ? SAP_OAUTH_CLIENT_ID : null,
    hasBearer: useBearer ? Boolean(SAP_BEARER_TOKEN) : null,
  };
}

/**
 * Build the Cookie string the middleware should forward to SAP, from request headers
 * supplied by the frontend (x-sap-jsessionid, x-sap-vcap-id).
 */
function buildCookieFromHeaders(req) {
  const j = req?.headers?.["x-sap-jsessionid"];
  const v = req?.headers?.["x-sap-vcap-id"];
  const parts = [];
  if (j) parts.push(`JSESSIONID=${j}`);
  if (v) parts.push(`__VCAP_ID__=${v}`);
  return parts.join("; ");
}

module.exports = {
  sapGet,
  sapWrite,
  sapBatch,
  ensureCsrf,
  SAP_CLIENT,
  getAuthInfo,
  buildCookieFromHeaders,
};

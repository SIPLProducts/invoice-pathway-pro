"use strict";

const axios = require("axios");
const qs = require("querystring");
const { CookieJar } = require("tough-cookie");
const { wrapper } = require("axios-cookiejar-support");
const { fromAxios, detectAuthHtml } = require("./util/errors");
const sapSessionStore = require("./sapSessionStore");
const {
  logSapCall,
  logLoginOk,
  logLoginFail,
  logRetry,
} = require("./util/sessionLog");

const {
  SAP_BASE_URL,
  SAP_SERVICE_PATH,
  SAP_CLIENT = "100",
  SAP_USER,
  SAP_PASSWORD,
  SAP_AUTH_MODE = "basic", // "basic" | "basic_stateless" | "bearer" | "oauth_cc"
  SAP_BEARER_TOKEN,
  SAP_OAUTH_TOKEN_URL,
  SAP_OAUTH_CLIENT_ID,
  SAP_OAUTH_CLIENT_SECRET,
} = process.env;

const authMode = String(SAP_AUTH_MODE).toLowerCase();
const useBearer = authMode === "bearer";
const useOauthCc = authMode === "oauth_cc";
const configuredBasicStateless = authMode === "basic_stateless";
const useBasic = !useBearer && !useOauthCc && !configuredBasicStateless;

// Runtime fallback: if cookie-based login returns sap_no_cookies, we flip this
// flag for the rest of the process and switch to per-request Basic auth.
let effectiveBasicStateless = configuredBasicStateless;
function isStatelessActive() {
  return effectiveBasicStateless;
}
function effectiveAuthMode() {
  if (useBearer) return "bearer";
  if (useOauthCc) return "oauth_cc";
  if (effectiveBasicStateless) return "basic_stateless";
  return "basic";
}

if (!SAP_BASE_URL || !SAP_SERVICE_PATH) {
  console.warn("[sapClient] Missing SAP_BASE_URL / SAP_SERVICE_PATH.");
}
if (useBearer && !SAP_BEARER_TOKEN) {
  console.warn("[sapClient] SAP_AUTH_MODE=bearer but SAP_BEARER_TOKEN is empty.");
} else if (useOauthCc && (!SAP_OAUTH_TOKEN_URL || !SAP_OAUTH_CLIENT_ID || !SAP_OAUTH_CLIENT_SECRET)) {
  console.warn(
    "[sapClient] SAP_AUTH_MODE=oauth_cc but SAP_OAUTH_TOKEN_URL / SAP_OAUTH_CLIENT_ID / SAP_OAUTH_CLIENT_SECRET missing.",
  );
} else if ((useBasic || configuredBasicStateless) && (!SAP_USER || !SAP_PASSWORD)) {
  console.warn("[sapClient] Basic auth selected but SAP_USER / SAP_PASSWORD missing.");
}

console.log(
  `[sapClient] mode=${authMode} ${
    useOauthCc
      ? `tokenUrl=${SAP_OAUTH_TOKEN_URL} clientId=${SAP_OAUTH_CLIENT_ID}`
      : useBearer
        ? "(static bearer token)"
        : configuredBasicStateless
          ? `user=${SAP_USER || "(unset)"} (stateless: Basic auth on every request, no cookie cache)`
          : `user=${SAP_USER || "(unset)"} (auto-cookie session enabled)`
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
    // NOTE: No instance-level Basic auth. We auto-login via sapSessionStore
    // and forward JSESSIONID/__VCAP_ID__ cookies on every request instead.
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
 * Resolve the cookie string to forward to SAP for this request.
 * Priority:
 *   1. Caller-supplied cookies (manual override via x-sap-jsessionid headers)
 *   2. Auto-managed session from sapSessionStore (auto-login when missing/expired)
 */
async function resolveCookies(extraCookies) {
  if (extraCookies && String(extraCookies).trim()) {
    return { cookies: String(extraCookies).trim(), source: "manual" };
  }
  if (useBearer || useOauthCc) {
    return { cookies: "", source: "none" };
  }
  if (effectiveBasicStateless) {
    // Already in stateless mode (configured or auto-fallback): no cookies, Basic auth per request.
    return { cookies: "", source: configuredBasicStateless ? "stateless" : "auto-fallback" };
  }
  // Stateful basic: try cached first; if missing/expired, auto-login.
  let cookies = sapSessionStore.getCachedCookies();
  let source = "cache";
  if (!cookies) {
    try {
      cookies = await sapSessionStore.ensureSession();
      logLoginOk();
      source = "fresh-login";
    } catch (e) {
      // Auto-fallback: tenant returned 200 but no JSESSIONID/__VCAP_ID__ cookies.
      // Switch to stateless Basic auth for the rest of this process.
      if (e?.code === "sap_no_cookies" && SAP_USER && SAP_PASSWORD) {
        effectiveBasicStateless = true;
        console.log(
          "[SAP] LOGIN no-cookies -> switching to auth=basic_stateless (auto-fallback). Subsequent requests will send Basic auth on every call.",
        );
        return { cookies: "", source: "auto-fallback" };
      }
      logLoginFail(e);
      throw e;
    }
  }
  return { cookies, source };
}

/**
 * Build per-request axios config that injects a Cookie header.
 * When forwarding session cookies, do NOT send Basic auth alongside.
 * In basic_stateless mode, attach Basic auth on every request and skip cookies.
 */
function buildRequestConfig(cookies, extraHeaders = {}) {
  const cfg = { headers: { ...extraHeaders } };
  if (cookies) {
    cfg.headers.Cookie = cookies;
    if (useBasic) {
      cfg.auth = null;
      cfg.headers.Authorization = undefined;
    }
  } else if (effectiveBasicStateless && SAP_USER && SAP_PASSWORD) {
    cfg.auth = { username: SAP_USER, password: SAP_PASSWORD };
  }
  return cfg;
}

function ensureJson(res, path, hadCookies = false) {
  const authErr = detectAuthHtml(res);
  if (authErr) {
    if (hadCookies && authErr.code === "sap_auth_redirect") {
      authErr.code = "sap_session_expired";
      authErr.message = "SAP browser session expired or invalid. Will auto re-login.";
      authErr.hint = "The middleware will obtain fresh cookies on the next attempt automatically.";
    }
    console.error(`[sapClient] ${path} -> non-JSON (${authErr.code})`);
    throw authErr;
  }
}

async function ensureCsrf(force = false, cookies = "") {
  const stale = Date.now() - csrfFetchedAt > CSRF_TTL_MS;
  if (csrfToken && !force && !stale) return csrfToken;

  const cfg = buildRequestConfig(cookies, { "x-csrf-token": "fetch" });
  const res = await http.get(`/GateHeader?$top=0&sap-client=${SAP_CLIENT}`, cfg);
  ensureJson(res, "CSRF fetch", Boolean(cookies));
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
 * Run a SAP call with auto re-login on session expiry.
 * `attempt({ cookies })` performs the actual http request and may throw
 * `sap_session_expired`, in which case we force-relogin and retry once.
 */
async function withAutoSession(method, path, extraCookies, attempt) {
  let { cookies, source } = await resolveCookies(extraCookies);
  logSapCall({ method, path, phase: source === "fresh-login" ? "(after login)" : "" });
  try {
    return await attempt({ cookies });
  } catch (e) {
    const isExpired = e?.code === "sap_session_expired" || e?.code === "sap_auth_redirect";
    // Only retry cookie-relogin when we are actually using stateful cookie mode.
    const canRelogin =
      useBasic && !effectiveBasicStateless && (!extraCookies || !String(extraCookies).trim());
    if (!isExpired || !canRelogin) throw e;

    logSapCall({ method, path, phase: "→ auto re-login" });
    sapSessionStore.clearSession();
    let fresh;
    try {
      fresh = await sapSessionStore.ensureSession();
      logLoginOk();
    } catch (loginErr) {
      logLoginFail(loginErr);
      throw loginErr;
    }
    csrfToken = null;
    try {
      const data = await attempt({ cookies: fresh });
      logRetry({ method, path, ok: true });
      return data;
    } catch (retryErr) {
      logRetry({ method, path, ok: false });
      throw retryErr;
    }
  }
}

async function sapGet(path, extraCookies = "") {
  return withAutoSession("GET", path, extraCookies, async ({ cookies }) => {
    const cfg = buildRequestConfig(cookies);
    let res = await http.get(withClient(path), cfg);
    if (res.status === 401 && useOauthCc) {
      cachedToken = null;
      res = await http.get(withClient(path), cfg);
    }
    ensureJson(res, `GET ${path}`, Boolean(cookies));
    if (res.status >= 400) {
      throw fromAxios({ message: `GET ${path} failed`, response: res });
    }
    return res.data;
  });
}

async function sapWrite(method, path, body, extraHeaders = {}, extraCookies = "") {
  // Stringify body ourselves so Axios cannot re-serialize and SAP always
  // receives application/json on the wire (otherwise SAP defaults to XML and
  // throws CX_SXML_PARSE_ERROR).
  const serialized = body === undefined || body === null ? undefined : JSON.stringify(body);

  return withAutoSession(method, path, extraCookies, async ({ cookies }) => {
    const doRequest = async () => {
      const token = await ensureCsrf(false, cookies);
      const cfg = buildRequestConfig(cookies, {
        "x-csrf-token": token,
        "If-Match": "*",
        ...extraHeaders,
        // Force these LAST so callers/extras cannot override them.
        "Content-Type": "application/json",
        Accept: "application/json",
      });
      return http.request({
        method,
        url: withClient(path),
        data: serialized,
        transformRequest: [(d) => d],
        ...cfg,
      });
    };

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
    ensureJson(res, `${method} ${path}`, Boolean(cookies));
    if (res.status >= 400) {
      throw fromAxios({ message: `${method} ${path} failed`, response: res });
    }
    return res.data;
  });
}

async function sapBatch(multipartBody, boundary, extraCookies = "") {
  return withAutoSession("POST", "/$batch", extraCookies, async ({ cookies }) => {
    const doRequest = async () => {
      const token = await ensureCsrf(false, cookies);
      const cfg = buildRequestConfig(cookies, {
        "x-csrf-token": token,
        "Content-Type": `multipart/mixed; boundary=${boundary}`,
        Accept: "multipart/mixed",
      });
      return http.request({
        method: "POST",
        url: withClient(`/$batch`),
        data: multipartBody,
        ...cfg,
        transformRequest: [(d) => d],
      });
    };

    let res = await doRequest();
    if (res.status === 401 && useOauthCc) {
      cachedToken = null;
      res = await doRequest();
    }
    if (res.status === 403) {
      csrfToken = null;
      res = await doRequest();
    }
    ensureJson(res, "$batch", Boolean(cookies));
    if (res.status >= 400) {
      throw fromAxios({ message: `$batch failed`, response: res });
    }
    return res.data;
  });
}

function getAuthInfo() {
  const eff = effectiveAuthMode();
  return {
    authMode,
    effectiveAuthMode: eff,
    user: useOauthCc || useBearer ? null : SAP_USER || null,
    tokenUrl: useOauthCc ? SAP_OAUTH_TOKEN_URL : null,
    clientId: useOauthCc ? SAP_OAUTH_CLIENT_ID : null,
    hasBearer: useBearer ? Boolean(SAP_BEARER_TOKEN) : null,
    autoSession: useBasic && !effectiveBasicStateless,
    cookieSession: useBasic && !effectiveBasicStateless,
    stateless: eff === "basic_stateless",
    statelessFallback: effectiveBasicStateless && !configuredBasicStateless,
  };
}

/**
 * Build the Cookie string the middleware should forward to SAP, from request headers
 * supplied by the frontend (x-sap-jsessionid, x-sap-vcap-id). Kept as an emergency
 * override; the auto-session path is preferred.
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
  isStatelessActive,
  effectiveAuthMode,
};

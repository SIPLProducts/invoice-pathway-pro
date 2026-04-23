"use strict";

/**
 * In-memory SAP session cookie cache.
 *
 * Holds JSESSIONID + __VCAP_ID__ cookies obtained from SAP via Basic auth login.
 * Auto-refreshes when expired or invalid. Cookies live only in this process'
 * memory — restarting the middleware drops them and triggers one auto-login on
 * the next call.
 */

const axios = require("axios");

const {
  SAP_BASE_URL,
  SAP_SERVICE_PATH,
  SAP_CLIENT = "100",
  SAP_USER,
  SAP_PASSWORD,
  SAP_SESSION_TTL_HOURS = "4",
} = process.env;

const TTL_MS = Math.max(1, Number(SAP_SESSION_TTL_HOURS) || 4) * 60 * 60 * 1000;

let session = null; // { jsessionid, vcapId, savedAt: Date, expiresAt: Date, sapUser }
let inflightLogin = null;

function parseSetCookie(headers) {
  const raw = headers?.["set-cookie"] || [];
  const arr = Array.isArray(raw) ? raw : [raw];
  let jsessionid = "";
  let vcapId = "";
  for (const line of arr) {
    if (!line) continue;
    const first = String(line).split(";", 1)[0].trim();
    const eq = first.indexOf("=");
    if (eq < 0) continue;
    const name = first.slice(0, eq).trim();
    const value = first.slice(eq + 1).trim();
    if (name === "JSESSIONID") jsessionid = value;
    else if (name === "__VCAP_ID__") vcapId = value;
  }
  return { jsessionid, vcapId };
}

async function loginToSap() {
  if (inflightLogin) return inflightLogin;

  inflightLogin = (async () => {
    if (!SAP_BASE_URL || !SAP_SERVICE_PATH) {
      const err = new Error("SAP_BASE_URL / SAP_SERVICE_PATH not configured in middleware/.env");
      err.code = "sap_config_missing";
      err.sapStatus = 500;
      throw err;
    }
    if (!SAP_USER || !SAP_PASSWORD) {
      const err = new Error(
        "SAP_USER / SAP_PASSWORD not configured in middleware/.env. Auto-login cannot run.",
      );
      err.code = "sap_credentials_missing";
      err.sapStatus = 500;
      err.hint =
        "Set SAP_USER and SAP_PASSWORD (Communication User credentials) in middleware/.env, then restart the middleware.";
      throw err;
    }

    const url = `${SAP_BASE_URL}${SAP_SERVICE_PATH}/GateHeader?$top=0&sap-client=${SAP_CLIENT}`;
    const res = await axios.get(url, {
      auth: { username: SAP_USER, password: SAP_PASSWORD },
      headers: { Accept: "application/json" },
      timeout: 30000,
      maxRedirects: 0,
      validateStatus: () => true,
    });

    if (res.status >= 400) {
      const err = new Error(
        `SAP login failed (${res.status}). Check SAP_USER/SAP_PASSWORD in middleware/.env.`,
      );
      err.code = "sap_login_failed";
      err.sapStatus = res.status;
      err.sapBody = typeof res.data === "string" ? res.data.slice(0, 500) : res.data;
      throw err;
    }

    const { jsessionid, vcapId } = parseSetCookie(res.headers);
    if (!jsessionid && !vcapId) {
      const err = new Error(
        "SAP did not return JSESSIONID / __VCAP_ID__ cookies on login. The tenant is likely stateless or OAuth-based.",
      );
      err.code = "sap_no_cookies";
      err.sapStatus = 502;
      err.hint =
        "The middleware will auto-fallback to stateless Basic auth (per-request) when SAP_USER/SAP_PASSWORD are set. For long-term, use SAP_AUTH_MODE=oauth_cc with SAP_OAUTH_* envs.";
      throw err;
    }

    const now = new Date();
    session = {
      jsessionid,
      vcapId,
      savedAt: now,
      expiresAt: new Date(now.getTime() + TTL_MS),
      sapUser: SAP_USER,
    };
    return session;
  })();

  try {
    return await inflightLogin;
  } finally {
    inflightLogin = null;
  }
}

function buildCookieString(s) {
  const parts = [];
  if (s?.jsessionid) parts.push(`JSESSIONID=${s.jsessionid}`);
  if (s?.vcapId) parts.push(`__VCAP_ID__=${s.vcapId}`);
  return parts.join("; ");
}

function isExpired(s) {
  if (!s) return true;
  return Date.now() >= s.expiresAt.getTime();
}

async function ensureSession() {
  if (!session || isExpired(session)) {
    await loginToSap();
  }
  return buildCookieString(session);
}

function getCachedCookies() {
  if (!session || isExpired(session)) return null;
  return buildCookieString(session);
}

function getStatus() {
  if (!session) {
    return {
      active: false,
      state: "NONE",
      savedAt: null,
      expiresAt: null,
      remainingMs: 0,
      jsessionidPreview: null,
      vcapIdPreview: null,
      sapUser: null,
    };
  }
  const remainingMs = session.expiresAt.getTime() - Date.now();
  return {
    active: remainingMs > 0,
    state: remainingMs > 0 ? "ACTIVE" : "EXPIRED",
    savedAt: session.savedAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
    remainingMs,
    jsessionidPreview: session.jsessionid ? `${session.jsessionid.slice(0, 8)}…` : null,
    vcapIdPreview: session.vcapId ? `${session.vcapId.slice(0, 8)}…` : null,
    sapUser: session.sapUser,
  };
}

function clearSession() {
  session = null;
}

module.exports = {
  ensureSession,
  getCachedCookies,
  loginToSap,
  getStatus,
  clearSession,
  TTL_MS,
};

"use strict";

/**
 * In-memory cache of the SAP browser session cookies (JSESSIONID + __VCAP_ID__).
 * The middleware logs into SAP once with stored credentials, parses the
 * Set-Cookie response, caches the cookies, and auto-refreshes when expired.
 */

const axios = require("axios");

const {
  SAP_BASE_URL,
  SAP_SERVICE_PATH,
  SAP_CLIENT = "100",
  SAP_USER,
  SAP_PASSWORD,
} = process.env;

// 4 hours default TTL — SAP doesn't expose the real lifetime, so we re-login
// on demand whenever SAP rejects a request (sap_session_expired).
const DEFAULT_TTL_MS = 4 * 60 * 60 * 1000;

let cache = null; // { jsessionid, vcapId, savedAt, expiresAt, sapUser }

function parseSetCookie(setCookieHeader) {
  if (!setCookieHeader) return {};
  const arr = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  const out = {};
  for (const raw of arr) {
    const first = String(raw).split(";")[0];
    const eq = first.indexOf("=");
    if (eq <= 0) continue;
    const name = first.slice(0, eq).trim();
    const value = first.slice(eq + 1).trim();
    if (name === "JSESSIONID" || name === "__VCAP_ID__") {
      out[name] = value;
    }
  }
  return out;
}

async function loginToSap({ user, password } = {}) {
  const u = (user || SAP_USER || "").trim();
  const p = password || SAP_PASSWORD || "";
  if (!u || !p) {
    const err = new Error(
      "No SAP credentials available. Set SAP_USER and SAP_PASSWORD in middleware/.env, or pass { user, password } in the request body.",
    );
    err.code = "sap_no_credentials";
    err.sapStatus = 400;
    throw err;
  }
  if (!SAP_BASE_URL || !SAP_SERVICE_PATH) {
    const err = new Error("SAP_BASE_URL / SAP_SERVICE_PATH not configured.");
    err.code = "sap_not_configured";
    err.sapStatus = 500;
    throw err;
  }

  const url = `${SAP_BASE_URL}${SAP_SERVICE_PATH}/GateHeader?$top=0&sap-client=${SAP_CLIENT}`;
  const res = await axios.get(url, {
    auth: { username: u, password: p },
    headers: { Accept: "application/json" },
    timeout: 30000,
    maxRedirects: 0,
    validateStatus: () => true,
  });

  // Detect login redirect (Steampunk OAuth/SAML) — Basic auth not allowed for this user.
  const ct = String(res.headers?.["content-type"] || "").toLowerCase();
  const bodyStr = typeof res.data === "string" ? res.data : "";
  if (ct.includes("text/html") || /<(!doctype|html|head)/i.test(bodyStr)) {
    const err = new Error(
      "SAP redirected to a login page. Basic auth is not allowed for this SAP user (likely a dialog/IDP user). Use a Communication User or switch to OAuth client_credentials.",
    );
    err.code = "sap_auth_redirect";
    err.sapStatus = 502;
    throw err;
  }

  if (res.status >= 400) {
    const err = new Error(`SAP login failed (${res.status}).`);
    err.code = "sap_login_failed";
    err.sapStatus = res.status;
    err.sapBody = res.data;
    throw err;
  }

  const cookies = parseSetCookie(res.headers["set-cookie"]);
  if (!cookies.JSESSIONID && !cookies.__VCAP_ID__) {
    const err = new Error(
      "SAP did not return JSESSIONID / __VCAP_ID__ cookies. Check the OData endpoint URL.",
    );
    err.code = "sap_no_cookies";
    err.sapStatus = 502;
    throw err;
  }

  const now = Date.now();
  cache = {
    jsessionid: cookies.JSESSIONID || (cache?.jsessionid ?? ""),
    vcapId: cookies.__VCAP_ID__ || (cache?.vcapId ?? ""),
    savedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + DEFAULT_TTL_MS).toISOString(),
    sapUser: u,
  };
  return getStatus();
}

function getCachedCookies() {
  if (!cache) return null;
  if (Date.now() >= new Date(cache.expiresAt).getTime()) return null;
  const parts = [];
  if (cache.jsessionid) parts.push(`JSESSIONID=${cache.jsessionid}`);
  if (cache.vcapId) parts.push(`__VCAP_ID__=${cache.vcapId}`);
  return parts.join("; ") || null;
}

function getRawCache() {
  return cache;
}

function mask(v) {
  if (!v) return null;
  return v.length <= 10 ? v : `${v.slice(0, 8)}…`;
}

function getStatus() {
  if (!cache) {
    return {
      active: false,
      hasEnvCredentials: Boolean(SAP_USER && SAP_PASSWORD),
      sapUser: SAP_USER || null,
    };
  }
  const now = Date.now();
  const expiresAtMs = new Date(cache.expiresAt).getTime();
  return {
    active: now < expiresAtMs,
    hasEnvCredentials: Boolean(SAP_USER && SAP_PASSWORD),
    sapUser: cache.sapUser,
    savedAt: cache.savedAt,
    expiresAt: cache.expiresAt,
    remainingMs: Math.max(0, expiresAtMs - now),
    jsessionidPreview: mask(cache.jsessionid),
    vcapIdPreview: mask(cache.vcapId),
  };
}

function clearSession() {
  cache = null;
}

module.exports = {
  loginToSap,
  getCachedCookies,
  getRawCache,
  getStatus,
  clearSession,
  DEFAULT_TTL_MS,
};

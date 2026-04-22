"use strict";

const axios = require("axios");
const { CookieJar } = require("tough-cookie");
const { wrapper } = require("axios-cookiejar-support");
const { fromAxios, detectAuthHtml } = require("./util/errors");

const {
  SAP_BASE_URL,
  SAP_SERVICE_PATH,
  SAP_CLIENT = "100",
  SAP_USER,
  SAP_PASSWORD,
  SAP_AUTH_MODE = "basic", // "basic" | "bearer"
  SAP_BEARER_TOKEN,
} = process.env;

const useBearer = String(SAP_AUTH_MODE).toLowerCase() === "bearer";

if (!SAP_BASE_URL || !SAP_SERVICE_PATH) {
  // eslint-disable-next-line no-console
  console.warn("[sapClient] Missing SAP_BASE_URL / SAP_SERVICE_PATH.");
}
if (useBearer && !SAP_BEARER_TOKEN) {
  // eslint-disable-next-line no-console
  console.warn("[sapClient] SAP_AUTH_MODE=bearer but SAP_BEARER_TOKEN is empty.");
} else if (!useBearer && (!SAP_USER || !SAP_PASSWORD)) {
  // eslint-disable-next-line no-console
  console.warn("[sapClient] Basic auth selected but SAP_USER / SAP_PASSWORD missing.");
}

const jar = new CookieJar();

const baseHeaders = {
  Accept: "application/json",
};
if (useBearer && SAP_BEARER_TOKEN) {
  baseHeaders.Authorization = `Bearer ${SAP_BEARER_TOKEN}`;
}

const http = wrapper(
  axios.create({
    baseURL: `${SAP_BASE_URL}${SAP_SERVICE_PATH}`,
    ...(useBearer
      ? {}
      : { auth: { username: SAP_USER || "", password: SAP_PASSWORD || "" } }),
    timeout: 30000,
    jar,
    withCredentials: true,
    maxRedirects: 0, // never silently follow login redirects
    validateStatus: () => true,
    headers: baseHeaders,
  }),
);

let csrfToken = null;
let csrfFetchedAt = 0;
const CSRF_TTL_MS = 25 * 60 * 1000;

function ensureJson(res, path) {
  // Detect SAP login HTML even when status is 200
  const authErr = detectAuthHtml(res);
  if (authErr) {
    // eslint-disable-next-line no-console
    console.error(`[sapClient] ${path} -> non-JSON (${authErr.code})`);
    throw authErr;
  }
}

async function ensureCsrf(force = false) {
  const stale = Date.now() - csrfFetchedAt > CSRF_TTL_MS;
  if (csrfToken && !force && !stale) return csrfToken;

  const res = await http.get(`/GateHeader?$top=0&sap-client=${SAP_CLIENT}`, {
    headers: { "x-csrf-token": "fetch" },
  });
  ensureJson(res, "CSRF fetch");
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

async function sapGet(path) {
  const res = await http.get(withClient(path));
  ensureJson(res, `GET ${path}`);
  if (res.status >= 400) {
    throw fromAxios({ message: `GET ${path} failed`, response: res });
  }
  return res.data;
}

async function sapWrite(method, path, body, extraHeaders = {}) {
  const doRequest = async () => {
    const token = await ensureCsrf();
    return http.request({
      method,
      url: withClient(path),
      data: body,
      headers: {
        "x-csrf-token": token,
        "Content-Type": "application/json",
        "If-Match": "*",
        ...extraHeaders,
      },
    });
  };

  let res = await doRequest();
  if (
    res.status === 403 &&
    /csrf/i.test(res.headers["x-csrf-token"] || res.data?.toString?.() || "")
  ) {
    csrfToken = null;
    res = await doRequest();
  }
  ensureJson(res, `${method} ${path}`);
  if (res.status >= 400) {
    throw fromAxios({ message: `${method} ${path} failed`, response: res });
  }
  return res.data;
}

async function sapBatch(multipartBody, boundary) {
  const doRequest = async () => {
    const token = await ensureCsrf();
    return http.request({
      method: "POST",
      url: withClient(`/$batch`),
      data: multipartBody,
      headers: {
        "x-csrf-token": token,
        "Content-Type": `multipart/mixed; boundary=${boundary}`,
        Accept: "multipart/mixed",
      },
      transformRequest: [(d) => d],
    });
  };

  let res = await doRequest();
  if (res.status === 403) {
    csrfToken = null;
    res = await doRequest();
  }
  ensureJson(res, "$batch");
  if (res.status >= 400) {
    throw fromAxios({ message: `$batch failed`, response: res });
  }
  return res.data;
}

module.exports = { sapGet, sapWrite, sapBatch, ensureCsrf, SAP_CLIENT };

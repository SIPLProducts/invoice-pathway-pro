"use strict";

const axios = require("axios");
const { CookieJar } = require("tough-cookie");
const { wrapper } = require("axios-cookiejar-support");
const { fromAxios } = require("./util/errors");

const {
  SAP_BASE_URL,
  SAP_SERVICE_PATH,
  SAP_CLIENT = "100",
  SAP_USER,
  SAP_PASSWORD,
} = process.env;

if (!SAP_BASE_URL || !SAP_SERVICE_PATH || !SAP_USER || !SAP_PASSWORD) {
  // eslint-disable-next-line no-console
  console.warn(
    "[sapClient] Missing one of SAP_BASE_URL / SAP_SERVICE_PATH / SAP_USER / SAP_PASSWORD. Requests will fail until set.",
  );
}

const jar = new CookieJar();

const http = wrapper(
  axios.create({
    baseURL: `${SAP_BASE_URL}${SAP_SERVICE_PATH}`,
    auth: { username: SAP_USER || "", password: SAP_PASSWORD || "" },
    timeout: 30000,
    jar,
    withCredentials: true,
    validateStatus: () => true, // we'll inspect manually
    headers: {
      Accept: "application/json",
    },
  }),
);

let csrfToken = null;
let csrfFetchedAt = 0;
const CSRF_TTL_MS = 25 * 60 * 1000; // 25 min

async function ensureCsrf(force = false) {
  const stale = Date.now() - csrfFetchedAt > CSRF_TTL_MS;
  if (csrfToken && !force && !stale) return csrfToken;

  const res = await http.get(`/GateHeader?$top=0&sap-client=${SAP_CLIENT}`, {
    headers: { "x-csrf-token": "fetch" },
  });
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
  if (res.status === 403 && /csrf/i.test(res.headers["x-csrf-token"] || res.data?.toString?.() || "")) {
    csrfToken = null;
    res = await doRequest();
  }
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
      transformRequest: [(d) => d], // keep raw string
    });
  };

  let res = await doRequest();
  if (res.status === 403) {
    csrfToken = null;
    res = await doRequest();
  }
  if (res.status >= 400) {
    throw fromAxios({ message: `$batch failed`, response: res });
  }
  return res.data;
}

module.exports = { sapGet, sapWrite, sapBatch, ensureCsrf, SAP_CLIENT };

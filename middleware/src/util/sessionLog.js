"use strict";

const sapSessionStore = require("../sapSessionStore");

const ENABLED = String(process.env.SAP_SESSION_LOG ?? "1") !== "0";

function fmtRemaining(ms) {
  if (ms == null) return "—";
  if (ms <= 0) return "expired";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function fmtTtl(ms) {
  const h = Math.floor(ms / (60 * 60 * 1000));
  if (h >= 1) return `${h}h`;
  const m = Math.floor(ms / (60 * 1000));
  return `${m}m`;
}

function pad(method) {
  return String(method || "").toUpperCase().padEnd(4, " ");
}

/** Log a SAP outbound call with current session lifetime info. */
function logSapCall({ method, path, phase = "" }) {
  if (!ENABLED) return;
  const st = sapSessionStore.getStatus();
  const tail = phase ? `  ${phase}` : "";
  if (st.state === "NONE") {
    console.log(`[SAP] ${pad(method)} ${path}  session=NONE${tail}`);
    return;
  }
  console.log(
    `[SAP] ${pad(method)} ${path}  session=${st.state}  savedAt=${st.savedAt}  expiresAt=${st.expiresAt}  remaining=${fmtRemaining(
      st.remainingMs,
    )}  jsess=${st.jsessionidPreview ?? "—"}  vcap=${st.vcapIdPreview ?? "—"}${tail}`,
  );
}

function logLoginOk() {
  if (!ENABLED) return;
  const st = sapSessionStore.getStatus();
  console.log(
    `[SAP] LOGIN ok user=${st.sapUser ?? "—"}  savedAt=${st.savedAt}  expiresAt=${st.expiresAt}  ttl=${fmtTtl(
      sapSessionStore.TTL_MS,
    )}`,
  );
}

function logLoginFail(err) {
  if (!ENABLED) return;
  console.log(`[SAP] LOGIN fail code=${err?.code || "unknown"} msg=${err?.message || ""}`);
}

function logLogout() {
  if (!ENABLED) return;
  console.log(`[SAP] LOGOUT cleared`);
}

function logRetry({ method, path, ok }) {
  if (!ENABLED) return;
  console.log(`[SAP] ${pad(method)} ${path}  retry=${ok ? "ok" : "fail"}`);
}

module.exports = {
  logSapCall,
  logLoginOk,
  logLoginFail,
  logLogout,
  logRetry,
};

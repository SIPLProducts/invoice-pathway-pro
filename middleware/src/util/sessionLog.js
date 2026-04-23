"use strict";

const sapSessionStore = require("../sapSessionStore");

const ENABLED = String(process.env.SAP_SESSION_LOG ?? "1") !== "0";

function fmtRemaining(ms) {
  if (ms == null || Number.isNaN(ms)) return "—";
  const negative = ms < 0;
  const abs = Math.abs(ms);
  const totalSec = Math.floor(abs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  let out;
  if (h > 0) out = `${h}h${m}m`;
  else if (m > 0) out = `${m}m${s}s`;
  else out = `${s}s`;
  return negative ? `-${out}` : out;
}

function logSapCall({ method, path, source = "auto" }) {
  if (!ENABLED) return;
  const cache = sapSessionStore.getRawCache();
  const now = Date.now();
  const m = String(method || "GET").toUpperCase().padEnd(5);
  const p = String(path || "").slice(0, 80);

  if (!cache) {
    console.log(`[SAP] ${m} ${p}  session=NONE     (login attempt may follow)`);
    return;
  }
  const expiresAtMs = new Date(cache.expiresAt).getTime();
  const remaining = expiresAtMs - now;
  const state = remaining <= 0 ? "EXPIRED" : "ACTIVE";
  const jsess = cache.jsessionid ? `${cache.jsessionid.slice(0, 8)}…` : "—";
  const vcap = cache.vcapId ? `${cache.vcapId.slice(0, 8)}…` : "—";
  console.log(
    `[SAP] ${m} ${p}  session=${state.padEnd(7)} savedAt=${cache.savedAt}  expiresAt=${cache.expiresAt}  remaining=${fmtRemaining(remaining)}  jsess=${jsess}  vcap=${vcap}  src=${source}`,
  );
}

function logLoginResult(result, err) {
  if (!ENABLED) return;
  if (err) {
    console.log(`[SAP] LOGIN fail  reason=${err.code || "unknown"}  msg=${err.message || ""}`);
    return;
  }
  if (!result) {
    console.log(`[SAP] LOGIN ok    (no status)`);
    return;
  }
  console.log(
    `[SAP] LOGIN ok    user=${result.sapUser || "?"}  savedAt=${result.savedAt}  expiresAt=${result.expiresAt}  ttl=${fmtRemaining(result.remainingMs)}`,
  );
}

function logRetry(method, path, ok) {
  if (!ENABLED) return;
  console.log(`[SAP] ${String(method).toUpperCase()} ${path}  retry=${ok ? "ok" : "fail"}`);
}

function logAutoRelogin(method, path) {
  if (!ENABLED) return;
  console.log(`[SAP] ${String(method).toUpperCase()} ${path}  → auto re-login`);
}

module.exports = { logSapCall, logLoginResult, logRetry, logAutoRelogin, fmtRemaining };

import { useSyncExternalStore } from "react";

/**
 * SAP session store with two modes:
 *  - "auto":   middleware handles cookies (no headers sent from client)
 *  - "manual": user pastes JSESSIONID + __VCAP_ID__ cookies; we forward them
 *              via x-sap-jsessionid / x-sap-vcap-id headers, which the
 *              middleware (`buildCookieFromHeaders`) prefers over auto-login.
 *
 * Persisted to localStorage under STORAGE_KEY. Reactive via useSyncExternalStore.
 *
 * Status tracking lets the UI show whether saved manual cookies are still valid:
 *   - "active":  most recent SAP call succeeded (or just saved).
 *   - "expired": SAP rejected (401 / 403 / sap_auth_redirect). Cookies kept so
 *                the user can compare and overwrite.
 *   - "unknown": never tested since save (e.g. after a reload).
 */

export type SapSessionMode = "auto" | "manual";
export type SapSessionStatus = "active" | "expired" | "unknown";

export interface SapSession {
  mode: SapSessionMode;
  jsessionid: string;
  vcapId: string;
  savedAt: string;
  expiresAt: string;
  status: SapSessionStatus;
}

const STORAGE_KEY = "sap.session.v1";
/** Mirrors middleware SAP_SESSION_TTL_HOURS default. */
const SAP_MANUAL_TTL_HOURS = 4;
const DEFAULT: SapSession = {
  mode: "manual",
  jsessionid: "",
  vcapId: "",
  savedAt: "",
  expiresAt: "",
  status: "unknown",
};

let cached: SapSession = readFromStorage();
const listeners = new Set<() => void>();

function readFromStorage(): SapSession {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as Partial<SapSession>;
    const status: SapSessionStatus =
      parsed.status === "active" || parsed.status === "expired" ? parsed.status : "unknown";
    return {
      mode: parsed.mode === "auto" ? "auto" : "manual",
      jsessionid: typeof parsed.jsessionid === "string" ? parsed.jsessionid : "",
      vcapId: typeof parsed.vcapId === "string" ? parsed.vcapId : "",
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : "",
      expiresAt: typeof parsed.expiresAt === "string" ? parsed.expiresAt : "",
      // After a reload we can't trust an old "active" — downgrade to "unknown" until next call.
      status: status === "active" ? "unknown" : status,
    };
  } catch {
    return DEFAULT;
  }
}

function persist(next: SapSession) {
  cached = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore quota errors */
    }
  }
  listeners.forEach((cb) => cb());
}

export function getSapSession(): SapSession {
  return cached;
}

export function setSapSession(input: { jsessionid: string; vcapId: string }) {
  const now = new Date();
  const expires = new Date(now.getTime() + SAP_MANUAL_TTL_HOURS * 3600_000);
  persist({
    mode: "manual",
    jsessionid: input.jsessionid.trim(),
    vcapId: input.vcapId.trim(),
    savedAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    status: "active",
  });
}

export function clearSapSession() {
  persist({ ...DEFAULT, mode: "auto" });
}

export function setSapSessionMode(mode: SapSessionMode) {
  persist({ ...cached, mode });
}

/** Flip status to "expired" without losing the cookie values. */
export function markSapSessionExpired() {
  if (cached.mode !== "manual") return;
  if (cached.status === "expired") return;
  persist({ ...cached, status: "expired" });
}

/** Flip status to "active" after a successful SAP call. */
export function markSapSessionActive() {
  if (cached.mode !== "manual") return;
  if (!cached.jsessionid || !cached.vcapId) return;
  if (cached.status === "active") return;
  persist({ ...cached, status: "active" });
}

/** Headers sent on every middleware call. Empty unless manual mode + both cookies set. */
export function getSapSessionHeaders(): Record<string, string> {
  if (cached.mode !== "manual") return {};
  if (!cached.jsessionid || !cached.vcapId) return {};
  return {
    "x-sap-jsessionid": cached.jsessionid,
    "x-sap-vcap-id": cached.vcapId,
  };
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useSapSession(): SapSession {
  return useSyncExternalStore(subscribe, getSapSession, () => DEFAULT);
}

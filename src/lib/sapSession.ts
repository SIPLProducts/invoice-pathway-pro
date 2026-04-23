import { useSyncExternalStore } from "react";

/**
 * SAP session store with two modes:
 *  - "auto":   middleware handles cookies (no headers sent from client)
 *  - "manual": user pastes JSESSIONID + __VCAP_ID__ cookies; we forward them
 *              via x-sap-jsessionid / x-sap-vcap-id headers, which the
 *              middleware (`buildCookieFromHeaders`) prefers over auto-login.
 *
 * Persisted to localStorage under STORAGE_KEY. Reactive via useSyncExternalStore.
 */

export type SapSessionMode = "auto" | "manual";

export interface SapSession {
  mode: SapSessionMode;
  jsessionid: string;
  vcapId: string;
  savedAt: string;
}

const STORAGE_KEY = "sap.session.v1";
const DEFAULT: SapSession = { mode: "auto", jsessionid: "", vcapId: "", savedAt: "" };

let cached: SapSession = readFromStorage();
const listeners = new Set<() => void>();

function readFromStorage(): SapSession {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as Partial<SapSession>;
    return {
      mode: parsed.mode === "manual" ? "manual" : "auto",
      jsessionid: typeof parsed.jsessionid === "string" ? parsed.jsessionid : "",
      vcapId: typeof parsed.vcapId === "string" ? parsed.vcapId : "",
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : "",
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
  persist({
    mode: "manual",
    jsessionid: input.jsessionid.trim(),
    vcapId: input.vcapId.trim(),
    savedAt: new Date().toISOString(),
  });
}

export function clearSapSession() {
  persist({ mode: "auto", jsessionid: "", vcapId: "", savedAt: "" });
}

export function setSapSessionMode(mode: SapSessionMode) {
  persist({ ...cached, mode });
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

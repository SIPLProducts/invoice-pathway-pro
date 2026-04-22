import { useSyncExternalStore } from "react";

export interface SapSession {
  jsessionid: string;
  vcapId: string;
  savedAt: string;
}

const STORAGE_KEY = "sap.session.cookies.v1";
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function getSapSession(): SapSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SapSession;
    if (!parsed?.jsessionid && !parsed?.vcapId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setSapSession(session: { jsessionid: string; vcapId: string }) {
  const clean: SapSession = {
    jsessionid: session.jsessionid.trim(),
    vcapId: session.vcapId.trim(),
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  emit();
}

export function clearSapSession() {
  localStorage.removeItem(STORAGE_KEY);
  emit();
}

/** Returns headers to attach to outgoing middleware requests. */
export function getSapSessionHeaders(): Record<string, string> {
  const s = getSapSession();
  if (!s) return {};
  const headers: Record<string, string> = {};
  if (s.jsessionid) headers["x-sap-jsessionid"] = s.jsessionid;
  if (s.vcapId) headers["x-sap-vcap-id"] = s.vcapId;
  return headers;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useSapSession(): SapSession | null {
  return useSyncExternalStore(subscribe, getSapSession, () => null);
}

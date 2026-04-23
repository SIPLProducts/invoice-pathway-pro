import { useSyncExternalStore } from "react";

/**
 * Cookie management is now fully handled by the middleware (auto-login + cache).
 * This module is a no-op shim retained so existing callers (useSapProxy,
 * useSapCreate) compile unchanged. Manual cookie paste UI has been removed.
 */

export interface SapSession {
  jsessionid: string;
  vcapId: string;
  savedAt: string;
}

const listeners = new Set<() => void>();

export function getSapSession(): SapSession | null {
  return null;
}

export function setSapSession(_session: { jsessionid: string; vcapId: string }) {
  // no-op: middleware now manages cookies automatically
}

export function clearSapSession() {
  // no-op
}

/** Returns headers to attach to outgoing middleware requests. */
export function getSapSessionHeaders(): Record<string, string> {
  return {};
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useSapSession(): SapSession | null {
  return useSyncExternalStore(subscribe, getSapSession, () => null);
}

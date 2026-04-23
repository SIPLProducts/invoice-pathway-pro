import { useSyncExternalStore } from "react";

export interface SapSession {
  jsessionid: string;
  vcapId: string;
  savedAt: string;
  /** Set when the session was created via dynamic middleware login. */
  source?: "manual" | "dynamic";
  /** Optional ISO timestamp at which the middleware considers the session expired. */
  expiresAt?: string;
  /** SAP user the session was created for (dynamic login only). */
  sapUser?: string;
}

const STORAGE_KEY = "sap.session.cookies.v1";
const listeners = new Set<() => void>();

let cachedRaw: string | null = null;
let cachedSession: SapSession | null = null;

function readSession(): SapSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw) return cachedSession;
    cachedRaw = raw;
    if (!raw) {
      cachedSession = null;
      return null;
    }
    const parsed = JSON.parse(raw) as SapSession;
    if (!parsed?.jsessionid && !parsed?.vcapId) {
      cachedSession = null;
      return null;
    }
    cachedSession = parsed;
    return parsed;
  } catch {
    cachedSession = null;
    return null;
  }
}

function emit() {
  // Invalidate cache so subscribers get fresh value
  cachedRaw = null;
  listeners.forEach((l) => l());
}

export function getSapSession(): SapSession | null {
  return readSession();
}

export function setSapSession(session: {
  jsessionid: string;
  vcapId: string;
  source?: "manual" | "dynamic";
  expiresAt?: string;
  sapUser?: string;
}) {
  const clean: SapSession = {
    jsessionid: session.jsessionid.trim(),
    vcapId: session.vcapId.trim(),
    savedAt: new Date().toISOString(),
    source: session.source ?? "manual",
    expiresAt: session.expiresAt,
    sapUser: session.sapUser,
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

// ----------------------------------------------------------------------------
// Dynamic middleware-managed SAP login (auto session)
// ----------------------------------------------------------------------------

export interface SapMiddlewareSessionStatus {
  ok?: boolean;
  active: boolean;
  hasEnvCredentials: boolean;
  sapUser?: string | null;
  savedAt?: string;
  expiresAt?: string;
  remainingMs?: number;
  jsessionidPreview?: string | null;
  vcapIdPreview?: string | null;
}

function trimSlash(u: string) {
  return u.replace(/\/$/, "");
}

/** POST {middlewareUrl}/api/sap-session/login — uses .env creds by default. */
export async function loginToSapDynamic(
  middlewareUrl: string,
  body?: { user?: string; password?: string },
): Promise<SapMiddlewareSessionStatus> {
  const base = trimSlash(middlewareUrl);
  const res = await fetch(`${base}/api/sap-session/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "ngrok-skip-browser-warning": "true",
    },
    body: JSON.stringify(body || {}),
  });
  const data = (await res.json().catch(() => null)) as
    | (SapMiddlewareSessionStatus & { code?: string; message?: string; hint?: string })
    | null;
  if (!res.ok || !data?.ok) {
    const err = new Error(
      data?.message || `Login failed (HTTP ${res.status})`,
    ) as Error & { code?: string; hint?: string };
    err.code = data?.code;
    err.hint = data?.hint;
    throw err;
  }

  // Mirror the session into the browser store so existing UI keeps working.
  // The middleware now manages cookies on its own — the browser-stored
  // values here are just previews used by the badge / table UI.
  setSapSession({
    jsessionid: data.jsessionidPreview || "auto",
    vcapId: data.vcapIdPreview || "auto",
    source: "dynamic",
    expiresAt: data.expiresAt,
    sapUser: data.sapUser ?? undefined,
  });
  return data;
}

/** GET {middlewareUrl}/api/sap-session/status */
export async function refreshSapSessionStatus(
  middlewareUrl: string,
): Promise<SapMiddlewareSessionStatus | null> {
  try {
    const base = trimSlash(middlewareUrl);
    const res = await fetch(`${base}/api/sap-session/status`, {
      headers: {
        Accept: "application/json",
        "ngrok-skip-browser-warning": "true",
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as SapMiddlewareSessionStatus;
  } catch {
    return null;
  }
}

/** POST {middlewareUrl}/api/sap-session/logout — also clears the local mirror. */
export async function logoutSapDynamic(middlewareUrl: string): Promise<void> {
  try {
    const base = trimSlash(middlewareUrl);
    await fetch(`${base}/api/sap-session/logout`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "ngrok-skip-browser-warning": "true",
      },
    });
  } finally {
    clearSapSession();
  }
}


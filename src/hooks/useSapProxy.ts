import { getSapConnection, useSapConnection } from "@/lib/sapConnection";
import { getSapTargetHeaders } from "@/lib/sapTarget";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { SapApiSchema } from "@/lib/sapApiSchemas";
import type { SapApi } from "@/lib/sapApisStore";
import { getPath } from "@/lib/getPath";
import {
  getSapSessionHeaders,
  useSapSession,
  markSapSessionActive,
  markSapSessionExpired,
} from "@/lib/sapSession";

export interface SapProxyError {
  message: string;
  code?: string;
  hint?: string;
}

export interface UseSapProxyResult<T = Record<string, unknown>> {
  rows: T[];
  loading: boolean;
  error: SapProxyError | null;
  lastFetched: Date | null;
  proxyConfigured: boolean;
  proxyUrl: string;
  refresh: () => void;
}

/**
 * Resolves the middleware base URL for a given API.
 * Priority: global Connection tab -> api.middleware.url (legacy) -> VITE_SAP_PROXY_URL env -> "".
 */
export function resolveProxyUrl(api?: SapApi | null): string {
  const candidates = [
    getSapConnection().middlewareUrl,
    api?.middleware?.url,
    import.meta.env.VITE_SAP_PROXY_URL as string | undefined,
  ];
  for (const c of candidates) {
    const n = normalizeProxyBase(c);
    if (n) return n;
  }
  return "";
}

/**
 * Callers append paths that already start with `/api/...`, so the base must be
 * the server root. A same-origin value like "/api" (Nginx reverse proxy) or
 * "/" maps to the current site origin; a trailing "/api" is stripped.
 */
export function normalizeProxyBase(raw: string | undefined | null, origin?: string): string {
  let v = (raw ?? "").trim().replace(/\/+$/, "");
  if (!v && !(raw ?? "").trim()) return "";
  v = v.replace(/\/api$/i, "");
  if (/^https?:\/\//i.test(v)) return v;
  const o = origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${o}${v}`.replace(/\/+$/, "");
}

/** Shared proxy secret: global Connection tab first, then the API's own (legacy). */
export function resolveProxySecret(api?: SapApi | null): string {
  return getSapConnection().proxySecret || api?.middleware?.secret || "";
}

export function useSapProxy<T = Record<string, unknown>>(
  api: SapApi | null | undefined,
  schema: SapApiSchema,
): UseSapProxyResult<T> {
  const conn = useSapConnection();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const proxyUrl = useMemo(() => resolveProxyUrl(api), [api, conn.middlewareUrl]);
  const proxyConfigured = Boolean(proxyUrl);
  const secret = api?.middleware?.secret ?? "";
  const session = useSapSession();
  const sessionKey = session ? `${session.jsessionid}|${session.vcapId}` : "";

  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<SapProxyError | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!proxyConfigured) return;
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const headers: Record<string, string> = {
          Accept: "application/json",
          "ngrok-skip-browser-warning": "true",
          ...getSapSessionHeaders(),
          ...getSapTargetHeaders(api),
        };
        if (secret) headers["x-proxy-secret"] = secret;
        const res = await fetch(`${proxyUrl}${schema.proxyPath}`, { headers });
        const text = await res.text();
        const ct = res.headers.get("content-type") ?? "";
        if (ct.includes("text/html") || /^\s*<(!doctype|html)/i.test(text)) {
          throw {
            message:
              "Middleware returned HTML (likely ngrok warning page or wrong URL). Open the middleware URL once in a new tab to clear the warning, or check the URL is correct.",
            code: "middleware_html",
          } as SapProxyError;
        }
        let data: unknown = null;
        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          throw {
            message: `Non-JSON response from middleware (${res.status}): ${text.slice(0, 200)}`,
            code: "non_json",
          } as SapProxyError;
        }
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) markSapSessionExpired();
          const errObj = data as {
            error?: {
              message?: string;
              code?: string;
              hint?: string;
              details?: Array<{ message?: string; target?: string }>;
            };
          } | null;
          if (errObj?.error?.code === "sap_auth_redirect") markSapSessionExpired();
          const detail =
            Array.isArray(errObj?.error?.details) && errObj?.error?.details?.[0]?.message
              ? errObj!.error!.details![0]!.message
              : null;
          throw {
            message: detail || errObj?.error?.message || `HTTP ${res.status}`,
            code: errObj?.error?.code,
            hint: errObj?.error?.hint,
          } as SapProxyError;
        }
        markSapSessionActive();
        const collection = schema.rowsPath
          ? (getPath(data, schema.rowsPath) as T[])
          : ((Array.isArray(data) ? data : [data]) as T[]);
        if (!cancelled) {
          setRows(Array.isArray(collection) ? collection : []);
          setLastFetched(new Date());
        }
      } catch (e) {
        if (!cancelled) {
          if (e && typeof e === "object" && "message" in (e as object)) {
            setError(e as SapProxyError);
          } else {
            setError({ message: e instanceof Error ? e.message : String(e) });
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [proxyUrl, proxyConfigured, secret, schema.proxyPath, schema.rowsPath, tick, sessionKey, api?.endpoint]);

  return { rows, loading, error, lastFetched, proxyConfigured, proxyUrl, refresh };
}

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SapApiSchema } from "@/lib/sapApiSchemas";
import type { SapApi } from "@/lib/sapApisStore";
import { getPath } from "@/lib/getPath";
import { getSapSessionHeaders, useSapSession } from "@/lib/sapSession";

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
 * Priority: api.middleware.url -> VITE_SAP_PROXY_URL env -> "".
 */
export function resolveProxyUrl(api?: SapApi | null): string {
  const fromApi = api?.middleware?.url?.trim().replace(/\/$/, "") ?? "";
  if (fromApi) return fromApi;
  const fromEnv = (import.meta.env.VITE_SAP_PROXY_URL as string | undefined)?.trim().replace(/\/$/, "") ?? "";
  return fromEnv;
}

export function useSapProxy<T = Record<string, unknown>>(
  api: SapApi | null | undefined,
  schema: SapApiSchema,
): UseSapProxyResult<T> {
  const proxyUrl = useMemo(() => resolveProxyUrl(api), [api]);
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
          const errObj = data as {
            error?: { message?: string; code?: string; hint?: string };
          } | null;
          throw {
            message: errObj?.error?.message || `HTTP ${res.status}`,
            code: errObj?.error?.code,
            hint: errObj?.error?.hint,
          } as SapProxyError;
        }
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
  }, [proxyUrl, proxyConfigured, secret, schema.proxyPath, schema.rowsPath, tick, sessionKey]);

  return { rows, loading, error, lastFetched, proxyConfigured, proxyUrl, refresh };
}

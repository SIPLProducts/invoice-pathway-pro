import { useCallback, useEffect, useMemo, useState } from "react";
import type { SapApiSchema } from "@/lib/sapApiSchemas";
import type { SapApi } from "@/lib/sapApisStore";
import { getPath } from "@/lib/getPath";

export interface UseSapProxyResult<T = Record<string, unknown>> {
  rows: T[];
  loading: boolean;
  error: string | null;
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

  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
        const headers: Record<string, string> = { Accept: "application/json" };
        if (secret) headers["x-proxy-secret"] = secret;
        const res = await fetch(`${proxyUrl}${schema.proxyPath}`, { headers });
        const text = await res.text();
        const data = text ? JSON.parse(text) : null;
        if (!res.ok) {
          throw new Error(data?.error?.message || data?.error?.code || `HTTP ${res.status}`);
        }
        const collection = schema.rowsPath
          ? (getPath(data, schema.rowsPath) as T[])
          : ((Array.isArray(data) ? data : [data]) as T[]);
        if (!cancelled) {
          setRows(Array.isArray(collection) ? collection : []);
          setLastFetched(new Date());
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [proxyUrl, proxyConfigured, secret, schema.proxyPath, schema.rowsPath, tick]);

  return { rows, loading, error, lastFetched, proxyConfigured, proxyUrl, refresh };
}

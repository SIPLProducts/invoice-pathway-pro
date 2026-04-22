import { useCallback, useEffect, useState } from "react";
import type { SapApiSchema } from "@/lib/sapApiSchemas";
import { getPath } from "@/lib/getPath";

export interface UseSapProxyResult<T = Record<string, unknown>> {
  rows: T[];
  loading: boolean;
  error: string | null;
  lastFetched: Date | null;
  proxyConfigured: boolean;
  refresh: () => void;
}

export function useSapProxy<T = Record<string, unknown>>(
  schema: SapApiSchema,
): UseSapProxyResult<T> {
  const proxyUrl = (import.meta.env.VITE_SAP_PROXY_URL as string | undefined)?.replace(/\/$/, "");
  const proxyConfigured = Boolean(proxyUrl);

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
        const res = await fetch(`${proxyUrl}${schema.proxyPath}`, {
          headers: { Accept: "application/json" },
        });
        const text = await res.text();
        const data = text ? JSON.parse(text) : null;
        if (!res.ok) {
          throw new Error(
            data?.error?.message || data?.error?.code || `HTTP ${res.status}`,
          );
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
  }, [proxyUrl, proxyConfigured, schema.proxyPath, schema.rowsPath, tick]);

  return { rows, loading, error, lastFetched, proxyConfigured, refresh };
}

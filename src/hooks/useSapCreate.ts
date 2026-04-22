import { useState } from "react";

export interface CreateResult {
  ok: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

/**
 * POSTs a header+items payload to the configured proxy path on the Node middleware.
 * Returns { ok, data, error } and exposes loading state.
 */
export function useSapCreate(proxyPath: string) {
  const [loading, setLoading] = useState(false);
  const proxyUrl = (import.meta.env.VITE_SAP_PROXY_URL as string | undefined)?.replace(/\/$/, "");

  const submit = async (body: Record<string, unknown>): Promise<CreateResult> => {
    if (!proxyUrl) {
      return {
        ok: false,
        error: "VITE_SAP_PROXY_URL is not set. Configure your Node middleware URL.",
      };
    }
    setLoading(true);
    try {
      const res = await fetch(`${proxyUrl}${proxyPath}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (!res.ok) {
        return {
          ok: false,
          error: data?.error?.message || data?.error?.code || `HTTP ${res.status}`,
        };
      }
      return { ok: true, data };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    } finally {
      setLoading(false);
    }
  };

  return { submit, loading, proxyConfigured: Boolean(proxyUrl) };
}

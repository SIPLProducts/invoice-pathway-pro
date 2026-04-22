import { useState } from "react";
import type { SapApi } from "@/lib/sapApisStore";
import { resolveProxyUrl } from "./useSapProxy";
import { getSapSessionHeaders } from "@/lib/sapSession";

export interface CreateResult {
  ok: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

/**
 * POSTs a payload to the configured proxy path. Resolves the middleware base URL
 * from the API record (`api.middleware.url`) with VITE_SAP_PROXY_URL as a fallback.
 */
export function useSapCreate(api: SapApi | null | undefined, proxyPathOverride?: string) {
  const [loading, setLoading] = useState(false);
  const proxyUrl = resolveProxyUrl(api);
  const proxyPath = proxyPathOverride ?? api?.createEndpoint ?? api?.proxyPath ?? "/api/gate/headers";
  const secret = api?.middleware?.secret ?? "";

  const submit = async (body: Record<string, unknown>): Promise<CreateResult> => {
    if (!proxyUrl) {
      return {
        ok: false,
        error:
          "Middleware URL not set. Open SAP Settings → API Details and set the Node.js Middleware URL (or define VITE_SAP_PROXY_URL).",
      };
    }
    setLoading(true);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
        "ngrok-skip-browser-warning": "true",
        ...getSapSessionHeaders(),
      };
      if (secret) headers["x-proxy-secret"] = secret;
      const res = await fetch(`${proxyUrl}${proxyPath}`, {
        method: "POST",
        headers,
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

  return { submit, loading, proxyConfigured: Boolean(proxyUrl), proxyUrl };
}

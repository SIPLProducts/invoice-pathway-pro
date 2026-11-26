import { useState } from "react";
import type { SapApi } from "@/lib/sapApisStore";
import { fillSapPath, getSapTargetHeaders } from "@/lib/sapTarget";
import { resolveProxyUrl, resolveProxySecret } from "./useSapProxy";
import { ensureSapConnectionLoaded } from "@/lib/sapConnection";
import { logTag } from "@/lib/sapCallLog";

export interface GrnPostResult { ok: boolean; data?: Record<string, unknown>; error?: string }

/** POSTs postGoodsReceipt for one Gate ID through the middleware OData route. */
export function useSapGrnPost(api: SapApi | null | undefined) {
  const [loading, setLoading] = useState(false);
  const post = async (gateId: string, body: Record<string, unknown>): Promise<GrnPostResult> => {
    if (!api) return { ok: false, error: 'No "Post Mat Doc Against DMR" API in SAP API Settings.' };
    await ensureSapConnectionLoaded();
    const proxyUrl = resolveProxyUrl(api);
    if (!proxyUrl) return { ok: false, error: "Middleware URL not set in SAP API Settings." };
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "ngrok-skip-browser-warning": "true",
      ...getSapTargetHeaders(api),
      "x-sap-path": fillSapPath(api.endpoint ?? "", { gate_id: gateId }),
      ...logTag(api.name, "write"),
    };
    const secret = resolveProxySecret(api);
    if (secret) headers["x-proxy-secret"] = secret;
    setLoading(true);
    try {
      const res = await fetch(`${proxyUrl}/api/odata`, { method: "POST", headers, body: JSON.stringify(body) });
      const text = await res.text();
      let data: unknown = null;
      try { data = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }
      if (!res.ok) {
        const e = (data as { error?: { message?: string; details?: { message?: string }[] } } | null)?.error;
        return { ok: false, error: e?.details?.[0]?.message || e?.message || `SAP returned ${res.status}` };
      }
      const v = (data as { value?: unknown[] } | null)?.value;
      return { ok: true, data: ((Array.isArray(v) ? v[0] : data) ?? {}) as Record<string, unknown> };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    } finally {
      setLoading(false);
    }
  };
  return { post, loading };
}

import { useCallback, useMemo, useRef, useState } from "react";
import { getPath } from "@/lib/getPath";
import { resolveProxyUrl, resolveProxySecret } from "@/hooks/useSapProxy";
import { useSapApis, type SapApi } from "@/lib/sapApisStore";
import {
  getSapSessionHeaders,
  markSapSessionActive,
  markSapSessionExpired,
} from "@/lib/sapSession";
import { getSapTargetHeaders, fillSapPath } from "@/lib/sapTarget";

export type ObdLine = Record<string, string | number | boolean | null>;

export interface UseSapObdLookupResult {
  api: SapApi | undefined;
  lines: ObdLine[];
  loading: boolean;
  error: string | null;
  notFound: boolean;
  lookup: (obdNumber: string) => Promise<void>;
  reset: () => void;
}

/** Finds the configured "Get OBD Details" API. */
export function useObdDetailsApi(): SapApi | undefined {
  const apis = useSapApis();
  return useMemo(() => {
    const exact = apis.find((a) => /get[_ ]?obd[_ ]?details/i.test(a.name));
    if (exact) return exact;
    return apis.find((a) => /\bobd\b|outbound[_ ]?delivery/i.test(a.name));
  }, [apis]);
}

export function useSapObdLookup(): UseSapObdLookupResult {
  const api = useObdDetailsApi();
  const [lines, setLines] = useState<ObdLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const reqId = useRef(0);

  const reset = useCallback(() => {
    reqId.current += 1;
    setLines([]);
    setError(null);
    setNotFound(false);
    setLoading(false);
  }, []);

  const lookup = useCallback(
    async (obdNumber: string) => {
      const obd = obdNumber.trim();
      const id = ++reqId.current;
      setLines([]);
      setNotFound(false);
      setError(null);

      if (!obd) {
        setError("Enter an OBD number first.");
        return;
      }
      if (!api) {
        setError('No "Get OBD Details" API configured. Open SAP Settings to add it.');
        return;
      }
      const proxyUrl = resolveProxyUrl(api);
      if (!proxyUrl) {
        setError("Middleware URL not set — open SAP Settings → Get OBD Details.");
        return;
      }

      // Prefer the SAP endpoint configured in SAP API Settings (sent as-is to the
      // middleware's generic OData route). Fall back to a custom proxy path.
      const sapEndpoint = (api.endpoint ?? "").trim();
      const useOdata = sapEndpoint.startsWith("/sap/");
      const template = api.proxyPath || api.listEndpoint || "";
      const path = useOdata
        ? "/api/odata"
        : template.includes("{obd_number}")
          ? template.replace("{obd_number}", encodeURIComponent(obd))
          : `${template.replace(/\/$/, "")}/${encodeURIComponent(obd)}`;

      setLoading(true);
      try {
        const headers: Record<string, string> = {
          Accept: "application/json",
          "ngrok-skip-browser-warning": "true",
          ...getSapSessionHeaders(),
          ...getSapTargetHeaders(api),
        };
        if (useOdata) headers["x-sap-path"] = fillSapPath(sapEndpoint, { obd_number: obd });
        { const s = resolveProxySecret(api); if (s) headers["x-proxy-secret"] = s; }

        const res = await fetch(`${proxyUrl}${path}`, { headers });
        const text = await res.text();
        const ct = res.headers.get("content-type") ?? "";
        if (ct.includes("text/html") || /^\s*<(!doctype|html)/i.test(text)) {
          throw new Error(
            "Middleware returned HTML (likely ngrok warning page or wrong URL). Open the middleware URL once in a new tab, or check the URL.",
          );
        }
        let data: unknown = null;
        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          throw new Error(`Non-JSON response from middleware (${res.status}).`);
        }

        const errObj = data as { error?: { message?: string; code?: string } } | null;
        if (res.status === 404) {
          // A middleware-generated 404 (missing route) carries an error envelope
          // with code "not_found" — show the real message instead of "OBD Number
          // not found". A SAP-side 404 (code "sap_error" / no envelope) means the
          // OBD really does not exist.
          if (errObj?.error?.code === "not_found") {
            throw new Error(
              `${errObj.error.message} — the middleware has no route for this request. Copy the latest middleware/src files and restart node server.js.`,
            );
          }
          if (id === reqId.current) setNotFound(true);
          return;
        }
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) markSapSessionExpired();
          if (errObj?.error?.code === "sap_auth_redirect") markSapSessionExpired();
          throw new Error(errObj?.error?.message || `HTTP ${res.status}`);
        }

        markSapSessionActive();
        const rowsPath = api.rowsPath;
        const raw = rowsPath ? getPath(data, rowsPath) : data;
        const collection = Array.isArray(raw) ? raw : raw ? [raw] : [];
        if (id !== reqId.current) return;
        if (collection.length === 0) setNotFound(true);
        else setLines(collection as ObdLine[]);
      } catch (e) {
        if (id === reqId.current) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    },
    [api],
  );

  return { api, lines, loading, error, notFound, lookup, reset };
}

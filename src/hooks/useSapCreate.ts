import { useState } from "react";
import type { SapApi, FieldDef } from "@/lib/sapApisStore";
import { resolveProxyUrl } from "./useSapProxy";
import { getSapSessionHeaders } from "@/lib/sapSession";

export interface CreateResult {
  ok: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

export interface SanitizeOptions {
  headerFields?: FieldDef[];
  itemFields?: FieldDef[];
  childKey?: string;
}

/**
 * Drop empty/null/undefined values and normalize date/time/number values
 * so SAP OData v4 doesn't fail with CX_SXML_PARSE_ERROR.
 */
function sanitizeRow(row: Record<string, unknown>, fields: FieldDef[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const typeMap = new Map(fields.map((f) => [f.key, f.type]));
  for (const [k, v] of Object.entries(row)) {
    if (v === "" || v === null || v === undefined) continue;
    const t = typeMap.get(k);
    if (t === "number") {
      const n = typeof v === "number" ? v : Number(v);
      if (Number.isNaN(n)) continue;
      out[k] = n;
    } else if (t === "time" && typeof v === "string") {
      // HTML <input type="time"> gives "HH:MM" — pad to "HH:MM:SS"
      out[k] = v.length === 5 ? `${v}:00` : v;
    } else if (t === "date" && typeof v === "string") {
      out[k] = v; // already YYYY-MM-DD from HTML date input
    } else if (t === "boolean") {
      out[k] = Boolean(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function sanitizeForSap(
  body: Record<string, unknown>,
  opts: SanitizeOptions,
): Record<string, unknown> {
  const headerFields = opts.headerFields ?? [];
  const itemFields = opts.itemFields ?? [];
  const childKey = opts.childKey ?? "_Item";

  const { [childKey]: rawItems, ...header } = body;
  const sanitizedHeader = sanitizeRow(header, headerFields);

  if (Array.isArray(rawItems) && itemFields.length) {
    const sanitizedItems = (rawItems as Record<string, unknown>[])
      .map((r) => sanitizeRow(r, itemFields))
      .filter((r) => Object.keys(r).length > 0);
    if (sanitizedItems.length) sanitizedHeader[childKey] = sanitizedItems;
  }

  return sanitizedHeader;
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

  const submit = async (
    body: Record<string, unknown>,
    sanitize?: SanitizeOptions,
  ): Promise<CreateResult> => {
    if (!proxyUrl) {
      return {
        ok: false,
        error:
          "Middleware URL not set. Open SAP Settings → API Details and set the Node.js Middleware URL (or define VITE_SAP_PROXY_URL).",
      };
    }
    setLoading(true);
    try {
      const payload = sanitize ? sanitizeForSap(body, sanitize) : body;
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
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (!res.ok) {
        // Surface SAP CX_SXML_PARSE_ERROR field details when present
        const sapErr = data?.sapBody?.error ?? data?.error;
        const detailMsg = Array.isArray(sapErr?.details) && sapErr.details[0]?.message;
        return {
          ok: false,
          error:
            detailMsg ||
            sapErr?.message ||
            data?.error?.message ||
            data?.error?.code ||
            `HTTP ${res.status}`,
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

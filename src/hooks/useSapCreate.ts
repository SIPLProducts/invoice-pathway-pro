import { useState } from "react";
import type { SapApi, FieldDef } from "@/lib/sapApisStore";
import { resolveProxyUrl } from "./useSapProxy";
import { getSapSessionHeaders } from "@/lib/sapSession";

export interface CreateResult {
  ok: boolean;
  data?: Record<string, unknown>;
  error?: string;
  sapBody?: unknown;
}

export interface SubmitOptions {
  headerFields?: FieldDef[];
  itemFields?: FieldDef[];
  childKey?: string;
}

/**
 * Strip empty / null / undefined keys and coerce values to types SAP OData v4 accepts.
 * SAP rejects empty strings on numeric/date/time properties with CX_SXML_PARSE_ERROR.
 */
function sanitizeRow(row: Record<string, unknown>, fields: FieldDef[]): Record<string, unknown> {
  const typeByKey = new Map(fields.map((f) => [f.key, f.type] as const));
  const out: Record<string, unknown> = {};
  for (const [k, raw] of Object.entries(row)) {
    if (raw === null || raw === undefined) continue;
    const t = typeByKey.get(k);
    if (typeof raw === "string") {
      const v = raw.trim();
      if (v === "") continue;
      if (t === "number") {
        const n = Number(v);
        if (Number.isNaN(n)) continue;
        out[k] = n;
        continue;
      }
      if (t === "time") {
        // pad HH:MM -> HH:MM:SS
        out[k] = /^\d{2}:\d{2}$/.test(v) ? `${v}:00` : v;
        continue;
      }
      out[k] = v;
      continue;
    }
    if (typeof raw === "number") {
      if (Number.isNaN(raw)) continue;
      out[k] = raw;
      continue;
    }
    out[k] = raw;
  }
  return out;
}

function sanitizeForSap(
  body: Record<string, unknown>,
  headerFields: FieldDef[] = [],
  itemFields: FieldDef[] = [],
  childKey = "_Item",
): Record<string, unknown> {
  const { [childKey]: items, ...header } = body as Record<string, unknown>;
  const cleanHeader = sanitizeRow(header, headerFields);
  if (Array.isArray(items) && items.length) {
    cleanHeader[childKey] = items.map((row) =>
      sanitizeRow(row as Record<string, unknown>, itemFields),
    );
  }
  return cleanHeader;
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
    options: SubmitOptions = {},
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
      const childKey = options.childKey ?? api?.childKey ?? "_Item";
      const payload = sanitizeForSap(
        body,
        options.headerFields ?? api?.requestHeaderFields ?? [],
        options.itemFields ?? api?.requestItemFields ?? [],
        childKey,
      );

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
        const sapErr = data?.error;
        // Surface specific field-level message from SAP details when present
        // (e.g. CX_SXML_PARSE_ERROR -> "Property X not allowed")
        const detail =
          Array.isArray(sapErr?.details) && sapErr.details[0]?.message
            ? sapErr.details[0].message
            : null;
        return {
          ok: false,
          error:
            detail || sapErr?.message || sapErr?.code || `HTTP ${res.status}`,
          sapBody: data,
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

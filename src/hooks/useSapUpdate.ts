import { useState } from "react";
import type { SapApi, FieldDef } from "@/lib/sapApisStore";
import { resolveProxyUrl } from "./useSapProxy";
import {
  getSapSessionHeaders,
  markSapSessionActive,
  markSapSessionExpired,
} from "@/lib/sapSession";

export interface UpdateResult {
  ok: boolean;
  data?: Record<string, unknown>;
  error?: string;
  sapBody?: unknown;
}

export interface UpdateSubmitOptions {
  headerFields?: FieldDef[];
}

function sanitizeRow(
  body: Record<string, unknown>,
  fields: FieldDef[],
  liveRow: Record<string, unknown> = {},
): Record<string, unknown> {
  const typeByKey = new Map(fields.map((f) => [f.key, f.type] as const));
  const allowed = fields.length > 0 ? new Set(fields.map((f) => f.key)) : null;
  const out: Record<string, unknown> = {};
  for (const [k, raw] of Object.entries(body)) {
    if (allowed && !allowed.has(k)) continue;
    if (raw === null || raw === undefined) continue;
    if (k.startsWith("@") || k === "SAP__Messages") continue;

    // Effective type: trust the live SAP row's actual type first (source of truth),
    // then fall back to the configured field type.
    const liveVal = liveRow[k];
    let effectiveType: FieldDef["type"] | undefined = typeByKey.get(k);
    if (typeof liveVal === "number") effectiveType = "number";
    else if (typeof liveVal === "boolean") effectiveType = "boolean";

    if (typeof raw === "string") {
      const v = raw.trim();
      if (v === "") continue;
      if (effectiveType === "number") {
        const n = Number(v);
        if (Number.isNaN(n)) continue;
        out[k] = n;
        continue;
      }
      if (effectiveType === "boolean") {
        out[k] = v === "true" || v === "1";
        continue;
      }
      if (effectiveType === "time") {
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

function pickSapDetailMessage(sapErr: unknown): string | null {
  if (!sapErr || typeof sapErr !== "object") return null;
  const details = (sapErr as { details?: unknown }).details;
  if (!Array.isArray(details) || details.length === 0) return null;
  // Prefer the most actionable detail: anything mentioning a Property name,
  // or a code containing PROPERTY/BAD_REQUEST.
  const scored = details
    .map((d) => {
      if (!d || typeof d !== "object") return null;
      const message = typeof (d as { message?: unknown }).message === "string"
        ? ((d as { message: string }).message)
        : "";
      const code = typeof (d as { code?: unknown }).code === "string"
        ? ((d as { code: string }).code)
        : "";
      let score = 0;
      if (/Property\s+'/i.test(message)) score += 10;
      if (/invalid value/i.test(message)) score += 5;
      if (/PROPERTY/i.test(code)) score += 4;
      if (/BAD_REQUEST/i.test(code)) score += 2;
      return { message, score };
    })
    .filter((x): x is { message: string; score: number } => !!x && !!x.message);
  if (scored.length === 0) return null;
  scored.sort((a, b) => b.score - a.score);
  return scored[0].message;
}

/**
 * Resolve `{placeholder}` tokens in a path template using values from `row`.
 * Returns null + the missing key if a token can't be filled.
 */
export function resolveUrlTemplate(
  template: string,
  row: Record<string, unknown>,
): { url: string | null; missing?: string } {
  const tokens = Array.from(template.matchAll(/\{([a-zA-Z0-9_]+)\}/g));
  let url = template;
  for (const t of tokens) {
    const key = t[1];
    const v = row[key];
    if (v === undefined || v === null || v === "") {
      return { url: null, missing: key };
    }
    url = url.replace(t[0], encodeURIComponent(String(v)));
  }
  return { url };
}

/**
 * PATCHes a payload to the configured `updateEndpoint` template,
 * substituting `{placeholders}` from the supplied row.
 */
export function useSapUpdate(api: SapApi | null | undefined) {
  const [loading, setLoading] = useState(false);
  const proxyUrl = resolveProxyUrl(api);
  const method = api?.updateMethod ?? "PATCH";
  const template = api?.updateEndpoint ?? "";
  const secret = api?.middleware?.secret ?? "";

  const submit = async (
    row: Record<string, unknown>,
    body: Record<string, unknown>,
    options: UpdateSubmitOptions = {},
  ): Promise<UpdateResult> => {
    if (!proxyUrl) {
      return {
        ok: false,
        error:
          "Middleware URL not set. Open SAP Settings → API Details and set the Node.js Middleware URL.",
      };
    }
    if (!template) {
      return {
        ok: false,
        error:
          "Update Endpoint not configured. Open SAP Settings → API Details and set the Update Endpoint (e.g. /api/gate/headers/{gate_id}).",
      };
    }
    const { url: resolvedPath, missing } = resolveUrlTemplate(template, row);
    if (!resolvedPath) {
      return {
        ok: false,
        error: `Cannot build update URL — missing value for "{${missing}}" in the selected row.`,
      };
    }
    setLoading(true);
    try {
      const headerFields = options.headerFields ?? api?.requestHeaderFields ?? [];
      const payload = sanitizeRow(body, headerFields, row);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
        "ngrok-skip-browser-warning": "true",
        ...getSapSessionHeaders(),
      };
      if (secret) headers["x-proxy-secret"] = secret;

      const res = await fetch(`${proxyUrl}${resolvedPath}`, {
        method,
        headers,
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) markSapSessionExpired();
        const sapErr = data?.error;
        if (sapErr?.code === "sap_auth_redirect") markSapSessionExpired();
        const bestDetail = pickSapDetailMessage(sapErr);
        return {
          ok: false,
          error: bestDetail || sapErr?.message || sapErr?.code || `HTTP ${res.status}`,
          sapBody: data,
        };
      }
      markSapSessionActive();
      return { ok: true, data };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    } finally {
      setLoading(false);
    }
  };

  return {
    submit,
    loading,
    proxyConfigured: Boolean(proxyUrl),
    proxyUrl,
    updateConfigured: Boolean(template),
  };
}

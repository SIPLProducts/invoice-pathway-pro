import { useState } from "react";
import type { SapApi, FieldDef } from "@/lib/sapApisStore";
import { resolveProxyUrl } from "./useSapProxy";
import {
  getSapSessionHeaders,
  markSapSessionActive,
  markSapSessionExpired,
} from "@/lib/sapSession";

export interface ItemUpdateResult {
  ok: boolean;
  data?: Record<string, unknown>;
  error?: string;
  sapBody?: unknown;
}

function sanitizeItemRow(
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
    // Skip SAP server-managed audit fields when null/empty
    if (k === "last_changed_at" || k === "created_at") {
      if (raw === "" || raw === null) continue;
    }

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
 * Resolve template tokens like `{gate_id}` and `{item_no}` using values from
 * the parent header row first, then falling back to the child item row.
 */
function resolveItemUrl(
  template: string,
  parentRow: Record<string, unknown>,
  childRow: Record<string, unknown>,
): { url: string | null; missing?: string } {
  const tokens = Array.from(template.matchAll(/\{([a-zA-Z0-9_]+)\}/g));
  let url = template;
  for (const t of tokens) {
    const key = t[1];
    let v: unknown = childRow[key];
    if (v === undefined || v === null || v === "") v = parentRow[key];
    if (v === undefined || v === null || v === "") {
      return { url: null, missing: key };
    }
    url = url.replace(t[0], encodeURIComponent(String(v)));
  }
  return { url };
}

/**
 * PATCH a single line item via the configured `updateEndpoint` template.
 * The template typically looks like `/api/gate/items/{gate_id}/{item_no}`.
 */
export function useSapItemUpdate(api: SapApi | null | undefined) {
  const [loading, setLoading] = useState(false);
  const proxyUrl = resolveProxyUrl(api);
  const method = api?.updateMethod ?? "PATCH";
  const template = api?.updateEndpoint ?? "";
  const secret = api?.middleware?.secret ?? "";

  const submit = async (
    parentRow: Record<string, unknown>,
    childRow: Record<string, unknown>,
    body: Record<string, unknown>,
  ): Promise<ItemUpdateResult> => {
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
          "Update Endpoint not configured. Open SAP Settings → API Details and set the Update Endpoint (e.g. /api/gate/items/{gate_id}/{item_no}).",
      };
    }
    const { url: resolvedPath, missing } = resolveItemUrl(template, parentRow, childRow);
    if (!resolvedPath) {
      return {
        ok: false,
        error: `Cannot build update URL — missing value for "{${missing}}" in the selected item.`,
      };
    }
    setLoading(true);
    try {
      const itemFields = api?.requestItemFields ?? [];
      const payload = sanitizeItemRow(body, itemFields, childRow);

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
        const sapErr = (data as { error?: unknown })?.error;
        if ((sapErr as { code?: string })?.code === "sap_auth_redirect") {
          markSapSessionExpired();
        }
        const bestDetail = pickSapDetailMessage(sapErr);
        return {
          ok: false,
          error:
            bestDetail ||
            (sapErr as { message?: string })?.message ||
            (sapErr as { code?: string })?.code ||
            `HTTP ${res.status}`,
          sapBody: data,
        };
      }
      markSapSessionActive();
      return { ok: true, data: data as Record<string, unknown> };
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

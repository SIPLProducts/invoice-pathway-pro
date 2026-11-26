import { getPath, resolveKey } from "@/lib/getPath";
import type { FieldDef } from "@/lib/sapApisStore";

type Val = string | number | boolean;

/** Compare-friendly form: trims, treats "10:24" and "10:24:00" alike, numbers numerically. */
export function normalizeForCompare(v: string, type: FieldDef["type"]): string {
  const s = (v ?? "").trim();
  if (type === "time") return /^\d{2}:\d{2}$/.test(s) ? `${s}:00` : s;
  if (type === "number") {
    if (s === "") return "";
    const n = Number(s);
    return Number.isNaN(n) ? s : String(n);
  }
  return s;
}

function coerce(v: string, type: FieldDef["type"]): Val {
  if (type === "number") {
    const n = Number(v);
    return Number.isNaN(n) ? 0 : n;
  }
  if (type === "boolean") return v === "true" || v === "1";
  if (type === "time" && /^\d{2}:\d{2}$/.test(v)) return `${v}:00`;
  return v;
}

/**
 * Builds the PATCH body with ONLY the fields the user changed, using SAP's own
 * property names. Key fields (e.g. Gate ID) are never included — they go in the URL.
 */
export function buildChangedPayload(
  fields: FieldDef[],
  initial: Record<string, string>,
  values: Record<string, string>,
  row: Record<string, unknown>,
  opts: { keyFields?: string[]; typeOf?: (f: FieldDef) => FieldDef["type"] } = {},
): Record<string, Val> {
  const keys = new Set((opts.keyFields ?? []).map((k) => k.replace(/_/g, "").toLowerCase()));
  const body: Record<string, Val> = {};
  for (const f of fields) {
    if (keys.has(f.key.replace(/_/g, "").toLowerCase())) continue;
    const t = opts.typeOf ? opts.typeOf(f) : f.type;
    const before = initial[f.key] ?? "";
    const after = values[f.key] ?? "";
    if (normalizeForCompare(before, t) === normalizeForCompare(after, t)) continue;
    body[resolveKey(row, f.key)] = coerce(after, t);
  }
  return body;
}

export { getPath };

import {
  DEFAULT_GATE_RESPONSE_HEADER,
  DEFAULT_GATE_RESPONSE_ITEM,
  type FieldDef,
  type SapApi,
} from "@/lib/sapApisStore";

export type ColumnFormat = "text" | "date" | "time" | "number";

export interface ColumnDef {
  header: string;
  path: string;
  format?: ColumnFormat;
  align?: "left" | "right";
  width?: string;
}

export interface SapApiSchema {
  id: string;
  label: string;
  proxyPath: string;
  rowsPath: string;
  rowKey: string;
  columns: ColumnDef[];
  childKey?: string;
  childColumns?: ColumnDef[];
}

function fieldToColumn(f: FieldDef): ColumnDef {
  const fmt: ColumnFormat =
    f.type === "date" ? "date" : f.type === "time" ? "time" : f.type === "number" ? "number" : "text";
  return {
    header: f.label || f.key,
    path: f.key,
    format: fmt,
    align: f.align,
    width: f.width,
  };
}

/**
 * Build a SapApiSchema for SapLiveTable from a configured SapApi record.
 * For gate-shaped APIs (Get_DMR, Create_Gate_Service…)
 * fall back to standard gate fields so the table renders even when the
 * user hasn't configured response fields yet.
 */
export function buildSchemaFromApi(api: SapApi): SapApiSchema {
  const proxyPath = api.proxyPath ?? api.listEndpoint ?? "/api/gate/headers";
  const isGateShaped =
    proxyPath.startsWith("/api/gate") || /gate|dmr/i.test(api.name);

  const headerSource =
    (api.responseHeaderFields ?? []).length > 0
      ? api.responseHeaderFields ?? []
      : isGateShaped
        ? DEFAULT_GATE_RESPONSE_HEADER
        : [];
  const itemSource =
    (api.responseItemFields ?? []).length > 0
      ? api.responseItemFields ?? []
      : isGateShaped
        ? DEFAULT_GATE_RESPONSE_ITEM
        : [];

  const headerCols = headerSource
    .filter((f) => f.showInTable !== false && f.key)
    .map(fieldToColumn);
  const itemCols = itemSource
    .filter((f) => f.showInTable !== false && f.key)
    .map(fieldToColumn);

  return {
    id: api.name,
    label: api.name,
    proxyPath,
    rowsPath: api.rowsPath ?? "value",
    rowKey: api.rowKey ?? (isGateShaped ? "gate_id" : headerCols[0]?.path ?? "id"),
    columns: headerCols,
    childKey: api.childKey ?? (isGateShaped ? "_Item" : undefined),
    childColumns: itemCols.length ? itemCols : undefined,
  };
}

/** "GateId" / "gate_id" → "Gate Id" */
export function humanizeKey(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const isScalar = (v: unknown) =>
  v === null || ["string", "number", "boolean"].includes(typeof v);

/**
 * Configured columns first, then every other scalar field found in the
 * returned rows (skipping @odata / __metadata / nested navigation objects).
 */
export function mergeColumnsWithData(
  configured: ColumnDef[],
  rows: Record<string, unknown>[],
  hiddenKeys: string[] = [],
): ColumnDef[] {
  const norm = (k: string) => k.toLowerCase().replace(/_/g, "");
  const seen = new Set(hiddenKeys.map(norm));
  const kept: ColumnDef[] = [];
  for (const c of configured) {
    const n = norm(c.path);
    if (seen.has(n)) continue;
    seen.add(n);
    kept.push(c);
  }
  const extra: ColumnDef[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    for (const [k, v] of Object.entries(row)) {
      if (k.startsWith("@") || k.startsWith("__") || k.includes("@odata")) continue;
      if (!isScalar(v)) continue;
      const lk = norm(k);
      if (seen.has(lk)) continue;
      seen.add(lk);
      extra.push({
        header: humanizeKey(k),
        path: k,
        format: typeof v === "number" ? "number" : "text",
        align: typeof v === "number" ? "right" : undefined,
      });
    }
  }
  return [...kept, ...extra];
}

/** Sort SAP rows newest first: Gate Date + Gate Time desc, fallback Gate ID desc. */
export function sortNewestFirst<T>(rows: T[]): T[] {
  const pick = (r: unknown, name: string): string => {
    if (!r || typeof r !== "object") return "";
    const k = Object.keys(r).find((x) => x.toLowerCase().replace(/_/g, "") === name);
    const v = k ? (r as Record<string, unknown>)[k] : undefined;
    return v == null ? "" : String(v);
  };
  return [...rows].sort((a, b) => {
    const ka = pick(a, "gatedate") + "T" + pick(a, "gatetime");
    const kb = pick(b, "gatedate") + "T" + pick(b, "gatetime");
    if (ka !== kb) return ka < kb ? 1 : -1;
    const ga = pick(a, "gateid"), gb = pick(b, "gateid");
    const na = Number(ga), nb = Number(gb);
    if (!Number.isNaN(na) && !Number.isNaN(nb) && ga && gb) return nb - na;
    return gb.localeCompare(ga);
  });
}

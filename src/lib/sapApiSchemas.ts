import type { FieldDef, SapApi } from "@/lib/sapApisStore";

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
 * Falls back to safe defaults if the API has no schema yet.
 */
export function buildSchemaFromApi(api: SapApi): SapApiSchema {
  const headerCols = (api.responseHeaderFields ?? [])
    .filter((f) => f.showInTable !== false && f.key)
    .map(fieldToColumn);
  const itemCols = (api.responseItemFields ?? [])
    .filter((f) => f.showInTable !== false && f.key)
    .map(fieldToColumn);

  // Detect "gate-shaped" APIs (Get_DMR, Create_Gate_Service, ZUI_Gate_Service, etc.)
  // and apply sensible defaults so user-created APIs render correctly without
  // forcing them to fill in obscure fields like rowsPath / rowKey / childKey.
  const proxyPath = api.proxyPath ?? api.listEndpoint ?? "/api/gate/headers";
  const isGateShaped =
    proxyPath.startsWith("/api/gate") || /gate|dmr/i.test(api.name);

  return {
    id: api.name,
    label: api.name,
    proxyPath,
    rowsPath: api.rowsPath ?? (isGateShaped ? "value" : "value"),
    rowKey: api.rowKey ?? (isGateShaped ? "gate_id" : headerCols[0]?.path ?? "id"),
    columns: headerCols,
    childKey: api.childKey ?? (isGateShaped ? "_Item" : undefined),
    childColumns: itemCols.length ? itemCols : undefined,
  };
}

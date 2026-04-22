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
 * For gate-shaped APIs (Get_DMR, Create_Gate_Service, ZUI_Gate_Service…)
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

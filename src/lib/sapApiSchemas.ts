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
  /** Path on the proxy server, e.g. "/api/gate/headers". */
  proxyPath: string;
  /** Where the row collection lives in the OData response. "" = root. */
  rowsPath: string;
  /** Unique-row key field (used as React key). */
  rowKey: string;
  columns: ColumnDef[];
  /** Optional child collection key on each row, e.g. "_Item". */
  childKey?: string;
  childColumns?: ColumnDef[];
}

export const GATE_HEADER_SCHEMA: SapApiSchema = {
  id: "zui_gate_service",
  label: "SAP Gate Entries",
  proxyPath: "/api/gate/headers",
  rowsPath: "value",
  rowKey: "gate_id",
  columns: [
    { header: "Gate ID", path: "gate_id" },
    { header: "Plant", path: "plant" },
    { header: "Date", path: "gate_date", format: "date" },
    { header: "Time", path: "gate_time", format: "time" },
    { header: "Vendor", path: "vendor" },
    { header: "Vendor Name", path: "vendor_name" },
    { header: "Vehicle", path: "vehicle_no" },
    { header: "Vehicle Type", path: "vehicle_type" },
    { header: "Driver", path: "driver_name" },
    { header: "Mobile", path: "driver_mobile" },
    { header: "Transport", path: "transport_type" },
    { header: "Purpose", path: "purpose" },
    { header: "Doc Type", path: "document_type" },
    { header: "Reference", path: "reference_doc" },
    { header: "Gross Wt", path: "gross_weight", format: "number", align: "right" },
    { header: "Tare Wt", path: "tare_weight", format: "number", align: "right" },
    { header: "Net Wt", path: "net_weight", format: "number", align: "right" },
    { header: "Entry", path: "entry_type" },
    { header: "Status", path: "gate_status" },
    { header: "Remarks", path: "remarks" },
  ],
  childKey: "_Item",
  childColumns: [
    { header: "Item", path: "item_no" },
    { header: "Material", path: "material" },
    { header: "Description", path: "material_desc" },
    { header: "Qty", path: "quantity", format: "number", align: "right" },
    { header: "Unit", path: "unit" },
    { header: "Batch", path: "batch" },
    { header: "Storage Loc", path: "storage_location" },
    { header: "PO", path: "po_number" },
    { header: "PO Item", path: "po_item" },
    { header: "Weight", path: "weight", format: "number", align: "right" },
    { header: "Remarks", path: "remarks" },
  ],
};

export const SAP_SCHEMAS: Record<string, SapApiSchema> = {
  [GATE_HEADER_SCHEMA.id]: GATE_HEADER_SCHEMA,
};

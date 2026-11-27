/** Builds the postGoodsReceiptByPo body. SAP requires every parameter, so blanks are sent as "". */
export function buildGrnPostPayload(
  postingDate: string,
  rows: { item?: unknown; sloc?: unknown; storageLocation?: unknown; serial?: unknown; poItem?: unknown; purchaseOrder?: unknown }[],
  po: { poNumber?: string; poItem?: string } = {},
): Record<string, string> {
  const s = (v: unknown) => (typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim());
  const sloc = rows.map((r) => s(r.sloc) || s(r.storageLocation)).find(Boolean) ?? "";
  const serials = rows.filter((r) => s(r.item) && s(r.serial)).map((r) => `${s(r.item)}:${s(r.serial)}`);
  return {
    PoNumber: s(po.poNumber) || (rows.map((r) => s(r.purchaseOrder)).find(Boolean) ?? ""),
    PoItem: s(po.poItem) || (rows.map((r) => s(r.poItem)).find(Boolean) ?? ""),
    PostingDate: s(postingDate).slice(0, 10),
    StorageLocations: sloc,
    Serials: serials.join(","),
  };
}

/** Labels of required PO fields that are empty in a built payload. */
export function missingPoFields(body: Record<string, string>): string[] {
  return [body.PoNumber ? "" : "PO Number", body.PoItem ? "" : "PO Item"].filter(Boolean);
}

/** Indexes of lines that have an item number but no serial number. */
export function missingSerialRows(rows: { item?: unknown; serial?: unknown }[]): number[] {
  const s = (v: unknown) => (v == null ? "" : String(v).trim());
  return rows.map((r, i) => (s(r.item) && !s(r.serial) ? i : -1)).filter((i) => i >= 0);
}

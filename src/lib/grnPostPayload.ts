/** Builds the postGoodsReceipt body. SAP requires all three parameters, so blanks are sent as "". */
export function buildGrnPostPayload(
  postingDate: string,
  rows: { item?: unknown; sloc?: unknown; storageLocation?: unknown; serial?: unknown }[],
): Record<string, string> {
  const s = (v: unknown) => (typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim());
  const sloc = rows.map((r) => s(r.sloc) || s(r.storageLocation)).find(Boolean) ?? "";
  const serials = rows.filter((r) => s(r.item) && s(r.serial)).map((r) => `${s(r.item)}:${s(r.serial)}`);
  return { PostingDate: s(postingDate).slice(0, 10), StorageLocations: sloc, Serials: serials.join(",") };
}

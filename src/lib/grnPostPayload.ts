/** Builds the postGoodsReceipt body. Empty values are left out. */
export function buildGrnPostPayload(
  postingDate: string,
  rows: { item?: unknown; sloc?: unknown; storageLocation?: unknown; serial?: unknown }[],
): Record<string, string> {
  const s = (v: unknown) => (typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim());
  const out: Record<string, string> = {};
  const d = s(postingDate).slice(0, 10);
  if (d) out.PostingDate = d;
  const sloc = rows.map((r) => s(r.sloc) || s(r.storageLocation)).find(Boolean);
  if (sloc) out.StorageLocations = sloc;
  const serials = rows.filter((r) => s(r.item) && s(r.serial)).map((r) => `${s(r.item)}:${s(r.serial)}`);
  if (serials.length) out.Serials = serials.join(",");
  return out;
}

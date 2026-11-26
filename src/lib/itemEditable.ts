/** Line item fields users may change on a DMR (normalized: no underscores, lowercase). Everything else is read-only. */
export const EDITABLE_ITEM_FIELDS = new Set([
  "materialdesc", "quantity", "batch", "storagelocation", "invoiceno", "weight", "remarks",
]);
export const isEditableItemField = (p: string) => EDITABLE_ITEM_FIELDS.has(p.replace(/_/g, "").toLowerCase());

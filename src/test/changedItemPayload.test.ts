import { describe, it, expect } from "vitest";
import { buildChangedItemPayload } from "@/components/EditableItemsTable";

const row = { GateId: "2007260011", ItemNo: "10", Remarks: "old", MaterialDesc: "PUMP", Quantity: 1, LastChangedAt: "x" };
const cols = ["gate_id", "item_no", "remarks", "material_desc", "quantity", "last_changed_at"].map((p) => ({ header: p, path: p }));
const initial = { gate_id: "2007260011", item_no: "10", remarks: "old", material_desc: "PUMP", quantity: "1", last_changed_at: "x" };

describe("item update payload", () => {
  it("sends only changed fields under SAP names, never keys", () => {
    const body = buildChangedItemPayload(cols, initial, { ...initial, remarks: "TS 21 7903", material_desc: "1.5 HP PUMP", gate_id: "9", last_changed_at: "y" }, row);
    expect(body).toEqual({ Remarks: "TS 21 7903", MaterialDesc: "1.5 HP PUMP" });
  });
  it("sends nothing when unchanged", () => {
    expect(buildChangedItemPayload(cols, initial, { ...initial, quantity: "1.0" }, row)).toEqual({});
  });
});

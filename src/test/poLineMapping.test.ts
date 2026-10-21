import { describe, it, expect } from "vitest";
import { mapPoLine } from "@/pages/DMRNew";

const line = {
  GrQuantity: 0, Material: "452", MaterialDesc: "TRANSPORT", OpenQuantity: 20,
  Plant: "2012", PoItem: "10", PoNumber: "400000001", PoQuantity: 20,
  StorageLocation: "", Unit: "EA", vendor: "4000200", vendor_name: "R.L.B",
};

describe("mapPoLine", () => {
  it("maps SAP PO line into item fields with OpenQuantity -> OpenQty", () => {
    const r = mapPoLine(line, [
      { key: "Material", type: "string" }, { key: "OpenQty", type: "number" },
      { key: "PoItem", type: "string" }, { key: "Unit", type: "string" },
      { key: "Quantity", type: "number" },
    ] as never);
    expect(r).toEqual({ Material: "452", OpenQty: 20, PoItem: "10", Unit: "EA", Quantity: 20 });
  });
});

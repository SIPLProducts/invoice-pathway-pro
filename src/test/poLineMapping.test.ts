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
    expect(r).toMatchObject({ Material: "452", OpenQty: 20, PoItem: "10", Unit: "EA", Quantity: 20 });
  });
});

describe("mapPoLine – DMR form columns", () => {
  it("fills Materials Code, Description, UOM, PO Quantity and GR Quantity from the SAP PO line", () => {
    const r = mapPoLine({ ...line, GrQuantity: 5 }, [
      { key: "materials_code", type: "string" }, { key: "materials_description", type: "string" },
      { key: "uom", type: "string" }, { key: "po_quantity", type: "number" },
      { key: "goods_receipt_quantity", type: "number" }, { key: "po_number", type: "string" },
    ] as never);
    expect(r).toMatchObject({
      materials_code: "452", materials_description: "TRANSPORT", uom: "EA",
      po_quantity: 20, goods_receipt_quantity: 5, po_number: "400000001",
    });
  });
});

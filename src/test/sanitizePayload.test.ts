import { describe, it, expect } from "vitest";
import { sanitizeRow } from "@/hooks/useSapUpdate";
import { sanitizeItemRow } from "@/hooks/useSapItemUpdate";

describe("update payload cleanup keeps SAP-named fields", () => {
  it("header", () => {
    const fields = [{ key: "vendor_name", type: "string" }, { key: "vehicle_no", type: "string" }] as never;
    expect(sanitizeRow({ VendorName: "ABC", VehicleNo: "TS 21" }, fields, { VendorName: "x", VehicleNo: "y" }))
      .toEqual({ VendorName: "ABC", VehicleNo: "TS 21" });
  });
  it("item", () => {
    const fields = [{ key: "remarks", type: "string" }, { key: "material_desc", type: "string" }, { key: "quantity", type: "string" }] as never;
    expect(sanitizeItemRow({ Remarks: "TS 21 7903", MaterialDesc: "PUMP", Quantity: "2" }, fields, { Quantity: 1 }))
      .toEqual({ Remarks: "TS 21 7903", MaterialDesc: "PUMP", Quantity: 2 });
  });
});

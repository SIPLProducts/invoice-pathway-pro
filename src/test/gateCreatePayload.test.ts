import { describe, it, expect } from "vitest";
import { buildGateCreatePayload } from "@/lib/gateCreatePayload";

describe("Create DMR body matches Postman", () => {
  it("maps screen fields to the SAP GateHeader deep-insert payload", () => {
    const header = {
      plant: "1000", gate_date: "2026-10-12", gate_time: "10:30", vendor: "1000000",
      vendor_name: "Goods Supplier", vehicle_no: "TS09AB1234", driver_name: "Test Driver", invoice_no: "",
    };
    const items = [{
      materials_code: "2", materials_description: "MIXER", open_quantity: 1, profit_center_plant: "1000",
      po_item: "10", po_number: "4500000000", goods_receipt_quantity: "100", storage_location: "", uom: "TO",
    }];
    expect(buildGateCreatePayload(header, items)).toEqual({
      Plant: "1000", GateDate: "2026-10-12", GateTime: "10:30:00", Vendor: "1000000",
      VendorName: "Goods Supplier", VehicleNo: "TS09AB1234", DriverName: "Test Driver", EntryType: "IN",
      _Item: [{
        Material: "2", MaterialDesc: "MIXER", OpenQty: 1, Plant: "1000", PoItem: "10",
        PoNumber: "4500000000", Quantity: 100, StorageLocation: "", Unit: "TO",
      }],
    });
  });
});

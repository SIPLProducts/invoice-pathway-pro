import { describe, expect, it } from "vitest";
import { getPath } from "@/lib/getPath";

describe("SAP field path matching", () => {
  const row = {
    GateId: "A123I00010",
    Plant: "1000",
    GateDate: "2026-10-12",
    GateTime: "10:30:00",
    Vendor: "1000000",
    VendorName: "Goods Supplier",
    VehicleNo: "TS09AB1234",
    DriverName: "Test Driver",
    _Item: [{ Material: "2", Quantity: 100, StorageLocation: "" }],
  };

  it.each([
    ["gate_id", "A123I00010"],
    ["plant", "1000"],
    ["gate_date", "2026-10-12"],
    ["gate_time", "10:30:00"],
    ["vendor", "1000000"],
    ["vendor_name", "Goods Supplier"],
    ["vehicle_no", "TS09AB1234"],
    ["driver_name", "Test Driver"],
  ])("reads configured %s from a PascalCase SAP response", (path, expected) => {
    expect(getPath(row, path)).toBe(expected);
  });

  it("preserves exact-key precedence and empty values", () => {
    const values = { plant: "", Plant: "1000", Quantity: 0, Active: false, Vendor: null };
    expect(getPath(values, "plant")).toBe("");
    expect(getPath(values, "quantity")).toBe(0);
    expect(getPath(values, "active")).toBe(false);
    expect(getPath(values, "vendor")).toBeNull();
  });

  it("supports nested navigation and numeric array indices", () => {
    expect(getPath(row, "_Item.0.material")).toBe("2");
    expect(getPath(row, "_item.0.quantity")).toBe(100);
    expect(getPath(row, "_Item.0.storage_location")).toBe("");
  });

  it("preserves snake_case responses and whole-object access", () => {
    expect(getPath({ gate_id: "legacy" }, "gate_id")).toBe("legacy");
    expect(getPath(row, "")).toBe(row);
    expect(getPath({ value: [row] }, "value.0.gate_id")).toBe("A123I00010");
  });

  it("returns undefined for missing, invalid or ambiguous paths", () => {
    expect(getPath(row, "missing")).toBeUndefined();
    expect(getPath(null, "plant")).toBeUndefined();
    expect(getPath(row, "_Item.9.material")).toBeUndefined();
    expect(getPath({ Plant: "1000", PLANT: "2000" }, "plant")).toBeUndefined();
    expect(getPath({}, "toString")).toBeUndefined();
  });
});
import { resolveKey } from "@/lib/getPath";
describe("resolveKey", () => {
  it("maps configured snake_case key to SAP PascalCase key", () => {
    expect(resolveKey({ VehicleNo: "TS10" }, "vehicle_no")).toBe("VehicleNo");
  });
  it("keeps exact key", () => {
    expect(resolveKey({ vehicle_no: "x", VehicleNo: "y" }, "vehicle_no")).toBe("vehicle_no");
  });
});

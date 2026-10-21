import { describe, it, expect } from "vitest";
import { findMissingRequired } from "@/pages/DMRNew";

const hf = [{ key: "VehicleNo", label: "Vehicle No", type: "string", required: true }] as never;
const itf = [
  { key: "PoItem", label: "PO Item", type: "string", required: true },
  { key: "OpenQty", label: "Open Qty", type: "number", required: true },
] as never;

describe("Create DMR required fields", () => {
  it("blocks submit when a line item PoItem is empty", () => {
    expect(findMissingRequired({ VehicleNo: "TS09" }, [{ PoItem: "", OpenQty: 100 }], hf, itf)).toBe(
      "Line 1: PO Item is required",
    );
  });
  it("blocks submit when a header field is empty", () => {
    expect(findMissingRequired({ VehicleNo: "" }, [], hf, itf)).toBe("Vehicle No is required");
  });
  it("allows 0 as a value and passes when all filled", () => {
    expect(findMissingRequired({ VehicleNo: "TS09" }, [{ PoItem: "10", OpenQty: 0 }], hf, itf)).toBeNull();
  });
});

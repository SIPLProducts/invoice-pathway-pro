import { describe, it, expect } from "vitest";
import { sanitizeRow } from "@/hooks/useSapCreate";

const itemFields = [
  { key: "Material", type: "string" },
  { key: "OpenQty", type: "number" },
  { key: "Quantity", type: "number" },
  { key: "StorageLocation", type: "string" },
] as never;

describe("Create DMR payload", () => {
  it("sends only configured fields, numbers as numbers, blank text as empty string", () => {
    const out = sanitizeRow(
      { Material: "2", OpenQty: "100", Quantity: "100", StorageLocation: "", extra: "x" },
      itemFields,
    );
    expect(out).toEqual({ Material: "2", OpenQty: 100, Quantity: 100, StorageLocation: "" });
  });
});

describe("Send to SAP switch", () => {
  it("does not send fields switched off, but sends PoItem", () => {
    const fields = [
      { key: "PoItem", type: "string" },
      { key: "remarks", type: "string", sendToSap: false },
    ] as never;
    expect(sanitizeRow({ PoItem: "10", remarks: "x" }, fields)).toEqual({ PoItem: "10" });
  });
});

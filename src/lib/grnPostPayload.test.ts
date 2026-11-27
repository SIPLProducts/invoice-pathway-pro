import { describe, it, expect } from "vitest";
import { buildGrnPostPayload, missingPoFields, missingSerialRows } from "./grnPostPayload";

describe("buildGrnPostPayload", () => {
  it("matches the postGoodsReceiptByPo Postman sample", () => {
    expect(buildGrnPostPayload("2026-11-26", [{ item: "10", sloc: "ST00", serial: "SN0000101" }], { poNumber: "410000777", poItem: "10" }))
      .toEqual({ PoNumber: "410000777", PoItem: "10", PostingDate: "2026-11-26", StorageLocations: "ST00", Serials: "10:SN0000101" });
  });
  it("falls back to the first line's PO and PO item", () => {
    const b = buildGrnPostPayload("2026-11-26", [{ item: "10", purchaseOrder: "410000777", poItem: "10" }]);
    expect([b.PoNumber, b.PoItem]).toEqual(["410000777", "10"]);
  });
  it("flags missing PO fields", () => {
    expect(missingPoFields(buildGrnPostPayload("2026-11-26", [{ item: "10" }]))).toEqual(["PO Number", "PO Item"]);
  });
});

describe("missingSerialRows", () => {
  it("flags lines without a serial", () => {
    expect(missingSerialRows([{ item: "10", serial: "SN1" }, { item: "20", serial: " " }])).toEqual([1]);
  });
});

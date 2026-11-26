import { describe, it, expect } from "vitest";
import { buildGrnPostPayload, missingSerialRows } from "./grnPostPayload";

describe("buildGrnPostPayload", () => {
  it("matches the Postman sample", () => {
    expect(buildGrnPostPayload("2026-11-01", [{ item: "10", sloc: "ST00", serial: "SN0000101" }]))
      .toEqual({ PostingDate: "2026-11-01", StorageLocations: "ST00", Serials: "10:SN0000101" });
  });
  it("always sends Serials and StorageLocations, empty when blank", () => {
    expect(buildGrnPostPayload("2026-11-01", [{ item: "10" }])).toEqual({ PostingDate: "2026-11-01", StorageLocations: "", Serials: "" });
  });
});

describe("missingSerialRows", () => {
  it("flags lines without a serial", () => {
    expect(missingSerialRows([{ item: "10", serial: "SN1" }, { item: "20", serial: " " }])).toEqual([1]);
  });
  it("builds exact Postman serial", () => {
    expect(buildGrnPostPayload("2026-11-01", [{ item: "10", sloc: "ST00", serial: "SN0000101" }]).Serials).toBe("10:SN0000101");
  });
});

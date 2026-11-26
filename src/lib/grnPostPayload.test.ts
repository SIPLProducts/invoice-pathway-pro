import { describe, it, expect } from "vitest";
import { buildGrnPostPayload } from "./grnPostPayload";

describe("buildGrnPostPayload", () => {
  it("matches the Postman sample", () => {
    expect(buildGrnPostPayload("2026-11-01", [{ item: "10", sloc: "ST00", serial: "SN0000101" }]))
      .toEqual({ PostingDate: "2026-11-01", StorageLocations: "ST00", Serials: "10:SN0000101" });
  });
  it("leaves out empty serials and storage location", () => {
    expect(buildGrnPostPayload("2026-11-01", [{ item: "10" }])).toEqual({ PostingDate: "2026-11-01" });
  });
});

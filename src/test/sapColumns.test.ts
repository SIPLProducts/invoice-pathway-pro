import { describe, it, expect } from "vitest";
import { mergeColumnsWithData, sortNewestFirst } from "@/lib/sapApiSchemas";

describe("All DMR columns and order", () => {
  it("does not duplicate configured columns for PascalCase SAP fields", () => {
    const cols = mergeColumnsWithData(
      [{ header: "Gate ID", path: "gate_id" }, { header: "Vehicle", path: "vehicle_no" }, { header: "Gate Id", path: "GateId" }],
      [{ GateId: "1", VehicleNo: "TS09", Extra: "x" }],
    );
    expect(cols.map((c) => c.path)).toEqual(["gate_id", "vehicle_no", "Extra"]);
  });
  it("sorts newest first", () => {
    const r = sortNewestFirst([
      { GateId: "1", GateDate: "2026-10-01", GateTime: "10:00:00" },
      { GateId: "3", GateDate: "2026-10-12", GateTime: "09:00:00" },
      { GateId: "2", GateDate: "2026-10-12", GateTime: "08:00:00" },
    ]);
    expect(r.map((x) => x.GateId)).toEqual(["3", "2", "1"]);
  });
});

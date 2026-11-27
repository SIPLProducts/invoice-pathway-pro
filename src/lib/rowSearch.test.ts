import { describe, it, expect } from "vitest";
import { filterRowsByQuery } from "./rowSearch";
const rows = [
  { GateId: "2007260031", PoNumber: "4500001234", _Item: [{ Material: "MAT-ABC" }] },
  { GateId: "2007260032", PoNumber: "4500009999", _Item: [{ Material: "OTHER" }] },
];
describe("filterRowsByQuery", () => {
  it("matches PO in header", () => expect(filterRowsByQuery(rows, "1234").map((r) => r.GateId)).toEqual(["2007260031"]));
  it("matches item material case-insensitively", () => expect(filterRowsByQuery(rows, "mat-abc", "_Item")).toHaveLength(1));
  it("empty query returns all", () => expect(filterRowsByQuery(rows, " ")).toHaveLength(2));
});

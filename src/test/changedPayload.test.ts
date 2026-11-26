import { describe, it, expect } from "vitest";
import { buildChangedPayload } from "@/lib/changedPayload";
import type { FieldDef } from "@/lib/sapApisStore";

const row = { GateId: "2008260012", Plant: "2008", GateTime: "10:24:00", VehicleNo: "TS09AB1234", DriverName: "Old" };
const fields: FieldDef[] = [
  { key: "gate_id", label: "Gate", type: "string" },
  { key: "plant", label: "Plant", type: "string" },
  { key: "gate_time", label: "Time", type: "time" },
  { key: "vehicle_no", label: "Vehicle", type: "string" },
  { key: "driver_name", label: "Driver", type: "string" },
] as FieldDef[];
const initial = { gate_id: "2008260012", plant: "2008", gate_time: "10:24", vehicle_no: "TS09AB1234", driver_name: "Old" };

describe("buildChangedPayload", () => {
  it("sends only changed fields with SAP names", () => {
    const body = buildChangedPayload(fields, initial,
      { ...initial, vehicle_no: "TS09AB1237", driver_name: "Test Driver 26-11-2026" }, row, { keyFields: ["gate_id"] });
    expect(body).toEqual({ VehicleNo: "TS09AB1237", DriverName: "Test Driver 26-11-2026" });
  });
  it("ignores 10:24 vs 10:24:00", () => {
    const body = buildChangedPayload(fields, initial, { ...initial, gate_time: "10:24:00" }, row, { keyFields: ["gate_id"] });
    expect(body).toEqual({});
  });
  it("never includes Gate ID", () => {
    const body = buildChangedPayload(fields, initial, { ...initial, gate_id: "999" }, row, { keyFields: ["gate_id"] });
    expect(body).toEqual({});
  });
  it("empty when nothing changed", () => {
    expect(buildChangedPayload(fields, initial, initial, row, { keyFields: ["gate_id"] })).toEqual({});
  });
});

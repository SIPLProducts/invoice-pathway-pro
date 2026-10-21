import { describe, it, expect, vi } from "vitest";

const SVC = "/sap/opu/odata4/sap/zsb_gate_entry_o4/srvd/sap/zsd_gate_entry/0001";
const apis = [
  { name: "Get DMR List", endpoint: `${SVC}/ZC_GateHeader?$expand=_Item` },
  { name: "Update Header Data", endpoint: `${SVC}/ZC_GateHeader(GateId='{gate_id}')` },
  { name: "Update Line", endpoint: `${SVC}/ZC_GateItem(GateId='{gate_id}',ItemNo='{item_no}')` },
];
vi.mock("@/lib/sapApisStore", () => ({ getSapApis: () => apis }));

import { getSapTargetHeaders, fillSapPath } from "@/lib/sapTarget";
import { pickRowValue } from "@/hooks/useSapUpdate";

describe("SAP target comes from SAP API Settings", () => {
  it("derives service, entities, keys and nav from the configured endpoints", () => {
    const h = getSapTargetHeaders(apis[0] as never);
    expect(h["x-sap-service-path"]).toBe(SVC);
    expect(h["x-sap-header-entity"]).toBe("ZC_GateHeader");
    expect(h["x-sap-item-entity"]).toBe("ZC_GateItem");
    expect(h["x-sap-header-keys"]).toBe("GateId");
    expect(h["x-sap-item-keys"]).toBe("GateId,ItemNo");
    expect(h["x-sap-item-nav"]).toBe("_Item");
  });

  it("fills the PO number into the configured PO endpoint", () => {
    const ep = `${SVC}/ZC_GateHeader/com.sap.gateway.srvd.zsd_gate_entry.v0001.getPoLines(PoNumber='{po_number}')`;
    expect(fillSapPath(ep, { po_number: "400000001" })).toContain("getPoLines(PoNumber='400000001')");
  });

  it("matches {gate_id} against SAP's GateId field", () => {
    expect(pickRowValue({ GateId: "A123I00010" }, "gate_id")).toBe("A123I00010");
  });
});

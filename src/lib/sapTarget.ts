import type { SapApi } from "@/lib/sapApisStore";

/**
 * Derive the SAP OData service path + entity set names from the endpoint
 * configured in SAP API Settings, e.g.
 *   /sap/opu/odata4/.../0001/ZC_GateHeader?$expand=_Item
 *   -> service "/sap/opu/odata4/.../0001", header "ZC_GateHeader", item "ZC_GateItem"
 * Sent to the middleware so it never relies on hardcoded entity names.
 */
export function parseSapTarget(endpoint?: string | null) {
  const raw = (endpoint ?? "").trim();
  if (!raw.startsWith("/sap/")) return null;
  const path = raw.split("?")[0].replace(/\/$/, "");
  const idx = path.lastIndexOf("/");
  if (idx <= 0) return null;
  const servicePath = path.slice(0, idx);
  const entity = path.slice(idx + 1).replace(/\(.*$/, "");
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(entity)) return { servicePath };
  const isItem = /Item/.test(entity) && !/Header/.test(entity);
  return isItem
    ? { servicePath, itemEntity: entity, headerEntity: entity.replace(/Item/, "Header") }
    : { servicePath, headerEntity: entity, itemEntity: entity.replace(/Header/, "Item") };
}

export function getSapTargetHeaders(api?: SapApi | null): Record<string, string> {
  const t = parseSapTarget(api?.endpoint);
  if (!t) return {};
  const h: Record<string, string> = { "x-sap-service-path": t.servicePath };
  if ("headerEntity" in t && t.headerEntity) h["x-sap-header-entity"] = t.headerEntity;
  if ("itemEntity" in t && t.itemEntity) h["x-sap-item-entity"] = t.itemEntity;
  return h;
}

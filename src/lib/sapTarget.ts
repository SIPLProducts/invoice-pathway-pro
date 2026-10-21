import { getSapApis, type SapApi } from "@/lib/sapApisStore";

/**
 * Everything the middleware needs to talk to a SAP OData service is derived
 * from the endpoints configured in SAP API Settings — nothing is hardcoded.
 *
 *   /sap/.../0001/ZC_GateHeader?$expand=_Item
 *     -> service "/sap/.../0001", header "ZC_GateHeader", item "ZC_GateItem", nav "_Item"
 *   /sap/.../0001/ZC_GateItem(GateId='{gate_id}',ItemNo='{item_no}')
 *     -> item keys "GateId,ItemNo"
 */
const NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

export interface SapTarget {
  servicePath: string;
  entity?: string;
  keys?: string[];
  nav?: string;
}

export function parseEndpoint(endpoint?: string | null): SapTarget | null {
  const raw = (endpoint ?? "").trim();
  if (!raw.startsWith("/sap/")) return null;
  const [pathPart, query = ""] = raw.split("?");
  const path = pathPart.replace(/\/$/, "");
  // Find the entity segment: the first segment after the service version (/0001)
  // or, failing that, the last segment.
  const segs = path.split("/");
  let idx = segs.findIndex((s, i) => i > 0 && /^\d{4}$/.test(segs[i - 1] ?? "") && s);
  if (idx < 0) idx = segs.length - 1;
  const servicePath = segs.slice(0, idx).join("/");
  const seg = segs[idx] ?? "";
  const m = seg.match(/^([A-Za-z_][A-Za-z0-9_]*)(?:\((.*)\))?$/);
  const out: SapTarget = { servicePath };
  if (m) {
    out.entity = m[1];
    if (m[2]) {
      const keys = Array.from(m[2].matchAll(/([A-Za-z_][A-Za-z0-9_]*)\s*=/g)).map((k) => k[1]);
      if (keys.length) out.keys = keys;
    }
  }
  const exp = decodeURIComponent(query).match(/\$expand=([A-Za-z_][A-Za-z0-9_]*)/);
  if (exp) out.nav = exp[1];
  return out;
}

const isItemName = (e?: string) => !!e && /Item/.test(e) && !/Header/.test(e);

/** Back-compat helper used by older callers. */
export function parseSapTarget(endpoint?: string | null) {
  const t = parseEndpoint(endpoint);
  if (!t) return null;
  if (!t.entity) return { servicePath: t.servicePath };
  return isItemName(t.entity)
    ? { servicePath: t.servicePath, itemEntity: t.entity, headerEntity: t.entity.replace(/Item/, "Header") }
    : { servicePath: t.servicePath, headerEntity: t.entity, itemEntity: t.entity.replace(/Header/, "Item") };
}

export function getSapTargetHeaders(api?: SapApi | null): Record<string, string> {
  const own = parseEndpoint(api?.endpoint);
  if (!own) return {};
  const h: Record<string, string> = { "x-sap-service-path": own.servicePath };

  // Combine what this API says with sibling APIs on the same service
  // (e.g. the list API knows the nav, the update APIs know the key names).
  let siblings: SapTarget[] = [];
  try {
    siblings = getSapApis()
      .map((a) => parseEndpoint(a.endpoint))
      .filter((t): t is SapTarget => !!t && t.servicePath === own.servicePath && !!t.entity);
  } catch {
    siblings = [];
  }
  const all = [own, ...siblings.filter((s) => s !== own)];

  const header = all.find((t) => t.entity && !isItemName(t.entity))?.entity;
  const item = all.find((t) => isItemName(t.entity))?.entity;
  const headerEntity = header ?? (item ? item.replace(/Item/, "Header") : undefined);
  const itemEntity = item ?? (header ? header.replace(/Header/, "Item") : undefined);
  if (headerEntity && NAME.test(headerEntity)) h["x-sap-header-entity"] = headerEntity;
  if (itemEntity && NAME.test(itemEntity)) h["x-sap-item-entity"] = itemEntity;

  const hk = all.find((t) => t.entity === headerEntity && t.keys?.length)?.keys;
  const ik = all.find((t) => t.entity === itemEntity && t.keys?.length)?.keys;
  if (hk) h["x-sap-header-keys"] = hk.join(",");
  if (ik) h["x-sap-item-keys"] = ik.join(",");
  const nav = all.find((t) => t.nav)?.nav ?? api?.childKey;
  if (nav && NAME.test(nav)) h["x-sap-item-nav"] = nav;
  return h;
}

/**
 * Fill `{token}` placeholders in a configured SAP endpoint. Values are
 * escaped for OData string literals and URL-encoded.
 */
export function fillSapPath(endpoint: string, values: Record<string, string>): string {
  return endpoint.replace(/\{([A-Za-z0-9_]+)\}/g, (_m, k: string) =>
    encodeURIComponent(String(values[k] ?? "").replace(/'/g, "''")),
  );
}

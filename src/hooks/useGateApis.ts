import { useSapApis } from "@/lib/sapApisStore";
import { pickSameService } from "@/lib/sapTarget";

/** Picks the Get DMR list API and its matching header/item update APIs (same SAP service). */
export function useGateApis() {
  const apis = useSapApis();
  // SAP Gate Entries tab shows any GET API that targets the gate service.
  const liveApis = apis.filter((a) => {
    if (a.method !== "GET") return false;
    if (a.status !== "Active") return false;
    const hay = `${a.name} ${a.endpoint} ${a.proxyPath ?? ""}`.toLowerCase();
    return /get[ _-]?dmr|dmr[ _-]?list|gate(header|service)/.test(hay);
  });
  const selectedApi =
    liveApis.find((a) => /get[ _-]?dmr[ _-]?list/i.test(a.name)) ??
    liveApis[0] ??
    null;

  // ---- API selection ------------------------------------------------------
  // Strict separation between HEADER updates and ITEM (line-item) updates so a
  // misnamed API can never silently PATCH the wrong endpoint.
  const itemRe = /item|line[ _-]?item/i;
  const headerNameRe = /update.*gate|gate.*update|update.*header|header.*update/i;
  const isItemApi = (a: typeof apis[number]) => {
    const hay = `${a.name} ${a.endpoint} ${a.proxyPath ?? ""} ${a.updateEndpoint ?? ""}`;
    if (itemRe.test(hay)) return true;
    const tpl = a.updateEndpoint ?? "";
    if (/\{item_no\}|\{item[_-]?id\}/i.test(tpl)) return true;
    if (/\/items?\//i.test(tpl)) return true;
    return false;
  };
  const isHeaderTpl = (tpl: string | undefined) =>
    !!tpl && !/\{item_no\}|\{item[_-]?id\}/i.test(tpl) && !/\/items?\//i.test(tpl);

  // 1) Best match: configured template AND looks like a header API by name AND template is header-shaped.
  // Prefer APIs on the same SAP service as the list API, so leftover configs
  // for an old service are never used to save changes.
  const listService = selectedApi?.endpoint;
  const headerByName = pickSameService(apis, listService,
    (a) =>
      a.status === "Active" &&
      isHeaderTpl(a.updateEndpoint) &&
      !isItemApi(a) &&
      headerNameRe.test(`${a.name} ${a.endpoint} ${a.proxyPath ?? ""}`),
  );
  // 2) Fallback: any active API with a header-shaped template that is NOT an item API.
  const headerByTpl = pickSameService(apis, listService,
    (a) => a.status === "Active" && isHeaderTpl(a.updateEndpoint) && !isItemApi(a),
  );
  // 3) Surface a "configure me" banner if we found something by name but the template is empty/wrong.
  const headerNeedsConfig = apis.find(
    (a) =>
      a.status === "Active" &&
      !isItemApi(a) &&
      headerNameRe.test(`${a.name} ${a.endpoint} ${a.proxyPath ?? ""}`) &&
      !isHeaderTpl(a.updateEndpoint),
  );

  const updateApi = headerByName ?? headerByTpl ?? null;
  const updateNeedsConfig = !updateApi && headerNeedsConfig ? headerNeedsConfig : null;

  // Item-level update API. Must be an item API AND have an item-shaped template.
  const isItemTpl = (tpl: string | undefined) =>
    !!tpl && (/\{item_no\}|\{item[_-]?id\}/i.test(tpl) || /\/items?\//i.test(tpl));
  const itemUpdateApi =
    pickSameService(apis, listService,
      (a) => a.status === "Active" && isItemApi(a) && isItemTpl(a.updateEndpoint),
    ) ?? null;
  const itemUpdateNeedsConfig =
    !itemUpdateApi
      ? apis.find((a) => a.status === "Active" && isItemApi(a)) ?? null
      : null;

  return { apis, selectedApi, updateApi, updateNeedsConfig, itemUpdateApi, itemUpdateNeedsConfig };
}

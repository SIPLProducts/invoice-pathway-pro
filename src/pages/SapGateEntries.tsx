import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { exportDmrExcel, exportDmrPdf } from "@/lib/dmrExport";
import type { ColumnDef } from "@/lib/sapApiSchemas";
import logoUrl from "@/assets/rithwik-logo.png";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { SapLiveTable } from "@/components/SapLiveTable";
import { EditHeaderDialog } from "@/components/EditHeaderDialog";
import { buildSchemaFromApi } from "@/lib/sapApiSchemas";
import { useSapApis } from "@/lib/sapApisStore";

export default function SapGateEntries() {
  const [editing, setEditing] = useState<{ row: Record<string, unknown> } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [data, setData] = useState<{
    rows: Record<string, unknown>[];
    selected: Record<string, unknown>[];
    columns: ColumnDef[];
    childColumns?: ColumnDef[];
  }>({ rows: [], selected: [], columns: [] });
  const [pdfBusy, setPdfBusy] = useState(false);
  const onDataChange = useCallback((d: typeof data) => setData(d), []);
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
  const headerByName = apis.find(
    (a) =>
      a.status === "Active" &&
      isHeaderTpl(a.updateEndpoint) &&
      !isItemApi(a) &&
      headerNameRe.test(`${a.name} ${a.endpoint} ${a.proxyPath ?? ""}`),
  );
  // 2) Fallback: any active API with a header-shaped template that is NOT an item API.
  const headerByTpl = apis.find(
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
    apis.find(
      (a) => a.status === "Active" && isItemApi(a) && isItemTpl(a.updateEndpoint),
    ) ?? null;
  const itemUpdateNeedsConfig =
    !itemUpdateApi
      ? apis.find((a) => a.status === "Active" && isItemApi(a)) ?? null
      : null;

  const childKey = selectedApi ? buildSchemaFromApi(selectedApi).childKey : undefined;
  const body = 
        (() => {
          if (!selectedApi) {
            return (
              <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
                No live SAP API configured yet. Open{" "}
                <Link to="/sap/settings" className="font-semibold text-primary hover:underline">
                  SAP Settings
                </Link>{" "}
                and add an Active GET API named{" "}
                <code className="font-mono text-xs">GET DMR LIST</code> (or{" "}
                <code className="font-mono text-xs">ZUI_Gate_Service</code>) pointing at the gate header endpoint.
              </div>
            );
          }
          return (
            <div className="space-y-3">
              <SapLiveTable
                key={refreshKey}
                api={selectedApi}
                schema={buildSchemaFromApi(selectedApi)}
                onEdit={updateApi ? (row) => setEditing({ row }) : undefined}
                itemUpdateApi={itemUpdateApi ?? undefined}
                onItemSaved={() => setRefreshKey((k) => k + 1)}
                selectable
                onDataChange={onDataChange}
              />
              {updateNeedsConfig && (
                <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2.5 text-xs text-foreground">
                  <div className="font-semibold">
                    Update API found ("{updateNeedsConfig.name}") but the{" "}
                    <span className="font-mono">Update Endpoint</span> template is empty.
                  </div>
                  <div className="mt-1 text-muted-foreground">
                    Open API Settings → {updateNeedsConfig.name} → API Details and set{" "}
                    <span className="font-mono">Update Endpoint</span> to{" "}
                    <code className="font-mono">/api/gate/headers/{"{gate_id}"}</code> to enable per-row editing.
                  </div>
                  <div className="mt-2">
                    <Link
                      to={`/sap/settings/edit/${encodeURIComponent(updateNeedsConfig.name)}`}
                      className="inline-flex items-center rounded border border-warning/50 bg-background px-2 py-1 font-semibold text-warning hover:bg-warning/20"
                    >
                      Configure now
                    </Link>
                  </div>
                </div>
              )}
              {itemUpdateNeedsConfig && (
                <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2.5 text-xs text-foreground">
                  <div className="font-semibold">
                    Item-update API found ("{itemUpdateNeedsConfig.name}") but the{" "}
                    <span className="font-mono">Update Endpoint</span> template is empty.
                  </div>
                  <div className="mt-1 text-muted-foreground">
                    Open API Settings → {itemUpdateNeedsConfig.name} → API Details and set{" "}
                    <span className="font-mono">Update Endpoint</span> to{" "}
                    <code className="font-mono">/api/gate/items/{"{gate_id}"}/{"{item_no}"}</code>{" "}
                    to enable per-line-item editing inside the Items popup.
                  </div>
                  <div className="mt-2">
                    <Link
                      to={`/sap/settings/edit/${encodeURIComponent(itemUpdateNeedsConfig.name)}`}
                      className="inline-flex items-center rounded border border-warning/50 bg-background px-2 py-1 font-semibold text-warning hover:bg-warning/20"
                    >
                      Configure now
                    </Link>
                  </div>
                </div>
              )}
              {!updateApi && !updateNeedsConfig && (
                <div className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  Tip: configure an Active API with an{" "}
                  <code className="font-mono">Update Endpoint</code> (e.g.{" "}
                  <code className="font-mono">/api/gate/headers/{"{gate_id}"}</code>) on{" "}
                  <Link to="/sap/settings" className="font-semibold text-primary hover:underline">
                    SAP Settings
                  </Link>{" "}
                  to enable per-row editing.
                </div>
              )}
              {editing && updateApi && (
                <EditHeaderDialog
                  api={updateApi}
                  row={editing.row}
                  onClose={() => setEditing(null)}
                  onSaved={() => setRefreshKey((k) => k + 1)}
                />
              )}
            </div>
          );
        })();
  return (
    <>
      <PageHeader
        title="All DMR"
        description="Live gate entries from SAP — view and edit headers and line items."
        actions={
          <>
            <Button
              variant="outline"
              disabled={data.rows.length === 0}
              onClick={() =>
                exportDmrExcel(data.rows, data.columns, childKey, data.childColumns)
              }
            >
              <FileSpreadsheet className="h-4 w-4" /> Download Excel
            </Button>
            <Button
              disabled={data.selected.length === 0 || pdfBusy}
              onClick={async () => {
                setPdfBusy(true);
                try {
                  await exportDmrPdf(data.selected, data.columns, childKey, data.childColumns, logoUrl);
                } catch (e) {
                  toast.error("Could not create PDF", { description: String(e) });
                } finally {
                  setPdfBusy(false);
                }
              }}
            >
              {pdfBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              Download PDF{data.selected.length ? ` (${data.selected.length})` : ""}
            </Button>
          </>
        }
      />
      {body}
    </>
  );
}

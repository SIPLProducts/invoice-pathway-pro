import { useCallback, useMemo, useState } from "react";
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
import { useGateApis } from "@/hooks/useGateApis";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const { selectedApi, updateApi, updateNeedsConfig, itemUpdateApi, itemUpdateNeedsConfig } = useGateApis();
  const [pdfRow, setPdfRow] = useState<Record<string, unknown> | null>(null);

  // Build the table schema once per selected API. Rebuilding it on every render
  // gave SapLiveTable new column arrays each time and caused an endless render loop.
  const selectedSchema = useMemo(
    () => (selectedApi ? buildSchemaFromApi(selectedApi) : null),
    [selectedApi],
  );
  const childKey = selectedSchema?.childKey;
  const downloadPdf = async (row: Record<string, unknown>) => {
    setPdfBusy(true);
    try {
      await exportDmrPdf([row], data.columns, childKey, data.childColumns, logoUrl);
    } catch (e) {
      toast.error("Could not create PDF", { description: String(e) });
    } finally {
      setPdfBusy(false);
    }
  };
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
                schema={selectedSchema!}
                onEdit={updateApi ? (row) => setEditing({ row }) : undefined}
                itemUpdateApi={itemUpdateApi ?? undefined}
                onItemSaved={() => setRefreshKey((k) => k + 1)}
                onDataChange={onDataChange}
                onRowClick={(row) => {
                  if (!pdfBusy) setPdfRow(row);
                }}
              />
              <AlertDialog open={!!pdfRow} onOpenChange={(o) => !o && setPdfRow(null)}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Download PDF?</AlertDialogTitle>
                    <AlertDialogDescription>Do you want to download the PDF for this DMR?</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => { const r = pdfRow; setPdfRow(null); if (r) void downloadPdf(r); }}>
                      Yes, download
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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
              disabled={data.selected.length !== 1 || pdfBusy}
              onClick={async () => {
                const row = data.selected[0];
                if (!row) return;
                setPdfBusy(true);
                try {
                  await exportDmrPdf([row], data.columns, childKey, data.childColumns, logoUrl);
                } catch (e) {
                  toast.error("Could not create PDF", { description: String(e) });
                } finally {
                  setPdfBusy(false);
                }
              }}
            >
              <FileDown className="h-4 w-4" /> Download PDF
            </Button>
            <Button
              variant="outline"
              disabled={data.rows.length === 0}
              onClick={() =>
                exportDmrExcel(data.rows, data.columns, childKey, data.childColumns)
              }
            >
              <FileSpreadsheet className="h-4 w-4" /> Download Excel
            </Button>
            {pdfBusy && (
              <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Creating PDF…
              </span>
            )}
          </>
        }
      />
      {body}
    </>
  );
}

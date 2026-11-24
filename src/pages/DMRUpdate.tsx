import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Search, Pencil } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EditHeaderDialog } from "@/components/EditHeaderDialog";
import { useGateApis } from "@/hooks/useGateApis";
import { useSapProxy } from "@/hooks/useSapProxy";
import { buildSchemaFromApi } from "@/lib/sapApiSchemas";
import { getPath } from "@/lib/getPath";

type Row = Record<string, unknown>;
const show = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : String(v));
const norm = (v: unknown) => String(v ?? "").trim().replace(/^0+(?=.)/, "").toLowerCase();

export default function DMRUpdate() {
  const { selectedApi, updateApi } = useGateApis();
  const schema = useMemo(() => (selectedApi ? buildSchemaFromApi(selectedApi) : null), [selectedApi]);
  const proxy = useSapProxy<Row>(selectedApi, schema ?? { proxyPath: "", columns: [] } as never);
  const [gateId, setGateId] = useState("");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(false);

  const keyPath = selectedApi?.keyField ?? selectedApi?.rowKey ?? schema?.rowKey ?? "gate_id";
  const found = useMemo(() => {
    if (!query) return null;
    return proxy.rows.find((r) => norm(getPath(r, keyPath)) === norm(query)) ?? null;
  }, [proxy.rows, query, keyPath]);

  const [searched, setSearched] = useState(false);
  useEffect(() => { if (query && !proxy.loading) setSearched(true); }, [proxy.loading, query]);

  const fetchGate = () => {
    const id = gateId.trim();
    if (!id) return;
    setSearched(false);
    setQuery(id);
    proxy.refresh();
  };

  const items = found && schema?.childKey ? ((getPath(found, schema.childKey) as Row[]) ?? []) : [];

  return (
    <>
      <PageHeader title="Update DMR" description="Enter a Gate ID to load the DMR from SAP, then edit and update it." />
      {!selectedApi ? (
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          No Get DMR API configured. Open <Link to="/sap/settings" className="font-semibold text-primary hover:underline">SAP Settings</Link>.
        </div>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardContent className="flex flex-wrap items-end gap-3 pt-6">
              <div className="w-64">
                <label className="text-sm font-medium" htmlFor="gate-id">Gate ID</label>
                <Input id="gate-id" value={gateId} onChange={(e) => setGateId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchGate()} placeholder="e.g. 1000000001" />
              </div>
              <Button onClick={fetchGate} disabled={!gateId.trim() || proxy.loading}>
                {proxy.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Fetch
              </Button>
            </CardContent>
          </Card>

          {proxy.error && <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">{proxy.error.message}</div>}
          {query && searched && !proxy.loading && !proxy.error && !found && (
            <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm">Gate ID "{query}" not found in SAP.</div>
          )}

          {found && schema && (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base">DMR {show(getPath(found, keyPath))}</CardTitle>
                  <Button onClick={() => setEditing(true)} disabled={!updateApi}>
                    <Pencil className="h-4 w-4" /> Edit & Update in SAP
                  </Button>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {schema.columns.map((c) => (
                    <div key={c.path}>
                      <div className="text-xs text-muted-foreground">{c.header}</div>
                      <div className="text-sm font-medium">{show(getPath(found, c.path))}</div>
                    </div>
                  ))}
                  {!updateApi && <div className="col-span-full text-xs text-muted-foreground">No Update Header API configured in SAP Settings.</div>}
                </CardContent>
              </Card>
              {schema.childColumns && items.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Line items</CardTitle></CardHeader>
                  <CardContent className="overflow-x-auto">
                    <Table>
                      <TableHeader><TableRow>{schema.childColumns.map((c) => <TableHead key={c.path}>{c.header}</TableHead>)}</TableRow></TableHeader>
                      <TableBody>
                        {items.map((it, i) => (
                          <TableRow key={i}>{schema.childColumns!.map((c) => <TableCell key={c.path}>{show(getPath(it, c.path))}</TableCell>)}</TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </>
          )}
          {editing && found && updateApi && (
            <EditHeaderDialog api={updateApi} row={found} onClose={() => setEditing(false)} onSaved={() => proxy.refresh()} />
          )}
        </div>
      )}
    </>
  );
}

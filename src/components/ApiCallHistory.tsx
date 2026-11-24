import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { History, RefreshCw } from "lucide-react";
import type { SapCallLogRow } from "@/lib/sapCallLog";

function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}
function ago(iso: string) {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
}
const ACTION_LABEL: Record<string, string> = {
  fetch: "Fetch", create: "Create", update: "Update", lookup: "Lookup", test: "Test", delete: "Delete",
};

export function ApiCallHistory({ apiName }: { apiName: string }) {
  const [rows, setRows] = useState<SapCallLogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<SapCallLogRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("sap_api_call_logs") as any)
      .select("*")
      .eq("api_name", apiName)
      .order("created_at", { ascending: false })
      .limit(10);
    setLoading(false);
    if (error) setError(error.message);
    else { setError(null); setRows((data ?? []) as SapCallLogRow[]); }
  }, [apiName]);

  useEffect(() => {
    void load();
    const h = (e: Event) => { if ((e as CustomEvent).detail === apiName) void load(); };
    window.addEventListener("sap-call-logged", h);
    return () => window.removeEventListener("sap-call-logged", h);
  }, [load, apiName]);

  return (
    <div className="mt-5 rounded-xl border bg-card p-6 shadow-card">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <div>
            <h2 className="font-display text-lg font-semibold">Recent API Calls</h2>
            <p className="text-sm text-muted-foreground">
              Last 10 calls for this API{rows[0] ? ` · Last call: ${ago(rows[0].created_at)}` : ""}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={loading ? "mr-1 h-4 w-4 animate-spin" : "mr-1 h-4 w-4"} /> Refresh
        </Button>
      </div>
      {error && <div className="mb-3 text-sm text-destructive">{error}</div>}
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">HTTP</TableHead>
              <TableHead className="text-right">Records</TableHead>
              <TableHead className="text-right">Size</TableHead>
              <TableHead className="text-right">Time taken</TableHead>
              <TableHead>Message</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-6 text-center text-sm text-muted-foreground">
                  No calls recorded yet. Open the screen that uses this API (or run it) and the call will appear here.
                </TableCell>
              </TableRow>
            ) : rows.map((r) => (
              <TableRow key={r.id} className="cursor-pointer" onClick={() => setOpen(r)}>
                <TableCell className="whitespace-nowrap text-xs">{new Date(r.created_at).toLocaleString()}</TableCell>
                <TableCell>{ACTION_LABEL[r.action] ?? r.action}{r.method ? <span className="ml-1 text-[10px] text-muted-foreground">{r.method}</span> : null}</TableCell>
                <TableCell>
                  <Badge variant={r.ok ? "default" : "destructive"}>{r.ok ? "Success" : "Failed"}</Badge>
                </TableCell>
                <TableCell className="text-right font-mono text-xs">{r.http_status ?? "—"}</TableCell>
                <TableCell className="text-right">{r.record_count}</TableCell>
                <TableCell className="text-right text-xs">{fmtBytes(r.bytes)}</TableCell>
                <TableCell className="text-right text-xs">{r.duration_ms != null ? `${r.duration_ms} ms` : "—"}</TableCell>
                <TableCell className="max-w-[280px] truncate text-xs" title={r.message ?? ""}>{r.message ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>SAP response — {open && new Date(open.created_at).toLocaleString()}</DialogTitle>
            <DialogDescription className="break-all font-mono text-xs">{open?.method} {open?.url}</DialogDescription>
          </DialogHeader>
          {open?.message && <div className="text-sm text-destructive">{open.message}</div>}
          <pre className="max-h-[60vh] overflow-auto rounded-md bg-muted p-3 text-xs">
            {open?.response_preview == null ? "(no response body)" : JSON.stringify(open.response_preview, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}

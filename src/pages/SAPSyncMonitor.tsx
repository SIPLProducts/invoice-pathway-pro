import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  RefreshCcw,
  Plug,
  CheckCircle2,
  XCircle,
  Download,
  Activity,
  Clock,
  Database,
  Play,
  TestTube2,
} from "lucide-react";
import { toast } from "sonner";
import { useSapApis } from "@/lib/sapApisStore";

const methodColor: Record<string, string> = {
  GET: "bg-success/15 text-success border-success/30",
  POST: "bg-primary/15 text-primary border-primary/30",
  PUT: "bg-warning/15 text-warning border-warning/30",
  DELETE: "bg-destructive/15 text-destructive border-destructive/30",
};

const history = [
  { api: "ZMRB_Inward_Inspection", time: "22/4/2026, 10:52:03 am", duration: "1.4s", records: 247, status: "Success" },
  { api: "ZMRB_Inward_Inspection", time: "22/4/2026, 10:47:03 am", duration: "1.2s", records: 241, status: "Success" },
  { api: "ZMRB_Inward_Inspection", time: "22/4/2026, 10:42:02 am", duration: "1.7s", records: 239, status: "Success" },
  { api: "ZMRB_Inward_Inspection", time: "22/4/2026, 10:37:01 am", duration: "1.1s", records: 238, status: "Success" },
  { api: "MB52_Stock_Report", time: "22/4/2026, 10:30:11 am", duration: "2.3s", records: 1430, status: "Success" },
];

const previewRows = [
  { lot: "10000123", po: "4500001234", vendor: "Ultratech Cement Ltd", material: "Cement OPC 53", qty: "200 BAG", date: "20/4/2026" },
  { lot: "10000124", po: "4500001235", vendor: "TATA Steel", material: "TMT Bar Fe500D 12mm", qty: "5.2 TON", date: "20/4/2026" },
  { lot: "10000125", po: "4500001236", vendor: "JSW Cement", material: "PPC Cement", qty: "150 BAG", date: "21/4/2026" },
  { lot: "10000126", po: "4500001237", vendor: "Asian Paints", material: "Apex Ultima 20L", qty: "30 TIN", date: "21/4/2026" },
];

export default function SAPSyncMonitor() {
  const [tab, setTab] = useState("connections");
  const apis = useSapApis();
  const activeCount = apis.filter((a) => a.status === "Active").length;

  return (
    <>
      <PageHeader
        title="SAP Sync Monitor"
        description="Test connections, trigger syncs, and view synced data across all tables"
        actions={
          <Button variant="outline" size="sm" className="gap-2" onClick={() => toast.success("All connections refreshed")}>
            <RefreshCcw className="h-4 w-4" /> Refresh All
          </Button>
        }
      />

      {/* KPI cards */}
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi icon={Plug} label="Active APIs" value={String(activeCount)} tone="primary" />
        <Kpi icon={CheckCircle2} label="Successful Syncs" value="50/50" tone="success" />
        <Kpi icon={XCircle} label="Failed Syncs" value="0" tone="destructive" />
        <Kpi icon={Download} label="Records Synced" value="4,847" tone="accent" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="connections" className="gap-2">
            <Activity className="h-4 w-4" /> API Connections
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <Clock className="h-4 w-4" /> Sync History
          </TabsTrigger>
          <TabsTrigger value="preview" className="gap-2">
            <Database className="h-4 w-4" /> Data Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="connections" className="mt-5">
          <div className="rounded-xl border bg-card shadow-card">
            <div className="border-b p-5">
              <div className="flex items-center gap-2 font-display text-lg font-semibold">
                <Plug className="h-5 w-5 text-primary" /> SAP API Connections
              </div>
              <p className="text-sm text-muted-foreground">Test and trigger sync for each configured SAP API</p>
            </div>
            <div className="divide-y">
              {apis.map((a) => (
                <div key={a.name} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{a.name}</span>
                        <Badge variant="outline" className="border-success/40 bg-success/10 text-success">
                          {a.status}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={
                            a.tag === "VPN Tunnel"
                              ? "border-warning/40 bg-warning/10 text-warning"
                              : a.tag === "Direct"
                                ? "border-muted-foreground/30 bg-muted text-muted-foreground"
                                : "border-primary/30 bg-primary/10 text-primary"
                          }
                        >
                          {a.tag}
                        </Badge>
                        <Badge variant="outline" className={methodColor[a.method]}>
                          {a.method}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{a.description}</p>
                      <code className="mt-2 inline-block rounded bg-muted px-2 py-1 font-mono text-xs">
                        {a.baseUrl}{a.endpoint}
                      </code>
                      {a.autoSync.lastSync && (
                        <div className="mt-2 text-xs text-muted-foreground">Last synced: {a.autoSync.lastSync}</div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toast.success(`Tested ${a.name}`)}>
                        <TestTube2 className="h-3.5 w-3.5" /> Test Route
                      </Button>
                      {a.type === "action" && (
                        <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning">
                          Action API — triggered from MRB Worklist
                        </Badge>
                      )}
                      {a.type === "live" && (
                        <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                          Live Fetch — data not stored locally
                        </Badge>
                      )}
                      {a.type === "sync" && (
                        <Button size="sm" className="gap-1.5" onClick={() => toast.success(`Sync triggered for ${a.name}`)}>
                          <Play className="h-3.5 w-3.5" /> Trigger Sync
                        </Button>
                      )}
                    </div>
                  </div>
                  {(a.type === "action") && (
                    <div className="mt-3 rounded-lg border border-warning/40 bg-warning/5 p-3 text-xs text-foreground/80">
                      <span className="font-semibold">343 (Blocked → Unrestricted)</span> and{" "}
                      <span className="font-semibold">344 (Unrestricted → Blocked)</span> are transactional movement
                      APIs. They require a specific material payload (Material, Plant, SLoc, Batch, Qty) and are
                      automatically triggered from the <span className="font-semibold">MRB Worklist</span> during
                      "Unblock & SAP Sync" actions. Use "Test Route" to verify connectivity only.
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-5">
          <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">API</th>
                  <th className="px-5 py-3 text-left font-medium">Triggered At</th>
                  <th className="px-5 py-3 text-left font-medium">Duration</th>
                  <th className="px-5 py-3 text-left font-medium">Records</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i} className="border-t hover:bg-muted/30">
                    <td className="px-5 py-3 font-medium">{h.api}</td>
                    <td className="px-5 py-3 font-mono text-xs">{h.time}</td>
                    <td className="px-5 py-3">{h.duration}</td>
                    <td className="px-5 py-3 font-mono">{h.records}</td>
                    <td className="px-5 py-3">
                      <Badge variant="outline" className="border-success/40 bg-success/10 text-success">
                        {h.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="mt-5">
          <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
            <div className="flex items-center justify-between border-b p-4">
              <div className="font-display font-semibold">ZMRB_Inward_Inspection · Latest Records</div>
              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                247 rows
              </Badge>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Lot</th>
                  <th className="px-5 py-3 text-left font-medium">PO</th>
                  <th className="px-5 py-3 text-left font-medium">Vendor</th>
                  <th className="px-5 py-3 text-left font-medium">Material</th>
                  <th className="px-5 py-3 text-left font-medium">Quantity</th>
                  <th className="px-5 py-3 text-left font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((r) => (
                  <tr key={r.lot} className="border-t hover:bg-muted/30">
                    <td className="px-5 py-3 font-mono">{r.lot}</td>
                    <td className="px-5 py-3 font-mono">{r.po}</td>
                    <td className="px-5 py-3">{r.vendor}</td>
                    <td className="px-5 py-3">{r.material}</td>
                    <td className="px-5 py-3 font-mono">{r.qty}</td>
                    <td className="px-5 py-3 text-muted-foreground">{r.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone: "primary" | "success" | "destructive" | "accent";
}) {
  const map: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    destructive: "bg-destructive/10 text-destructive",
    accent: "bg-accent/10 text-accent",
  };
  return (
    <div className="rounded-xl border bg-card p-4 shadow-card">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${map[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="font-display text-2xl font-bold">{value}</div>
        </div>
      </div>
    </div>
  );
}

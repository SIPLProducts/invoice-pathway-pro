import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { dmrs } from "@/lib/seed";
import { inr } from "@/lib/format";
import { Plus, Search, Filter, Download, Eye, FileText, MapPin, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { SapLiveTable } from "@/components/SapLiveTable";
import { EditHeaderDialog } from "@/components/EditHeaderDialog";
import { buildSchemaFromApi } from "@/lib/sapApiSchemas";
import { useSapApis } from "@/lib/sapApisStore";



const tabs = [
  "All",
  "Draft",
  "Submitted",
  "Validated",
  "Approved",
  "GRN Posted",
  "Rejected",
  "SAP Gate Entries",
] as const;
const tabMap: Record<string, string | null> = {
  All: null,
  Draft: "draft",
  Submitted: "submitted",
  Validated: "validated",
  Approved: "approved",
  "GRN Posted": "grn_posted",
  Rejected: "rejected",
  "SAP Gate Entries": "__sap_gate__",
};

export default function DMRPage() {
  const [active, setActive] = useState<(typeof tabs)[number]>("All");
  const [q, setQ] = useState("");
  const apis = useSapApis();
  // SAP Gate Entries tab shows any GET API that targets the gate service.
  // Create_Gate_Service is a write API and lives on the New DMR page.
  const liveApis = apis.filter((a) => {
    if (a.method !== "GET") return false;
    if (a.status !== "Active") return false;
    const hay = `${a.name} ${a.endpoint} ${a.proxyPath ?? ""}`.toLowerCase();
    return /get[ _-]?dmr|dmr[ _-]?list|gate(header|service)/.test(hay);
  });
  // Prefer an explicit "GET DMR LIST" API when present
  const selectedApi =
    liveApis.find((a) => /get[ _-]?dmr[ _-]?list/i.test(a.name)) ??
    liveApis[0] ??
    null;

  const filtered = dmrs.filter((d) => {
    const tab = tabMap[active];
    const matchTab = !tab || d.status === tab;
    const matchQ =
      !q ||
      [d.dmrNo, d.invoiceNo, d.vendor.name, d.poNo ?? "", d.site].some((v) =>
        v.toLowerCase().includes(q.toLowerCase()),
      );
    return matchTab && matchQ;
  });

  return (
    <>
      <PageHeader
        title="Daily Material Receipts"
        description="Create, validate, approve, and track DMR entries across all sites."
        actions={
          <>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button size="sm" className="bg-gradient-primary" asChild>
              <Link to="/dmr/new">
                <Plus className="h-4 w-4" />
                New DMR
              </Link>
            </Button>
          </>
        }
      />

      {/* Tabs */}
      <div className="mb-4 flex flex-wrap items-center gap-2 border-b">
        {tabs.map((t) => {
          const count =
            t === "All"
              ? dmrs.length
              : t === "SAP Gate Entries"
                ? null
                : dmrs.filter((d) => d.status === tabMap[t]).length;
          const isActive = active === t;
          return (
            <button
              key={t}
              onClick={() => setActive(t)}
              className={`relative -mb-px flex items-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "border-b-2 border-primary text-primary"
                  : "border-b-2 border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
              {count !== null && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {active === "SAP Gate Entries" ? (
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
              <SapLiveTable api={selectedApi} schema={buildSchemaFromApi(selectedApi)} />
            </div>
          );
        })()
      ) : (
        <>
          {/* Toolbar */}
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search DMR, invoice, vendor, PO…"
                className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:shadow-glow"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </div>

          {/* Desktop table */}
          <div className="hidden rounded-xl border bg-card shadow-card md:block">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3 font-medium">DMR No</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Vendor</th>
                    <th className="px-4 py-3 font-medium">Invoice</th>
                    <th className="px-4 py-3 font-medium">PO / PR</th>
                    <th className="px-4 py-3 font-medium">Site</th>
                    <th className="px-4 py-3 font-medium text-right">Amount</th>
                    <th className="px-4 py-3 font-medium">Validation</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((d) => (
                    <tr key={d.id} className="border-b last:border-0 transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <Link to={`/dmr/${d.id}`} className="font-mono text-xs font-semibold text-primary hover:underline">
                          {d.dmrNo}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{d.date}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{d.vendor.name}</div>
                        <div className="text-[11px] text-muted-foreground">{d.vendor.code}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{d.invoiceNo}</td>
                      <td className="px-4 py-3 font-mono text-xs">{d.poNo ?? d.prNo ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{d.site}</td>
                      <td className="px-4 py-3 text-right font-mono">{inr(d.total)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={d.validations[0].level} />
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/dmr/${d.id}`}><Eye className="h-4 w-4" /></Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {filtered.map((d) => (
              <Link
                key={d.id}
                to={`/dmr/${d.id}`}
                className="block rounded-xl border bg-card p-4 shadow-card transition-shadow hover:shadow-elegant"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-mono text-xs font-semibold text-primary">{d.dmrNo}</div>
                    <div className="mt-0.5 font-medium">{d.vendor.name}</div>
                  </div>
                  <StatusBadge status={d.status} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <FileText className="h-3 w-3" />
                    <span className="font-mono">{d.invoiceNo}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {d.site}
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {d.date}
                  </div>
                  <div className="text-right font-mono font-semibold">{inr(d.total)}</div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold">{d.flow}</span>
                  <StatusBadge status={d.validations[0].level} />
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  );
}

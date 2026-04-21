import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { sapEntries } from "@/lib/seed";
import { inr } from "@/lib/format";
import { Download, Filter, Search, ChevronRight, CheckCircle2 } from "lucide-react";

const tabs = ["All", "Site Fields", "Accounts / HO Fields"] as const;

export default function Tracker() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("All");
  const [q, setQ] = useState("");
  const filtered = sapEntries.filter((e) =>
    !q || [e.dmrNo, e.invoiceNo, e.vendor, e.poNo ?? "", e.miroDocNo ?? ""].some((v) => v.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <>
      <PageHeader
        title="SAP Entries Tracker"
        description="Unified view of site & HO data — DMR, GRN, MIRO, taxes, retention, and bill status."
        actions={
          <>
            <Button variant="outline" size="sm"><Filter className="h-4 w-4" />Advanced</Button>
            <Button size="sm" className="bg-gradient-primary"><Download className="h-4 w-4" />Export</Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === t ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
            }`}
          >
            {t}
          </button>
        ))}
        <div className="relative ml-auto w-full md:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search DMR, MIRO, vendor, invoice…"
            className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:shadow-glow"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card shadow-card scrollbar-thin">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-muted/40 text-left uppercase tracking-wider text-muted-foreground">
              <th className="whitespace-nowrap px-3 py-2.5 font-medium">DMR No</th>
              <th className="whitespace-nowrap px-3 py-2.5 font-medium">GRN / SAP Ref</th>
              {tab !== "Accounts / HO Fields" && (
                <>
                  <th className="whitespace-nowrap px-3 py-2.5 font-medium">PO · Line · Material</th>
                  <th className="whitespace-nowrap px-3 py-2.5 font-medium">Vendor / GSTIN</th>
                  <th className="whitespace-nowrap px-3 py-2.5 font-medium">Invoice</th>
                  <th className="whitespace-nowrap px-3 py-2.5 font-medium text-right">CGST</th>
                  <th className="whitespace-nowrap px-3 py-2.5 font-medium text-right">SGST</th>
                  <th className="whitespace-nowrap px-3 py-2.5 font-medium text-right">IGST</th>
                </>
              )}
              {tab !== "Site Fields" && (
                <>
                  <th className="whitespace-nowrap px-3 py-2.5 font-medium text-right">TDS</th>
                  <th className="whitespace-nowrap px-3 py-2.5 font-medium text-right">Retention</th>
                  <th className="whitespace-nowrap px-3 py-2.5 font-medium text-right">Net Payable</th>
                  <th className="whitespace-nowrap px-3 py-2.5 font-medium">MIRO</th>
                  <th className="whitespace-nowrap px-3 py-2.5 font-medium">GL</th>
                  <th className="whitespace-nowrap px-3 py-2.5 font-medium text-center">Checklist</th>
                  <th className="whitespace-nowrap px-3 py-2.5 font-medium text-right">Delay (d)</th>
                </>
              )}
              <th className="whitespace-nowrap px-3 py-2.5 font-medium">Bill Status</th>
              <th className="px-2 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={e.id} className="border-b last:border-0 transition-colors hover:bg-muted/30">
                <td className="whitespace-nowrap px-3 py-2.5 font-mono font-semibold text-primary">{e.dmrNo}</td>
                <td className="whitespace-nowrap px-3 py-2.5">
                  <div className="font-mono">{e.grnNo ?? "—"}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">{e.sapRef ?? "Not posted"}</div>
                </td>
                {tab !== "Accounts / HO Fields" && (
                  <>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono">
                      {e.poNo ?? "—"}{e.poLine ? ` · ${e.poLine}` : ""}
                      <div className="text-[10px] text-muted-foreground">{e.materialCode}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium">{e.vendor}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{e.gstin}</div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono">
                      {e.invoiceNo}
                      <div className="text-[10px] text-muted-foreground">{e.invoiceDate}</div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono">{inr(e.cgst)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono">{inr(e.sgst)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-muted-foreground">{e.igst ? inr(e.igst) : "—"}</td>
                  </>
                )}
                {tab !== "Site Fields" && (
                  <>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono">{inr(e.tdsAmount)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono">{inr(e.retention)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono font-semibold">{inr(e.netPayable)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono">{e.miroDocNo ?? "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-muted-foreground">{e.glCode ?? "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-center">
                      {e.checklistComplete ? (
                        <CheckCircle2 className="mx-auto h-4 w-4 text-success" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className={`whitespace-nowrap px-3 py-2.5 text-right font-mono font-semibold ${e.delayDays > 7 ? "text-destructive" : e.delayDays > 3 ? "text-warning" : ""}`}>
                      {e.delayDays}
                    </td>
                  </>
                )}
                <td className="whitespace-nowrap px-3 py-2.5"><StatusBadge status={e.billStatus} /></td>
                <td className="px-2 py-2.5"><ChevronRight className="h-4 w-4 text-muted-foreground" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Showing {filtered.length} of {sapEntries.length} entries · Tip: scroll horizontally to see all fields
      </p>
    </>
  );
}

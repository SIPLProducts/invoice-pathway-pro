import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { grns } from "@/lib/seed";
import { inr } from "@/lib/format";
import { Download, PackageCheck, RefreshCw } from "lucide-react";

export default function GRN() {
  return (
    <>
      <PageHeader
        title="Goods Receipt Notes"
        description="Track GRN posting to SAP S/4HANA — supports partial receipts and retry queue."
        actions={
          <>
            <Button variant="outline" size="sm"><RefreshCw className="h-4 w-4" />Retry Failed</Button>
            <Button size="sm" className="bg-gradient-primary"><Download className="h-4 w-4" />Export</Button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatBlock label="Posted Today" value="34" sub="₹ 1.42 Cr" tone="success" />
        <StatBlock label="Partial" value="6" sub="₹ 28.4 L" tone="warning" />
        <StatBlock label="Pending" value="12" sub="₹ 64.2 L" tone="info" />
        <StatBlock label="Failed" value="3" sub="In retry queue" tone="destructive" />
      </div>

      <div className="rounded-xl border bg-card shadow-card">
        <div className="border-b p-5">
          <h3 className="font-display text-base font-semibold">GRN Register</h3>
          <p className="text-xs text-muted-foreground">All goods receipt postings linked to SAP</p>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">GRN No</th>
                <th className="px-4 py-3 font-medium">DMR Ref</th>
                <th className="px-4 py-3 font-medium">SAP Doc</th>
                <th className="px-4 py-3 font-medium">PO</th>
                <th className="px-4 py-3 font-medium">Vendor</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {grns.map((g) => (
                <tr key={g.id} className="border-b last:border-0 transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">{g.grnNo}</td>
                  <td className="px-4 py-3 font-mono text-xs">{g.dmrNo}</td>
                  <td className="px-4 py-3 font-mono text-xs">{g.sapDocNo ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{g.poNo ?? "—"}</td>
                  <td className="px-4 py-3">{g.vendor}</td>
                  <td className="px-4 py-3 text-muted-foreground">{g.date}</td>
                  <td className="px-4 py-3 text-right font-mono">{inr(g.amount)}</td>
                  <td className="px-4 py-3"><StatusBadge status={g.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function StatBlock({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: string }) {
  const toneCls: Record<string, string> = {
    success: "text-success",
    warning: "text-warning",
    info: "text-info",
    destructive: "text-destructive",
  };
  return (
    <div className="rounded-xl border bg-card p-4 shadow-card">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <PackageCheck className={`h-3.5 w-3.5 ${toneCls[tone]}`} />
        {label}
      </div>
      <div className="mt-2 font-display text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { approvals } from "@/lib/seed";
import { inr } from "@/lib/format";
import { CheckCircle2, XCircle, Clock, Inbox, ArrowUpRight } from "lucide-react";

export default function Approvals() {
  return (
    <>
      <PageHeader
        title="Approvals Inbox"
        description="Review pending DMRs, non-PO transactions, and GRN postings — escalations included."
      />

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Pending" value={String(approvals.length)} icon={Inbox} tone="info" />
        <Stat label="High Priority" value="3" icon={ArrowUpRight} tone="destructive" />
        <Stat label="Avg Cycle Time" value="6.2h" icon={Clock} tone="warning" />
        <Stat label="Approved (Week)" value="142" icon={CheckCircle2} tone="success" />
      </div>

      <div className="space-y-3">
        {approvals.map((a) => (
          <div key={a.id} className="group rounded-xl border bg-card p-5 shadow-card transition-shadow hover:shadow-elegant">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary">
                    {a.type}
                  </span>
                  <span className="font-mono text-sm font-semibold">{a.refNo}</span>
                  <StatusBadge status={a.priority} />
                  <span className="text-xs text-muted-foreground">Level {a.level}</span>
                </div>
                <div className="mt-1.5 font-medium">{a.vendor}</div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span>Raised by <strong className="text-foreground">{a.raisedBy}</strong></span>
                  <span>·</span>
                  <span>{a.raisedAt}</span>
                  <span>·</span>
                  <span className={a.ageHours > 24 ? "text-destructive font-semibold" : ""}>
                    {a.ageHours}h ago
                  </span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-muted-foreground">Amount</div>
                <div className="font-display text-xl font-bold">{inr(a.amount)}</div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10">
                  <XCircle className="h-4 w-4" /> Reject
                </Button>
                <Button size="sm" className="bg-gradient-success">
                  <CheckCircle2 className="h-4 w-4" /> Approve
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function Stat({ label, value, icon: Icon, tone }: any) {
  const toneCls: Record<string, string> = {
    info: "text-info bg-info/10",
    destructive: "text-destructive bg-destructive/10",
    warning: "text-warning bg-warning/10",
    success: "text-success bg-success/10",
  };
  return (
    <div className="rounded-xl border bg-card p-4 shadow-card">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-1 font-display text-2xl font-bold">{value}</div>
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${toneCls[tone]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

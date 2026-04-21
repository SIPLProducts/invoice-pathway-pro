import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { agingBuckets, dmrVsGrnSeries, dmrs, valueByProject } from "@/lib/seed";
import { compact, inr } from "@/lib/format";
import {
  ArrowDownRight,
  ArrowUpRight,
  Download,
  FileText,
  PackageCheck,
  AlertTriangle,
  IndianRupee,
  Clock,
  RefreshCw,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const kpis = [
  { label: "DMR Created (MTD)", value: "248", delta: "+12.4%", up: true, icon: FileText, tone: "info" },
  { label: "GRN Posted (MTD)", value: "212", delta: "+9.1%", up: true, icon: PackageCheck, tone: "success" },
  { label: "Pending Approvals", value: "18", delta: "-3", up: false, icon: Clock, tone: "warning" },
  { label: "Invoice Value (MTD)", value: "₹4.82 Cr", delta: "+18.2%", up: true, icon: IndianRupee, tone: "primary" },
];

const exceptions = [
  { label: "SAP sync failed", count: 3, tone: "destructive" as const },
  { label: "Duplicate invoices", count: 2, tone: "warning" as const },
  { label: "Validation failures", count: 5, tone: "destructive" as const },
  { label: "Overdue approvals", count: 4, tone: "warning" as const },
];

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--warning))", "hsl(var(--destructive))"];

export default function Dashboard() {
  const recent = dmrs.slice(0, 6);

  return (
    <>
      <PageHeader
        title="Operations Dashboard"
        description="Real-time visibility into DMR, GRN, finance posting, and SAP integration health."
        actions={
          <>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button size="sm" className="bg-gradient-primary">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </>
        }
      />

      {/* KPI grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="stat-card group">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{k.label}</div>
                <div className="mt-2 font-display text-3xl font-bold tracking-tight">{k.value}</div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <k.icon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs">
              <span
                className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold ${
                  k.up ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                }`}
              >
                {k.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {k.delta}
              </span>
              <span className="text-muted-foreground">vs last month</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border bg-card p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-semibold">DMR vs GRN Trend</h3>
              <p className="text-xs text-muted-foreground">Last 14 days · Daily counts</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary" /> DMR
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-accent" /> GRN
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={dmrVsGrnSeries}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Area type="monotone" dataKey="DMR" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#g1)" />
              <Area type="monotone" dataKey="GRN" stroke="hsl(var(--accent))" strokeWidth={2} fill="url(#g2)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-card">
          <h3 className="font-display text-base font-semibold">Aging Analysis</h3>
          <p className="text-xs text-muted-foreground">Pending DMRs by bucket</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={agingBuckets} dataKey="count" nameKey="bucket" innerRadius={45} outerRadius={75} paddingAngle={2}>
                {agingBuckets.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1.5">
            {agingBuckets.map((b, i) => (
              <div key={b.bucket} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i] }} />
                  <span className="text-muted-foreground">{b.bucket}</span>
                </div>
                <div className="font-mono font-semibold">{b.count} · ₹{b.value.toFixed(1)}L</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Project & exceptions */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border bg-card p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-semibold">Invoice Value by Project</h3>
              <p className="text-xs text-muted-foreground">Invoiced vs SAP-posted (₹ Crore)</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={valueByProject}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="project" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="invoiced" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              <Bar dataKey="posted" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-card">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <h3 className="font-display text-base font-semibold">Exceptions</h3>
          </div>
          <p className="text-xs text-muted-foreground">Items needing immediate attention</p>
          <div className="mt-4 space-y-2">
            {exceptions.map((e) => (
              <div key={e.label} className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50">
                <span className="text-sm">{e.label}</span>
                <StatusBadge status={e.tone === "destructive" ? "fail" : "warning"} />
                <span className="font-mono text-sm font-semibold">{e.count}</span>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" className="mt-4 w-full">View exception queue</Button>
        </div>
      </div>

      {/* Recent DMRs */}
      <div className="mt-6 rounded-xl border bg-card shadow-card">
        <div className="flex items-center justify-between border-b p-5">
          <div>
            <h3 className="font-display text-base font-semibold">Recent DMR Activity</h3>
            <p className="text-xs text-muted-foreground">Latest entries from all sites</p>
          </div>
          <Button variant="ghost" size="sm">View all</Button>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-2.5 font-medium">DMR No</th>
                <th className="px-5 py-2.5 font-medium">Vendor</th>
                <th className="px-5 py-2.5 font-medium">Site</th>
                <th className="px-5 py-2.5 font-medium">Flow</th>
                <th className="px-5 py-2.5 font-medium text-right">Amount</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((d) => (
                <tr key={d.id} className="border-b last:border-0 transition-colors hover:bg-muted/30">
                  <td className="px-5 py-3 font-mono text-xs font-semibold">{d.dmrNo}</td>
                  <td className="px-5 py-3">{d.vendor.name}</td>
                  <td className="px-5 py-3 text-muted-foreground">{d.site}</td>
                  <td className="px-5 py-3">
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold">
                      {d.flow}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-mono">{inr(d.total)}</td>
                  <td className="px-5 py-3"><StatusBadge status={d.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

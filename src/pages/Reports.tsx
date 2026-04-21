import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Download, FileBarChart, FileSpreadsheet, FileText, TrendingUp, AlertCircle, Wallet, History } from "lucide-react";

const reports = [
  { icon: FileBarChart, title: "DMR Pending Report", description: "Open DMRs by site, vendor, and aging bucket", category: "Operations" },
  { icon: FileBarChart, title: "GRN Pending Report", description: "Approved DMRs awaiting SAP posting", category: "Operations" },
  { icon: TrendingUp, title: "Aging Analysis", description: "DMR-to-GRN cycle time across projects", category: "Operations" },
  { icon: AlertCircle, title: "Inventory Variance", description: "Quantity discrepancies between PO, DMR, and GRN", category: "Inventory" },
  { icon: Wallet, title: "Financial Posting Status", description: "MIRO, retention, TDS, and net payable summary", category: "Finance" },
  { icon: History, title: "Audit Trail", description: "All create, edit, approve, post, delete actions", category: "Compliance" },
  { icon: FileText, title: "Vendor-wise Summary", description: "Volumes, values, and payment status per vendor", category: "Vendor" },
  { icon: FileSpreadsheet, title: "Project Cost Roll-up", description: "Material cost rolled up by project & phase", category: "Management" },
];

export default function Reports() {
  return (
    <>
      <PageHeader
        title="Reports & Analytics"
        description="Pre-built operational, financial, and compliance reports — exportable to Excel & PDF."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((r) => (
          <div key={r.title} className="group flex flex-col rounded-xl border bg-card p-5 shadow-card transition-all hover:shadow-elegant">
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground shadow-glow">
                <r.icon className="h-5 w-5" />
              </div>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {r.category}
              </span>
            </div>
            <h3 className="mt-4 font-display font-semibold">{r.title}</h3>
            <p className="mt-1 flex-1 text-sm text-muted-foreground">{r.description}</p>
            <div className="mt-4 flex items-center gap-2">
              <Button variant="outline" size="sm" className="flex-1">View</Button>
              <Button variant="outline" size="sm"><Download className="h-4 w-4" />XLS</Button>
              <Button variant="outline" size="sm"><Download className="h-4 w-4" />PDF</Button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

import { PageHeader } from "@/components/PageHeader";
import { Users, ShieldCheck, Workflow, Database, Settings as Cog, Activity, FileWarning, Sliders, KeySquare } from "lucide-react";
import { Button } from "@/components/ui/button";

const sections = [
  { icon: Users, title: "Users & Roles", description: "Manage 142 users across 4 roles & 12 sites" },
  { icon: ShieldCheck, title: "Permissions Matrix", description: "Granular RBAC and field-level access" },
  { icon: Workflow, title: "Approval Workflows", description: "Configure multi-level approvals by amount, project, type" },
  { icon: Database, title: "SAP Field Mappings", description: "OData / API field mappings to S/4HANA" },
  { icon: Sliders, title: "Tolerance Rules", description: "Price, quantity, and tax tolerance thresholds" },
  { icon: FileWarning, title: "Duplicate Detection", description: "Vendor + invoice no + date matching rules" },
  { icon: KeySquare, title: "SSO & Security", description: "SAML/OIDC, MFA, and session policies" },
  { icon: Activity, title: "Integration Logs", description: "Live SAP API logs, retries, and queue monitor" },
  { icon: Cog, title: "System Parameters", description: "Tax codes, GL defaults, retention %, fiscal year" },
];

export default function Admin() {
  return (
    <>
      <PageHeader
        title="System Administration"
        description="Configure users, workflows, SAP mappings, security, and integration health."
        actions={<Button size="sm" variant="outline">Audit Logs</Button>}
      />

      <div className="mb-6 rounded-xl border bg-gradient-surface p-5 shadow-card">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <Activity className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <div className="font-display text-base font-semibold">System Health: All Green</div>
            <div className="text-sm text-muted-foreground">SAP S/4HANA · OCR Service · Auth · Storage all operational</div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <Pill label="API p95" value="412ms" />
            <Pill label="OCR avg" value="3.1s" />
            <Pill label="Uptime (30d)" value="99.94%" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => (
          <div key={s.title} className="group cursor-pointer rounded-xl border bg-card p-5 shadow-card transition-all hover:border-primary/40 hover:shadow-elegant">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <s.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-display font-semibold">{s.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
            <div className="mt-3 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">Configure →</div>
          </div>
        ))}
      </div>
    </>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-card px-2.5 py-1.5">
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-mono font-semibold">{value}</span>
    </div>
  );
}

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Image, FileSpreadsheet, Download, Search } from "lucide-react";
import { dmrs } from "@/lib/seed";

const docs = dmrs.slice(0, 12).flatMap((d, i) => [
  {
    name: `invoice-${d.invoiceNo.split("/").pop()}.pdf`,
    type: "PDF",
    size: 230 + i * 18,
    linked: d.dmrNo,
    vendor: d.vendor.name,
    uploaded: d.createdAt,
    icon: FileText,
    tone: "destructive",
  },
  ...(i % 2 === 0
    ? [{
        name: `delivery-challan-${d.dmrNo.slice(-5)}.jpg`,
        type: "IMG",
        size: 1240 + i * 50,
        linked: d.dmrNo,
        vendor: d.vendor.name,
        uploaded: d.createdAt,
        icon: Image,
        tone: "accent",
      }]
    : []),
]);

export default function Documents() {
  return (
    <>
      <PageHeader
        title="Document Vault"
        description="Secure invoice & supporting document storage with versioning and access control."
        actions={
          <Button size="sm" className="bg-gradient-primary"><Upload className="h-4 w-4" />Upload</Button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Total Documents", value: "1,284" },
          { label: "Storage Used", value: "12.4 GB" },
          { label: "Linked to DMR", value: "1,206" },
          { label: "Avg per Invoice", value: "2.3" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-4 shadow-card">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{s.label}</div>
            <div className="mt-1 font-display text-2xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input placeholder="Search documents…" className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:shadow-glow" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {docs.map((d, i) => (
          <div key={i} className="group rounded-xl border bg-card p-4 shadow-card transition-all hover:shadow-elegant">
            <div className="flex items-start gap-3">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${
                d.tone === "destructive" ? "bg-destructive/10 text-destructive" : "bg-accent/10 text-accent"
              }`}>
                <d.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{d.name}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{d.vendor}</div>
                <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono font-semibold">{d.type}</span>
                  <span>{d.size.toLocaleString()} KB</span>
                  <span>·</span>
                  <span>{d.uploaded}</span>
                </div>
                <div className="mt-2 font-mono text-[11px] text-primary">→ {d.linked}</div>
              </div>
              <Button variant="ghost" size="icon" className="opacity-0 transition-opacity group-hover:opacity-100">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

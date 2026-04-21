import { useParams, Link } from "react-router-dom";
import { dmrs } from "@/lib/seed";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { inr } from "@/lib/format";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Download,
  Camera,
  PackageCheck,
  Clock,
  User,
  Building2,
  Hash,
} from "lucide-react";

export default function DMRDetail() {
  const { id } = useParams();
  const dmr = dmrs.find((d) => d.id === id) ?? dmrs[0];

  const timeline = [
    { icon: FileText, label: "DMR Created", by: dmr.createdBy, at: dmr.createdAt + " 09:42", done: true },
    { icon: Camera, label: "OCR Processed", by: "OCR Service", at: dmr.createdAt + " 09:43", done: true },
    { icon: CheckCircle2, label: "Validations Run", by: "SAP Connector", at: dmr.createdAt + " 09:44", done: true },
    { icon: User, label: "Submitted for Approval", by: dmr.createdBy, at: dmr.createdAt + " 09:50", done: dmr.status !== "draft" },
    { icon: CheckCircle2, label: "Approved", by: "Site Manager", at: dmr.createdAt + " 11:20", done: ["approved", "grn_posted"].includes(dmr.status) },
    { icon: PackageCheck, label: "GRN Posted to SAP", by: "SAP S/4HANA", at: dmr.createdAt + " 14:05", done: dmr.status === "grn_posted" },
  ];

  return (
    <>
      <Link to="/dmr" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to DMR list
      </Link>

      <PageHeader
        title={dmr.dmrNo}
        description={`Created by ${dmr.createdBy} on ${dmr.createdAt} · ${dmr.site}`}
        actions={
          <>
            <Button variant="outline" size="sm"><Download className="h-4 w-4" />Download</Button>
            {dmr.status === "submitted" || dmr.status === "validated" ? (
              <>
                <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10">
                  <XCircle className="h-4 w-4" /> Reject
                </Button>
                <Button size="sm" className="bg-gradient-success">
                  <CheckCircle2 className="h-4 w-4" /> Approve & Post GRN
                </Button>
              </>
            ) : null}
          </>
        }
      />

      {/* Status banner */}
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border bg-gradient-surface p-4">
        <StatusBadge status={dmr.status} />
        <span className="rounded bg-muted px-2 py-0.5 font-mono text-[10px] font-semibold">{dmr.flow}</span>
        <span className="text-sm text-muted-foreground">·</span>
        <StatusBadge status={dmr.validations[0].level} />
        <span className="text-sm">{dmr.validations[0].message}</span>
        <span className="ml-auto text-xs text-muted-foreground">
          OCR confidence: <span className="font-mono font-semibold text-foreground">{Math.round(dmr.ocrConfidence * 100)}%</span>
        </span>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-5 lg:col-span-2">
          {/* Header info */}
          <div className="rounded-xl border bg-card p-5 shadow-card">
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Document Information
            </h3>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
              <Field icon={Building2} label="Vendor" value={dmr.vendor.name} sub={dmr.vendor.code} />
              <Field icon={Hash} label="GSTIN" value={dmr.vendor.gstin} mono />
              <Field icon={Hash} label="PAN" value={dmr.vendor.pan} mono />
              <Field icon={FileText} label="Invoice No" value={dmr.invoiceNo} mono />
              <Field icon={Clock} label="Invoice Date" value={dmr.invoiceDate} />
              <Field icon={Hash} label={dmr.flow === "PO" ? "PO Number" : "PR Number"} value={dmr.poNo ?? dmr.prNo ?? "—"} mono />
              <Field icon={Building2} label="Site" value={dmr.site} />
              <Field icon={Building2} label="Project" value={dmr.project} />
              <Field icon={Hash} label="GL Code" value={dmr.glCode ?? "—"} mono />
            </div>
          </div>

          {/* Line items */}
          <div className="rounded-xl border bg-card shadow-card">
            <div className="border-b p-5">
              <h3 className="font-display text-base font-semibold">Line Items</h3>
              <p className="text-xs text-muted-foreground">Material details from invoice</p>
            </div>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-2.5 font-medium">Material</th>
                    <th className="px-5 py-2.5 font-medium">UOM</th>
                    <th className="px-5 py-2.5 font-medium text-right">Qty</th>
                    <th className="px-5 py-2.5 font-medium text-right">Rate</th>
                    <th className="px-5 py-2.5 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {dmr.lineItems.map((li) => (
                    <tr key={li.id} className="border-b last:border-0">
                      <td className="px-5 py-3">
                        <div className="font-medium">{li.description}</div>
                        <div className="font-mono text-[11px] text-muted-foreground">{li.materialCode}</div>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{li.uom}</td>
                      <td className="px-5 py-3 text-right font-mono">{li.qty}</td>
                      <td className="px-5 py-3 text-right font-mono">{inr(li.rate)}</td>
                      <td className="px-5 py-3 text-right font-mono font-semibold">{inr(li.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/30 text-sm">
                  <tr className="border-t">
                    <td colSpan={4} className="px-5 py-2 text-right text-muted-foreground">Subtotal</td>
                    <td className="px-5 py-2 text-right font-mono">{inr(dmr.subtotal)}</td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="px-5 py-2 text-right text-muted-foreground">CGST 9%</td>
                    <td className="px-5 py-2 text-right font-mono">{inr(dmr.cgst)}</td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="px-5 py-2 text-right text-muted-foreground">SGST 9%</td>
                    <td className="px-5 py-2 text-right font-mono">{inr(dmr.sgst)}</td>
                  </tr>
                  <tr className="border-t">
                    <td colSpan={4} className="px-5 py-3 text-right font-semibold">Total</td>
                    <td className="px-5 py-3 text-right font-mono text-base font-bold">{inr(dmr.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Validations */}
          <div className="rounded-xl border bg-card p-5 shadow-card">
            <h3 className="font-display text-base font-semibold">SAP Validations</h3>
            <div className="mt-3 space-y-2">
              {[
                { level: "pass", label: "Vendor master matched", detail: `${dmr.vendor.name} · ${dmr.vendor.code}` },
                { level: dmr.flow === "PO" ? "pass" : "warning", label: "PO existence", detail: dmr.poNo ?? "Non-PO flow — PR required" },
                { level: "pass", label: "Material master valid", detail: "All line items resolved" },
                { level: dmr.validations[0].level, label: "Price tolerance check", detail: dmr.validations[0].message },
                { level: "pass", label: "Tax structure", detail: "GST split valid" },
              ].map((v, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
                  {v.level === "pass" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                  ) : v.level === "warning" ? (
                    <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                  )}
                  <div className="flex-1">
                    <div className="text-sm font-medium">{v.label}</div>
                    <div className="text-xs text-muted-foreground">{v.detail}</div>
                  </div>
                  <StatusBadge status={v.level} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <div className="rounded-xl border bg-card p-5 shadow-card">
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">Activity Timeline</h3>
            <div className="mt-4 space-y-4">
              {timeline.map((t, i) => (
                <div key={i} className="flex gap-3">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-card ${
                      t.done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <t.icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 border-l border-dashed pl-4 -ml-4 pt-1">
                    <div className={`text-sm font-medium ${t.done ? "" : "text-muted-foreground"}`}>{t.label}</div>
                    <div className="text-xs text-muted-foreground">{t.by} · {t.at}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5 shadow-card">
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">Attachments</h3>
            <div className="mt-3 space-y-2">
              {Array.from({ length: dmr.attachments }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border p-2.5 transition-colors hover:bg-muted/50">
                  <div className="flex h-9 w-9 items-center justify-center rounded bg-destructive/10 text-destructive">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="flex-1 text-sm">
                    <div className="font-medium">invoice-{dmr.invoiceNo.split("/").pop()}-{i + 1}.pdf</div>
                    <div className="text-xs text-muted-foreground">{(120 + i * 45).toLocaleString()} KB</div>
                  </div>
                  <Button variant="ghost" size="icon"><Download className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Field({
  icon: Icon,
  label,
  value,
  sub,
  mono,
}: {
  icon: any;
  label: string;
  value: string;
  sub?: string;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className={`mt-1 font-medium ${mono ? "font-mono text-xs" : ""}`}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

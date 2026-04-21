import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Camera, Save, Send } from "lucide-react";
import { Link } from "react-router-dom";

export default function DMRNew() {
  return (
    <>
      <Link to="/dmr" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to DMR list
      </Link>
      <PageHeader
        title="New DMR Entry"
        description="Capture a daily material receipt — start by uploading invoice or filling manually."
        actions={
          <>
            <Button variant="outline" size="sm"><Save className="h-4 w-4" />Save Draft</Button>
            <Button size="sm" className="bg-gradient-primary"><Send className="h-4 w-4" />Submit</Button>
          </>
        }
      />

      <div className="mb-5 rounded-xl border-2 border-dashed border-primary/30 bg-gradient-surface p-6 text-center">
        <Camera className="mx-auto h-10 w-10 text-primary" />
        <h3 className="mt-3 font-display text-base font-semibold">Start with OCR Capture</h3>
        <p className="mt-1 text-sm text-muted-foreground">Auto-extract vendor, invoice, PO, and line items in seconds</p>
        <Button className="mt-4 bg-gradient-primary" asChild>
          <Link to="/ocr">Open Capture →</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          <Section title="Document Information">
            <Grid>
              <Field label="Flow type">
                <select className="h-9 w-full rounded-md border bg-background px-2.5 text-sm outline-none focus:shadow-glow">
                  <option>PO-based</option>
                  <option>Non-PO</option>
                </select>
              </Field>
              <Field label="PO Number"><TextInput placeholder="PO-45100012" /></Field>
              <Field label="Vendor"><TextInput placeholder="Search vendor master…" /></Field>
              <Field label="Invoice No"><TextInput placeholder="INV/…" /></Field>
              <Field label="Invoice Date"><TextInput type="date" /></Field>
              <Field label="Site / Project"><TextInput placeholder="Site BLR-01" /></Field>
            </Grid>
          </Section>

          <Section title="Line Items">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 font-medium">Material</th>
                    <th className="py-2 font-medium">UOM</th>
                    <th className="py-2 font-medium text-right">Qty</th>
                    <th className="py-2 font-medium text-right">Rate</th>
                    <th className="py-2 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2].map((i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 pr-2"><TextInput placeholder="Search material…" /></td>
                      <td className="py-2 pr-2"><TextInput className="w-20" defaultValue="BAG" /></td>
                      <td className="py-2 pr-2"><TextInput className="w-24 text-right" /></td>
                      <td className="py-2 pr-2"><TextInput className="w-28 text-right" /></td>
                      <td className="py-2 text-right font-mono">—</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button variant="outline" size="sm" className="mt-3">+ Add line</Button>
          </Section>
        </div>

        <div className="space-y-4">
          <Section title="Tax Summary">
            <Row label="Subtotal" value="—" />
            <Row label="CGST 9%" value="—" />
            <Row label="SGST 9%" value="—" />
            <Row label="IGST" value="—" />
            <div className="mt-2 border-t pt-2">
              <Row label="Total" value="—" bold />
            </div>
          </Section>

          <Section title="Attachments">
            <div className="rounded-lg border-2 border-dashed p-6 text-center text-sm text-muted-foreground">
              Drop files here or <span className="font-medium text-primary">browse</span>
            </div>
          </Section>
        </div>
      </div>
    </>
  );
}

function TextInput({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-9 w-full rounded-md border bg-background px-2.5 text-sm outline-none focus:shadow-glow ${className}`}
    />
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-card">
      <h3 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-1 text-sm ${bold ? "font-semibold" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}

import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Camera, Upload, FileScan, RotateCw, Crop, ZoomIn, CheckCircle2, AlertTriangle, Sparkles, Image as ImageIcon } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Link } from "react-router-dom";

const extracted = [
  { field: "Vendor Name", value: "Ultratech Cement Ltd.", confidence: 0.97 },
  { field: "GSTIN", value: "27AAACU0042B1Z5", confidence: 0.94 },
  { field: "Invoice No", value: "INV/V10042/08812", confidence: 0.92 },
  { field: "Invoice Date", value: "2026-04-18", confidence: 0.88 },
  { field: "PO Number", value: "PO-45100012", confidence: 0.81 },
  { field: "Subtotal", value: "₹ 2,84,500", confidence: 0.86 },
  { field: "CGST 9%", value: "₹ 25,605", confidence: 0.74 },
  { field: "SGST 9%", value: "₹ 25,605", confidence: 0.74 },
  { field: "Total", value: "₹ 3,35,710", confidence: 0.91 },
  { field: "Place of Supply", value: "Karnataka", confidence: 0.62 },
];

export default function OCRCapture() {
  const [stage, setStage] = useState<"capture" | "review">("review");

  return (
    <>
      <PageHeader
        title="OCR Invoice Capture"
        description="Capture invoices via mobile camera, scanner, or PDF upload — extract & validate in seconds."
        actions={
          stage === "review" && (
            <>
              <Button variant="outline" size="sm" onClick={() => setStage("capture")}>
                <RotateCw className="h-4 w-4" /> Re-capture
              </Button>
              <Button size="sm" className="bg-gradient-primary" asChild>
                <Link to="/dmr/dmr-1">Create DMR</Link>
              </Button>
            </>
          )
        }
      />

      {stage === "capture" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <CaptureCard icon={Camera} title="Mobile Camera" description="Open camera and snap the invoice" tone="primary" onClick={() => setStage("review")} />
          <CaptureCard icon={FileScan} title="Scanner Upload" description="Upload from your scanner output" tone="accent" onClick={() => setStage("review")} />
          <CaptureCard icon={Upload} title="PDF / Image File" description="Drag & drop or browse files (max 20 MB)" tone="success" onClick={() => setStage("review")} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Preview */}
          <div className="rounded-xl border bg-card shadow-card">
            <div className="flex items-center justify-between border-b p-4">
              <div>
                <div className="font-display text-sm font-semibold">Invoice Preview</div>
                <div className="text-xs text-muted-foreground">invoice-08812.pdf · Page 1 of 1</div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon"><ZoomIn className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon"><Crop className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon"><RotateCw className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="aspect-[4/5] overflow-hidden bg-gradient-to-br from-muted/40 to-muted/10 p-6">
              <div className="flex h-full flex-col rounded-lg border-2 border-dashed border-border bg-card p-6 text-xs">
                <div className="flex items-start justify-between border-b pb-3">
                  <div>
                    <div className="font-display text-base font-bold">ULTRATECH CEMENT LTD.</div>
                    <div className="text-[10px] text-muted-foreground">Aditya Birla Group</div>
                    <div className="mt-2 text-[10px] text-muted-foreground">B Wing, Ahura Centre, Mahakali Caves Road<br/>Andheri (E), Mumbai - 400093</div>
                    <div className="mt-1 text-[10px] font-mono">GSTIN: 27AAACU0042B1Z5</div>
                  </div>
                  <div className="text-right">
                    <div className="font-display font-bold">TAX INVOICE</div>
                    <div className="mt-2 text-[10px]">No: <span className="font-mono">INV/V10042/08812</span></div>
                    <div className="text-[10px]">Date: <span className="font-mono">18-Apr-2026</span></div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <div className="text-muted-foreground">Bill To</div>
                    <div className="font-semibold">M/s Construction Pvt. Ltd.</div>
                    <div>Site BLR-01 · Metro Phase III</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">PO Reference</div>
                    <div className="font-mono font-semibold">PO-45100012</div>
                  </div>
                </div>
                <table className="mt-4 w-full border-collapse text-[10px]">
                  <thead>
                    <tr className="border-y bg-muted/30">
                      <th className="px-1 py-1 text-left">Material</th>
                      <th className="px-1 py-1 text-right">Qty</th>
                      <th className="px-1 py-1 text-right">Rate</th>
                      <th className="px-1 py-1 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="px-1 py-1.5">OPC 43 Grade Cement 50kg</td>
                      <td className="px-1 py-1.5 text-right font-mono">200</td>
                      <td className="px-1 py-1.5 text-right font-mono">385</td>
                      <td className="px-1 py-1.5 text-right font-mono">77,000</td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-1 py-1.5">PPC Cement 50kg</td>
                      <td className="px-1 py-1.5 text-right font-mono">540</td>
                      <td className="px-1 py-1.5 text-right font-mono">385</td>
                      <td className="px-1 py-1.5 text-right font-mono">2,07,900</td>
                    </tr>
                  </tbody>
                </table>
                <div className="mt-auto space-y-0.5 text-right text-[10px] font-mono">
                  <div>Subtotal: ₹ 2,84,500</div>
                  <div>CGST 9%: ₹ 25,605</div>
                  <div>SGST 9%: ₹ 25,605</div>
                  <div className="border-t pt-1 text-sm font-bold">Total: ₹ 3,35,710</div>
                </div>
              </div>
            </div>
          </div>

          {/* Extraction */}
          <div className="space-y-4">
            <div className="rounded-xl border bg-gradient-surface p-4 shadow-card">
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-accent" />
                <span className="font-semibold">Extraction completed in 2.4s</span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-3 text-xs">
                <Stat label="Fields detected" value="10 / 10" />
                <Stat label="Avg confidence" value="84%" />
                <Stat label="Needs review" value="3" tone="warning" />
              </div>
            </div>

            <div className="rounded-xl border bg-card shadow-card">
              <div className="border-b p-4">
                <div className="font-display text-sm font-semibold">Extracted Fields</div>
                <div className="text-xs text-muted-foreground">Review and correct low-confidence fields</div>
              </div>
              <div className="divide-y">
                {extracted.map((f) => {
                  const low = f.confidence < 0.8;
                  return (
                    <div key={f.field} className="flex items-center gap-3 p-3">
                      <div className="w-32 shrink-0 text-xs text-muted-foreground">{f.field}</div>
                      <input
                        defaultValue={f.value}
                        className={`flex-1 rounded-md border bg-background px-2.5 py-1.5 text-sm outline-none focus:shadow-glow ${
                          low ? "border-warning/40 bg-warning/5" : ""
                        }`}
                      />
                      <div className="flex items-center gap-1.5">
                        {low ? (
                          <AlertTriangle className="h-4 w-4 text-warning" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        )}
                        <span className="w-9 text-right font-mono text-xs font-semibold">
                          {Math.round(f.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CaptureCard({ icon: Icon, title, description, tone, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-start rounded-xl border-2 border-dashed bg-card p-6 text-left transition-all hover:border-primary hover:bg-gradient-surface hover:shadow-elegant"
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
        <Icon className="h-6 w-6" />
      </div>
      <div className="font-display font-semibold">{title}</div>
      <div className="mt-1 text-sm text-muted-foreground">{description}</div>
      <div className="mt-4 text-xs font-medium text-primary group-hover:underline">Start →</div>
    </button>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warning" }) {
  return (
    <div className="rounded-lg border bg-card p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-0.5 font-display text-base font-bold ${tone === "warning" ? "text-warning" : ""}`}>{value}</div>
    </div>
  );
}

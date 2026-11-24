import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, Plus, Printer, Save, Search, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

type Row = Record<string, string | boolean>;

const COLUMNS: { key: string; label: string; type?: "check" | "select"; options?: string[]; w?: string }[] = [
  { key: "matText", label: "Mat. Short Text", w: "min-w-[200px]" },
  { key: "wa", label: "WA", type: "check" },
  { key: "ok", label: "OK", type: "check" },
  { key: "qty", label: "Qty in UnE" },
  { key: "eun", label: "EUn" },
  { key: "sloc", label: "SLoc" },
  { key: "profitCenter", label: "Profit Center" },
  { key: "batch", label: "Batch" },
  { key: "valuationType", label: "Valuation Type" },
  { key: "movementType", label: "Movement Type" },
  { key: "direction", label: "Direction" },
  { key: "stockType", label: "Stock Type", type: "select", options: ["Unrestricted-Use", "Quality Inspection", "Blocked Stock"] },
  { key: "plant", label: "Plant" },
  { key: "jitCall", label: "JIT Call Number" },
  { key: "item", label: "Item" },
  { key: "specialStock", label: "Special Stock" },
  { key: "customer", label: "Customer" },
  { key: "vendor", label: "Vendor" },
  { key: "salesOrder", label: "Sales Order" },
  { key: "salesOrderItem", label: "Sales Ord. Item" },
  { key: "wbs", label: "WBS Element" },
  { key: "supplier", label: "Supplier" },
  { key: "qtyOpun", label: "Qty in OPUn" },
  { key: "opun", label: "OPUn" },
  { key: "purchaseOrder", label: "Purchase Order" },
  { key: "poItem", label: "PO Item" },
  { key: "delivered", label: "D", type: "check" },
  { key: "delComplInd", label: "Del. Compl. Ind.", type: "select", options: ["1 Set automatically", "2 Set", "3 Do not set"] },
  { key: "delDate", label: "Del. Date" },
  { key: "material", label: "Material" },
  { key: "vendorMaterial", label: "Vendor Material Number" },
  { key: "supplierBatch", label: "Supplier Batch" },
  { key: "storageLocation", label: "Storage Location" },
  { key: "storageBin", label: "Storage Bin" },
  { key: "requisitioner", label: "Requisitioner" },
  { key: "reason", label: "Reason" },
  { key: "reasonText", label: "Text for Reason" },
  { key: "orderQty", label: "Order Quantity" },
  { key: "received", label: "Received" },
  { key: "issued", label: "Issued" },
  { key: "orderUnit", label: "OUn" },
  { key: "promotion", label: "Promotion" },
  { key: "extAmount", label: "Ext. Amount LC" },
  { key: "currency", label: "Currency" },
];

const today = new Date().toISOString().slice(0, 10);
const emptyRow = (): Row => ({ movementType: "101", direction: "+", stockType: "Unrestricted-Use", delComplInd: "1 Set automatically", currency: "INR" });

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[130px_1fr] items-center gap-3">
      <Label className="text-right text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

const sel = "h-9 w-full rounded-md border border-input bg-background px-2 text-sm";

export default function GRNCreate() {
  const [h, setH] = useState({
    action: "A01 Goods Receipt", ref: "R01 Purchase Order", poNumber: "", poItem: "", plant: "", movementType: "101",
    docDate: today, postDate: today, slip: "1 Individual Slip", printSlip: false, deliveryNote: "", billOfLading: "",
    slipNo: "", headerText: "", supplier: "", vendor: "", vendorName: "", postalCode: "", city: "",
    purchasingGroup: "", orderedBy: "",
  });
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [selected, setSelected] = useState<number | null>(null);
  const set = (k: keyof typeof h, v: string | boolean) => setH((p) => ({ ...p, [k]: v }));
  const setCell = (i: number, k: string, v: string | boolean) => setRows((r) => r.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  return (
    <>
      <PageHeader
        title="Create GRN"
        description="Post goods receipt against a purchase order (MIGO-style)."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => toast.info("Check completed — no errors found")}>Check</Button>
            <Button size="sm" onClick={() => toast.info("GRN posting to SAP is not connected yet")}><Save className="h-4 w-4" />Post</Button>
          </>
        }
      />

      <div className="rounded-xl border bg-card p-4 shadow-card">
        <div className="flex flex-wrap items-center gap-3">
          <select className={`${sel} w-48`} value={h.action} onChange={(e) => set("action", e.target.value)}>
            {["A01 Goods Receipt", "A02 Return Delivery", "A04 Display", "A07 Goods Issue"].map((o) => <option key={o}>{o}</option>)}
          </select>
          <select className={`${sel} w-48`} value={h.ref} onChange={(e) => set("ref", e.target.value)}>
            {["R01 Purchase Order", "R02 Material Document", "R05 Outbound Delivery"].map((o) => <option key={o}>{o}</option>)}
          </select>
          <Input className="w-40 font-mono" placeholder="PO Number" value={h.poNumber} onChange={(e) => set("poNumber", e.target.value)} />
          <Input className="w-20 font-mono" placeholder="Item" value={h.poItem} onChange={(e) => set("poItem", e.target.value)} />
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Plant:</Label>
            <Input className="w-24" value={h.plant} onChange={(e) => set("plant", e.target.value)} />
          </div>
          <Button variant="outline" size="icon" aria-label="Search PO" onClick={() => toast.info("PO lookup is not connected yet")}><Search className="h-4 w-4" /></Button>
          <div className="ml-auto flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">GR goods receipt</Label>
            <Input className="w-20 font-mono" value={h.movementType} onChange={(e) => set("movementType", e.target.value)} />
          </div>
        </div>

        <Tabs defaultValue="general" className="mt-5">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="vendor">Vendor</TabsTrigger>
            <TabsTrigger value="partner" aria-label="Partner"><Users className="h-4 w-4" /></TabsTrigger>
          </TabsList>
          <TabsContent value="general" className="pt-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="space-y-3">
                <Field label="Document Date"><Input type="date" value={h.docDate} onChange={(e) => set("docDate", e.target.value)} /></Field>
                <Field label="Posting Date"><Input type="date" value={h.postDate} onChange={(e) => set("postDate", e.target.value)} /></Field>
                <div className="grid grid-cols-[130px_1fr] items-center gap-3">
                  <div className="flex items-center justify-end gap-2">
                    <Printer className="h-4 w-4 text-muted-foreground" />
                    <Checkbox checked={h.printSlip} onCheckedChange={(v) => set("printSlip", !!v)} aria-label="Print slip" />
                  </div>
                  <select className={sel} value={h.slip} onChange={(e) => set("slip", e.target.value)}>
                    {["1 Individual Slip", "2 Indiv. Slip w. Inspect. Text", "3 Collective Slip"].map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-3">
                <Field label="Delivery Note"><Input value={h.deliveryNote} onChange={(e) => set("deliveryNote", e.target.value)} /></Field>
                <Field label="Bill of Lading"><Input value={h.billOfLading} onChange={(e) => set("billOfLading", e.target.value)} /></Field>
                <Field label="GR/GI Slip No."><Input value={h.slipNo} onChange={(e) => set("slipNo", e.target.value)} /></Field>
              </div>
              <div className="space-y-3">
                <Field label="Supplier"><Input readOnly className="bg-muted" value={h.supplier} /></Field>
                <Field label="Header Text"><Input value={h.headerText} onChange={(e) => set("headerText", e.target.value)} /></Field>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="vendor" className="pt-4">
            <div className="max-w-xl space-y-3">
              <Field label="Vendor"><Input className="font-mono" value={h.vendor} onChange={(e) => set("vendor", e.target.value)} /></Field>
              <Field label="Name"><Input value={h.vendorName} onChange={(e) => set("vendorName", e.target.value)} /></Field>
              <Field label="Postal Code / City">
                <div className="grid grid-cols-[120px_1fr] gap-2">
                  <Input value={h.postalCode} onChange={(e) => set("postalCode", e.target.value)} />
                  <Input value={h.city} onChange={(e) => set("city", e.target.value)} />
                </div>
              </Field>
            </div>
          </TabsContent>
          <TabsContent value="partner" className="pt-4">
            <div className="max-w-xl space-y-3">
              <Field label="Purchasing Group"><Input value={h.purchasingGroup} onChange={(e) => set("purchasingGroup", e.target.value)} /></Field>
              <Field label="Ordered By"><Input value={h.orderedBy} onChange={(e) => set("orderedBy", e.target.value)} /></Field>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="mt-5 rounded-xl border bg-card shadow-card">
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="font-display text-base font-semibold">Items <span className="text-xs font-normal text-muted-foreground">({rows.length})</span></h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setRows((r) => [...r, emptyRow()])}><Plus className="h-4 w-4" />Add Line</Button>
            <Button variant="outline" size="sm" disabled={selected === null}
              onClick={() => { setRows((r) => r.filter((_, i) => i !== selected)); setSelected(null); }}>
              <Trash2 className="h-4 w-4" />Delete
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-max min-w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="sticky left-0 z-10 bg-muted px-3 py-2 font-medium">Line</th>
                {COLUMNS.map((c) => <th key={c.key} className={`whitespace-nowrap px-2 py-2 font-medium ${c.w ?? ""}`}>{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className={`border-b last:border-0 ${selected === i ? "bg-primary/5" : ""}`}>
                  <td className="sticky left-0 z-10 bg-card px-3 py-1.5">
                    <button type="button" onClick={() => setSelected(selected === i ? null : i)}
                      className={`h-7 w-9 rounded-md border text-xs font-semibold ${selected === i ? "border-primary text-primary" : ""}`}>{i + 1}</button>
                  </td>
                  {COLUMNS.map((c) => (
                    <td key={c.key} className="px-1 py-1">
                      {c.type === "check" ? (
                        <div className="flex justify-center"><Checkbox checked={!!r[c.key]} onCheckedChange={(v) => setCell(i, c.key, !!v)} /></div>
                      ) : c.type === "select" ? (
                        <select className={`${sel} h-8 min-w-[150px]`} value={String(r[c.key] ?? "")} onChange={(e) => setCell(i, c.key, e.target.value)}>
                          {c.options!.map((o) => <option key={o}>{o}</option>)}
                        </select>
                      ) : (
                        <Input className={`h-8 ${c.w ?? "min-w-[110px]"}`} value={String(r[c.key] ?? "")} onChange={(e) => setCell(i, c.key, e.target.value)} />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {rows.length > 0 && (() => {
        const di = Math.min(selected ?? 0, rows.length - 1);
        const r = rows[di];
        const v = (k: string) => String(r[k] ?? "");
        const ed = (k: string, cls = "") => <Input className={cls} value={v(k)} onChange={(e) => setCell(di, k, e.target.value)} />;
        const ro = (k: string, cls = "") => <Input readOnly className={`bg-muted ${cls}`} value={v(k)} />;
        const pair = (a: React.ReactNode, b: React.ReactNode) => <div className="grid grid-cols-[1fr_100px] gap-2">{a}{b}</div>;
        return (
          <div className="mt-5 rounded-xl border bg-card shadow-card">
            <Tabs defaultValue="material" className="p-4">
              <TabsList className="flex-wrap h-auto">
                {[["material","Material"],["quantity","Quantity"],["where","Where"],["po","Purchase Order Data"],["partner","Partner"],["acct","Account Assignment"],["custom","Custom Fields"]].map(([k,l]) => <TabsTrigger key={k} value={k}>{l}</TabsTrigger>)}
              </TabsList>
              <TabsContent value="material" className="pt-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-3">
                    <Field label="Material">{pair(ro("matText"), ro("material", "font-mono"))}</Field>
                    <Field label="Supplier Mat. No.">{ro("vendorMaterial")}</Field>
                    <Field label="Material Group">{ro("materialGroup", "w-40 font-mono")}</Field>
                  </div>
                  <div className="space-y-3 lg:pt-24">
                    <Field label="EAN in Order Unit">{ed("ean")}</Field>
                    <Field label="EAN Check">{pair(ed("eanCheck"), ed("eanCheckFlag"))}</Field>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="quantity" className="pt-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-3">
                    <Field label="Qty in Unit of Entry">{pair(ed("qty"), ed("eun"))}</Field>
                    <Field label="Qty in SKU">{pair(ro("qtySku"), ro("eun"))}</Field>
                    <Field label="Qty in Delivery Note">{pair(ed("qtyDelNote"), ed("delNoteUnit"))}</Field>
                    <Field label="Quantity Ordered">{pair(ro("orderQty"), ro("orderUnit"))}</Field>
                  </div>
                  <div className="space-y-3 lg:pt-36">
                    <Field label="No. Containers">{pair(ed("containers"), ed("containerUnit"))}</Field>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="where" className="pt-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-3">
                    <Field label="Movement Type">
                      <div className="flex items-center gap-2">{ed("movementType", "w-20 font-mono")}<span className="text-sm text-muted-foreground">{v("direction") || "+"} GR goods receipt</span></div>
                    </Field>
                    <Field label="Plant">{pair(ro("plantName"), ro("plant", "font-mono"))}</Field>
                    <Field label="Storage Location">{pair(ed("slocName"), ro("sloc", "font-mono"))}</Field>
                    <Field label="Goods Recipient">{ed("goodsRecipient", "w-48")}</Field>
                    <Field label="Unloading Point">{ed("unloadingPoint", "w-72")}</Field>
                    <Field label="Text">{ed("itemText")}</Field>
                  </div>
                  <div className="space-y-3">
                    <Field label="Stock type">
                      <select className={sel} value={v("stockType")} onChange={(e) => setCell(di, "stockType", e.target.value)}>
                        {["Unrestricted-Use", "Quality Inspection", "Blocked Stock"].map((o) => <option key={o}>{o}</option>)}
                      </select>
                    </Field>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="po" className="pt-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-3">
                    <Field label="Purchase Order">{pair(ro("purchaseOrder", "font-mono"), ro("poItem", "font-mono"))}</Field>
                    <Field label='"Del.Completed" Ind.'>
                      <select className={sel} value={v("delComplInd")} onChange={(e) => setCell(di, "delComplInd", e.target.value)}>
                        {["1 Set automatically", "2 Set", "3 Do not set"].map((o) => <option key={o}>{o}</option>)}
                      </select>
                    </Field>
                  </div>
                  <div className="space-y-3">
                    <Field label="Item Category"><span className="text-sm">{v("itemCategory") || "Standard"}</span></Field>
                    <div className="flex items-center gap-2 pl-[142px] text-sm text-muted-foreground">
                      <Checkbox disabled checked={!!r.delivered} /> Del. Compl. Ind. PO Item
                    </div>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="partner" className="pt-4">
                <div className="max-w-2xl"><Field label="Vendor">{pair(ro("vendorName"), ro("vendor", "font-mono"))}</Field></div>
              </TabsContent>
              <TabsContent value="acct" className="pt-4">
                <div className="max-w-md"><Field label="Profit Ctrs">{ro("profitCenter", "font-mono")}</Field></div>
              </TabsContent>
              <TabsContent value="custom" className="pt-4">
                <p className="text-sm text-muted-foreground">No custom fields configured.</p>
              </TabsContent>
            </Tabs>
            <div className="flex items-center gap-4 border-t bg-muted/30 px-4 py-2">
              <div className="flex gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Previous line" disabled={di === 0} onClick={() => setSelected(di - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Next line" disabled={di >= rows.length - 1} onClick={() => setSelected(di + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={!!r.ok} onCheckedChange={(x) => setCell(di, "ok", !!x)} />Item OK</label>
              <div className="ml-8 flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Line:</span>
                <Input type="number" min={1} max={rows.length} className="h-8 w-20" value={di + 1}
                  onChange={(e) => { const n = Number(e.target.value); if (n >= 1 && n <= rows.length) setSelected(n - 1); }} />
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}

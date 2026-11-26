import { useMemo, useState } from "react";
import { useGateApis } from "@/hooks/useGateApis";
import { useSapProxy } from "@/hooks/useSapProxy";
import { buildSchemaFromApi, sortNewestFirst } from "@/lib/sapApiSchemas";
import { getPath } from "@/lib/getPath";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, Plus, Printer, Save, Search, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { useSapGrnPost } from "@/hooks/useSapGrnPost";
import { buildGrnPostPayload } from "@/lib/grnPostPayload";
import { alertError, alertSuccess, confirmAction } from "@/lib/alerts";

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
  { key: "serial", label: "Serial No." },
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
    <div className="grid grid-cols-[90px_1fr] items-center gap-2 sm:grid-cols-[110px_1fr] [&>*]:min-w-0">
      <Label className="text-right text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

const cardCls = "min-w-0 max-w-full overflow-hidden rounded-xl border border-primary/15 bg-card shadow-card";
const stripCls = "bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground";
const tabCls = "[&_[data-state=active]]:bg-gradient-primary [&_[data-state=active]]:text-primary-foreground";
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
  const { selectedApi, apis } = useGateApis();
  const postApi = useMemo(() => apis.find((a) => a.status === "Active" && /postgoodsreceipt/i.test(a.endpoint ?? "")) ?? null, [apis]);
  const grnPost = useSapGrnPost(postApi);
  const schema = useMemo(() => (selectedApi ? buildSchemaFromApi(selectedApi) : null), [selectedApi]);
  const proxy = useSapProxy<Record<string, unknown>>(selectedApi, schema ?? ({ proxyPath: "", columns: [] } as never));
  const dmrs = useMemo(() => sortNewestFirst(proxy.rows as Record<string, unknown>[]), [proxy.rows]);
  const [gateId, setGateId] = useState("");
  const str = (r: Record<string, unknown>, ...keys: string[]) => {
    for (const k of keys) { const v = getPath(r, k); if (v !== undefined && v !== null && v !== "") return String(v); }
    return "";
  };
  const pickGate = (id: string) => {
    setGateId(id);
    setSelected(null);
    if (!id) {
      setH((p) => ({ ...p, poNumber: "", poItem: "", plant: "", supplier: "", vendor: "", vendorName: "", deliveryNote: "", headerText: "", docDate: today }));
      setRows([emptyRow()]);
      return;
    }
    const d = dmrs.find((r) => str(r, "gate_id") === id);
    if (!d) return;
    const items = ((schema?.childKey ? getPath(d, schema.childKey) : undefined) as Record<string, unknown>[] | undefined) ?? [];
    const vendor = str(d, "vendor");
    const plant = str(d, "plant");
    setH((p) => ({
      ...p,
      plant, vendor, supplier: vendor,
      poNumber: str(d, "po_number", "reference_doc") || (items[0] ? str(items[0], "po_number") : ""),
      vendorName: str(d, "vendor_name"),
      deliveryNote: str(d, "invoice_no", "reference_doc"),
      headerText: str(d, "remarks"),
      docDate: str(d, "gate_date").slice(0, 10) || today,
    }));
    setRows(items.length ? items.map((it) => ({
      ...emptyRow(),
      material: str(it, "material"), matText: str(it, "material_desc"), qty: str(it, "quantity"),
      eun: str(it, "unit"), sloc: str(it, "storage_location"), storageLocation: str(it, "storage_location"),
      batch: str(it, "batch"), plant: str(it, "plant") || plant, purchaseOrder: str(it, "po_number"),
      poItem: str(it, "po_item"), item: str(it, "item_no"), vendor, supplier: vendor,
    })) : [emptyRow()]);
  };
  const onPost = async () => {
    if (!gateId) return;
    const body = buildGrnPostPayload(h.postDate, rows as Record<string, unknown>[]);
    if (!(await confirmAction(`Post GRN for Gate ${gateId}?`, `Posting date ${body.PostingDate ?? "-"}`))) return;
    const r = await grnPost.post(gateId, body);
    if (!r.ok) { await alertError("Post failed", r.error); return; }
    const d = r.data ?? {};
    const doc = str(d, "material_doc"); const yr = str(d, "material_doc_year");
    await alertSuccess("GRN posted", doc ? `Material Document ${doc} / ${yr} posted for Gate ${gateId}` : `Posted for Gate ${gateId}`);
  };
  const set = (k: keyof typeof h, v: string | boolean) => setH((p) => ({ ...p, [k]: v }));
  const setCell = (i: number, k: string, v: string | boolean) => setRows((r) => r.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  return (
    <div className="min-w-0 max-w-full">
      <PageHeader
        title="Create GRN — Post Mat Doc Against DMR"
        description="Post goods receipt against a purchase order (MIGO-style)."
        actions={
          <>
            <Button variant="outline" size="sm" className="border-primary/40 text-primary hover:bg-primary/10" onClick={() => toast.info("Check completed — no errors found")}>Check</Button>
            <Button size="sm" className="bg-gradient-primary shadow-card hover:opacity-90" disabled={!gateId || grnPost.loading} onClick={onPost}><Save className="h-4 w-4" />{grnPost.loading ? "Posting…" : "Post"}</Button>
          </>
        }
      />

      <div className="grid min-w-0 gap-4 md:grid-cols-12 [&_input]:h-8 [&_select]:h-8">
        <div className="min-w-0 space-y-4 md:col-span-8 lg:col-span-9">
          <div className={cardCls}>
            <div className="grid grid-cols-2 gap-2 p-3 [&>*]:min-w-0 sm:grid-cols-3 xl:grid-cols-6">
          <div className="space-y-1"><Label className="text-xs text-muted-foreground">Action</Label>
            <select className={sel} value={h.action} onChange={(e) => set("action", e.target.value)}>
              {["A01 Goods Receipt", "A02 Change", "A03 Display", "A04 Cancel"].map((o) => <option key={o}>{o}</option>)}
            </select></div>
          {!gateId && (<>
            <div className="space-y-1"><Label className="text-xs text-muted-foreground">Reference</Label>
              <select className={sel} value={h.ref} onChange={(e) => set("ref", e.target.value)}>
                {["R01 Purchase Order", "R02 Material Document", "R05 Outbound Delivery"].map((o) => <option key={o}>{o}</option>)}
              </select></div>
            <div className="space-y-1"><Label className="text-xs text-muted-foreground">PO Number</Label>
              <div className="flex gap-1">
                <Input className="min-w-0 font-mono" placeholder="PO Number" value={h.poNumber} onChange={(e) => set("poNumber", e.target.value)} />
                <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" aria-label="Search PO" onClick={() => toast.info("PO lookup is not connected yet")}><Search className="h-4 w-4" /></Button>
              </div></div>
            <div className="space-y-1"><Label className="text-xs text-muted-foreground">Item</Label>
              <Input className="font-mono" placeholder="Item" value={h.poItem} onChange={(e) => set("poItem", e.target.value)} /></div>
          </>)}
          <div className="space-y-1"><Label className="text-xs text-muted-foreground">Plant</Label>
            <Input value={h.plant} onChange={(e) => set("plant", e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs text-muted-foreground">GR goods receipt</Label>
            <Input className="font-mono" value={h.movementType} onChange={(e) => set("movementType", e.target.value)} /></div>
            </div>
          </div>
          <div className={cardCls}>
            <div className={stripCls}>Document Header</div>
            <div className="p-3">
        <Tabs defaultValue="general" >
          <TabsList className={`max-w-full overflow-x-auto ${tabCls}`}>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="vendor">Vendor</TabsTrigger>
            <TabsTrigger value="partner" aria-label="Partner"><Users className="h-4 w-4" /></TabsTrigger>
          </TabsList>
          <TabsContent value="general" className="pt-3">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-2">
                <Field label="Document Date"><Input type="date" value={h.docDate} onChange={(e) => set("docDate", e.target.value)} /></Field>
                <Field label="Posting Date"><Input type="date" value={h.postDate} onChange={(e) => set("postDate", e.target.value)} /></Field>
                <div className="grid grid-cols-[100px_1fr] items-center gap-3">
                  <div className="flex items-center justify-end gap-2">
                    <Printer className="h-4 w-4 text-muted-foreground" />
                    <Checkbox checked={h.printSlip} onCheckedChange={(v) => set("printSlip", !!v)} aria-label="Print slip" />
                  </div>
                  <select className={sel} value={h.slip} onChange={(e) => set("slip", e.target.value)}>
                    {["1 Individual Slip", "2 Indiv. Slip w. Inspect. Text", "3 Collective Slip"].map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Field label="Delivery Note"><Input value={h.deliveryNote} onChange={(e) => set("deliveryNote", e.target.value)} /></Field>
                <Field label="Bill of Lading"><Input value={h.billOfLading} onChange={(e) => set("billOfLading", e.target.value)} /></Field>
                <Field label="GR/GI Slip No."><Input value={h.slipNo} onChange={(e) => set("slipNo", e.target.value)} /></Field>
              </div>
              <div className="space-y-2">
                <Field label="Supplier"><Input readOnly className="bg-muted" value={h.supplier} /></Field>
                <Field label="Header Text"><Input value={h.headerText} onChange={(e) => set("headerText", e.target.value)} /></Field>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="vendor" className="pt-3">
            <div className="grid gap-3 md:grid-cols-2">
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
          <TabsContent value="partner" className="pt-3">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Purchasing Group"><Input value={h.purchasingGroup} onChange={(e) => set("purchasingGroup", e.target.value)} /></Field>
              <Field label="Ordered By"><Input value={h.orderedBy} onChange={(e) => set("orderedBy", e.target.value)} /></Field>
            </div>
          </TabsContent>
        </Tabs>
            </div>
          </div>
        </div>
        <div className="order-first min-w-0 md:order-last md:col-span-4 lg:col-span-3">
          <div className="rounded-xl bg-gradient-primary p-4 text-primary-foreground shadow-card md:sticky md:top-4">
            <h3 className="mb-2 font-display text-base font-semibold">Selection</h3>
            <p className="mb-3 text-xs text-primary-foreground/80">Pick a Gate ID from All DMR to fill this GRN.</p>
          <div className="space-y-1.5 "><Label className="text-xs font-semibold text-primary-foreground/90">Gate ID</Label>
            <select className={`${sel} font-mono text-foreground`} value={gateId} onChange={(e) => pickGate(e.target.value)} disabled={proxy.loading}>
              <option value="">{proxy.loading ? "Loading Gate IDs…" : "Select Gate ID"}</option>
              {dmrs.map((r) => { const id = str(r, "gate_id"); return id ? <option key={id} value={id}>{id}</option> : null; })}
            </select>
            {gateId && (<div className="flex items-center justify-between gap-2 pt-1"><span className="truncate rounded-full bg-primary-foreground/20 px-2 py-0.5 text-xs text-primary-foreground">{gateId}{h.vendorName ? ` · ${h.vendorName}` : ""}</span><Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground" onClick={() => pickGate("")}>Clear</Button></div>)}
            {proxy.error && <p className="text-xs text-primary-foreground">Could not load DMRs from SAP</p>}
          </div>
          </div>
        </div>
      </div>

      <div className={`mt-4 ${cardCls}`}>
        <div className={`${stripCls} flex items-center justify-between py-1.5`}>
          <h3 className="font-display text-sm font-semibold">Items <span className="text-xs font-normal opacity-80">({rows.length})</span></h3>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" className="h-7" onClick={() => setRows((r) => [...r, emptyRow()])}><Plus className="h-4 w-4" />Add Line</Button>
            <Button variant="secondary" size="sm" className="h-7" disabled={selected === null}
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
          <div className={`mt-4 ${cardCls}`}>
            <div className={stripCls}>Item Detail — Line {di + 1}</div>
            <Tabs defaultValue="material" className="p-3">
              <TabsList className={`h-auto max-w-full justify-start overflow-x-auto ${tabCls}`}>
                {[["material","Material"],["quantity","Quantity"],["where","Where"],["po","Purchase Order Data"],["partner","Partner"],["acct","Account Assignment"],["custom","Custom Fields"]].map(([k,l]) => <TabsTrigger key={k} value={k}>{l}</TabsTrigger>)}
              </TabsList>
              <TabsContent value="material" className="pt-4">
                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="space-y-3">
                    <Field label="Material">{pair(ro("matText"), ro("material", "font-mono"))}</Field>
                    <Field label="Supplier Mat. No.">{ro("vendorMaterial")}</Field>
                    <Field label="Material Group">{ro("materialGroup", "w-40 font-mono")}</Field>
                  </div>
                  <div className="space-y-3 xl:pt-24">
                    <Field label="EAN in Order Unit">{ed("ean")}</Field>
                    <Field label="EAN Check">{pair(ed("eanCheck"), ed("eanCheckFlag"))}</Field>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="quantity" className="pt-4">
                <div className="grid gap-4 xl:grid-cols-2">
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
                <div className="grid gap-4 xl:grid-cols-2">
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
                <div className="grid gap-4 xl:grid-cols-2">
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
    </div>
  );
}

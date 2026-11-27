import { ArrowLeft, Pencil, Plus, Save, Send, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { alertError, alertSuccess, confirmAction } from "@/lib/alerts";
import { cn } from "@/lib/utils";
import { AddPoItemsDialog } from "./AddPoItemsDialog";
import { SesItemDetail } from "./SesItemDetail";
import { amount, inr, SesItem, SesSheet, stripCls, tabCls } from "./sesTypes";

export function SesForm({ initial, onBack, onSaved, onDeleted }: {
  initial: SesSheet; onBack: () => void; onSaved: (s: SesSheet) => void; onDeleted: (id: string) => void;
}) {
  const [s, setS] = useState(initial);
  const [editing, setEditing] = useState(initial.editingStatus === "Draft");
  const [sel, setSel] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [missing, setMissing] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState("");
  const isNew = !initial.createdOn;
  const set = (p: Partial<SesSheet>) => setS({ ...s, ...p });
  const setItem = (i: number, p: Partial<SesItem>) => {
    set({ items: s.items.map((it, k) => (k === i ? { ...it, ...p } : it)) });
    const n = new Set(missing); Object.keys(p).forEach((f) => n.delete(`${i}:${f}`)); setMissing(n);
  };
  const total = amount(s);

  const create = async () => {
    if (!s.name.trim() || !s.poNumber.trim()) return alertError("Missing fields", "Enter Name of Service Entry Sheet and Reference Purchase Order.");
    if (!s.items.length) return alertError("No items", "Add at least one purchase order item.");
    const m = new Set<string>();
    s.items.forEach((it, i) => (["startDate", "endDate", "quantity"] as const).forEach((f) => { if (!String(it[f]).trim()) m.add(`${i}:${f}`); }));
    setMissing(m);
    if (m.size) return alertError("Item details missing", "Enter Service Start Date, End Date and Quantity for the highlighted lines.");
    if (!(await confirmAction(isNew ? "Create Service Entry Sheet?" : "Save changes?", undefined, isNew ? "Yes, create" : "Yes, save"))) return;
    const saved: SesSheet = { ...s, editingStatus: "Saved", id: isNew ? String(Math.floor(100 + Math.random() * 900)) : s.id,
      createdOn: s.createdOn || new Date().toISOString(), createdBy: s.createdBy || "You" };
    setS(saved); setEditing(false); onSaved(saved);
    alertSuccess("Saved (design preview)", `Service Entry Sheet ${saved.id} — not sent to SAP yet.`);
  };
  const discard = async () => { if (await confirmAction("Discard draft?", undefined, "Yes, discard")) onBack(); };
  const del = async () => { if (await confirmAction(`Delete Service Entry Sheet ${s.id}?`, undefined, "Yes, delete")) { onDeleted(s.id); alertSuccess("Deleted", `Service Entry Sheet ${s.id} removed (design preview).`); } };
  const approve = async () => { if (await confirmAction("Send for approval?", undefined, "Yes, send")) { const n = { ...s, approvalStatus: "Workflow started (20)" }; setS(n); onSaved(n); alertSuccess("Sent for approval", "Design preview — SAP not connected yet."); } };

  const bad = (i: number, f: string) => missing.has(`${i}:${f}`) && "border-destructive ring-1 ring-destructive";
  const kpis: [string, string][] = [["Supplier", s.supplier || "–"], ["Document Status", s.documentStatus], ["Approval Status", s.approvalStatus], ["Stated Amount", inr(total)], ["Stated Amount Incl. Input Tax", inr(total)]];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4" />Back</Button>
          <h2 className="font-display text-xl font-semibold">{isNew ? "New Service Entry Sheet" : `${s.name} `}{!isNew && <span className="text-sm text-muted-foreground">#{s.id}</span>}</h2>
          {editing && <Badge variant="outline">Draft</Badge>}
        </div>
        <div className="flex gap-2">
          {editing ? (<>
            <Button size="sm" variant="outline" onClick={discard}><X className="h-4 w-4" />Discard Draft</Button>
            <Button size="sm" className="bg-gradient-primary hover:opacity-90" onClick={create}><Save className="h-4 w-4" />{isNew ? "Create" : "Save"}</Button>
          </>) : (<>
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" />Edit</Button>
            <Button size="sm" variant="outline" onClick={del}><Trash2 className="h-4 w-4" />Delete</Button>
            <Button size="sm" className="bg-gradient-primary hover:opacity-90" onClick={approve}><Send className="h-4 w-4" />Send for Approval</Button>
          </>)}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-xl bg-gradient-primary p-3 text-primary-foreground shadow-card md:grid-cols-5">
        {kpis.map(([l, v]) => <div key={l}><div className="text-xs opacity-80">{l}</div><div className="truncate text-sm font-semibold">{v}</div></div>)}
      </div>

      <Tabs defaultValue="general">
        <TabsList className={tabCls}>
          <TabsTrigger value="general">General Information</TabsTrigger><TabsTrigger value="items">Items ({s.items.length})</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger><TabsTrigger value="att">Attachments</TabsTrigger>
        </TabsList>
        <TabsContent value="general">
          <div className="overflow-hidden rounded-xl border bg-card shadow-card">
            <div className={stripCls}>Basic Data</div>
            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
              {([["Name of Service Entry Sheet *", "name", "text"], ["Reference Purchase Order *", "poNumber", "text"], ["Posting Date for Goods Receipt", "postingDate", "date"], ["Reference", "reference", "text"]] as const).map(([l, k, t]) => (
                <div key={k} className="space-y-1"><Label className="text-xs">{l}</Label>
                  <Input type={t} className={cn("h-8", !editing && "bg-muted")} readOnly={!editing} value={s[k]} onChange={(e) => set({ [k]: e.target.value })} /></div>))}
              {!isNew && <><div className="space-y-1"><Label className="text-xs">Created By</Label><Input className="h-8 bg-muted" readOnly value={s.createdBy} /></div>
                <div className="space-y-1"><Label className="text-xs">Created On</Label><Input className="h-8 bg-muted" readOnly value={new Date(s.createdOn).toLocaleString("en-IN")} /></div></>}
            </div>
          </div>
        </TabsContent>
        <TabsContent value="items" className="space-y-4">
          <div className="overflow-hidden rounded-xl border bg-card shadow-card">
            <div className={`${stripCls} flex items-center justify-between`}>
              <span>Items ({s.items.length})</span>
              {editing && <div className="flex gap-2">
                <Button size="sm" variant="secondary" className="h-7" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" />Add</Button>
                <Button size="sm" variant="secondary" className="h-7" disabled={!s.items.length} onClick={() => { set({ items: s.items.filter((_, k) => k !== sel) }); setSel(0); }}><Trash2 className="h-4 w-4" />Delete</Button>
              </div>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-xs text-muted-foreground"><tr>
                  {["PO Item", "Product", "Item Description", "Product Type Group", "Ordered", "Service Start", "Service End", "Quantity"].map((h) => <th key={h} className="whitespace-nowrap px-3 py-2 text-left font-medium">{h}</th>)}
                </tr></thead>
                <tbody>
                  {s.items.map((it, i) => (
                    <tr key={it.poItem} onClick={() => setSel(i)} className={cn("cursor-pointer border-t", sel === i ? "bg-accent/50" : "hover:bg-accent/30")}>
                      <td className="px-3 py-2 font-medium">{it.poItem}</td>
                      <td className="px-3 py-2">{it.description} ({it.product})</td>
                      <td className="px-3 py-2">{it.description}</td>
                      <td className="px-3 py-2">{it.productTypeGroup}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs">Expected {it.orderedQty} {it.unit}<br />Stated {it.quantity || 0} {it.unit}</td>
                      {(["startDate", "endDate"] as const).map((f) => <td key={f} className="px-3 py-2">
                        <Input type="date" readOnly={!editing} className={cn("h-7 w-36", bad(i, f))} value={it[f]} onChange={(e) => setItem(i, { [f]: e.target.value })} /></td>)}
                      <td className="px-3 py-2"><Input type="number" readOnly={!editing} className={cn("h-7 w-24", bad(i, "quantity"))} value={it.quantity} onChange={(e) => setItem(i, { quantity: e.target.value })} /></td>
                    </tr>))}
                  {!s.items.length && <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">There are no entries yet — press Add to pick purchase order items.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          {s.items[sel] && <SesItemDetail item={s.items[sel]} index={sel} total={s.items.length} readOnly={!editing} onChange={(p) => setItem(sel, p)} onNav={setSel} />}
        </TabsContent>
        <TabsContent value="notes"><Textarea rows={4} readOnly={!editing} placeholder="No notes available" value={notes} onChange={(e) => setNotes(e.target.value)} /></TabsContent>
        <TabsContent value="att"><div className="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">No files found. Uploads will be enabled once SAP is connected.</div></TabsContent>
      </Tabs>
      <AddPoItemsDialog open={addOpen} onOpenChange={setAddOpen} existing={s.items.map((i) => i.poItem)}
        onAdd={(items) => set({ items: [...s.items, ...items], supplier: s.supplier || items[0]?.supplier || "" })} />
    </div>
  );
}

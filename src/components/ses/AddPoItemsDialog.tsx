import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { samplePoItems, SesItem } from "./sesTypes";

export function AddPoItemsDialog({ open, onOpenChange, existing, onAdd }: {
  open: boolean; onOpenChange: (o: boolean) => void; existing: string[]; onAdd: (items: SesItem[]) => void;
}) {
  const [f, setF] = useState({ item: "", product: "", desc: "" });
  const [sel, setSel] = useState<Record<string, string>>({});
  const [showInvalid, setShowInvalid] = useState(false);
  const rows = useMemo(() => samplePoItems.filter((i) =>
    i.poItem.includes(f.item) && i.product.includes(f.product) && i.description.toLowerCase().includes(f.desc.toLowerCase()) &&
    (showInvalid || !existing.includes(i.poItem))), [f, showInvalid, existing]);
  const add = () => {
    onAdd(samplePoItems.filter((i) => sel[i.poItem] !== undefined).map((i) => ({ ...i, quantity: sel[i.poItem] })));
    setSel({}); onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>Add Purchase Order Items</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {([["Purchase Order Item", "item"], ["Product", "product"], ["Item Description", "desc"]] as const).map(([l, k]) => (
            <div key={k} className="space-y-1"><Label className="text-xs">{l}</Label>
              <Input className="h-8" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>))}
        </div>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-xs text-muted-foreground"><tr>
              {["", "PO Item", "Product", "Description", "Product Type Group", "Quantity"].map((h) => <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}
            </tr></thead>
            <tbody>{rows.map((i) => {
              const on = sel[i.poItem] !== undefined;
              return (
                <tr key={i.poItem} className="border-t">
                  <td className="px-3 py-2"><Checkbox checked={on} onCheckedChange={(c) => {
                    const n = { ...sel }; if (c) n[i.poItem] = "1"; else delete n[i.poItem]; setSel(n); }} /></td>
                  <td className="px-3 py-2">{i.poItem.padStart(5, "0")}</td>
                  <td className="px-3 py-2">{i.product.padStart(18, "0")}</td>
                  <td className="px-3 py-2">{i.description}</td>
                  <td className="px-3 py-2">{i.productTypeGroup}</td>
                  <td className="px-3 py-2"><Input type="number" className="h-7 w-20" disabled={!on} value={sel[i.poItem] ?? ""}
                    onChange={(e) => setSel({ ...sel, [i.poItem]: e.target.value })} /></td>
                </tr>);
            })}
            {!rows.length && <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">No items</td></tr>}</tbody>
          </table>
        </div>
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={showInvalid} onCheckedChange={(c) => setShowInvalid(!!c)} />Show Invalid Items</label>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-gradient-primary hover:opacity-90" disabled={!Object.keys(sel).length} onClick={add}>Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

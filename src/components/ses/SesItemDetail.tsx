import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { inr, SesItem, stripCls, tabCls } from "./sesTypes";

const RO = ({ label, value }: { label: string; value: string }) => (
  <div className="space-y-1"><Label className="text-xs">{label}</Label><Input className="h-8 bg-muted" readOnly value={value || "–"} /></div>
);

export function SesItemDetail({ item, index, total, readOnly, onChange, onNav }: {
  item: SesItem; index: number; total: number; readOnly: boolean;
  onChange: (p: Partial<SesItem>) => void; onNav: (i: number) => void;
}) {
  const qty = Number(item.quantity) || 0;
  const net = qty * item.price;
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-card">
      <div className={`${stripCls} flex items-center justify-between`}>
        <span>Item {item.poItem} — {item.description}</span>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="secondary" className="h-6 w-6" disabled={index === 0} onClick={() => onNav(index - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-xs">{index + 1} / {total}</span>
          <Button size="icon" variant="secondary" className="h-6 w-6" disabled={index >= total - 1} onClick={() => onNav(index + 1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
      <Tabs defaultValue="general" className="p-3">
        <TabsList className={`w-full justify-start overflow-x-auto ${tabCls}`}>
          {[["general", "General Information"], ["acct", "Account Assignment"], ["source", "Source of Supply"], ["tax", "Tax"], ["pricing", "Pricing"], ["notes", "Notes"], ["att", "Attachments"]].map(([v, l]) =>
            <TabsTrigger key={v} value={v}>{l}</TabsTrigger>)}
        </TabsList>
        <TabsContent value="general" className="grid grid-cols-2 gap-3 pt-2 md:grid-cols-4">
          <RO label="Net Price" value={inr(item.price)} /><RO label="Price Unit" value={item.priceUnit} />
          <RO label="Open Quantity" value={`${item.openQty} ${item.unit}`} /><RO label="Order Quantity" value={`${item.orderedQty} ${item.unit}`} />
        </TabsContent>
        <TabsContent value="acct" className="pt-2">
          <table className="w-full text-sm"><thead className="bg-muted/60 text-xs text-muted-foreground"><tr>
            {["#", "G/L Account", "Quantity", "Net Amount", "Distribution"].map((h) => <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
            <tbody><tr className="border-t"><td className="px-3 py-2">1</td>
              <td className="px-3 py-2"><Input className="h-7 w-28" readOnly={readOnly} value={item.glAccount} onChange={(e) => onChange({ glAccount: e.target.value })} /></td>
              <td className="px-3 py-2">{qty.toFixed(3)} {item.unit}</td><td className="px-3 py-2">{inr(net)}</td><td className="px-3 py-2">–</td></tr></tbody></table>
        </TabsContent>
        <TabsContent value="source" className="grid grid-cols-2 gap-3 pt-2 md:grid-cols-4"><RO label="Supplier" value={item.supplier} /></TabsContent>
        <TabsContent value="tax" className="grid grid-cols-2 gap-3 pt-2 md:grid-cols-4">
          <RO label="Tax Code" value={item.taxCode} />
          <div className="space-y-1"><Label className="text-xs">Tax Date</Label>
            <Input type="date" className="h-8" readOnly={readOnly} value={item.taxDate} onChange={(e) => onChange({ taxDate: e.target.value })} /></div>
        </TabsContent>
        <TabsContent value="pricing" className="overflow-x-auto pt-2">
          <table className="w-full text-sm"><thead className="bg-muted/60 text-xs text-muted-foreground"><tr>
            {["Condition Type", "Description", "Amount", "Currency", "Pricing Unit", "Condition Basis", "Condition Value"].map((h) => <th key={h} className="whitespace-nowrap px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
            <tbody>
              <tr className="border-t"><td className="px-3 py-2">PMP0</td><td className="px-3 py-2">Manual Gross Price</td><td className="px-3 py-2">{item.price.toFixed(2)}</td><td className="px-3 py-2">{item.currency}</td><td className="px-3 py-2">{item.priceUnit}</td><td className="px-3 py-2">{qty} {item.unit}</td><td className="px-3 py-2">{inr(net)}</td></tr>
              <tr className="border-t font-semibold"><td /><td className="px-3 py-2">Gross Value</td><td className="px-3 py-2">{item.price.toFixed(2)}</td><td className="px-3 py-2">{item.currency}</td><td className="px-3 py-2">{item.priceUnit}</td><td className="px-3 py-2">{qty} {item.unit}</td><td className="px-3 py-2">{inr(net)}</td></tr>
            </tbody></table>
        </TabsContent>
        <TabsContent value="notes" className="pt-2"><Textarea rows={3} readOnly={readOnly} placeholder="No notes available" value={item.notes} onChange={(e) => onChange({ notes: e.target.value })} /></TabsContent>
        <TabsContent value="att" className="pt-2"><div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No files found. Uploads will be enabled once SAP is connected.</div></TabsContent>
      </Tabs>
    </div>
  );
}

import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { amount, inr, SesSheet, stripCls } from "./sesTypes";

export function SesList({ sheets, onOpen, onCreate }: { sheets: SesSheet[]; onOpen: (s: SesSheet) => void; onCreate: () => void }) {
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? sheets.filter((s) => [s.id, s.name, s.supplier, s.poNumber, s.documentStatus].join(" ").toLowerCase().includes(t)) : sheets;
  }, [q, sheets]);
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-card">
      <div className={`${stripCls} flex flex-wrap items-center justify-between gap-2`}>
        <span>Service Entry Sheets ({rows.length}{q ? ` of ${sheets.length}` : ""})</span>
        <div className="flex items-center gap-2">
          <div className="relative"><Search className="absolute left-2 top-1.5 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="h-7 w-44 bg-card pl-7 text-foreground" /></div>
          <Button size="sm" variant="secondary" className="h-7" onClick={onCreate}><Plus className="h-4 w-4" />Create</Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-xs text-muted-foreground"><tr>
            {["Service Entry Sheet", "Supplier", "Reference PO", "Stated Amount Incl. Tax", "Name", "Document Status", "Approval Status", "Created On"].map((h) =>
              <th key={h} className="whitespace-nowrap px-3 py-2 text-left font-medium">{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} onClick={() => onOpen(s)} className="cursor-pointer border-t hover:bg-accent/40">
                <td className="px-3 py-2 font-medium text-primary">{s.id}{s.editingStatus === "Draft" && <Badge variant="outline" className="ml-2">Draft</Badge>}</td>
                <td className="px-3 py-2">{s.supplier}</td>
                <td className="px-3 py-2">{s.poNumber}</td>
                <td className="px-3 py-2 text-right tabular-nums">{inr(amount(s))}</td>
                <td className="px-3 py-2">{s.name}</td>
                <td className="px-3 py-2"><Badge variant="secondary">{s.documentStatus}</Badge></td>
                <td className="px-3 py-2 text-xs">{s.approvalStatus}</td>
                <td className="whitespace-nowrap px-3 py-2 text-xs">{s.createdOn ? new Date(s.createdOn).toLocaleString("en-IN") : "–"}</td>
              </tr>))}
            {!rows.length && <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">No service entry sheets found</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="border-t px-4 py-1.5 text-xs text-muted-foreground">Sample data — live SAP list will appear once the API is connected.</div>
    </div>
  );
}

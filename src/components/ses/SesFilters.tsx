import { Filter, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { stripCls } from "./sesTypes";

export interface SesFilterValues {
  editing: string; supplier: string; sheet: string; name: string; docStatus: string;
  approval: string; from: string; to: string; origin: string;
}
export const emptyFilters: SesFilterValues = { editing: "All", supplier: "", sheet: "", name: "", docStatus: "", approval: "", from: "", to: "", origin: "" };

export function SesFilters({ value, onChange, onGo, onClear }: {
  value: SesFilterValues; onChange: (v: SesFilterValues) => void; onGo: () => void; onClear: () => void;
}) {
  const set = (k: keyof SesFilterValues) => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, [k]: e.target.value });
  const field = (label: string, k: keyof SesFilterValues, ph = "") => (
    <div className="space-y-1"><Label className="text-xs">{label}</Label>
      <Input className="h-8" value={value[k]} placeholder={ph} onChange={set(k)} onKeyDown={(e) => e.key === "Enter" && onGo()} /></div>
  );
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-card">
      <div className={`${stripCls} flex items-center gap-2`}><Filter className="h-4 w-4" />Filters</div>
      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1"><Label className="text-xs">Editing Status</Label>
          <Select value={value.editing} onValueChange={(v) => onChange({ ...value, editing: v })}>
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>{["All", "Draft", "Saved"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
          </Select></div>
        {field("Supplier", "supplier", "Name or number")}
        {field("Service Entry Sheet", "sheet")}
        {field("Name of Service Entry Sheet", "name")}
        {field("Document Status", "docStatus")}
        {field("Approval Status", "approval")}
        <div className="space-y-1"><Label className="text-xs">Created On</Label>
          <div className="flex gap-1"><Input type="date" className="h-8" value={value.from} onChange={set("from")} />
            <Input type="date" className="h-8" value={value.to} onChange={set("to")} /></div></div>
        {field("Origin", "origin")}
      </div>
      <div className="flex justify-end gap-2 border-t px-4 py-2">
        <Button size="sm" variant="outline" onClick={onClear}><RotateCcw className="h-4 w-4" />Clear</Button>
        <Button size="sm" className="bg-gradient-primary hover:opacity-90" onClick={onGo}><Search className="h-4 w-4" />Go</Button>
      </div>
    </div>
  );
}

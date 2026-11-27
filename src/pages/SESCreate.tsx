import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { emptyFilters, SesFilters, SesFilterValues } from "@/components/ses/SesFilters";
import { SesForm } from "@/components/ses/SesForm";
import { SesList } from "@/components/ses/SesList";
import { sampleSheets, SesSheet } from "@/components/ses/sesTypes";

const blank = (): SesSheet => ({ id: "", name: "", supplier: "", poNumber: "", postingDate: "", reference: "", documentStatus: "In Process (10)",
  approvalStatus: "Workflow not yet started (10)", createdBy: "", createdOn: "", origin: "Manual", editingStatus: "Draft", items: [] });

export default function SESCreate() {
  const [sheets, setSheets] = useState<SesSheet[]>(sampleSheets);
  const [draft, setDraft] = useState<SesFilterValues>(emptyFilters);
  const [applied, setApplied] = useState<SesFilterValues>(emptyFilters);
  const [open, setOpen] = useState<SesSheet | null>(null);

  const filtered = useMemo(() => {
    const has = (v: string, q: string) => !q || v.toLowerCase().includes(q.toLowerCase());
    return sheets.filter((s) => (applied.editing === "All" || s.editingStatus === applied.editing) && has(s.supplier, applied.supplier) &&
      has(s.id, applied.sheet) && has(s.name, applied.name) && has(s.documentStatus, applied.docStatus) && has(s.approvalStatus, applied.approval) &&
      has(s.origin, applied.origin) && (!applied.from || s.createdOn.slice(0, 10) >= applied.from) && (!applied.to || s.createdOn.slice(0, 10) <= applied.to));
  }, [sheets, applied]);

  if (open) return (
    <SesForm key={open.id || "new"} initial={open} onBack={() => setOpen(null)}
      onSaved={(s) => setSheets((all) => [s, ...all.filter((x) => x.id !== s.id && x.id !== open.id)])}
      onDeleted={(id) => { setSheets((all) => all.filter((x) => x.id !== id)); setOpen(null); }} />
  );
  return (
    <div className="space-y-4">
      <PageHeader title="Service Entry Sheets" description="Find existing service entry sheets or create a new one." />
      <SesFilters value={draft} onChange={setDraft} onGo={() => setApplied(draft)} onClear={() => { setDraft(emptyFilters); setApplied(emptyFilters); }} />
      <SesList sheets={filtered} onOpen={setOpen} onCreate={() => setOpen(blank())} />
    </div>
  );
}

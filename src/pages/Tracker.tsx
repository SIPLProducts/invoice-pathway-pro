import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { sapEntries } from "@/lib/seed";
import { inr } from "@/lib/format";
import type { SAPEntry } from "@/lib/types";
import { Download, Filter, Search, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = ["All", "Site Fields", "Accounts / HO Fields"] as const;
type Tab = (typeof tabs)[number];

type Group = "ho" | "site" | "extra";

interface Col {
  key: string;
  header: string;
  group: Group;
  align?: "right" | "center";
  mono?: boolean;
  render: (e: SAPEntry) => React.ReactNode;
}

const dash = (v: unknown) => (v === undefined || v === null || v === "" ? "—" : String(v));

const columns: Col[] = [
  // Accounts / HO fields (7)
  { key: "sapPostingDate", header: "SAP Posting Date", group: "ho", mono: true, render: (e) => dash(e.sapPostingDate) },
  { key: "sapDocNo", header: "SAP DOC NO", group: "ho", mono: true, render: (e) => dash(e.sapRef) },
  { key: "miro", header: "MIRO", group: "ho", mono: true, render: (e) => dash(e.miroDocNo) },
  { key: "billsStatus", header: "Bills Status", group: "ho", render: (e) => <StatusBadge status={e.billStatus} /> },
  { key: "typeOfBill", header: "Type of Bill", group: "ho", render: (e) => e.typeOfBill },
  {
    key: "billsMailReceivedDate",
    header: "Bills/Mail received Date",
    group: "ho",
    mono: true,
    render: (e) => dash(e.billsMailReceivedDate),
  },
  {
    key: "days",
    header: "Days",
    group: "ho",
    align: "right",
    mono: true,
    render: (e) => (
      <span
        className={cn(
          "font-semibold",
          e.ageingDays > 7 ? "text-destructive" : e.ageingDays > 3 ? "text-warning" : "",
        )}
      >
        {e.ageingDays}
      </span>
    ),
  },

  // Site fields (23)
  { key: "slNo", header: "SI.No", group: "site", align: "right", mono: true, render: (e) => e.slNo },
  { key: "siteDocNo", header: "Site Document Nos", group: "site", mono: true, render: (e) => e.siteDocNo },
  { key: "grnOrNonPo", header: "GRN No./Non PO", group: "site", mono: true, render: (e) => dash(e.grnOrNonPo) },
  { key: "poNo", header: "PO No.", group: "site", mono: true, render: (e) => dash(e.poNo) },
  { key: "materialGroupDesc", header: "Material Group Description", group: "site", render: (e) => dash(e.materialGroupDesc) },
  { key: "projectName", header: "Project Name", group: "site", render: (e) => e.projectName },
  { key: "profitCenter", header: "Profit Center", group: "site", mono: true, render: (e) => e.profitCenter },
  { key: "plantCode", header: "Plant Code", group: "site", mono: true, render: (e) => dash(e.plantCode) },
  { key: "glCode", header: "GL Code Non PO Bills", group: "site", mono: true, render: (e) => dash(e.glCode) },
  { key: "vendorCode", header: "Vendor Code", group: "site", mono: true, render: (e) => e.vendorCode },
  { key: "vendorName", header: "Vendor Name", group: "site", render: (e) => e.vendor },
  { key: "invoiceNo", header: "Invoice No.", group: "site", mono: true, render: (e) => e.invoiceNo },
  { key: "invoiceDate", header: "Invoice Date", group: "site", mono: true, render: (e) => e.invoiceDate },
  { key: "basicAmount", header: "Basic Amount", group: "site", align: "right", mono: true, render: (e) => inr(e.basicAmount) },
  { key: "sgst", header: "SGST", group: "site", align: "right", mono: true, render: (e) => inr(e.sgst) },
  { key: "cgst", header: "CGST", group: "site", align: "right", mono: true, render: (e) => inr(e.cgst) },
  { key: "igst", header: "IGST", group: "site", align: "right", mono: true, render: (e) => (e.igst ? inr(e.igst) : "—") },
  { key: "others", header: "Others", group: "site", align: "right", mono: true, render: (e) => (e.others ? inr(e.others) : "—") },
  {
    key: "totalInvoiceAmount",
    header: "Total Invoice Amount",
    group: "site",
    align: "right",
    mono: true,
    render: (e) => <span className="font-semibold">{inr(e.invoiceAmount)}</span>,
  },
  { key: "tds", header: "TDS", group: "site", align: "right", mono: true, render: (e) => inr(e.tdsAmount) },
  { key: "rm", header: "RM", group: "site", align: "right", mono: true, render: (e) => inr(e.rmAmount) },
  {
    key: "otherDeductions",
    header: "Other deductions",
    group: "site",
    align: "right",
    mono: true,
    render: (e) => (e.otherDeductions ? inr(e.otherDeductions) : "—"),
  },
  {
    key: "netAmount",
    header: "Net Amount",
    group: "site",
    align: "right",
    mono: true,
    render: (e) => <span className="font-semibold">{inr(e.netPayable)}</span>,
  },
  { key: "requester", header: "Requester", group: "site", render: (e) => e.requester },
  { key: "remarks", header: "Remarks", group: "site", render: (e) => e.remarks },

  // All-only extras (4)
  {
    key: "dms",
    header: "DMS Attachment Status",
    group: "extra",
    render: (e) => (
      <span
        className={cn(
          "rounded-full px-2 py-0.5 text-[10px] font-semibold",
          e.dmsAttachmentStatus === "Attached"
            ? "bg-success/10 text-success"
            : "bg-warning/10 text-warning",
        )}
      >
        {e.dmsAttachmentStatus}
      </span>
    ),
  },
  {
    key: "checklist",
    header: "Checklist",
    group: "extra",
    align: "center",
    render: (e) =>
      e.checklistComplete ? (
        <CheckCircle2 className="mx-auto h-4 w-4 text-success" />
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    key: "delayDays",
    header: "Delay (d)",
    group: "extra",
    align: "right",
    mono: true,
    render: (e) => (
      <span
        className={cn(
          "font-semibold",
          e.delayDays > 7 ? "text-destructive" : e.delayDays > 3 ? "text-warning" : "",
        )}
      >
        {e.delayDays}
      </span>
    ),
  },
  { key: "billStatus", header: "Bill Status", group: "extra", render: (e) => <StatusBadge status={e.billStatus} /> },
];

function columnsFor(tab: Tab): Col[] {
  if (tab === "Site Fields") return columns.filter((c) => c.group === "site");
  if (tab === "Accounts / HO Fields") return columns.filter((c) => c.group === "ho");
  return columns;
}

export default function Tracker() {
  const [tab, setTab] = useState<Tab>("All");
  const [q, setQ] = useState("");
  const cols = columnsFor(tab);
  const filtered = sapEntries.filter(
    (e) =>
      !q ||
      [e.siteDocNo, e.dmrNo, e.invoiceNo, e.vendor, e.poNo ?? "", e.miroDocNo ?? ""].some((v) =>
        v.toLowerCase().includes(q.toLowerCase()),
      ),
  );

  return (
    <>
      <PageHeader
        title="SAP Entries Tracker"
        description="Unified view of site & HO data — DMR, GRN, MIRO, taxes, retention, and bill status."
        actions={
          <>
            <Button variant="outline" size="sm"><Filter className="h-4 w-4" />Advanced</Button>
            <Button size="sm" className="bg-gradient-primary"><Download className="h-4 w-4" />Export</Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === t ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
            }`}
          >
            {t}
          </button>
        ))}
        <div className="relative ml-auto w-full md:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search document no., MIRO, vendor, invoice…"
            className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:shadow-glow"
          />
        </div>
      </div>

      <div className="max-h-[70vh] overflow-auto rounded-xl border bg-card shadow-card scrollbar-thin">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10">
            <tr className="border-b bg-muted text-left uppercase tracking-wider text-muted-foreground">
              {cols.map((c) => (
                <th
                  key={c.key}
                  className={cn(
                    "whitespace-nowrap border-b px-3 py-2.5 font-medium",
                    c.align === "right" && "text-right",
                    c.align === "center" && "text-center",
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={e.id} className="border-b last:border-0 transition-colors hover:bg-muted/30">
                {cols.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      "whitespace-nowrap px-3 py-2.5",
                      c.mono && "font-mono",
                      c.align === "right" && "text-right",
                      c.align === "center" && "text-center",
                    )}
                  >
                    {c.render(e)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Showing {filtered.length} of {sapEntries.length} entries · {cols.length} columns · Tip: scroll horizontally to see all fields
      </p>
    </>
  );
}

import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { ColumnDef } from "@/lib/sapApiSchemas";
import { getPath } from "@/lib/getPath";

type Row = Record<string, unknown>;

const cell = (v: unknown) => (v === null || v === undefined ? "" : typeof v === "object" ? "" : String(v));

function rowKeyValue(row: Row): string {
  for (const k of ["GateId", "gate_id", "gateId"]) if (row[k]) return String(row[k]);
  return "";
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

const stamp = () => new Date().toISOString().slice(0, 10);

export function exportDmrExcel(
  rows: Row[],
  columns: ColumnDef[],
  childKey?: string,
  childColumns?: ColumnDef[],
) {
  const wb = XLSX.utils.book_new();
  const headerData = rows.map((r) =>
    Object.fromEntries(columns.map((c) => [c.header, cell(getPath(r, c.path))])),
  );
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(headerData), "Gate Entries");
  if (childKey && childColumns?.length) {
    const items = rows.flatMap((r) => {
      const gid = rowKeyValue(r);
      const kids = (getPath(r, childKey) as Row[]) ?? [];
      return kids.map((it) => ({
        "Gate ID": gid,
        ...Object.fromEntries(childColumns.map((c) => [c.header, cell(getPath(it, c.path))])),
      }));
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(items), "Line Items");
  }
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  downloadBlob(
    new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `All_DMR_${stamp()}.xlsx`,
  );
}

async function loadImage(url: string): Promise<{ data: string; w: number; h: number } | null> {
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    c.getContext("2d")!.drawImage(img, 0, 0);
    return { data: c.toDataURL("image/png"), w: img.naturalWidth, h: img.naturalHeight };
  } catch {
    return null;
  }
}

export async function exportDmrPdf(
  rows: Row[],
  columns: ColumnDef[],
  childKey: string | undefined,
  childColumns: ColumnDef[] | undefined,
  logoUrl: string,
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const logo = await loadImage(logoUrl);
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const m = 12;

  rows.forEach((row, idx) => {
    if (idx > 0) doc.addPage();
    // Header band
    if (logo) {
      const h = 16;
      const w = Math.min(50, (logo.w / logo.h) * h);
      doc.addImage(logo.data, "PNG", m, m, w, h);
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Gate Entry / DMR", pageW - m, m + 6, { align: "right" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Gate ID: ${rowKeyValue(row) || "-"}`, pageW - m, m + 12, { align: "right" });
    doc.setDrawColor(180);
    doc.line(m, m + 20, pageW - m, m + 20);

    // Header details in two label/value column pairs
    const pairs = columns.map((c) => [c.header, cell(getPath(row, c.path)) || "-"]);
    const half = Math.ceil(pairs.length / 2);
    const body = Array.from({ length: half }, (_, i) => [
      ...(pairs[i] ?? ["", ""]),
      ...(pairs[i + half] ?? ["", ""]),
    ]);
    autoTable(doc, {
      startY: m + 24,
      body,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 1.5 },
      columnStyles: {
        0: { fontStyle: "bold", fillColor: [243, 244, 246] },
        2: { fontStyle: "bold", fillColor: [243, 244, 246] },
      },
      margin: { left: m, right: m },
    });

    // Line items
    const items = childKey ? ((getPath(row, childKey) as Row[]) ?? []) : [];
    if (childColumns?.length) {
      const y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(`Line Items (${items.length})`, m, y);
      autoTable(doc, {
        startY: y + 2,
        head: [childColumns.map((c) => c.header)],
        body: items.length
          ? items.map((it) => childColumns.map((c) => cell(getPath(it, c.path))))
          : [[{ content: "No line items", colSpan: childColumns.length }]],
        theme: "striped",
        styles: { fontSize: 6.5, cellPadding: 1 },
        headStyles: { fillColor: [31, 41, 55], fontSize: 6.5 },
        margin: { left: m, right: m },
      });
    }
  });

  // Footer on every page
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated ${new Date().toLocaleString()}`, m, pageH - 6);
    doc.text(`Page ${p} of ${total}`, pageW - m, pageH - 6, { align: "right" });
  }

  const name =
    rows.length === 1 ? `DMR_${rowKeyValue(rows[0]) || "entry"}.pdf` : `DMR_${rows.length}_entries_${stamp()}.pdf`;
  downloadBlob(doc.output("blob"), name);
}

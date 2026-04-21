import { DMR, GRN, SAPEntry, ApprovalItem, Vendor } from "./types";

const vendors: Vendor[] = [
  { code: "V10042", name: "Ultratech Cement Ltd.", gstin: "27AAACU0042B1Z5", pan: "AAACU0042B" },
  { code: "V10118", name: "Tata Steel Limited", gstin: "07AAACT2727Q1ZW", pan: "AAACT2727Q" },
  { code: "V10256", name: "JSW Steel Industries", gstin: "29AAACJ4625R1Z0", pan: "AAACJ4625R" },
  { code: "V10301", name: "Asian Paints Ltd.", gstin: "27AAACA6666N1Z3", pan: "AAACA6666N" },
  { code: "V10422", name: "Schneider Electric India", gstin: "06AABCS1429R1Z0", pan: "AABCS1429R" },
  { code: "V10577", name: "Havells India Ltd.", gstin: "07AAACH8124L1ZK", pan: "AAACH8124L" },
];

const sites = ["Site BLR-01", "Site MUM-04", "Site DEL-12", "Site HYD-07", "Site PUN-03"];
const projects = ["Metro Phase III", "Tower-B Residential", "Logistics Hub", "Riverfront Bridge", "Tech Park Block-C"];
const users = ["Anil Kumar", "Priya Sharma", "Rahul Verma", "Meera Iyer", "Sandeep Rao"];

const today = new Date();
const daysAgo = (n: number) => new Date(today.getTime() - n * 86400000).toISOString().slice(0, 10);

export const dmrs: DMR[] = Array.from({ length: 24 }).map((_, i) => {
  const v = vendors[i % vendors.length];
  const flow = i % 4 === 0 ? "NON_PO" : "PO";
  const subtotal = 50000 + Math.round(Math.random() * 850000);
  const cgst = Math.round(subtotal * 0.09);
  const sgst = Math.round(subtotal * 0.09);
  const total = subtotal + cgst + sgst;
  const statuses: DMR["status"][] = ["draft", "submitted", "validated", "approved", "rejected", "grn_posted"];
  const status = statuses[i % statuses.length];
  return {
    id: `dmr-${i + 1}`,
    dmrNo: `DMR-2026-${String(1024 + i).padStart(5, "0")}`,
    date: daysAgo(i % 30),
    site: sites[i % sites.length],
    project: projects[i % projects.length],
    vendor: v,
    invoiceNo: `INV/${v.code}/${String(8800 + i).padStart(5, "0")}`,
    invoiceDate: daysAgo((i % 30) + 2),
    poNo: flow === "PO" ? `PO-45${String(100 + i).padStart(5, "0")}` : undefined,
    prNo: flow === "NON_PO" ? `PR-22${String(800 + i).padStart(5, "0")}` : undefined,
    glCode: flow === "NON_PO" ? "5100-2300" : undefined,
    flow,
    status,
    lineItems: [
      {
        id: "li-1",
        materialCode: "MAT-CEM-43G",
        description: "OPC 43 Grade Cement Bag 50kg",
        uom: "BAG",
        qty: 200 + i * 5,
        rate: 385,
        amount: (200 + i * 5) * 385,
      },
      {
        id: "li-2",
        materialCode: "MAT-STL-12M",
        description: "TMT Steel Bar 12mm Fe500D",
        uom: "MT",
        qty: 4 + (i % 3),
        rate: 62500,
        amount: (4 + (i % 3)) * 62500,
      },
    ],
    subtotal,
    cgst,
    sgst,
    igst: 0,
    total,
    validations:
      i % 5 === 0
        ? [{ level: "fail", message: "PO open quantity exceeded for line 2" }]
        : i % 3 === 0
          ? [{ level: "warning", message: "Rate variance 4.2% above PO price" }]
          : [{ level: "pass", message: "All SAP validations passed" }],
    ocrConfidence: 0.78 + Math.random() * 0.21,
    createdBy: users[i % users.length],
    createdAt: daysAgo(i % 30),
    attachments: 1 + (i % 3),
  };
});

export const grns: GRN[] = dmrs
  .filter((d) => d.status === "grn_posted" || d.status === "approved")
  .map((d, i) => ({
    id: `grn-${i + 1}`,
    grnNo: `GRN-2026-${String(5012 + i).padStart(5, "0")}`,
    dmrNo: d.dmrNo,
    sapDocNo: d.status === "grn_posted" ? `5000${1200 + i}` : undefined,
    date: d.date,
    vendor: d.vendor.name,
    poNo: d.poNo,
    amount: d.total,
    status: d.status === "grn_posted" ? "posted" : i % 3 === 0 ? "partial" : "pending",
    postedAt: d.status === "grn_posted" ? d.createdAt : undefined,
  }));

export const sapEntries: SAPEntry[] = dmrs.map((d, i) => ({
  id: `sap-${i + 1}`,
  dmrNo: d.dmrNo,
  grnNo: grns.find((g) => g.dmrNo === d.dmrNo)?.grnNo,
  sapRef: grns.find((g) => g.dmrNo === d.dmrNo)?.sapDocNo,
  poNo: d.poNo,
  poLine: d.poNo ? "10" : undefined,
  materialCode: d.lineItems[0].materialCode,
  vendor: d.vendor.name,
  vendorCode: d.vendor.code,
  gstin: d.vendor.gstin,
  pan: d.vendor.pan,
  invoiceNo: d.invoiceNo,
  invoiceDate: d.invoiceDate,
  invoiceAmount: d.total,
  cgst: d.cgst,
  sgst: d.sgst,
  igst: d.igst,
  tdsAmount: Math.round(d.subtotal * 0.02),
  tdsSection: "194C",
  retention: Math.round(d.subtotal * 0.05),
  netPayable: d.total - Math.round(d.subtotal * 0.07),
  miroDocNo: d.status === "grn_posted" ? `51000${4500 + i}` : undefined,
  glCode: d.glCode,
  billStatus:
    d.status === "grn_posted" ? "posted" : d.status === "approved" ? "approved" : d.status === "rejected" ? "rejected" : "pending",
  delayDays: Math.floor(Math.random() * 18),
  checklistComplete: i % 3 !== 0,
}));

export const approvals: ApprovalItem[] = dmrs
  .filter((d) => d.status === "submitted" || d.status === "validated")
  .slice(0, 8)
  .map((d, i) => ({
    id: `apr-${i + 1}`,
    type: d.flow === "NON_PO" ? "NON_PO" : "DMR",
    refNo: d.dmrNo,
    vendor: d.vendor.name,
    amount: d.total,
    raisedBy: d.createdBy,
    raisedAt: d.createdAt,
    ageHours: 4 + i * 7,
    level: 1 + (i % 3),
    priority: i % 3 === 0 ? "high" : i % 3 === 1 ? "medium" : "low",
  }));

// Dashboard time series
export const dmrVsGrnSeries = Array.from({ length: 14 }).map((_, i) => ({
  day: `D-${14 - i}`,
  DMR: 18 + Math.round(Math.random() * 12),
  GRN: 12 + Math.round(Math.random() * 10),
}));

export const valueByProject = projects.map((p) => ({
  project: p.length > 14 ? p.slice(0, 14) + "…" : p,
  invoiced: 2 + Math.random() * 8,
  posted: 1 + Math.random() * 6,
}));

export const agingBuckets = [
  { bucket: "0-3 days", count: 14, value: 8.4 },
  { bucket: "4-7 days", count: 9, value: 5.2 },
  { bucket: "8-15 days", count: 6, value: 3.8 },
  { bucket: "15+ days", count: 3, value: 2.1 },
];

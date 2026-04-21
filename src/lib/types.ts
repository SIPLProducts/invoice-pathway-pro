export type Role = "site" | "accounts" | "management" | "admin";

export type DMRStatus =
  | "draft"
  | "submitted"
  | "validated"
  | "approved"
  | "rejected"
  | "grn_posted";

export type GRNStatus = "pending" | "partial" | "posted" | "failed";

export type BillStatus = "pending" | "approved" | "posted" | "rejected";

export type ValidationLevel = "pass" | "warning" | "fail";

export interface Vendor {
  code: string;
  name: string;
  gstin: string;
  pan: string;
}

export interface DMRLineItem {
  id: string;
  materialCode: string;
  description: string;
  uom: string;
  qty: number;
  rate: number;
  amount: number;
  poLineRef?: string;
}

export interface OCRField {
  value: string;
  confidence: number; // 0-1
}

export interface DMR {
  id: string;
  dmrNo: string;
  date: string;
  site: string;
  project: string;
  vendor: Vendor;
  invoiceNo: string;
  invoiceDate: string;
  poNo?: string;
  prNo?: string;
  glCode?: string;
  flow: "PO" | "NON_PO";
  status: DMRStatus;
  lineItems: DMRLineItem[];
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  validations: { level: ValidationLevel; message: string }[];
  ocrConfidence: number;
  createdBy: string;
  createdAt: string;
  attachments: number;
}

export interface GRN {
  id: string;
  grnNo: string;
  dmrNo: string;
  sapDocNo?: string;
  date: string;
  vendor: string;
  poNo?: string;
  amount: number;
  status: GRNStatus;
  partialOf?: string;
  postedAt?: string;
}

export interface SAPEntry {
  id: string;
  dmrNo: string;
  grnNo?: string;
  sapRef?: string;
  poNo?: string;
  poLine?: string;
  materialCode?: string;
  vendor: string;
  vendorCode: string;
  gstin: string;
  pan: string;
  invoiceNo: string;
  invoiceDate: string;
  invoiceAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  tdsAmount: number;
  tdsSection?: string;
  retention: number;
  netPayable: number;
  miroDocNo?: string;
  glCode?: string;
  billStatus: BillStatus;
  delayDays: number;
  checklistComplete: boolean;
}

export interface ApprovalItem {
  id: string;
  type: "DMR" | "NON_PO" | "GRN";
  refNo: string;
  vendor: string;
  amount: number;
  raisedBy: string;
  raisedAt: string;
  ageHours: number;
  level: number;
  priority: "high" | "medium" | "low";
}

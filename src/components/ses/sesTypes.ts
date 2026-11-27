// Sample data and types for the Service Entry Sheet screen (design only, no SAP yet).
export interface SesItem {
  poItem: string; product: string; description: string; productTypeGroup: string;
  orderedQty: number; unit: string; quantity: string; startDate: string; endDate: string;
  openQty: number; priceUnit: string; glAccount: string; netAmount: number; price: number;
  currency: string; taxCode: string; taxDate: string; supplier: string; notes: string;
}
export interface SesSheet {
  id: string; name: string; supplier: string; poNumber: string; postingDate: string; reference: string;
  documentStatus: string; approvalStatus: string; createdBy: string; createdOn: string; origin: string;
  editingStatus: "Draft" | "Saved"; items: SesItem[];
}
export const stripCls = "bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground";
export const tabCls = "[&_[data-state=active]]:bg-gradient-primary [&_[data-state=active]]:text-primary-foreground";

export const samplePoItems: SesItem[] = [
  { poItem: "10", product: "442", description: "SERVICE CHARGES - 2018", productTypeGroup: "Service (2)", orderedQty: 200, unit: "EA",
    quantity: "", startDate: "", endDate: "", openQty: 200, priceUnit: "1 EA", glAccount: "414000", netAmount: 0, price: 100,
    currency: "INR", taxCode: "G3 — IGST 18% Domestic input GST", taxDate: "", supplier: "ABC HYDERABAD (1000010)", notes: "" },
  { poItem: "20", product: "443", description: "MAINTENANCE CHARGES", productTypeGroup: "Service (2)", orderedQty: 50, unit: "EA",
    quantity: "", startDate: "", endDate: "", openQty: 50, priceUnit: "1 EA", glAccount: "414000", netAmount: 0, price: 250,
    currency: "INR", taxCode: "G3 — IGST 18% Domestic input GST", taxDate: "", supplier: "ABC HYDERABAD (1000010)", notes: "" },
];
export const sampleSheets: SesSheet[] = [{
  id: "172", name: "123", supplier: "ABC HYDERABAD (1000010)", poNumber: "470000181", postingDate: "", reference: "",
  documentStatus: "In Process (10)", approvalStatus: "Workflow not yet started (10)", createdBy: "Srinivas Rao Kesana",
  createdOn: "2026-11-27T13:06:36", origin: "Manual", editingStatus: "Saved",
  items: [{ ...samplePoItems[0], quantity: "100", startDate: "2026-11-01", endDate: "2026-11-30", netAmount: 10000, taxDate: "2026-11-26" }],
}];
export const amount = (s: SesSheet) => s.items.reduce((t, i) => t + (Number(i.quantity) || 0) * i.price, 0);
export const inr = (n: number) => `${n.toLocaleString("en-IN", { minimumFractionDigits: 2 })} INR`;

import { useSyncExternalStore } from "react";

export type SapMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
export type SapAuth = "Basic" | "OAuth" | "Bearer" | "API Key";
export type SapStatus = "Active" | "Inactive";
export type SapTag = "Proxy" | "VPN Tunnel" | "Direct";
export type SapType = "action" | "live" | "sync";

export type FieldType = "string" | "number" | "date" | "time" | "boolean";

export interface FieldDef {
  /** OData/JSON property key, e.g. "gate_id". */
  key: string;
  /** Human label shown in UI. */
  label: string;
  type: FieldType;
  required?: boolean;
  defaultValue?: string;
  /** Response: include as table column. */
  showInTable?: boolean;
  /** Request: include as form input. */
  showInForm?: boolean;
  align?: "left" | "right";
  width?: string;
}

export interface SchedulerConfig {
  enabled: boolean;
  frequency: "manual" | "5m" | "15m" | "1h" | "1d";
  retryCount: number;
  retryDelayMs: number;
  plants: { code: string; name: string; selected: boolean }[];
}

export interface CredentialsConfig {
  user: string;
  password: string;
  sapClient: string;
}

export interface AdvancedConfig {
  active: boolean;
  logging: boolean;
  maxRecords: number;
  timeoutMs: number;
  customHeaders: string;
}

export interface MiddlewareConfig {
  /** Base URL of the Node middleware (e.g. https://abcd.ngrok-free.app or http://10.10.4.178:3202). No trailing slash needed. */
  url: string;
  port?: string;
  /** Optional shared secret sent as x-proxy-secret header. */
  secret?: string;
  connectionMode?: "Direct" | "Via Proxy Server" | "VPN Tunnel";
  deploymentMode?: string;
}

export interface SapApi {
  name: string;
  description: string;
  baseUrl: string;
  endpoint: string;
  method: SapMethod;
  auth: SapAuth;
  status: SapStatus;
  tag: SapTag;
  type: SapType;
  autoSync: { enabled: boolean; frequencyMinutes: number; lastSync?: string };

  // Field-driven config
  rowsPath?: string;
  rowKey?: string;
  childKey?: string;
  requestHeaderFields?: FieldDef[];
  requestItemFields?: FieldDef[];
  responseHeaderFields?: FieldDef[];
  responseItemFields?: FieldDef[];

  // Tabs
  scheduler?: SchedulerConfig;
  credentials?: CredentialsConfig;
  advanced?: AdvancedConfig;

  // Endpoints
  listEndpoint?: string;
  createEndpoint?: string;

  /** Optional middleware path the proxy exposes. e.g. "/api/gate/headers" */
  proxyPath?: string;

  /** Per-API middleware connection (overrides VITE_SAP_PROXY_URL when set). */
  middleware?: MiddlewareConfig;
}

const STORAGE_KEY = "dmr.sapApis.v3";

const GATE_HEADER_REQUEST: FieldDef[] = [
  { key: "gate_id", label: "Gate ID", type: "string", required: true, showInForm: true },
  { key: "plant", label: "Plant", type: "string", required: true, showInForm: true, defaultValue: "3801" },
  { key: "gate_date", label: "Gate Date", type: "date", required: true, showInForm: true },
  { key: "gate_time", label: "Gate Time", type: "time", required: true, showInForm: true },
  { key: "vendor", label: "Vendor Code", type: "string", required: true, showInForm: true },
  { key: "vendor_name", label: "Vendor Name", type: "string", showInForm: true },
  { key: "vehicle_no", label: "Vehicle No", type: "string", required: true, showInForm: true },
  { key: "vehicle_type", label: "Vehicle Type", type: "string", showInForm: true },
  { key: "driver_name", label: "Driver Name", type: "string", showInForm: true },
  { key: "driver_mobile", label: "Driver Mobile", type: "string", showInForm: true },
  { key: "license_no", label: "License No", type: "string", showInForm: true },
  { key: "transport_type", label: "Transport Type", type: "string", required: true, showInForm: true, defaultValue: "INBOUND" },
  { key: "purpose", label: "Purpose", type: "string", required: true, showInForm: true },
  { key: "document_type", label: "Document Type", type: "string", required: true, showInForm: true, defaultValue: "PO" },
  { key: "reference_doc", label: "Reference Doc", type: "string", showInForm: true },
  { key: "gross_weight", label: "Gross Weight", type: "number", showInForm: true },
  { key: "tare_weight", label: "Tare Weight", type: "number", showInForm: true },
  { key: "net_weight", label: "Net Weight", type: "number", showInForm: true },
  { key: "entry_type", label: "Entry Type", type: "string", required: true, showInForm: true, defaultValue: "IN" },
  { key: "gate_status", label: "Gate Status", type: "string", required: true, showInForm: true, defaultValue: "OPEN" },
  { key: "remarks", label: "Remarks", type: "string", showInForm: true },
];

const GATE_ITEM_REQUEST: FieldDef[] = [
  { key: "item_no", label: "Item No", type: "string", required: true, showInForm: true },
  { key: "material", label: "Material", type: "string", required: true, showInForm: true },
  { key: "material_desc", label: "Material Desc", type: "string", showInForm: true },
  { key: "quantity", label: "Quantity", type: "number", required: true, showInForm: true, align: "right" },
  { key: "unit", label: "Unit", type: "string", required: true, showInForm: true, defaultValue: "KG" },
  { key: "batch", label: "Batch", type: "string", showInForm: true },
  { key: "storage_location", label: "Storage Loc", type: "string", showInForm: true },
  { key: "po_number", label: "PO Number", type: "string", showInForm: true },
  { key: "po_item", label: "PO Item", type: "string", showInForm: true },
  { key: "delivery_no", label: "Delivery No", type: "string", showInForm: true },
  { key: "delivery_item", label: "Delivery Item", type: "string", showInForm: true },
  { key: "invoice_no", label: "Invoice No", type: "string", showInForm: true },
  { key: "weight", label: "Weight", type: "number", showInForm: true, align: "right" },
  { key: "remarks", label: "Remarks", type: "string", showInForm: true },
];

const GATE_HEADER_RESPONSE: FieldDef[] = [
  { key: "gate_id", label: "Gate ID", type: "string", showInTable: true },
  { key: "plant", label: "Plant", type: "string", showInTable: true },
  { key: "gate_date", label: "Date", type: "date", showInTable: true },
  { key: "gate_time", label: "Time", type: "time", showInTable: true },
  { key: "vendor", label: "Vendor", type: "string", showInTable: true },
  { key: "vendor_name", label: "Vendor Name", type: "string", showInTable: true },
  { key: "vehicle_no", label: "Vehicle", type: "string", showInTable: true },
  { key: "vehicle_type", label: "Vehicle Type", type: "string", showInTable: true },
  { key: "driver_name", label: "Driver", type: "string", showInTable: true },
  { key: "driver_mobile", label: "Mobile", type: "string", showInTable: true },
  { key: "license_no", label: "License", type: "string", showInTable: false },
  { key: "transport_type", label: "Transport", type: "string", showInTable: true },
  { key: "purpose", label: "Purpose", type: "string", showInTable: true },
  { key: "document_type", label: "Doc Type", type: "string", showInTable: true },
  { key: "reference_doc", label: "Reference", type: "string", showInTable: true },
  { key: "gross_weight", label: "Gross Wt", type: "number", showInTable: true, align: "right" },
  { key: "tare_weight", label: "Tare Wt", type: "number", showInTable: true, align: "right" },
  { key: "net_weight", label: "Net Wt", type: "number", showInTable: true, align: "right" },
  { key: "entry_type", label: "Entry", type: "string", showInTable: true },
  { key: "gate_status", label: "Status", type: "string", showInTable: true },
  { key: "remarks", label: "Remarks", type: "string", showInTable: true },
];

const GATE_ITEM_RESPONSE: FieldDef[] = [
  { key: "item_no", label: "Item", type: "string", showInTable: true },
  { key: "material", label: "Material", type: "string", showInTable: true },
  { key: "material_desc", label: "Description", type: "string", showInTable: true },
  { key: "quantity", label: "Qty", type: "number", showInTable: true, align: "right" },
  { key: "unit", label: "Unit", type: "string", showInTable: true },
  { key: "batch", label: "Batch", type: "string", showInTable: true },
  { key: "storage_location", label: "Storage Loc", type: "string", showInTable: true },
  { key: "po_number", label: "PO", type: "string", showInTable: true },
  { key: "po_item", label: "PO Item", type: "string", showInTable: true },
  { key: "delivery_no", label: "Delivery", type: "string", showInTable: false },
  { key: "delivery_item", label: "Delivery Item", type: "string", showInTable: false },
  { key: "invoice_no", label: "Invoice", type: "string", showInTable: false },
  { key: "weight", label: "Weight", type: "number", showInTable: true, align: "right" },
  { key: "remarks", label: "Remarks", type: "string", showInTable: true },
];

export const DEFAULT_GATE_REQUEST_HEADER = GATE_HEADER_REQUEST;
export const DEFAULT_GATE_REQUEST_ITEM = GATE_ITEM_REQUEST;
export const DEFAULT_GATE_RESPONSE_HEADER = GATE_HEADER_RESPONSE;
export const DEFAULT_GATE_RESPONSE_ITEM = GATE_ITEM_RESPONSE;

const seed: SapApi[] = [
  {
    name: "ZMRB_Inward_Inspection",
    description:
      "ZMRB01/ZMRB04 - Inward Inspection Report. Fetches inspection lots with vendor, PO, batch and quantity details. Use ART=01 for ZMRB01, ART=04 for ZMRB04.",
    baseUrl: "http://10.10.6.115:8000",
    endpoint: "/mrb/inward/report?sap-client=234",
    method: "POST",
    auth: "Basic",
    status: "Active",
    tag: "VPN Tunnel",
    type: "sync",
    autoSync: { enabled: true, frequencyMinutes: 5, lastSync: "22/4/2026, 10:52:03 am" },
  },
  {
    name: "ZUI_Gate_Service",
    description:
      "SAP BTP Public Cloud - Gate Service (RAP). GET/POST GateHeader via Node middleware proxy. Configure VITE_SAP_PROXY_URL on the frontend.",
    baseUrl: "https://fa530628-e5cb-4817-8c70-9991654babd5.abap-web.us10.hana.ondemand.com",
    endpoint:
      "/sap/opu/odata4/sap/zui_gate_service/srvd_a2x/sap/zui_gate_service/0001/GateHeader?$expand=_Item&sap-client=100",
    method: "GET",
    auth: "Basic",
    status: "Active",
    tag: "Direct",
    type: "live",
    autoSync: { enabled: false, frequencyMinutes: 5 },
    rowsPath: "value",
    rowKey: "gate_id",
    childKey: "_Item",
    requestHeaderFields: GATE_HEADER_REQUEST,
    requestItemFields: GATE_ITEM_REQUEST,
    responseHeaderFields: GATE_HEADER_RESPONSE,
    responseItemFields: GATE_ITEM_RESPONSE,
    scheduler: {
      enabled: false,
      frequency: "manual",
      retryCount: 3,
      retryDelayMs: 5000,
      plants: [{ code: "1300", name: "HBL Plant 1300", selected: false }],
    },
    credentials: { user: "DEV00", password: "", sapClient: "100" },
    advanced: {
      active: true,
      logging: true,
      maxRecords: 1000,
      timeoutMs: 30000,
      customHeaders: "{}",
    },
    listEndpoint: "/api/gate/headers",
    createEndpoint: "/api/gate/headers",
    proxyPath: "/api/gate/headers",
    middleware: {
      url: "",
      port: "3202",
      secret: "",
      connectionMode: "Via Proxy Server",
      deploymentMode: "Self-Hosted (Client Server)",
    },
  },
];

function load(): SapApi[] {
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed;
    const parsed = JSON.parse(raw) as SapApi[];
    if (!Array.isArray(parsed) || parsed.length === 0) return seed;

    // One-time cleanup: remove deprecated default APIs without resetting other edits.
    const CLEANUP_FLAG = "dmr.sapApis.cleanup.v1";
    const REMOVED_NAMES = new Set([
      "SAP_343_Blocked_To_Unrestricted",
      "SAP_344_Unrestricted_To_Blocked",
      "MB52_Stock_Report",
    ]);
    let cleaned = parsed;
    if (!localStorage.getItem(CLEANUP_FLAG)) {
      cleaned = parsed.filter((a) => !REMOVED_NAMES.has(a.name));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
        localStorage.setItem(CLEANUP_FLAG, "1");
      } catch {
        /* ignore quota */
      }
    }

    // Merge: ensure ZUI_Gate_Service has field schemas (in case older cached version)
    return cleaned.map((a) => {
      if (a.name === "ZUI_Gate_Service" && !a.requestHeaderFields) {
        return { ...seed.find((s) => s.name === "ZUI_Gate_Service")!, ...a, requestHeaderFields: GATE_HEADER_REQUEST, requestItemFields: GATE_ITEM_REQUEST, responseHeaderFields: GATE_HEADER_RESPONSE, responseItemFields: GATE_ITEM_RESPONSE };
      }
      return a;
    });
  } catch {
    return seed;
  }
}

let state: SapApi[] = load();
const listeners = new Set<() => void>();

function emit() {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore quota */
    }
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return state;
}

export function useSapApis(): SapApi[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function getSapApis(): SapApi[] {
  return state;
}

export function getSapApi(name: string): SapApi | undefined {
  return state.find((a) => a.name === name);
}

export function addApi(api: SapApi) {
  state = [...state, api];
  emit();
}

export function updateApi(originalName: string, api: SapApi) {
  state = state.map((a) => (a.name === originalName ? api : a));
  emit();
}

export function deleteApi(name: string) {
  state = state.filter((a) => a.name !== name);
  emit();
}

export function resetApis() {
  state = seed;
  emit();
}

import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  /** Update endpoint template, supports `{placeholder}` tokens filled from selected row. e.g. "/api/gate/headers/{gate_id}" */
  updateEndpoint?: string;
  /** HTTP method for update calls. Defaults to PATCH. */
  updateMethod?: SapMethod;
  /** Field name in the response row that fills the {placeholder} in updateEndpoint. Defaults to `rowKey`. */
  keyField?: string;

  /** Optional middleware path the proxy exposes. e.g. "/api/gate/headers" */
  proxyPath?: string;

  /** Per-API middleware connection (overrides VITE_SAP_PROXY_URL when set). */
  middleware?: MiddlewareConfig;
}

// IMPORTANT: Never bump STORAGE_KEY without adding a forward migration in `load()`.
// Bumping the key without migration wipes all user-created APIs from the previous key.
const STORAGE_KEY = "dmr.sapApis.v3";
const LEGACY_STORAGE_KEYS = ["dmr.sapApis.v2", "dmr.sapApis.v1"];
const BACKUP_KEY = "dmr.sapApis.backup.latest";

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
    updateEndpoint: "/api/gate/headers/{gate_id}",
    updateMethod: "PATCH",
    keyField: "gate_id",
    proxyPath: "/api/gate/headers",
    middleware: {
      url: "",
      port: "3202",
      secret: "",
      connectionMode: "Via Proxy Server",
      deploymentMode: "Self-Hosted (Client Server)",
    },
  },
  {
    name: "Get DMR List",
    description:
      "Lists all SAP Gate Header records (with line items expanded) via the Node middleware proxy. Used by the DMR → SAP Gate Entries tab.",
    baseUrl: "https://fa530628-e5cb-4817-8c70-9991654babd5.abap-web.us10.hana.ondemand.com",
    endpoint:
      "/sap/opu/odata4/sap/zui_gate_service/srvd_a2x/sap/zui_gate_service/0001/GateHeader?$expand=_Item&sap-client=100",
    method: "GET",
    auth: "Basic",
    status: "Active",
    tag: "Proxy",
    type: "live",
    autoSync: { enabled: false, frequencyMinutes: 5 },
    rowsPath: "value",
    rowKey: "gate_id",
    childKey: "_Item",
    requestHeaderFields: GATE_HEADER_REQUEST,
    requestItemFields: GATE_ITEM_REQUEST,
    responseHeaderFields: GATE_HEADER_RESPONSE,
    responseItemFields: GATE_ITEM_RESPONSE,
    listEndpoint: "/api/gate/headers",
    proxyPath: "/api/gate/headers",
    middleware: {
      url: "",
      port: "3202",
      secret: "",
      connectionMode: "Via Proxy Server",
      deploymentMode: "Self-Hosted (Client Server)",
    },
  },
  {
    name: "Update Header Data",
    description:
      "PATCHes header fields on a single Gate Entry (gate_id) via the Node middleware. Used by the Edit Header dialog on DMR → SAP Gate Entries.",
    baseUrl: "https://fa530628-e5cb-4817-8c70-9991654babd5.abap-web.us10.hana.ondemand.com",
    endpoint:
      "/sap/opu/odata4/sap/zui_gate_service/srvd_a2x/sap/zui_gate_service/0001/GateHeader(gate_id='{gate_id}')",
    method: "PATCH",
    auth: "Basic",
    status: "Active",
    tag: "Proxy",
    type: "action",
    autoSync: { enabled: false, frequencyMinutes: 5 },
    rowKey: "gate_id",
    requestHeaderFields: GATE_HEADER_REQUEST,
    responseHeaderFields: GATE_HEADER_RESPONSE,
    updateEndpoint: "/api/gate/headers/{gate_id}",
    updateMethod: "PATCH",
    keyField: "gate_id",
    proxyPath: "/api/gate/headers/{gate_id}",
    middleware: {
      url: "",
      port: "3202",
      secret: "",
      connectionMode: "Via Proxy Server",
      deploymentMode: "Self-Hosted (Client Server)",
    },
  },
  {
    name: "Update Selected Line Item Data",
    description:
      "PATCHes a single Gate line item (gate_id + item_no) via the Node middleware. Used by the per-row Edit/Update inside the Items popup on DMR → SAP Gate Entries.",
    baseUrl: "https://fa530628-e5cb-4817-8c70-9991654babd5.abap-web.us10.hana.ondemand.com",
    endpoint:
      "/sap/opu/odata4/sap/zui_gate_service/srvd_a2x/sap/zui_gate_service/0001/GateItem(gate_id='{gate_id}',item_no='{item_no}')",
    method: "PATCH",
    auth: "Basic",
    status: "Active",
    tag: "Proxy",
    type: "action",
    autoSync: { enabled: false, frequencyMinutes: 5 },
    rowKey: "item_no",
    requestItemFields: GATE_ITEM_REQUEST,
    responseItemFields: GATE_ITEM_RESPONSE,
    updateEndpoint: "/api/gate/items/{gate_id}/{item_no}",
    updateMethod: "PATCH",
    keyField: "item_no",
    proxyPath: "/api/gate/items/{gate_id}/{item_no}",
    middleware: {
      url: "",
      port: "3202",
      secret: "",
      connectionMode: "Via Proxy Server",
      deploymentMode: "Self-Hosted (Client Server)",
    },
  },
];

// =============================================================================
// Cloud-backed store. SAP API configs live in Lovable Cloud (Supabase table
// `sap_api_configs`), so they are shared across all devices, browsers, and the
// preview <-> published deployments. localStorage is used only as an offline
// read-cache for first paint and as the source for a one-time migration from
// the previous (browser-local) version of this app.
// =============================================================================

const LOCAL_CACHE_KEY = "dmr.sapApis.cloudCache.v1";
const LEGACY_LOCAL_KEYS = ["dmr.sapApis.v3", "dmr.sapApis.v2", "dmr.sapApis.v1"];
const LEGACY_BACKUP_KEY = "dmr.sapApis.backup.latest";
const MIGRATION_FLAG = "dmr.sapApis.cloudMigration.v1";

function readLocalArray(key: string): SapApi[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SapApi[];
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeLocalCache(apis: SapApi[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(apis));
  } catch {
    /* ignore quota */
  }
}

/** Append any seed entries whose name isn't already present. Never overwrites user data. */
function mergeSeedNonDestructive(existing: SapApi[]): SapApi[] {
  const names = new Set(existing.map((a) => a.name));
  const additions = seed.filter((s) => !names.has(s.name));
  return additions.length === 0 ? existing : [...existing, ...additions];
}

/** First-paint state: prefer the local cache; otherwise show seed defaults so the
 *  UI is never empty. The real Cloud data overwrites this as soon as it loads. */
function bootstrapState(): SapApi[] {
  const cached = readLocalArray(LOCAL_CACHE_KEY);
  if (cached && cached.length > 0) return cached;
  return seed;
}

let state: SapApi[] = bootstrapState();
const listeners = new Set<() => void>();
let cloudReady = false;
let cloudReadyPromise: Promise<void> | null = null;

function setState(next: SapApi[], persistCache = true) {
  state = next;
  if (persistCache) writeLocalCache(next);
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return state;
}

// ---------------------------------------------------------------------------
// Cloud sync
// ---------------------------------------------------------------------------

interface CloudRow {
  name: string;
  config: SapApi;
}

async function fetchAllFromCloud(): Promise<SapApi[]> {
  const { data, error } = await supabase
    .from("sap_api_configs")
    .select("name, config")
    .order("name", { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as unknown as CloudRow[];
  // Re-hydrate using the stored name as the canonical key.
  return rows.map((r) => ({ ...(r.config ?? ({} as SapApi)), name: r.name }));
}

async function upsertOne(api: SapApi) {
  const row = { name: api.name, config: api as unknown as never };
  const { error } = await supabase
    .from("sap_api_configs")
    .upsert(row as never, { onConflict: "name" });
  if (error) throw error;
}

async function deleteOne(name: string) {
  const { error } = await supabase.from("sap_api_configs").delete().eq("name", name);
  if (error) throw error;
}

async function bulkUpsert(apis: SapApi[]) {
  if (apis.length === 0) return;
  const payload = apis.map((api) => ({ name: api.name, config: api as unknown as never }));
  const { error } = await supabase.from("sap_api_configs").upsert(payload as never, { onConflict: "name" });
  if (error) throw error;
}

/** Migrate any pre-Cloud localStorage entries into Cloud the first time we run. */
async function migrateLegacyLocalToCloud(cloudCount: number): Promise<number> {
  if (typeof window === "undefined") return 0;
  if (localStorage.getItem(MIGRATION_FLAG)) return 0;
  if (cloudCount > 0) {
    // Cloud already has data — don't overwrite it from this device's old localStorage.
    localStorage.setItem(MIGRATION_FLAG, "1");
    return 0;
  }
  let legacy: SapApi[] | null = null;
  for (const key of LEGACY_LOCAL_KEYS) {
    const data = readLocalArray(key);
    if (data) {
      legacy = data;
      break;
    }
  }
  if (!legacy) {
    legacy = readLocalArray(LEGACY_BACKUP_KEY);
  }
  if (!legacy || legacy.length === 0) {
    localStorage.setItem(MIGRATION_FLAG, "1");
    return 0;
  }
  await bulkUpsert(legacy);
  localStorage.setItem(MIGRATION_FLAG, "1");
  return legacy.length;
}

/** Ensure default seed APIs exist in Cloud (insert-only, never overwrite user edits). */
async function ensureSeedInCloud(currentNames: Set<string>) {
  const missing = seed.filter((s) => !currentNames.has(s.name));
  if (missing.length === 0) return;
  await bulkUpsert(missing);
}

async function bootstrapCloud(): Promise<void> {
  try {
    let cloud = await fetchAllFromCloud();

    // One-time migration of legacy per-browser data into Cloud.
    const migratedCount = await migrateLegacyLocalToCloud(cloud.length);
    if (migratedCount > 0) {
      cloud = await fetchAllFromCloud();
      setTimeout(() => {
        import("sonner").then(({ toast }) => {
          toast.success(`Migrated ${migratedCount} SAP API configurations to Cloud`);
        }).catch(() => {});
      }, 1200);
    }

    // Make sure default APIs exist (insert-only).
    const names = new Set(cloud.map((a) => a.name));
    const seedNeedsInsert = seed.some((s) => !names.has(s.name));
    if (seedNeedsInsert) {
      await ensureSeedInCloud(names);
      cloud = await fetchAllFromCloud();
    }

    cloudReady = true;
    setState(cloud);
  } catch (err) {
    console.error("[sapApisStore] Cloud bootstrap failed, using local cache only.", err);
    // Keep local cache state; mark ready so writes don't block forever.
    cloudReady = true;
    // Still merge seeds into local view so the UI isn't empty.
    setState(mergeSeedNonDestructive(state), false);
  }
}

function ensureCloudReady(): Promise<void> {
  if (cloudReady) return Promise.resolve();
  if (!cloudReadyPromise) cloudReadyPromise = bootstrapCloud();
  return cloudReadyPromise;
}

// Track the active realtime channel so HMR re-imports don't try to re-attach
// `postgres_changes` callbacks to an already-subscribed channel (Supabase
// rejects this with: "cannot add postgres_changes callbacks ... after subscribe()").
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
let realtimeBootstrapped = false;
let beforeUnloadBound = false;

function subscribeRealtime() {
  if (typeof window === "undefined") return;
  // Tear down any prior channel from a previous module instance (HMR).
  if (realtimeChannel) {
    try {
      supabase.removeChannel(realtimeChannel);
    } catch {
      /* noop */
    }
    realtimeChannel = null;
  }
  realtimeChannel = supabase
    .channel("sap_api_configs_changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "sap_api_configs" },
      async () => {
        try {
          const fresh = await fetchAllFromCloud();
          setState(fresh);
        } catch (e) {
          console.warn("[sapApisStore] realtime refresh failed", e);
        }
      },
    )
    .subscribe();
  // Best-effort cleanup on tab unload (bind once).
  if (!beforeUnloadBound) {
    beforeUnloadBound = true;
    window.addEventListener("beforeunload", () => {
      try {
        if (realtimeChannel) supabase.removeChannel(realtimeChannel);
      } catch {
        /* noop */
      }
    });
  }
}

// Kick off Cloud sync at module load (browser only). Guard against HMR double-init.
if (typeof window !== "undefined" && !realtimeBootstrapped) {
  realtimeBootstrapped = true;
  ensureCloudReady().then(() => subscribeRealtime());
}

// ---------------------------------------------------------------------------
// Public API (unchanged surface — sync helpers stay sync, mutations are now
// fire-and-forget to Cloud with optimistic local update + cache write).
// ---------------------------------------------------------------------------

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
  // Optimistic update.
  setState([...state, api]);
  ensureCloudReady()
    .then(() => upsertOne(api))
    .catch((e) => {
      console.error("[sapApisStore] addApi -> cloud failed", e);
      import("sonner").then(({ toast }) => {
        toast.error(`Couldn't save "${api.name}" to Cloud — change is local only.`);
      }).catch(() => {});
    });
}

export function updateApi(originalName: string, api: SapApi) {
  setState(state.map((a) => (a.name === originalName ? api : a)));
  ensureCloudReady()
    .then(async () => {
      // If the name changed, delete the old row first.
      if (originalName !== api.name) {
        await deleteOne(originalName).catch(() => {});
      }
      await upsertOne(api);
    })
    .catch((e) => {
      console.error("[sapApisStore] updateApi -> cloud failed", e);
      import("sonner").then(({ toast }) => {
        toast.error(`Couldn't update "${api.name}" in Cloud — change is local only.`);
      }).catch(() => {});
    });
}

export function deleteApi(name: string) {
  setState(state.filter((a) => a.name !== name));
  ensureCloudReady()
    .then(() => deleteOne(name))
    .catch((e) => {
      console.error("[sapApisStore] deleteApi -> cloud failed", e);
      import("sonner").then(({ toast }) => {
        toast.error(`Couldn't delete "${name}" from Cloud — change is local only.`);
      }).catch(() => {});
    });
}

export function resetApis() {
  setState(seed);
  ensureCloudReady()
    .then(async () => {
      // Wipe and reseed Cloud.
      const { error: delErr } = await supabase.from("sap_api_configs").delete().neq("name", "__never__");
      if (delErr) throw delErr;
      await bulkUpsert(seed);
    })
    .catch((e) => {
      console.error("[sapApisStore] resetApis -> cloud failed", e);
      import("sonner").then(({ toast }) => {
        toast.error("Couldn't reset APIs in Cloud — change is local only.");
      }).catch(() => {});
    });
}

/** Returns a pretty-printed JSON string of all current APIs for download. */
export function exportApis(): string {
  return JSON.stringify(
    {
      version: "cloud.v1",
      exportedAt: new Date().toISOString(),
      apis: state,
    },
    null,
    2,
  );
}

/**
 * Imports APIs from a JSON string. Accepts either:
 *   - the full export envelope `{ version, exportedAt, apis: [...] }`, or
 *   - a bare array `[ ...apis ]`.
 * Names that already exist are replaced; new names are appended.
 */
export function importApis(json: string): { added: number; replaced: number } {
  const parsed = JSON.parse(json);
  const incoming: SapApi[] = Array.isArray(parsed) ? parsed : parsed?.apis;
  if (!Array.isArray(incoming)) {
    throw new Error("Invalid import file: expected an array of APIs or { apis: [...] }.");
  }
  const existingNames = new Set(state.map((a) => a.name));
  let added = 0;
  let replaced = 0;
  const byName = new Map(state.map((a) => [a.name, a] as const));
  const valid: SapApi[] = [];
  for (const api of incoming) {
    if (!api || typeof api.name !== "string") continue;
    if (existingNames.has(api.name)) {
      replaced += 1;
    } else {
      added += 1;
    }
    byName.set(api.name, api);
    valid.push(api);
  }
  setState(Array.from(byName.values()));
  ensureCloudReady()
    .then(() => bulkUpsert(valid))
    .catch((e) => {
      console.error("[sapApisStore] importApis -> cloud failed", e);
      import("sonner").then(({ toast }) => {
        toast.error("Imported locally, but Cloud sync failed.");
      }).catch(() => {});
    });
  return { added, replaced };
}

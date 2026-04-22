import { useSyncExternalStore } from "react";

export type SapMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
export type SapAuth = "Basic" | "OAuth" | "Bearer" | "API Key";
export type SapStatus = "Active" | "Inactive";
export type SapTag = "Proxy" | "VPN Tunnel" | "Direct";
export type SapType = "action" | "live" | "sync";

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
}

const STORAGE_KEY = "dmr.sapApis.v1";

const seed: SapApi[] = [
  {
    name: "SAP_343_Blocked_To_Unrestricted",
    description: "343 Movement - Moves blocked stock quantity to unrestricted stock in SAP.",
    baseUrl: "http://10.10.6.115:8000",
    endpoint: "/mrb/mb52/mat_stocks?sap-client=234",
    method: "PUT",
    auth: "Basic",
    status: "Active",
    tag: "Proxy",
    type: "action",
    autoSync: { enabled: false, frequencyMinutes: 5 },
  },
  {
    name: "SAP_344_Unrestricted_To_Blocked",
    description: "344 Movement - Moves unrestricted stock quantity to blocked stock in SAP.",
    baseUrl: "http://10.10.6.115:8000",
    endpoint: "/mrb/mb52/mat_stocks?sap-client=234",
    method: "GET",
    auth: "Basic",
    status: "Active",
    tag: "Proxy",
    type: "action",
    autoSync: { enabled: false, frequencyMinutes: 5 },
  },
  {
    name: "MB52_Stock_Report",
    description:
      "MB52 - Material Stock Report. Returns stock quantities (unrestricted, blocked, QI, transfer) by plant, storage location, material and batch.",
    baseUrl: "http://10.10.6.115:8000",
    endpoint: "/mrb/mb52/mat_stocks?sap-client=234",
    method: "POST",
    auth: "Basic",
    status: "Active",
    tag: "Proxy",
    type: "live",
    autoSync: { enabled: false, frequencyMinutes: 5 },
  },
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
];

function load(): SapApi[] {
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed;
    const parsed = JSON.parse(raw) as SapApi[];
    if (!Array.isArray(parsed) || parsed.length === 0) return seed;
    return parsed;
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

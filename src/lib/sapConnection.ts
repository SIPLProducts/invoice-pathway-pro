import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Global SAP / middleware connection settings shared by every API.
 * Stored in the cloud as a reserved row ("__connection__") in sap_api_configs,
 * so it follows the user across devices and the published site.
 */
export interface SapConnection {
  middlewareUrl: string;
  proxySecret: string;
  sapHost: string;
  sapClient: string;
  updatedAt?: string;
}

export const CONNECTION_ROW = "__connection__";
const CACHE_KEY = "dmr.sapConnection.v1";

const empty: SapConnection = { middlewareUrl: "", proxySecret: "", sapHost: "", sapClient: "100" };

function readCache(): SapConnection {
  if (typeof window === "undefined") return empty;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? { ...empty, ...JSON.parse(raw) } : empty;
  } catch {
    return empty;
  }
}

let state: SapConnection = readCache();
const listeners = new Set<() => void>();

function setState(next: SapConnection) {
  if (JSON.stringify(next) === JSON.stringify(state)) return;
  state = next;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(next));
  } catch {
    /* noop */
  }
  listeners.forEach((l) => l());
}

async function load() {
  const { data, error } = await supabase
    .from("sap_api_configs")
    .select("config")
    .eq("name", CONNECTION_ROW)
    .maybeSingle();
  if (error) {
    console.warn("[sapConnection] load failed", error);
    return;
  }
  if (data?.config) setState({ ...empty, ...(data.config as unknown as SapConnection) });
}

let loaded = false;
export function ensureSapConnectionLoaded() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  load();
}

export function getSapConnection(): SapConnection {
  ensureSapConnectionLoaded();
  return state;
}

export function useSapConnection(): SapConnection {
  ensureSapConnectionLoaded();
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
}

export async function saveSapConnection(next: SapConnection) {
  const value: SapConnection = {
    ...next,
    middlewareUrl: next.middlewareUrl.trim().replace(/\/+$/, ""),
    sapHost: next.sapHost.trim().replace(/\/+$/, ""),
    updatedAt: new Date().toISOString(),
  };
  const { error } = await supabase
    .from("sap_api_configs")
    .upsert({ name: CONNECTION_ROW, config: value as never } as never, { onConflict: "name" });
  if (error) throw error;
  setState(value);
}

/** Internal: refresh after realtime change. */
export function reloadSapConnection() {
  return load();
}

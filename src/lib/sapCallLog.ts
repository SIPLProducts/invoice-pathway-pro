import { supabase } from "@/integrations/supabase/client";

/** Request headers used only inside the browser to tag a SAP call for the history log.
 *  They are stripped before the request leaves the browser. */
export const LOG_API_HEADER = "x-dmr-log-api";
export const LOG_ACTION_HEADER = "x-dmr-log-action";

export function logTag(apiName: string | undefined | null, action?: string): Record<string, string> {
  if (!apiName) return {};
  return { [LOG_API_HEADER]: apiName, ...(action ? { [LOG_ACTION_HEADER]: action } : {}) };
}

const MAX_PREVIEW = 20_000;

function countRecords(data: unknown): number {
  if (Array.isArray(data)) return data.length;
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.value)) return d.value.length;
    const inner = d.d as Record<string, unknown> | undefined;
    if (inner && Array.isArray(inner.results)) return inner.results.length;
    if (Array.isArray(d.rows)) return d.rows.length;
    if (Array.isArray(d.data)) return d.data.length;
    if (d.error) return 0;
    return 1;
  }
  return 0;
}

function errorMessage(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const e = (data as Record<string, unknown>).error as Record<string, unknown> | string | undefined;
  if (typeof e === "string") return e;
  if (e && typeof e.message === "string") return e.message as string;
  const m = (data as Record<string, unknown>).message;
  return typeof m === "string" ? m : null;
}

function actionFor(method: string): string {
  if (method === "POST") return "create";
  if (method === "PATCH" || method === "PUT") return "update";
  if (method === "DELETE") return "delete";
  return "fetch";
}

export interface SapCallLogRow {
  id: string;
  api_name: string;
  action: string;
  method: string | null;
  url: string | null;
  http_status: number | null;
  ok: boolean;
  record_count: number;
  bytes: number;
  duration_ms: number | null;
  message: string | null;
  response_preview: unknown;
  created_at: string;
}

function save(row: Omit<SapCallLogRow, "id" | "created_at">) {
  void supabase.auth.getUser().then(({ data }) => {
    if (!data.user) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    void (supabase.from("sap_api_call_logs") as any).insert({ ...row, user_id: data.user.id }).then(() => {
      window.dispatchEvent(new CustomEvent("sap-call-logged", { detail: row.api_name }));
    });
  });
}

let installed = false;
/** Wraps window.fetch so every tagged SAP call is recorded (fire-and-forget). */
export function installSapCallLogger() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const orig = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const hdrs = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    const apiName = hdrs.get(LOG_API_HEADER);
    if (!apiName) return orig(input, init);
    const action = hdrs.get(LOG_ACTION_HEADER);
    hdrs.delete(LOG_API_HEADER);
    hdrs.delete(LOG_ACTION_HEADER);
    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const started = performance.now();
    try {
      const res = await orig(input, { ...init, headers: hdrs });
      res.clone().text().then((text) => {
        let data: unknown = null;
        try { data = text ? JSON.parse(text) : null; } catch { data = text.slice(0, 500); }
        const isHtml = /^\s*<(!doctype|html)/i.test(text);
        const ok = res.ok && !isHtml && !(data && typeof data === "object" && (data as Record<string, unknown>).error);
        save({
          api_name: apiName,
          action: action ?? actionFor(method),
          method,
          url,
          http_status: res.status,
          ok,
          record_count: ok ? countRecords(data) : 0,
          bytes: new Blob([text]).size,
          duration_ms: Math.round(performance.now() - started),
          message: ok ? null : isHtml ? "Got a web page instead of SAP data — check the Middleware URL points to the middleware" : errorMessage(data) ?? `HTTP ${res.status}`,
          response_preview: isHtml ? { html: text.slice(0, 500) } : text.length > MAX_PREVIEW ? { truncated: true, text: text.slice(0, MAX_PREVIEW) } : data,
        });
      }).catch(() => {});
      return res;
    } catch (e) {
      save({
        api_name: apiName,
        action: action ?? actionFor(method),
        method,
        url,
        http_status: null,
        ok: false,
        record_count: 0,
        bytes: 0,
        duration_ms: Math.round(performance.now() - started),
        message: `${e instanceof Error ? e.message : String(e)} — middleware not reachable (is it running?)`,
        response_preview: null,
      });
      throw e;
    }
  };
}

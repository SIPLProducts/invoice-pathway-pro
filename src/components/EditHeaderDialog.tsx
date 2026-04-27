import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSapUpdate, resolveUrlTemplate } from "@/hooks/useSapUpdate";
import type { SapApi, FieldDef } from "@/lib/sapApisStore";
import { toast } from "sonner";
import { Loader2, Save, AlertCircle } from "lucide-react";

interface Props {
  api: SapApi;
  row: Record<string, unknown>;
  onClose: () => void;
  onSaved?: () => void;
}

function deriveFields(api: SapApi, row: Record<string, unknown>): FieldDef[] {
  // Prefer explicit request header fields; fall back to response header fields filtered to scalars present in the row.
  const req = (api.requestHeaderFields ?? []).filter((f) => f.showInForm !== false);
  if (req.length) return req;
  const resp = api.responseHeaderFields ?? [];
  if (resp.length) {
    return resp.filter((f) => {
      const v = row[f.key];
      return v === null || v === undefined || typeof v !== "object";
    });
  }
  // Last resort: derive from the row itself
  return Object.entries(row)
    .filter(([k, v]) => !k.startsWith("@") && k !== "SAP__Messages" && (v === null || typeof v !== "object"))
    .map(([k, v]) => ({
      key: k,
      label: k,
      type: typeof v === "number" ? "number" : "string",
      showInForm: true,
    }));
}

function toInputValue(v: unknown, type: FieldDef["type"]): string {
  if (v === null || v === undefined) return "";
  if (type === "time" && typeof v === "string") {
    return v.length >= 5 ? v.slice(0, 5) : v;
  }
  return String(v);
}

function coerce(v: string, type: FieldDef["type"]): string | number | boolean {
  if (type === "number") {
    const n = Number(v);
    return Number.isNaN(n) ? 0 : n;
  }
  if (type === "boolean") return v === "true" || v === "1";
  return v;
}

/**
 * Trust the live SAP row as the source of truth for primitive types.
 * If the schema says "string" but the live row's value is a number/boolean,
 * render and coerce as that real type — this prevents sending quoted numbers
 * to SAP (which fails with CX_SXML_PARSE_ERROR on Edm.Decimal fields).
 */
function effectiveType(field: FieldDef, liveValue: unknown): FieldDef["type"] {
  if (typeof liveValue === "number") return "number";
  if (typeof liveValue === "boolean") return "boolean";
  return field.type;
}

export function EditHeaderDialog({ api, row, onClose, onSaved }: Props) {
  const fields = useMemo(() => deriveFields(api, row), [api, row]);
  const { submit, loading, proxyConfigured, updateConfigured } = useSapUpdate(api);

  const initial = useMemo(() => {
    const o: Record<string, string> = {};
    fields.forEach((f) => (o[f.key] = toInputValue(row[f.key], effectiveType(f, row[f.key]))));
    return o;
  }, [fields, row]);

  const [values, setValues] = useState<Record<string, string>>(initial);

  const keyField = api.keyField ?? api.rowKey ?? "gate_id";
  const previewKey = String(row[keyField] ?? "");
  const { url: resolvedPath, missing } = resolveUrlTemplate(api.updateEndpoint ?? "", row);

  // Defense-in-depth: if the configured template is an ITEM template (has
  // {item_no} or /items/), refuse to render the header form so we never
  // silently PATCH the wrong endpoint with header data.
  const tpl = api.updateEndpoint ?? "";
  const isItemTemplate = /\{item_no\}|\{item[_-]?id\}/i.test(tpl) || /\/items?\//i.test(tpl);
  if (isItemTemplate) {
    return (
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Wrong API selected for header edit</DialogTitle>
            <DialogDescription>
              The chosen API "{api.name}" points at an <strong>item</strong> endpoint
              (<code className="rounded bg-muted px-1 font-mono text-[11px]">{tpl}</code>),
              not a header endpoint.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
            Open <strong>SAP Settings</strong> and configure a separate header-update API with
            an Update Endpoint like{" "}
            <code className="rounded bg-background px-1 font-mono text-[11px]">
              /api/gate/headers/{"{gate_id}"}
            </code>
            . The current API will continue to be used for per-line-item edits inside the Items popup.
          </div>
          <DialogFooter>
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const onSubmit = async () => {
    const body: Record<string, string | number | boolean> = {};
    fields.forEach((f) => {
      const raw = values[f.key];
      if (raw === undefined || raw === "") return;
      body[f.key] = coerce(raw, effectiveType(f, row[f.key]));
    });

    const result = await submit(row, body);
    if (!result.ok) {
      toast.error(result.error ?? "Update failed");
      return;
    }
    toast.success(`Updated ${keyField} = ${previewKey}`);
    onSaved?.();
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit header — {previewKey || "(no key)"}</DialogTitle>
          <DialogDescription>
            Update header fields and save. Changes are sent to{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
              {api.updateMethod ?? "PATCH"} {resolvedPath ?? api.updateEndpoint ?? "(no endpoint)"}
            </code>
          </DialogDescription>
        </DialogHeader>

        {!updateConfigured && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="font-semibold">Update endpoint not configured</div>
              <div className="text-xs">
                Open SAP Settings → {api.name} → API Details and set{" "}
                <code className="rounded bg-background px-1 font-mono">Update Endpoint</code> to a
                template like{" "}
                <code className="rounded bg-background px-1 font-mono">
                  /api/gate/headers/{"{gate_id}"}
                </code>
                .
              </div>
            </div>
          </div>
        )}

        {updateConfigured && missing && (
          <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <div>
              Cannot resolve placeholder{" "}
              <code className="rounded bg-background px-1 font-mono">{`{${missing}}`}</code> — the
              selected row is missing this value.
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {fields.map((f) => {
            const isKey = f.key === keyField;
            const t = effectiveType(f, row[f.key]);
            return (
              <div key={f.key} className="space-y-1.5">
                <Label className="text-xs">
                  {f.label}
                  {f.required && <span className="ml-0.5 text-destructive">*</span>}
                  {isKey && (
                    <span className="ml-1.5 rounded bg-muted px-1 py-0.5 text-[9px] font-semibold uppercase text-muted-foreground">
                      key
                    </span>
                  )}
                </Label>
                <Input
                  type={t === "number" ? "number" : t === "date" ? "date" : t === "time" ? "time" : "text"}
                  step={t === "number" ? "any" : undefined}
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValues((p) => ({ ...p, [f.key]: e.target.value }))}
                  disabled={isKey}
                  className="h-9 text-sm"
                />
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={loading || !proxyConfigured || !updateConfigured || !!missing}
            className="gap-1.5"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default EditHeaderDialog;

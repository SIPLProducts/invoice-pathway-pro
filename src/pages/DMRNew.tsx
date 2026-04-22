import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Camera, Save, Send, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useSapApis, type FieldDef, type SapApi } from "@/lib/sapApisStore";
import { useSapCreate } from "@/hooks/useSapCreate";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Row = Record<string, string | number | boolean>;

function emptyRowFromFields(fields: FieldDef[]): Row {
  const row: Row = {};
  for (const f of fields) {
    if (f.type === "number") row[f.key] = 0;
    else if (f.type === "boolean") row[f.key] = false;
    else row[f.key] = f.defaultValue ?? "";
  }
  return row;
}

function coerce(v: string, type: FieldDef["type"]): string | number | boolean {
  if (type === "number") return v === "" ? 0 : Number(v);
  if (type === "boolean") return v === "true";
  return v;
}

export default function DMRNew() {
  const navigate = useNavigate();
  const apis = useSapApis();
  // Show every configured API that can plausibly create or read records.
  const liveApis = apis.filter(
    (a) =>
      a.type === "live" ||
      a.type === "sync" ||
      (a.requestHeaderFields?.length ?? 0) > 0 ||
      (a.responseHeaderFields?.length ?? 0) > 0,
  );

  const [selectedName, setSelectedName] = useState<string>(
    liveApis.find((a) => a.name === "ZUI_Gate_Service")?.name ?? liveApis[0]?.name ?? "",
  );

  const api: SapApi | undefined = useMemo(
    () => apis.find((a) => a.name === selectedName),
    [apis, selectedName],
  );

  // If request fields are missing, allow user to derive them from response fields (in-memory only).
  const [derivedHeaderFields, setDerivedHeaderFields] = useState<FieldDef[] | null>(null);
  const [derivedItemFields, setDerivedItemFields] = useState<FieldDef[] | null>(null);

  const headerFields = (
    derivedHeaderFields ??
    api?.requestHeaderFields ??
    []
  ).filter((f) => f.showInForm !== false && f.key);
  const itemFields = (
    derivedItemFields ??
    api?.requestItemFields ??
    []
  ).filter((f) => f.showInForm !== false && f.key);

  const [header, setHeader] = useState<Row>(() => emptyRowFromFields(headerFields));
  const [items, setItems] = useState<Row[]>(() =>
    itemFields.length ? [emptyRowFromFields(itemFields)] : [],
  );

  // Reset state when switching API
  const handleSelectApi = (name: string) => {
    setSelectedName(name);
    setDerivedHeaderFields(null);
    setDerivedItemFields(null);
    const next = apis.find((a) => a.name === name);
    const hf = (next?.requestHeaderFields ?? []).filter((f) => f.showInForm !== false && f.key);
    const itf = (next?.requestItemFields ?? []).filter((f) => f.showInForm !== false && f.key);
    setHeader(emptyRowFromFields(hf));
    setItems(itf.length ? [emptyRowFromFields(itf)] : []);
  };

  const autoGenerateFromResponse = () => {
    if (!api) return;
    const hf: FieldDef[] = (api.responseHeaderFields ?? []).map((f) => ({
      ...f,
      showInForm: true,
    }));
    const itf: FieldDef[] = (api.responseItemFields ?? []).map((f) => ({
      ...f,
      showInForm: true,
    }));
    if (!hf.length && !itf.length) {
      toast.error("No response fields configured either. Open SAP Settings to add them.");
      return;
    }
    setDerivedHeaderFields(hf);
    setDerivedItemFields(itf);
    setHeader(emptyRowFromFields(hf));
    setItems(itf.length ? [emptyRowFromFields(itf)] : []);
    toast.success(
      `Generated ${hf.length} header + ${itf.length} item field(s) from response schema`,
    );
  };

  const { submit, loading, proxyConfigured } = useSapCreate(api ?? null);

  const onSubmit = async () => {
    if (!api) return;
    // Validate required fields
    for (const f of headerFields) {
      if (f.required && (header[f.key] === "" || header[f.key] === undefined)) {
        toast.error(`${f.label || f.key} is required`);
        return;
      }
    }
    const body: Record<string, unknown> = { ...header };
    if (itemFields.length) body._Item = items;

    if (!proxyConfigured) {
      toast.error(
        "VITE_SAP_PROXY_URL is not set. Configure your Node middleware URL to enable Submit.",
      );
      return;
    }

    const res = await submit(body);
    if (res.ok) {
      const id = (res.data as Record<string, unknown> | undefined)?.[api.rowKey ?? "gate_id"] ?? "";
      toast.success(`Created ${id || "record"} in SAP`);
      navigate("/dmr");
    } else {
      toast.error(res.error ?? "Failed to create");
    }
  };

  return (
    <>
      <Link
        to="/dmr"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to DMR list
      </Link>
      <PageHeader
        title="New DMR Entry"
        description="Capture a daily material receipt — fields are driven by the selected SAP API configuration."
        actions={
          <>
            <Button variant="outline" size="sm">
              <Save className="h-4 w-4" />
              Save Draft
            </Button>
            <Button
              size="sm"
              className="bg-gradient-primary"
              onClick={onSubmit}
              disabled={loading || !api}
            >
              <Send className="h-4 w-4" />
              {loading ? "Submitting…" : "Submit to SAP"}
            </Button>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4 shadow-card">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Source API
          </span>
          <Select value={selectedName} onValueChange={handleSelectApi}>
            <SelectTrigger className="h-9 w-72">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {liveApis.map((a) => (
                <SelectItem key={a.name} value={a.name}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto text-[11px] text-muted-foreground">
          Fields and validation come from{" "}
          <Link to="/sap/settings" className="font-semibold text-primary hover:underline">
            SAP Settings → {selectedName} → Request Fields
          </Link>
          .
        </div>
      </div>

      <div className="mb-5 rounded-xl border-2 border-dashed border-primary/30 bg-gradient-surface p-6 text-center">
        <Camera className="mx-auto h-10 w-10 text-primary" />
        <h3 className="mt-3 font-display text-base font-semibold">Start with OCR Capture</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Auto-extract vendor, invoice, PO, and line items in seconds
        </p>
        <Button className="mt-4 bg-gradient-primary" asChild>
          <Link to="/ocr">Open Capture →</Link>
        </Button>
      </div>

      {!api ? (
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          No SAP API selected.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-5">
            <Section title={`${api.name} — Header`}>
              <Grid>
                {headerFields.map((f) => (
                  <Field key={f.key} label={`${f.label || f.key}${f.required ? " *" : ""}`}>
                    <FieldInput
                      field={f}
                      value={header[f.key] as string | number | boolean}
                      onChange={(v) => setHeader((h) => ({ ...h, [f.key]: v }))}
                    />
                  </Field>
                ))}
                {headerFields.length === 0 && (
                  <div className="col-span-full rounded-lg border-2 border-dashed p-4 text-center text-xs text-muted-foreground">
                    No request header fields configured. Open SAP Settings → {api.name} → Request Fields.
                  </div>
                )}
              </Grid>
            </Section>

            {itemFields.length > 0 && (
              <Section title="Line Items (_Item)">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                        {itemFields.map((f) => (
                          <th
                            key={f.key}
                            className={`py-2 pr-2 font-medium ${f.align === "right" ? "text-right" : ""}`}
                          >
                            {f.label || f.key}
                          </th>
                        ))}
                        <th className="py-2 w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((row, idx) => (
                        <tr key={idx} className="border-b last:border-0">
                          {itemFields.map((f) => (
                            <td key={f.key} className="py-1.5 pr-2">
                              <FieldInput
                                field={f}
                                compact
                                value={row[f.key] as string | number | boolean}
                                onChange={(v) =>
                                  setItems((arr) =>
                                    arr.map((r, i) => (i === idx ? { ...r, [f.key]: v } : r)),
                                  )
                                }
                              />
                            </td>
                          ))}
                          <td className="py-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() =>
                                setItems((arr) => (arr.length > 1 ? arr.filter((_, i) => i !== idx) : arr))
                              }
                              aria-label="Remove line"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 gap-1.5"
                  onClick={() => setItems((a) => [...a, emptyRowFromFields(itemFields)])}
                >
                  <Plus className="h-3.5 w-3.5" /> Add line
                </Button>
              </Section>
            )}
          </div>

          <div className="space-y-4">
            <Section title="Request Preview">
              <pre className="max-h-96 overflow-auto rounded-lg bg-muted/50 p-3 font-mono text-[11px] leading-relaxed">
                {JSON.stringify(
                  itemFields.length ? { ...header, _Item: items } : header,
                  null,
                  2,
                )}
              </pre>
            </Section>

            <Section title="Attachments">
              <div className="rounded-lg border-2 border-dashed p-6 text-center text-sm text-muted-foreground">
                Drop files here or <span className="font-medium text-primary">browse</span>
              </div>
            </Section>
          </div>
        </div>
      )}
    </>
  );
}

function FieldInput({
  field,
  value,
  onChange,
  compact,
}: {
  field: FieldDef;
  value: string | number | boolean | undefined;
  onChange: (v: string | number | boolean) => void;
  compact?: boolean;
}) {
  const base = `${compact ? "h-8" : "h-9"} w-full rounded-md border bg-background px-2.5 text-sm outline-none focus:shadow-glow`;
  const v = value ?? (field.type === "number" ? 0 : field.type === "boolean" ? false : "");

  if (field.type === "boolean") {
    return (
      <select
        className={base}
        value={String(v)}
        onChange={(e) => onChange(e.target.value === "true")}
      >
        <option value="false">No</option>
        <option value="true">Yes</option>
      </select>
    );
  }
  const inputType =
    field.type === "date" ? "date" : field.type === "time" ? "time" : field.type === "number" ? "number" : "text";
  return (
    <input
      type={inputType}
      className={`${base} ${field.align === "right" ? "text-right font-mono" : ""}`}
      value={String(v)}
      step={field.type === "number" ? "any" : undefined}
      onChange={(e) => onChange(coerce(e.target.value, field.type))}
    />
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-card">
      <h3 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

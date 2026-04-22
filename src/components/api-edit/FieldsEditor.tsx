import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, RotateCcw } from "lucide-react";
import type { FieldDef, FieldType } from "@/lib/sapApisStore";

interface Props {
  title: string;
  description?: string;
  fields: FieldDef[];
  onChange: (next: FieldDef[]) => void;
  /** "request" shows Required + Show in Form + Default; "response" shows Show in Table + Align. */
  variant: "request" | "response";
  onResetDefaults?: () => void;
}

const TYPES: FieldType[] = ["string", "number", "date", "time", "boolean"];

export function FieldsEditor({
  title,
  description,
  fields,
  onChange,
  variant,
  onResetDefaults,
}: Props) {
  const update = (idx: number, patch: Partial<FieldDef>) => {
    const next = fields.map((f, i) => (i === idx ? { ...f, ...patch } : f));
    onChange(next);
  };

  const remove = (idx: number) => onChange(fields.filter((_, i) => i !== idx));

  const add = () =>
    onChange([
      ...fields,
      {
        key: "",
        label: "",
        type: "string",
        ...(variant === "request" ? { showInForm: true } : { showInTable: true }),
      },
    ]);

  return (
    <div className="rounded-xl border bg-card p-5 shadow-card">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-base font-semibold">{title}</h3>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        <div className="flex gap-2">
          {onResetDefaults && (
            <Button variant="outline" size="sm" onClick={onResetDefaults} className="gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" /> Reset to SAP defaults
            </Button>
          )}
          <Button size="sm" onClick={add} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add Field
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Key</th>
              <th className="px-3 py-2 text-left font-medium">Label</th>
              <th className="px-3 py-2 text-left font-medium">Type</th>
              {variant === "request" ? (
                <>
                  <th className="px-3 py-2 text-center font-medium">Required</th>
                  <th className="px-3 py-2 text-center font-medium">In Form</th>
                  <th className="px-3 py-2 text-left font-medium">Default</th>
                </>
              ) : (
                <>
                  <th className="px-3 py-2 text-center font-medium">In Table</th>
                  <th className="px-3 py-2 text-left font-medium">Align</th>
                </>
              )}
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {fields.length === 0 && (
              <tr>
                <td colSpan={variant === "request" ? 7 : 6} className="py-6 text-center text-xs text-muted-foreground">
                  No fields yet. Click "Add Field" or "Reset to SAP defaults".
                </td>
              </tr>
            )}
            {fields.map((f, i) => (
              <tr key={i} className="border-t">
                <td className="px-2 py-1.5">
                  <Input
                    value={f.key}
                    onChange={(e) => update(i, { key: e.target.value })}
                    placeholder="gate_id"
                    className="h-8 font-mono text-xs"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    value={f.label}
                    onChange={(e) => update(i, { label: e.target.value })}
                    placeholder="Gate ID"
                    className="h-8 text-xs"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Select value={f.type} onValueChange={(v) => update(i, { type: v as FieldType })}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPES.map((t) => (
                        <SelectItem key={t} value={t} className="text-xs">
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                {variant === "request" ? (
                  <>
                    <td className="px-2 py-1.5 text-center">
                      <Switch
                        checked={!!f.required}
                        onCheckedChange={(v) => update(i, { required: v })}
                      />
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <Switch
                        checked={f.showInForm !== false}
                        onCheckedChange={(v) => update(i, { showInForm: v })}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        value={f.defaultValue ?? ""}
                        onChange={(e) => update(i, { defaultValue: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-2 py-1.5 text-center">
                      <Switch
                        checked={f.showInTable !== false}
                        onCheckedChange={(v) => update(i, { showInTable: v })}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Select
                        value={f.align ?? "left"}
                        onValueChange={(v) => update(i, { align: v as "left" | "right" })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left" className="text-xs">left</SelectItem>
                          <SelectItem value="right" className="text-xs">right</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  </>
                )}
                <td className="px-2 py-1.5 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => remove(i)}
                    aria-label="Delete field"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

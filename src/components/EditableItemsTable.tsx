import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ColumnDef, SapApiSchema } from "@/lib/sapApiSchemas";
import type { SapApi } from "@/lib/sapApisStore";
import { useSapItemUpdate } from "@/hooks/useSapItemUpdate";
import { Pencil, Save, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  schema: SapApiSchema;
  parentRow: Record<string, unknown>;
  items: Record<string, unknown>[];
  itemUpdateApi?: SapApi;
  onSaved?: (updated: Record<string, unknown>, idx: number) => void;
}

function formatCell(value: unknown, col: ColumnDef): string {
  if (value === null || value === undefined || value === "") return "—";
  switch (col.format) {
    case "number":
      return typeof value === "number" ? value.toLocaleString() : String(value);
    default:
      return String(value);
  }
}

function effectiveType(col: ColumnDef, liveValue: unknown): ColumnDef["format"] {
  if (typeof liveValue === "number") return "number";
  return col.format ?? "text";
}

function toInputValue(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

const KEY_COLS = new Set(["gate_id", "item_no"]);
// Server-managed; not user-editable.
const READONLY_COLS = new Set(["last_changed_at", "created_at", "last_changed_by", "created_by"]);

export function EditableItemsTable({
  schema,
  parentRow,
  items,
  itemUpdateApi,
  onSaved,
}: Props) {
  const cols = schema.childColumns ?? [];
  const { submit, loading, updateConfigured, proxyConfigured } = useSapItemUpdate(itemUpdateApi);
  const canEdit = Boolean(itemUpdateApi && updateConfigured && proxyConfigured);

  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const startEdit = (idx: number, row: Record<string, unknown>) => {
    const initial: Record<string, string> = {};
    cols.forEach((c) => {
      initial[c.path] = toInputValue(row[c.path]);
    });
    // Make sure we keep parent gate_id available for URL building (display only).
    setDraft(initial);
    setEditingIdx(idx);
  };

  const cancel = () => {
    setEditingIdx(null);
    setDraft({});
  };

  const onUpdate = async (idx: number, row: Record<string, unknown>) => {
    if (!itemUpdateApi) return;
    const body: Record<string, unknown> = { ...draft };
    const result = await submit(parentRow, row, body);
    if (!result.ok) {
      toast.error(result.error ?? "Update failed");
      return;
    }
    toast.success(`Updated item ${row.item_no ?? ""}`);
    onSaved?.((result.data as Record<string, unknown>) ?? { ...row, ...body }, idx);
    cancel();
  };

  return (
    <div className="overflow-x-auto rounded border bg-background">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            {cols.map((c) => (
              <TableHead
                key={c.path}
                className={cn(
                  "whitespace-nowrap text-[10px] uppercase",
                  c.align === "right" && "text-right",
                )}
              >
                {c.header}
              </TableHead>
            ))}
            {itemUpdateApi && (
              <TableHead className="whitespace-nowrap text-[10px] uppercase">Action</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((child, idx) => {
            const isEditing = editingIdx === idx;
            return (
              <TableRow key={idx}>
                {cols.map((c) => {
                  const liveVal = child[c.path];
                  const t = effectiveType(c, liveVal);
                  const isKey = KEY_COLS.has(c.path);
                  const isReadOnly = READONLY_COLS.has(c.path);
                  if (isEditing && !isKey && !isReadOnly) {
                    return (
                      <TableCell key={c.path} className="whitespace-nowrap p-1">
                        <Input
                          type={t === "number" ? "number" : t === "date" ? "date" : t === "time" ? "time" : "text"}
                          step={t === "number" ? "any" : undefined}
                          value={draft[c.path] ?? ""}
                          onChange={(e) =>
                            setDraft((p) => ({ ...p, [c.path]: e.target.value }))
                          }
                          className={cn("h-8 text-xs", c.align === "right" && "text-right")}
                        />
                      </TableCell>
                    );
                  }
                  return (
                    <TableCell
                      key={c.path}
                      className={cn(
                        "whitespace-nowrap text-xs",
                        c.align === "right" && "text-right font-mono",
                        isEditing && (isKey || isReadOnly) && "text-muted-foreground",
                      )}
                    >
                      {formatCell(liveVal, c)}
                    </TableCell>
                  );
                })}
                {itemUpdateApi && (
                  <TableCell className="whitespace-nowrap">
                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          className="h-7 gap-1.5 text-xs"
                          disabled={loading}
                          onClick={() => onUpdate(idx, child)}
                        >
                          {loading ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Save className="h-3 w-3" />
                          )}
                          Update
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1.5 text-xs"
                          disabled={loading}
                          onClick={cancel}
                        >
                          <X className="h-3 w-3" />
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1.5 text-xs"
                        disabled={!canEdit || editingIdx !== null}
                        onClick={() => startEdit(idx, child)}
                        title={
                          !canEdit
                            ? "Item-update API not configured"
                            : editingIdx !== null
                              ? "Finish editing the current row first"
                              : "Edit item"
                        }
                      >
                        <Pencil className="h-3 w-3" />
                        Edit
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export default EditableItemsTable;

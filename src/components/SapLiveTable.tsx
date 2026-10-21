import { useEffect, useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useSapProxy } from "@/hooks/useSapProxy";
import { mergeColumnsWithData, type ColumnDef, type SapApiSchema } from "@/lib/sapApiSchemas";
import type { SapApi } from "@/lib/sapApisStore";
import { getPath } from "@/lib/getPath";
import { RefreshCw, AlertCircle, Wifi, WifiOff, Package, KeyRound, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { EditableItemsTable } from "@/components/EditableItemsTable";

interface Props {
  api: SapApi;
  schema: SapApiSchema;
  onEdit?: (row: Record<string, unknown>) => void;
  itemUpdateApi?: SapApi;
  onItemSaved?: () => void;
  selectable?: boolean;
  /** Reports loaded rows, the displayed columns and the selected rows. */
  onDataChange?: (data: {
    rows: Record<string, unknown>[];
    selected: Record<string, unknown>[];
    columns: ColumnDef[];
    childColumns?: ColumnDef[];
  }) => void;
}

function formatCell(value: unknown, col: ColumnDef): string {
  if (value === null || value === undefined || value === "") return "—";
  switch (col.format) {
    case "number":
      return typeof value === "number" ? value.toLocaleString() : String(value);
    case "date":
    case "time":
      return String(value);
    default:
      return String(value);
  }
}

export function SapLiveTable({ api, schema, onEdit, itemUpdateApi, onItemSaved, selectable, onDataChange }: Props) {
  const { rows: rawRows, loading, error, lastFetched, proxyConfigured, refresh } = useSapProxy(api, schema);
  // Add a derived Total Quantity (sum of line-item Quantity) to each header row.
  const rows = useMemo(() => {
    if (!schema.childKey) return rawRows;
    return (rawRows as Record<string, unknown>[]).map((r) => {
      const items = (getPath(r, schema.childKey!) as Record<string, unknown>[]) ?? [];
      if (!Array.isArray(items) || !items.length) return r;
      let sum = 0;
      for (const it of items) {
        const k = Object.keys(it).find((x) => x.toLowerCase() === "quantity");
        const n = Number(k ? it[k] : NaN);
        if (!Number.isNaN(n)) sum += n;
      }
      return { ...r, TotalQuantity: sum };
    });
  }, [rawRows, schema.childKey]);

  const [openRow, setOpenRow] = useState<{
    key: string;
    items: Record<string, unknown>[];
    parent: Record<string, unknown>;
  } | null>(null);

  const hiddenHeader = (api.responseHeaderFields ?? []).filter((f) => f.showInTable === false).map((f) => f.key);
  const hiddenItem = (api.responseItemFields ?? []).filter((f) => f.showInTable === false).map((f) => f.key);
  const columns = useMemo(
    () => mergeColumnsWithData(schema.columns, rows as Record<string, unknown>[], hiddenHeader),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [schema.columns, rows],
  );
  const childColumns = useMemo(() => {
    if (!schema.childKey) return schema.childColumns;
    const all = (rows as Record<string, unknown>[]).flatMap(
      (r) => ((getPath(r, schema.childKey!) as Record<string, unknown>[]) ?? []),
    );
    const merged = mergeColumnsWithData(schema.childColumns ?? [], all, hiddenItem);
    return merged.length ? merged : undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema.childKey, schema.childColumns, rows]);
  const viewSchema = useMemo(() => ({ ...schema, columns, childColumns }), [schema, columns, childColumns]);
  const hasChildren = Boolean(schema.childKey && childColumns?.length);

  const allRows = rows as Record<string, unknown>[];
  const keyOf = (row: Record<string, unknown>, idx: number) => String(getPath(row, schema.rowKey) ?? idx);
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const total = allRows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * pageSize;
  const pageRows = allRows.slice(start, start + pageSize);

  useEffect(() => {
    if (!onDataChange) return;
    onDataChange({
      rows: allRows,
      selected: allRows.filter((r, i) => selected.has(keyOf(r, i))),
      columns,
      childColumns,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRows, selected, columns, childColumns]);

  const pageKeys = pageRows.map((r, i) => keyOf(r, start + i));
  const allOnPage = pageKeys.length > 0 && pageKeys.every((k) => selected.has(k));
  const toggleAllOnPage = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      pageKeys.forEach((k) => (allOnPage ? next.delete(k) : next.add(k)));
      return next;
    });
  const toggleOne = (k: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  const extraCols = (selectable ? 1 : 0) + (hasChildren ? 1 : 0) + (onEdit ? 1 : 0);

  return (
    <div className="rounded-xl border bg-card shadow-card">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{schema.label}</h3>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            {total} record{total === 1 ? "" : "s"}
            {selected.size > 0 && ` · ${selected.size} selected`}
          </span>
          {proxyConfigured ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
              <Wifi className="h-3 w-3" /> Live
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
              <WifiOff className="h-3 w-3" /> Proxy not configured
            </span>
          )}
          {error && (
            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
              <AlertCircle className="h-3 w-3" /> Error
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {lastFetched && <span>Updated {lastFetched.toLocaleTimeString()}</span>}
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={!proxyConfigured || loading}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {!proxyConfigured && (
        <div className="space-y-3 px-4 py-8 text-center text-sm text-muted-foreground">
          <div>
            Records can't load yet — the <strong>Node.js Middleware URL</strong> isn't set
            for <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{api.name}</code>.
          </div>
          <div className="text-xs">
            Each browser stores its own SAP API settings, so every user opening this shared
            project must set the middleware URL once.
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Link
              to={`/sap/settings/edit/${encodeURIComponent(api.name)}`}
              className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20"
            >
              Configure middleware URL
            </Link>
            <Link
              to="/sap/settings"
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
            >
              Open SAP Settings
            </Link>
          </div>
        </div>
      )}

      {proxyConfigured && error && (
        <div
          className={cn(
            "border-b px-4 py-3 text-sm",
            error.code === "sap_session_expired" ||
              error.code === "sap_auth_redirect" ||
              error.code === "sap_no_cookies"
              ? "bg-warning/10 text-warning-foreground"
              : "bg-destructive/5 text-destructive",
          )}
        >
          <div className="flex items-center gap-2 font-semibold">
            {error.code === "sap_session_expired" ||
            error.code === "sap_auth_redirect" ||
            error.code === "sap_no_cookies" ? (
              <KeyRound className="h-4 w-4 text-warning" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            {error.code === "sap_session_expired"
              ? "SAP browser session expired"
              : error.code === "sap_auth_redirect"
                ? "SAP authentication required"
                : error.code === "sap_no_cookies"
                  ? "SAP did not issue session cookies"
                  : "Failed to load from SAP"}
            {error.code && (
              <code className="rounded bg-foreground/10 px-1.5 py-0.5 font-mono text-[10px]">
                {error.code}
              </code>
            )}
          </div>
          <div className="mt-1 whitespace-pre-wrap text-xs">{error.message}</div>
          {error.hint && error.code !== "sap_no_cookies" && (
            <div className="mt-2 rounded border border-border bg-background/60 px-3 py-2 text-xs text-foreground">
              <span className="font-semibold">How to fix: </span>
              {error.hint}
            </div>
          )}
          {error.code === "sap_no_cookies" && (
            <div className="mt-2 rounded border border-border bg-background/60 px-3 py-2 text-xs text-foreground">
              This SAP tenant does not issue browser session cookies. The middleware should
              auto-fallback to stateless Basic auth on the next call. If this error persists,
              ensure <code className="rounded bg-muted px-1 font-mono">SAP_USER</code> /{" "}
              <code className="rounded bg-muted px-1 font-mono">SAP_PASSWORD</code> are set in{" "}
              <code className="rounded bg-muted px-1 font-mono">middleware/.env</code>, or switch
              to <code className="rounded bg-muted px-1 font-mono">SAP_AUTH_MODE=oauth_cc</code>.
            </div>
          )}
          {(error.code === "sap_session_expired" || error.code === "sap_auth_redirect") && (
            <div className="mt-2">
              <Link
                to="/sap/settings"
                className="inline-flex items-center gap-1.5 rounded-md border border-warning/40 bg-warning/15 px-2.5 py-1 text-xs font-semibold text-warning hover:bg-warning/25"
              >
                <KeyRound className="h-3 w-3" />
                Open SAP Settings → SAP Browser Session
              </Link>
            </div>
          )}
        </div>
      )}

      {proxyConfigured && (
        <div className="overflow-x-auto scrollbar-thin">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                {selectable && (
                  <TableHead className="w-10">
                    <Checkbox checked={allOnPage} onCheckedChange={toggleAllOnPage} aria-label="Select all on this page" />
                  </TableHead>
                )}
                {columns.map((c) => (
                  <TableHead
                    key={c.path}
                    className={cn(
                      "whitespace-nowrap text-xs uppercase tracking-wider",
                      c.align === "right" && "text-right",
                    )}
                  >
                    {c.header}
                  </TableHead>
                ))}
                {hasChildren && (
                  <TableHead className="whitespace-nowrap text-xs uppercase tracking-wider">
                    Items
                  </TableHead>
                )}
                {onEdit && (
                  <TableHead className="whitespace-nowrap text-xs uppercase tracking-wider">
                    Edit
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && rows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + extraCols}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {!loading && rows.length === 0 && !error && (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + extraCols}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No records returned by SAP.
                  </TableCell>
                </TableRow>
              )}
              {pageRows.map((row, i) => {
                const idx = start + i;
                const key = keyOf(row, idx);
                const children = hasChildren
                  ? ((getPath(row, schema.childKey!) as Record<string, unknown>[]) ?? [])
                  : [];
                const keyFieldName = api.keyField ?? api.rowKey ?? schema.rowKey;
                const editKey = keyFieldName ? row[keyFieldName] : undefined;
                const canEdit = editKey !== undefined && editKey !== null && editKey !== "";
                return (
                  <TableRow key={key} className="hover:bg-muted/30" data-state={selected.has(key) ? "selected" : undefined}>
                    {selectable && (
                      <TableCell className="w-10">
                        <Checkbox checked={selected.has(key)} onCheckedChange={() => toggleOne(key)} aria-label={`Select ${key}`} />
                      </TableCell>
                    )}
                    {columns.map((c) => (
                      <TableCell
                        key={c.path}
                        className={cn(
                          "whitespace-nowrap text-sm",
                          c.align === "right" && "text-right font-mono",
                        )}
                      >
                        {formatCell(getPath(row, c.path), c)}
                      </TableCell>
                    ))}
                    {hasChildren && (
                      <TableCell className="whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1.5 text-xs"
                          disabled={children.length === 0}
                          onClick={() => setOpenRow({ key, items: children, parent: row })}
                        >
                          <Package className="h-3 w-3" />
                          {children.length} item{children.length === 1 ? "" : "s"}
                        </Button>
                      </TableCell>
                    )}
                    {onEdit && (
                      <TableCell className="whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1.5 text-xs"
                          disabled={!canEdit}
                          onClick={() => onEdit(row)}
                          title={canEdit ? "Edit header" : `Missing ${String(keyFieldName)}`}
                        >
                          <Pencil className="h-3 w-3" />
                          Edit
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {proxyConfigured && total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-xs text-muted-foreground">
          <div>
            Showing {start + 1}–{Math.min(start + pageSize, total)} of {total} entries
          </div>
          <div className="flex items-center gap-2">
            <span>Rows per page</span>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="h-8 w-20"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
              Previous
            </Button>
            <span className="px-1 font-medium text-foreground">
              Page {safePage} of {pageCount}
            </span>
            <Button variant="outline" size="sm" disabled={safePage >= pageCount} onClick={() => setPage(safePage + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Items popup */}
      <Dialog open={!!openRow} onOpenChange={(o) => !o && setOpenRow(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Line items — {openRow?.key}</DialogTitle>
            <DialogDescription>
              {openRow?.items.length ?? 0} item(s) for this gate entry.
            </DialogDescription>
          </DialogHeader>
          {childColumns && openRow && (
            <EditableItemsTable
              schema={viewSchema}
              parentRow={openRow.parent}
              items={openRow.items}
              itemUpdateApi={itemUpdateApi}
              onSaved={(updated, idx) => {
                setOpenRow((prev) => {
                  if (!prev) return prev;
                  const nextItems = prev.items.slice();
                  nextItems[idx] = { ...nextItems[idx], ...updated };
                  return { ...prev, items: nextItems };
                });
                onItemSaved?.();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SapLiveTable;

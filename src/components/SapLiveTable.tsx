import { useState } from "react";
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
import type { ColumnDef, SapApiSchema } from "@/lib/sapApiSchemas";
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

export function SapLiveTable({ api, schema, onEdit, itemUpdateApi, onItemSaved }: Props) {
  const { rows, loading, error, lastFetched, proxyConfigured, refresh } = useSapProxy(api, schema);

  const [openRow, setOpenRow] = useState<{
    key: string;
    items: Record<string, unknown>[];
    parent: Record<string, unknown>;
  } | null>(null);

  const hasChildren = Boolean(schema.childKey && schema.childColumns?.length);

  return (
    <div className="rounded-xl border bg-card shadow-card">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{schema.label}</h3>
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
                {schema.columns.map((c) => (
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
                    colSpan={schema.columns.length + (hasChildren ? 1 : 0) + (onEdit ? 1 : 0)}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {!loading && rows.length === 0 && !error && (
                <TableRow>
                  <TableCell
                    colSpan={schema.columns.length + (hasChildren ? 1 : 0) + (onEdit ? 1 : 0)}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No records returned by SAP.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((row, idx) => {
                const key = String(getPath(row, schema.rowKey) ?? idx);
                const children = hasChildren
                  ? ((getPath(row, schema.childKey!) as Record<string, unknown>[]) ?? [])
                  : [];
                const keyFieldName = api.keyField ?? api.rowKey ?? schema.rowKey;
                const editKey = keyFieldName ? row[keyFieldName] : undefined;
                const canEdit = editKey !== undefined && editKey !== null && editKey !== "";
                return (
                  <TableRow key={key} className="hover:bg-muted/30">
                    {schema.columns.map((c) => (
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

      {/* Items popup */}
      <Dialog open={!!openRow} onOpenChange={(o) => !o && setOpenRow(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Line items — {openRow?.key}</DialogTitle>
            <DialogDescription>
              {openRow?.items.length ?? 0} item(s) for this gate entry.
            </DialogDescription>
          </DialogHeader>
          {schema.childColumns && openRow && (
            <EditableItemsTable
              schema={schema}
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

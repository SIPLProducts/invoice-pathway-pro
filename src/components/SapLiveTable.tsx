import { Fragment, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSapProxy } from "@/hooks/useSapProxy";
import type { ColumnDef, SapApiSchema } from "@/lib/sapApiSchemas";
import type { SapApi } from "@/lib/sapApisStore";
import { getPath } from "@/lib/getPath";
import { ChevronDown, ChevronRight, RefreshCw, AlertCircle, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  api: SapApi;
  schema: SapApiSchema;
}

function formatCell(value: unknown, col: ColumnDef): string {
  if (value === null || value === undefined || value === "") return "—";
  switch (col.format) {
    case "number":
      return typeof value === "number" ? value.toLocaleString() : String(value);
    case "date":
      return String(value);
    case "time":
      return String(value);
    default:
      return String(value);
  }
}

export function SapLiveTable({ api, schema }: Props) {
  const { rows, loading, error, lastFetched, proxyConfigured, refresh } = useSapProxy(api, schema);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleRow = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

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

      {/* States */}
      {!proxyConfigured && (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
          Set the <strong>Node.js Middleware URL</strong> on{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">SAP Settings → {api.name} → API Details</code>{" "}
          (or define <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">VITE_SAP_PROXY_URL</code>).
        </div>
      )}

      {proxyConfigured && error && (
        <div className="px-4 py-6 text-sm text-destructive">
          Failed to load: {error}
        </div>
      )}

      {proxyConfigured && !error && (
        <div className="overflow-x-auto scrollbar-thin">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                {schema.childKey && <TableHead className="w-8" />}
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && rows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={schema.columns.length + (schema.childKey ? 1 : 0)}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={schema.columns.length + (schema.childKey ? 1 : 0)}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No records returned by SAP.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((row, idx) => {
                const key = String(getPath(row, schema.rowKey) ?? idx);
                const isOpen = expanded.has(key);
                const children =
                  schema.childKey && schema.childColumns
                    ? ((getPath(row, schema.childKey) as Record<string, unknown>[]) ?? [])
                    : [];
                return (
                  <Fragment key={key}>
                    <TableRow className="hover:bg-muted/30">
                      {schema.childKey && (
                        <TableCell className="w-8 p-2">
                          <button
                            onClick={() => toggleRow(key)}
                            className="rounded p-1 hover:bg-muted"
                            aria-label={isOpen ? "Collapse" : "Expand"}
                          >
                            {isOpen ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        </TableCell>
                      )}
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
                    </TableRow>
                    {isOpen && schema.childColumns && (
                      <TableRow className="bg-muted/20">
                        <TableCell
                          colSpan={schema.columns.length + 1}
                          className="p-0"
                        >
                          <div className="px-4 py-3">
                            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Items ({children.length})
                            </div>
                            {children.length === 0 ? (
                              <div className="text-xs text-muted-foreground">No items.</div>
                            ) : (
                              <div className="overflow-x-auto rounded border bg-background">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-muted/40">
                                      {schema.childColumns.map((c) => (
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
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {children.map((child, i) => (
                                      <TableRow key={i}>
                                        {schema.childColumns!.map((c) => (
                                          <TableCell
                                            key={c.path}
                                            className={cn(
                                              "whitespace-nowrap text-xs",
                                              c.align === "right" && "text-right font-mono",
                                            )}
                                          >
                                            {formatCell(getPath(child, c.path), c)}
                                          </TableCell>
                                        ))}
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export default SapLiveTable;

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Server,
  Timer,
  FileText,
  Link as LinkIcon,
  Edit3,
  Sliders,
  Play,
  Trash2,
  Download,
  Cloud,
  Monitor,
  Activity,
  KeyRound,
  ChevronDown,
  ChevronRight,
  Save,
  Eraser,
  LogIn,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useSapApis, deleteApi, type SapMethod } from "@/lib/sapApisStore";
import { AddApiDialog } from "@/components/AddApiDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useSapSession,
  setSapSession,
  clearSapSession,
  getSapSessionHeaders,
  loginToSapDynamic,
  refreshSapSessionStatus,
  logoutSapDynamic,
  type SapMiddlewareSessionStatus,
} from "@/lib/sapSession";

const methodColor: Record<SapMethod, string> = {
  GET: "bg-success/15 text-success border-success/30",
  POST: "bg-primary/15 text-primary border-primary/30",
  PUT: "bg-warning/15 text-warning border-warning/30",
  DELETE: "bg-destructive/15 text-destructive border-destructive/30",
  PATCH: "bg-accent/15 text-accent border-accent/30",
};

function formatNextSync(lastSync: string | undefined, frequencyMinutes: number) {
  if (!lastSync) return "—";
  return `+${frequencyMinutes} min after last`;
}

export default function SAPSettings() {
  const apis = useSapApis();
  const [tab, setTab] = useState("apis");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const session = useSapSession();
  const [jsessionInput, setJsessionInput] = useState("");
  const [vcapInput, setVcapInput] = useState("");
  const [showCookieHelp, setShowCookieHelp] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAltCreds, setShowAltCreds] = useState(false);
  const [altUser, setAltUser] = useState("");
  const [altPassword, setAltPassword] = useState("");
  const [logging, setLogging] = useState(false);
  const [serverStatus, setServerStatus] = useState<SapMiddlewareSessionStatus | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Resolve middleware base URL once per render from configured APIs (or env fallback).
  const middlewareUrl = useMemo(() => {
    const fromApi = apis.find((a) => a.middleware?.url)?.middleware?.url?.trim().replace(/\/$/, "");
    if (fromApi) return fromApi;
    return ((import.meta.env.VITE_SAP_PROXY_URL as string | undefined)?.trim().replace(/\/$/, "") ?? "");
  }, [apis]);

  // Poll middleware session status every 30s while page is open.
  useEffect(() => {
    if (!middlewareUrl) return;
    let cancelled = false;
    const tick = async () => {
      const s = await refreshSapSessionStatus(middlewareUrl);
      if (!cancelled) setServerStatus(s);
    };
    tick();
    const id = setInterval(tick, 30_000);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
      clearInterval(clock);
    };
  }, [middlewareUrl]);

  const remainingLabel = useMemo(() => {
    if (!serverStatus?.expiresAt) return null;
    const ms = new Date(serverStatus.expiresAt).getTime() - now;
    if (ms <= 0) return "expired";
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }, [serverStatus, now]);

  const doDynamicLogin = async (useAlt: boolean) => {
    if (!middlewareUrl) {
      toast.error("No middleware URL configured. Set it on any API → API Details.");
      return;
    }
    setLogging(true);
    try {
      const body = useAlt ? { user: altUser.trim(), password: altPassword } : undefined;
      const status = await loginToSapDynamic(middlewareUrl, body);
      setServerStatus(status);
      toast.success(`Logged in to SAP as ${status.sapUser ?? "configured user"}.`);
      setAltPassword("");
    } catch (err) {
      const e = err as Error & { code?: string; hint?: string };
      toast.error(`${e.code || "login_failed"}: ${e.message}${e.hint ? `\n\n${e.hint}` : ""}`, {
        duration: 12000,
      });
    } finally {
      setLogging(false);
    }
  };

  const saveSession = () => {
    if (!jsessionInput.trim() && !vcapInput.trim()) {
      toast.error("Paste at least one cookie value before saving.");
      return;
    }
    setSapSession({ jsessionid: jsessionInput, vcapId: vcapInput, source: "manual" });
    setJsessionInput("");
    setVcapInput("");
    toast.success("SAP browser session saved. Refresh tables to use it.");
  };

  const removeSession = async () => {
    if (middlewareUrl) {
      await logoutSapDynamic(middlewareUrl);
      const s = await refreshSapSessionStatus(middlewareUrl);
      setServerStatus(s);
    } else {
      clearSapSession();
    }
    toast.success("SAP browser session cleared.");
  };

  const testSapConnection = async () => {
    const base =
      apis.find((a) => a.middleware?.url)?.middleware?.url?.trim().replace(/\/$/, "") ||
      ((import.meta.env.VITE_SAP_PROXY_URL as string | undefined)?.trim().replace(/\/$/, "") ?? "");
    if (!base) {
      toast.error("No middleware URL configured. Set it on any API → API Details.");
      return;
    }
    setTesting(true);
    try {
      const res = await fetch(`${base}/api/health/sap`, {
        headers: {
          Accept: "application/json",
          "ngrok-skip-browser-warning": "true",
          ...getSapSessionHeaders(),
        },
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        toast.success(
          `SAP OK (mode: ${data.authMode}${data.user ? `, user: ${data.user}` : ""}) — rows: ${data.rows}`,
        );
      } else {
        toast.error(
          `${data?.code || "sap_error"}: ${data?.message || `HTTP ${res.status}`}${
            data?.hint ? `\n\nFix: ${data.hint}` : ""
          }`,
          { duration: 12000 },
        );
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setTesting(false);
    }
  };

  const scheduledApis = apis.filter((a) => a.autoSync.enabled);

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteApi(pendingDelete);
    toast.success(`API "${pendingDelete}" deleted`);
    setPendingDelete(null);
  };

  return (
    <>
      <PageHeader
        title="SAP API Settings"
        description="Configure SAP API connections with dynamic field mappings"
        actions={
          <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning">
            System Admin
          </Badge>
        }
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="apis" className="gap-2">
                <FileText className="h-4 w-4" /> API Configurations
              </TabsTrigger>
              <TabsTrigger value="guide" className="gap-2">
                <LinkIcon className="h-4 w-4" /> SAP Connectivity Guide
              </TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={testSapConnection}
                disabled={testing}
              >
                <Activity className="h-4 w-4" />
                {testing ? "Testing…" : "Test SAP connection"}
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" /> Download PDF
              </Button>
            </div>
          </div>

          <TabsContent value="apis" className="mt-5 space-y-5">
            <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-5">
              <div className="mb-3 flex items-center gap-2 font-display font-semibold">
                <Server className="h-5 w-5 text-primary" /> How SAP Connection Works
              </div>
              <p className="mb-4 text-sm text-muted-foreground">
                All requests go through your <span className="font-semibold text-foreground">Node.js middleware</span>{" "}
                via its <code className="rounded bg-muted px-1 font-mono text-xs">POST /proxy</code> endpoint. The
                middleware URL is the <span className="font-semibold text-foreground">base URL only</span> (do not
                append <code className="rounded bg-muted px-1 font-mono text-xs">/proxy</code>).
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border bg-card p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <Cloud className="h-4 w-4 text-accent" /> Lovable Cloud Preview
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div>App → Backend Function → ngrok → local proxy → SAP</div>
                    <div>
                      → Set <span className="font-semibold text-foreground">"Node.js Middleware URL"</span> to your{" "}
                      <span className="font-semibold text-foreground">public ngrok URL</span>
                    </div>
                    <div className="font-mono text-[11px] text-muted-foreground/70">e.g. https://abc123.ngrok-free.app</div>
                  </div>
                </div>
                <div className="rounded-lg border bg-card p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <Monitor className="h-4 w-4 text-primary" /> Self-Hosted / Client Server
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div>Browser → internal middleware → SAP</div>
                    <div>
                      → Set <span className="font-semibold text-foreground">"Node.js Middleware URL"</span> to{" "}
                      <span className="font-mono text-[11px] text-foreground">http://host.docker.internal:3002</span>
                    </div>
                    <div className="font-mono text-[11px] text-muted-foreground/70">
                      or http://10.10.4.178:3002 (default port: 3002)
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                💡 Credentials are read from this page. The system tries multiple auth strategies automatically if SAP
                rejects the first attempt.
              </div>
            </div>

            <div className="rounded-xl border-2 border-success/40 bg-success/5 p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Timer className="h-5 w-5 text-success" />
                  <span className="font-display font-semibold">Auto-Sync Scheduler</span>
                  <Badge className="border-success/40 bg-success/15 text-success" variant="outline">
                    {scheduledApis.length > 0 ? "Active" : "Idle"}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Checks every 30s · {scheduledApis.length} scheduled API{scheduledApis.length === 1 ? "" : "s"}
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border bg-card">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-medium">API</th>
                      <th className="px-4 py-2.5 text-left font-medium">Frequency</th>
                      <th className="px-4 py-2.5 text-left font-medium">Last Sync</th>
                      <th className="px-4 py-2.5 text-left font-medium">Next Sync</th>
                      <th className="px-4 py-2.5 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scheduledApis.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted-foreground">
                          No APIs are scheduled. Enable Auto-Sync when adding or editing an API.
                        </td>
                      </tr>
                    ) : (
                      scheduledApis.map((a) => (
                        <tr key={a.name} className="border-t">
                          <td className="px-4 py-3 font-medium">{a.name}</td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                              every {a.autoSync.frequencyMinutes} min
                            </Badge>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">{a.autoSync.lastSync ?? "—"}</td>
                          <td className="px-4 py-3 font-mono text-xs">
                            {formatNextSync(a.autoSync.lastSync, a.autoSync.frequencyMinutes)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="border-success/40 bg-success/10 text-success">
                              Idle
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl border-2 border-warning/40 bg-warning/5 p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-warning" />
                  <span className="font-display font-semibold">SAP Browser Session</span>
                  {serverStatus?.active ? (
                    <Badge
                      variant="outline"
                      className="border-success/40 bg-success/10 text-success"
                    >
                      Active{remainingLabel ? ` · ${remainingLabel} left` : ""}
                    </Badge>
                  ) : session ? (
                    <Badge
                      variant="outline"
                      className="border-warning/40 bg-warning/10 text-warning"
                    >
                      Manual paste · saved {new Date(session.savedAt).toLocaleTimeString()}
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-muted-foreground/30 bg-muted text-muted-foreground"
                    >
                      Not set
                    </Badge>
                  )}
                </div>
              </div>

              <p className="mb-3 text-xs text-muted-foreground">
                Click <span className="font-semibold text-foreground">Login to SAP</span> — the middleware will sign in
                using its stored credentials, capture the SAP session cookies, cache them, and auto-refresh when they
                expire. No more pasting from DevTools.
              </p>

              {/* Live session readout */}
              {serverStatus && (
                <div className="mb-3 grid gap-2 rounded-lg border bg-card p-3 text-xs sm:grid-cols-2">
                  <div>
                    <div className="text-muted-foreground">Session</div>
                    <div className="font-mono">
                      {serverStatus.active ? "ACTIVE" : "NONE"}
                      {serverStatus.sapUser ? ` · ${serverStatus.sapUser}` : ""}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Remaining</div>
                    <div className="font-mono">{remainingLabel ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Saved at</div>
                    <div className="font-mono">
                      {serverStatus.savedAt ? new Date(serverStatus.savedAt).toLocaleString() : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Expires at</div>
                    <div className="font-mono">
                      {serverStatus.expiresAt ? new Date(serverStatus.expiresAt).toLocaleString() : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">JSESSIONID</div>
                    <div className="font-mono">{serverStatus.jsessionidPreview ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">__VCAP_ID__</div>
                    <div className="font-mono">{serverStatus.vcapIdPreview ?? "—"}</div>
                  </div>
                </div>
              )}

              {/* Optional: alternate credentials */}
              <button
                type="button"
                onClick={() => setShowAltCreds((v) => !v)}
                className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                {showAltCreds ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
                Use different credentials (one-time, not stored in browser)
              </button>

              {showAltCreds && (
                <div className="mb-3 grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="alt-user" className="text-xs font-semibold">
                      SAP User
                    </Label>
                    <Input
                      id="alt-user"
                      value={altUser}
                      onChange={(e) => setAltUser(e.target.value)}
                      placeholder="Communication user"
                      className="font-mono text-xs"
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="alt-password" className="text-xs font-semibold">
                      Password
                    </Label>
                    <Input
                      id="alt-password"
                      type="password"
                      value={altPassword}
                      onChange={(e) => setAltPassword(e.target.value)}
                      placeholder="••••••••"
                      className="font-mono text-xs"
                      autoComplete="off"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-end gap-2">
                {(serverStatus?.active || session) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={removeSession}
                  >
                    <Eraser className="h-4 w-4" />
                    Clear session
                  </Button>
                )}
                <Button
                  size="sm"
                  variant={serverStatus?.active ? "outline" : "default"}
                  className="gap-2"
                  onClick={() => doDynamicLogin(showAltCreds && altUser.trim().length > 0)}
                  disabled={logging || (showAltCreds && (!altUser.trim() || !altPassword))}
                >
                  {serverStatus?.active ? (
                    <RefreshCw className={`h-4 w-4 ${logging ? "animate-spin" : ""}`} />
                  ) : (
                    <LogIn className={`h-4 w-4 ${logging ? "animate-pulse" : ""}`} />
                  )}
                  {logging
                    ? "Logging in…"
                    : serverStatus?.active
                      ? "Re-login"
                      : "Login to SAP"}
                </Button>
              </div>

              {/* Advanced — manual paste fallback */}
              <div className="mt-4 border-t pt-3">
                <button
                  type="button"
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  {showAdvanced ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                  Advanced — paste cookies manually
                </button>

                {showAdvanced && (
                  <div className="mt-3 space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Fallback: paste the <code className="rounded bg-muted px-1 font-mono">JSESSIONID</code> and{" "}
                      <code className="rounded bg-muted px-1 font-mono">__VCAP_ID__</code> cookies from your logged-in
                      SAP browser tab. Only needed if dynamic login is blocked (e.g. tenant requires SSO).
                    </p>

                    <button
                      type="button"
                      onClick={() => setShowCookieHelp((v) => !v)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      {showCookieHelp ? (
                        <ChevronDown className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5" />
                      )}
                      How to get these cookies
                    </button>

                    {showCookieHelp && (
                      <div className="rounded-lg border bg-card p-3 text-xs text-muted-foreground">
                        <ol className="list-decimal space-y-1 pl-5">
                          <li>Open the SAP OData URL in Chrome and log in with username/password.</li>
                          <li>
                            DevTools (F12) → <strong>Application</strong> → <strong>Cookies</strong> → select the SAP
                            host (e.g.{" "}
                            <code className="rounded bg-muted px-1 font-mono">
                              *.abap-web.us10.hana.ondemand.com
                            </code>
                            ).
                          </li>
                          <li>
                            Copy the <strong>Value</strong> column for{" "}
                            <code className="rounded bg-muted px-1 font-mono">JSESSIONID</code> and{" "}
                            <code className="rounded bg-muted px-1 font-mono">__VCAP_ID__</code>.
                          </li>
                          <li>Paste both into the fields below and click Save.</li>
                        </ol>
                      </div>
                    )}

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="sap-jsessionid" className="text-xs font-semibold">
                          JSESSIONID
                        </Label>
                        <Input
                          id="sap-jsessionid"
                          value={jsessionInput}
                          onChange={(e) => setJsessionInput(e.target.value)}
                          placeholder={
                            session?.jsessionid
                              ? `Current: ${session.jsessionid.slice(0, 12)}…`
                              : "Paste JSESSIONID value"
                          }
                          className="font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="sap-vcap" className="text-xs font-semibold">
                          __VCAP_ID__
                        </Label>
                        <Input
                          id="sap-vcap"
                          value={vcapInput}
                          onChange={(e) => setVcapInput(e.target.value)}
                          placeholder={
                            session?.vcapId
                              ? `Current: ${session.vcapId.slice(0, 12)}…`
                              : "Paste __VCAP_ID__ value"
                          }
                          className="font-mono text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button size="sm" className="gap-2" onClick={saveSession}>
                        <Save className="h-4 w-4" />
                        Save manual session
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <AddApiDialog />
            </div>

            <div className="rounded-xl border bg-card shadow-card">
              <div className="border-b p-5">
                <div className="flex items-center gap-2 font-display text-lg font-semibold">
                  <FileText className="h-5 w-5 text-primary" /> API Configurations
                </div>
                <p className="text-sm text-muted-foreground">
                  Manage your SAP API endpoints and their configurations
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3 text-left font-medium">Name</th>
                      <th className="px-5 py-3 text-left font-medium">Endpoint</th>
                      <th className="px-5 py-3 text-left font-medium">Method</th>
                      <th className="px-5 py-3 text-left font-medium">Auth</th>
                      <th className="px-5 py-3 text-left font-medium">Status</th>
                      <th className="px-5 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apis.map((api) => (
                      <tr key={api.name} className="border-t align-top hover:bg-muted/30">
                        <td className="px-5 py-4">
                          <div className="font-semibold">{api.name}</div>
                          <Badge
                            variant="outline"
                            className={
                              api.tag === "VPN Tunnel"
                                ? "mt-1 border-warning/40 bg-warning/10 text-warning"
                                : api.tag === "Direct"
                                  ? "mt-1 border-muted-foreground/30 bg-muted text-muted-foreground"
                                  : "mt-1 border-primary/30 bg-primary/10 text-primary"
                            }
                          >
                            {api.tag}
                          </Badge>
                          <p className="mt-1 max-w-md text-xs text-muted-foreground">{api.description}</p>
                        </td>
                        <td className="px-5 py-4">
                          <code className="rounded bg-muted px-2 py-1 font-mono text-xs">{api.endpoint}</code>
                        </td>
                        <td className="px-5 py-4">
                          <Badge variant="outline" className={methodColor[api.method]}>
                            {api.method}
                          </Badge>
                        </td>
                        <td className="px-5 py-4 text-muted-foreground">{api.auth}</td>
                        <td className="px-5 py-4">
                          <Badge
                            variant="outline"
                            className={
                              api.status === "Active"
                                ? "border-success/40 bg-success/10 text-success"
                                : "border-muted-foreground/30 bg-muted text-muted-foreground"
                            }
                          >
                            {api.status}
                          </Badge>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <Link to={`/sap/settings/edit/${encodeURIComponent(api.name)}`}>
                              <Button variant="ghost" size="sm" className="gap-1.5">
                                <Edit3 className="h-3.5 w-3.5" /> Edit
                              </Button>
                            </Link>
                            <Button variant="ghost" size="sm" className="gap-1.5">
                              <Sliders className="h-3.5 w-3.5" /> Fields
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1.5"
                              onClick={() => toast.success(`Tested ${api.name}`)}
                            >
                              <Play className="h-3.5 w-3.5" /> Test
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => setPendingDelete(api.name)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {apis.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
                          No API configurations yet. Click "Add API Configuration" to create one.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="guide" className="mt-5">
            <div className="rounded-xl border bg-card p-6 shadow-card">
              <h3 className="mb-3 font-display text-lg font-semibold">SAP Connectivity Guide</h3>
              <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                <li>Install the Node.js middleware on a server with network access to SAP S/4HANA.</li>
                <li>Expose the middleware on port <code className="font-mono">3002</code> (self-hosted) or via ngrok (cloud).</li>
                <li>Configure the SAP user, client, and authentication method here.</li>
                <li>Map SAP fields to DMR/GRN fields under each API's "Fields" tab.</li>
                <li>Use the Sync Monitor to test connectivity and trigger manual syncs.</li>
              </ol>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete API configuration?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <span className="font-semibold">{pendingDelete}</span> from the list. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

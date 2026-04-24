import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  AlertTriangle,
  HelpCircle,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useSapApis, deleteApi, exportApis, importApis, type SapMethod } from "@/lib/sapApisStore";
import { AddApiDialog } from "@/components/AddApiDialog";
import {
  getSapSessionHeaders,
  useSapSession,
  setSapSession,
  clearSapSession,
  setSapSessionMode,
  markSapSessionActive,
  markSapSessionExpired,
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

type FixStep = { title: string; steps: string[] };
type AuthError = {
  code: string;
  message: string;
  hint?: string | null;
  fixSteps?: FixStep[] | null;
};

export default function SAPSettings() {
  const apis = useSapApis();
  const session = useSapSession();
  const [tab, setTab] = useState("apis");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [authError, setAuthError] = useState<AuthError | null>(null);
  const [troubleshootOpen, setTroubleshootOpen] = useState(false);
  const [jsessionInput, setJsessionInput] = useState(() => session.jsessionid);
  const [vcapInput, setVcapInput] = useState(() => session.vcapId);

  const manualCookiesActive =
    session.mode === "manual" && Boolean(session.jsessionid) && Boolean(session.vcapId);

  const maskCookie = (v: string) =>
    !v ? "" : v.length <= 10 ? `${v.slice(0, 2)}…` : `${v.slice(0, 4)}…${v.slice(-4)}`;

  const formatRelative = (iso: string) => {
    if (!iso) return "";
    const diff = Date.now() - new Date(iso).getTime();
    if (Number.isNaN(diff)) return "";
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const formatRemaining = (iso: string) => {
    if (!iso) return "";
    const diff = new Date(iso).getTime() - Date.now();
    if (Number.isNaN(diff) || diff <= 0) return "expired";
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    const remM = m % 60;
    return remM ? `${h}h ${remM}m` : `${h}h`;
  };

  const handleSaveManual = () => {
    if (!jsessionInput.trim() || !vcapInput.trim()) {
      toast.error("Both JSESSIONID and __VCAP_ID__ are required.");
      return;
    }
    const next = { jsessionid: jsessionInput.trim(), vcapId: vcapInput.trim() };
    setSapSession(next);
    setJsessionInput(next.jsessionid);
    setVcapInput(next.vcapId);
    toast.success("Manual SAP cookies saved. They will be sent with every SAP call.");
  };

  const handleClearManual = () => {
    clearSapSession();
    setJsessionInput("");
    setVcapInput("");
    toast.success("Manual cookies cleared. Reverted to Auto-managed.");
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
        const eff = data.effectiveAuthMode || data.authMode;
        const fallback = data.statelessFallback ? " (auto-fallback)" : "";
        toast.success(
          `SAP OK (auth: ${eff}${fallback}${data.user ? `, user: ${data.user}` : ""}) — rows: ${data.rows}`,
        );
        setAuthError(null);
        markSapSessionActive();
      } else {
        const code: string = data?.code || "sap_error";
        const message: string = data?.message || `HTTP ${res.status}`;
        const fixSteps: FixStep[] | null = Array.isArray(data?.fixSteps) ? data.fixSteps : null;
        if (res.status === 401 || res.status === 403 || code === "sap_auth_redirect") {
          markSapSessionExpired();
        }
        if (code === "sap_auth_redirect" || fixSteps) {
          setAuthError({ code, message, hint: data?.hint, fixSteps });
          toast.error(`${code}: see the resolution card on this page for fix steps.`, {
            duration: 8000,
          });
        } else {
          setAuthError(null);
          toast.error(
            `${code}: ${message}${data?.hint ? `\n\nFix: ${data.hint}` : ""}`,
            { duration: 12000 },
          );
        }
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

            <div className="rounded-xl border-2 border-success/40 bg-success/5 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-success" />
                  <span className="font-display font-semibold">SAP Browser Session</span>
                  {session.mode === "auto" ? (
                    <Badge
                      variant="outline"
                      className="border-success/40 bg-success/10 text-success"
                    >
                      Auto-managed
                    </Badge>
                  ) : manualCookiesActive ? (
                    session.status === "expired" ? (
                      <Badge
                        variant="outline"
                        className="border-destructive/40 bg-destructive/10 text-destructive"
                      >
                        Manual — expired
                      </Badge>
                    ) : session.status === "active" ? (
                      <Badge
                        variant="outline"
                        className="border-success/40 bg-success/10 text-success"
                      >
                        Manual — active
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-warning/40 bg-warning/10 text-warning"
                      >
                        Manual cookies
                      </Badge>
                    )
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Manual — not set
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="inline-flex rounded-md border bg-card p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setSapSessionMode("auto")}
                      className={`rounded px-3 py-1 font-medium transition-colors ${
                        session.mode === "auto"
                          ? "bg-success/15 text-success"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Auto
                    </button>
                    <button
                      type="button"
                      onClick={() => setSapSessionMode("manual")}
                      className={`rounded px-3 py-1 font-medium transition-colors ${
                        session.mode === "manual"
                          ? "bg-warning/15 text-warning"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Manual
                    </button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={testSapConnection}
                    disabled={testing}
                  >
                    <Activity className="h-4 w-4" />
                    {testing ? "Testing…" : "Test connection"}
                  </Button>
                </div>
              </div>

              {session.mode === "auto" ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  SAP authentication is handled automatically by the middleware. Depending on your
                  tenant, it will use a stateful cookie session (JSESSIONID / __VCAP_ID__),
                  stateless Basic auth (per-request, when the tenant does not issue cookies), or
                  OAuth client credentials. Credentials and mode come from{" "}
                  <code className="rounded bg-muted px-1 font-mono">middleware/.env</code>. Watch
                  the middleware terminal for per-call auth logs
                  (<code className="rounded bg-muted px-1 font-mono">[SAP] …</code>) — they show
                  whether each request used <code className="font-mono">auth=basic</code>,
                  {" "}<code className="font-mono">auth=basic_stateless</code>, or
                  {" "}<code className="font-mono">auth=oauth_cc</code>.
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Paste cookies from a logged-in SAP browser tab. In DevTools open{" "}
                    <span className="font-semibold text-foreground">
                      Application → Cookies → your SAP host
                    </span>{" "}
                    and copy the values of{" "}
                    <code className="rounded bg-muted px-1 font-mono">JSESSIONID</code> and{" "}
                    <code className="rounded bg-muted px-1 font-mono">__VCAP_ID__</code>. They will
                    be forwarded with every SAP call until you clear them.
                  </p>

                  {manualCookiesActive && (
                    <div className="rounded-md border bg-card px-3 py-2 text-xs">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span className="text-muted-foreground">Saved {formatRelative(session.savedAt)}</span>
                        <span className="font-mono">
                          JSESSIONID: <span className="text-foreground">{maskCookie(session.jsessionid)}</span>
                        </span>
                        <span className="font-mono">
                          __VCAP_ID__: <span className="text-foreground">{maskCookie(session.vcapId)}</span>
                        </span>
                      </div>
                      {(() => {
                        const remaining = formatRemaining(session.expiresAt);
                        const isExpired =
                          session.status === "expired" || remaining === "expired";
                        if (isExpired) {
                          return (
                            <div className="mt-2 flex items-center gap-2 text-warning">
                              <span className="inline-block h-2 w-2 rounded-full bg-warning" />
                              <span>
                                Expired. Paste fresh cookies from your SAP tab and click{" "}
                                <span className="font-semibold">Save</span>.
                              </span>
                            </div>
                          );
                        }
                        if (session.status === "active") {
                          return (
                            <div className="mt-2 flex items-center gap-2 text-success">
                              <span className="inline-block h-2 w-2 rounded-full bg-success" />
                              <span>Active. Expires in {remaining}.</span>
                            </div>
                          );
                        }
                        return (
                          <div className="mt-2 flex items-center gap-2 text-muted-foreground">
                            <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/60" />
                            <span>
                              Click <span className="font-semibold">Test connection</span> to verify
                              {remaining ? ` — expires in ${remaining}` : ""}.
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="sap-jsessionid" className="text-xs">
                        JSESSIONID
                      </Label>
                      <Input
                        id="sap-jsessionid"
                        value={jsessionInput}
                        onChange={(e) => setJsessionInput(e.target.value)}
                        placeholder="paste cookie value"
                        className="font-mono text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="sap-vcapid" className="text-xs">
                        __VCAP_ID__
                      </Label>
                      <Input
                        id="sap-vcapid"
                        value={vcapInput}
                        onChange={(e) => setVcapInput(e.target.value)}
                        placeholder="paste cookie value"
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" onClick={handleSaveManual} className="gap-2">
                      Save cookies
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleClearManual}
                      disabled={!manualCookiesActive && !session.jsessionid && !session.vcapId}
                    >
                      Clear
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Switching back to <span className="font-semibold text-foreground">Auto</span> restores
                      middleware-managed login.
                    </span>
                  </div>
                </div>
              )}
            </div>


            {authError && (
              <div className="rounded-xl border-2 border-destructive/40 bg-destructive/5 p-5">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-md bg-destructive/15 p-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <div className="font-display font-semibold text-destructive">
                        SAP authentication failed ({authError.code})
                      </div>
                      <p className="mt-1 max-w-3xl text-sm text-foreground/80">
                        {authError.message}
                      </p>
                      {authError.hint && (
                        <p className="mt-2 max-w-3xl text-xs text-muted-foreground">
                          {authError.hint}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setAuthError(null)}
                    aria-label="Dismiss error"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {authError.fixSteps && authError.fixSteps.length > 0 && (
                  <div className="grid gap-3 md:grid-cols-2">
                    {authError.fixSteps.map((fix, i) => (
                      <div key={i} className="rounded-lg border bg-card p-4">
                        <div className="mb-2 text-sm font-semibold text-foreground">
                          {fix.title}
                        </div>
                        <ol className="list-decimal space-y-1.5 pl-5 text-xs text-muted-foreground">
                          {fix.steps.map((s, j) => (
                            <li key={j}>{s}</li>
                          ))}
                        </ol>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="rounded-xl border bg-muted/30 p-5">
              <button
                type="button"
                onClick={() => setTroubleshootOpen((v) => !v)}
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-primary" />
                  <span className="font-display font-semibold">
                    Auth troubleshooting — Steampunk / ABAP Environment tenants
                  </span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {troubleshootOpen ? "Hide" : "Show"}
                </Badge>
              </button>
              {troubleshootOpen && (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border bg-card p-4">
                    <div className="mb-2 text-sm font-semibold">
                      Option A — Communication User + Basic auth (recommended)
                    </div>
                    <ol className="list-decimal space-y-1.5 pl-5 text-xs text-muted-foreground">
                      <li>
                        In SAP Fiori, open <span className="font-semibold text-foreground">Maintain Communication Users</span> → New. Create e.g. <code className="font-mono">GATE_COMM_USER</code>.
                      </li>
                      <li>
                        Open <span className="font-semibold text-foreground">Communication Systems</span> → New. Set host to your SAP host and assign the Communication User above for inbound.
                      </li>
                      <li>
                        Open <span className="font-semibold text-foreground">Communication Arrangements</span> → New. Pick the scenario exposing <code className="font-mono">ZUI_GATE_SERVICE</code> and assign the Communication System.
                      </li>
                      <li>
                        In <code className="font-mono">middleware/.env</code> set{" "}
                        <code className="font-mono">SAP_AUTH_MODE=basic</code>,{" "}
                        <code className="font-mono">SAP_USER=GATE_COMM_USER</code>,{" "}
                        <code className="font-mono">SAP_PASSWORD=&lt;password&gt;</code>.
                      </li>
                      <li>
                        Restart <code className="font-mono">node server.js</code>.
                      </li>
                    </ol>
                  </div>
                  <div className="rounded-lg border bg-card p-4">
                    <div className="mb-2 text-sm font-semibold">
                      Option B — OAuth 2.0 client credentials
                    </div>
                    <ol className="list-decimal space-y-1.5 pl-5 text-xs text-muted-foreground">
                      <li>
                        In the Communication Arrangement, switch the Inbound auth method to <span className="font-semibold text-foreground">OAuth 2.0</span>.
                      </li>
                      <li>
                        Copy the generated <span className="font-semibold text-foreground">Token Endpoint</span>, <span className="font-semibold text-foreground">Client ID</span>, and <span className="font-semibold text-foreground">Client Secret</span>.
                      </li>
                      <li>
                        In <code className="font-mono">middleware/.env</code> set{" "}
                        <code className="font-mono">SAP_AUTH_MODE=oauth_cc</code>,{" "}
                        <code className="font-mono">SAP_OAUTH_TOKEN_URL=…</code>,{" "}
                        <code className="font-mono">SAP_OAUTH_CLIENT_ID=…</code>,{" "}
                        <code className="font-mono">SAP_OAUTH_CLIENT_SECRET=…</code>.
                      </li>
                      <li>
                        Restart <code className="font-mono">node server.js</code>.
                      </li>
                    </ol>
                  </div>
                  <div className="md:col-span-2 rounded-lg border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
                    💡 Why? ABAP Environment (Steampunk) tenants reject Basic auth from dialog/IDP users (email-style BTP logins). They only accept Communication Users or OAuth 2.0 client credentials issued through a Communication Arrangement.
                  </div>
                </div>
              )}
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

import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getSapApi,
  updateApi,
  addApi,
  type SapApi,
  type SapMethod,
  type SapAuth,
  type SapTag,
  type FieldDef,
  DEFAULT_GATE_REQUEST_HEADER,
  DEFAULT_GATE_REQUEST_ITEM,
  DEFAULT_GATE_RESPONSE_HEADER,
  DEFAULT_GATE_RESPONSE_ITEM,
} from "@/lib/sapApisStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Save,
  Settings as Cog,
  Eye,
  EyeOff,
  Lock,
  Timer,
  Sparkles,
  ClipboardPaste,
} from "lucide-react";
import { toast } from "sonner";
import { FieldsEditor } from "@/components/api-edit/FieldsEditor";

const TABS = [
  { id: "details", label: "API Details" },
  { id: "request", label: "Request Fields" },
  { id: "response", label: "Response Fields" },
  { id: "scheduler", label: "Scheduler" },
  { id: "credentials", label: "Credentials" },
  { id: "settings", label: "Settings" },
];

export default function SAPApiEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === "new";
  const [showSecret, setShowSecret] = useState(false);
  const [showSapPwd, setShowSapPwd] = useState(false);
  const [tab, setTab] = useState("details");
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");

  const existing = !isNew ? getSapApi(decodeURIComponent(id ?? "")) : undefined;

  const initialApi: SapApi = useMemo(() => {
    if (existing) return { ...existing };
    return {
      name: "",
      description: "",
      baseUrl: "http://10.10.6.115:8000",
      endpoint: "",
      method: "POST",
      auth: "Basic",
      status: "Active",
      tag: "Proxy",
      type: "sync",
      autoSync: { enabled: false, frequencyMinutes: 5 },
      requestHeaderFields: [],
      requestItemFields: [],
      responseHeaderFields: [],
      responseItemFields: [],
      scheduler: {
        enabled: false,
        frequency: "manual",
        retryCount: 3,
        retryDelayMs: 5000,
        plants: [{ code: "1300", name: "HBL Plant 1300", selected: false }],
      },
      credentials: { user: "", password: "", sapClient: "100" },
      advanced: {
        active: true,
        logging: true,
        maxRecords: 1000,
        timeoutMs: 30000,
        customHeaders: "{}",
      },
    };
  }, [existing]);

  const [api, setApi] = useState<SapApi>(initialApi);
  const [details, setDetails] = useState({
    sapClient: api.credentials?.sapClient ?? "100",
    timeout: String(api.advanced?.timeoutMs ?? 30000),
    connectionMode: api.middleware?.connectionMode ?? "Via Proxy Server",
    deploymentMode: api.middleware?.deploymentMode ?? "Self-Hosted (Client Server)",
    middlewarePort: api.middleware?.port ?? "3202",
    middlewareUrl: api.middleware?.url ?? "",
    proxySecret: api.middleware?.secret ?? "",
  });

  const setApiField = <K extends keyof SapApi>(k: K, v: SapApi[K]) =>
    setApi((p) => ({ ...p, [k]: v }));

  const isGate = api.name === "ZUI_Gate_Service";

  const applyPasteSample = () => {
    try {
      const parsed = JSON.parse(pasteText);
      const rows: Record<string, unknown>[] = Array.isArray(parsed?.value)
        ? parsed.value
        : Array.isArray(parsed)
          ? parsed
          : [parsed];
      if (!rows.length) {
        toast.error("Couldn't find any rows in the pasted JSON");
        return;
      }
      const first = rows[0] as Record<string, unknown>;
      const headerFields: FieldDef[] = Object.entries(first)
        .filter(([k]) => !k.startsWith("@") && !k.startsWith("SAP__") && k !== "_Item")
        .map(([k, v]) => ({
          key: k,
          label: prettify(k),
          type: inferType(v),
          showInTable: true,
        }));
      const itemArr = (first._Item as Record<string, unknown>[] | undefined) ?? [];
      const itemFields: FieldDef[] =
        itemArr.length > 0
          ? Object.entries(itemArr[0])
              .filter(([k]) => !k.startsWith("@") && !k.startsWith("SAP__"))
              .map(([k, v]) => ({
                key: k,
                label: prettify(k),
                type: inferType(v),
                showInTable: true,
              }))
          : [];
      setApi((p) => ({
        ...p,
        responseHeaderFields: headerFields,
        responseItemFields: itemFields,
        rowsPath: Array.isArray(parsed?.value) ? "value" : "",
        childKey: itemFields.length ? "_Item" : p.childKey,
      }));
      toast.success(`Imported ${headerFields.length} header + ${itemFields.length} item fields`);
      setPasteOpen(false);
      setPasteText("");
    } catch (e) {
      toast.error("Invalid JSON: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-5 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <h1 className="font-display text-xl font-bold">
          {isNew ? "New API Configuration" : "Edit API Configuration"}
        </h1>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex w-full flex-wrap justify-start">
          {TABS.map((t) => (
            <TabsTrigger key={t.id} value={t.id}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ============ API DETAILS ============ */}
        <TabsContent value="details" className="mt-5">
          <div className="rounded-xl border bg-card p-6 shadow-card">
            <div className="mb-5 flex items-center gap-2">
              <Cog className="h-5 w-5 text-primary" />
              <div>
                <h2 className="font-display text-lg font-semibold">API Configuration</h2>
                <p className="text-sm text-muted-foreground">
                  Edit the API endpoint details, HTTP method, and authentication type
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Name *">
                <Input value={api.name} onChange={(e) => setApiField("name", e.target.value)} />
              </Field>
              <Field label="Description">
                <Input
                  value={api.description}
                  onChange={(e) => setApiField("description", e.target.value)}
                />
              </Field>
              <Field label="Base URL *">
                <Input value={api.baseUrl} onChange={(e) => setApiField("baseUrl", e.target.value)} />
              </Field>
              <Field label="Endpoint Path">
                <Input
                  value={api.endpoint}
                  onChange={(e) => setApiField("endpoint", e.target.value)}
                />
              </Field>
              <Field label="List Endpoint (proxy path)">
                <Input
                  value={api.listEndpoint ?? ""}
                  onChange={(e) => setApiField("listEndpoint", e.target.value)}
                  placeholder="/api/gate/headers"
                />
              </Field>
              <Field label="Create Endpoint (proxy path)">
                <Input
                  value={api.createEndpoint ?? ""}
                  onChange={(e) => setApiField("createEndpoint", e.target.value)}
                  placeholder="/api/gate/headers"
                />
              </Field>

              <div className="grid grid-cols-3 gap-3 md:col-span-2">
                <Field label="HTTP Method">
                  <Select
                    value={api.method}
                    onValueChange={(v) => setApiField("method", v as SapMethod)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["GET", "POST", "PUT", "DELETE", "PATCH"] as SapMethod[]).map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Auth Type">
                  <Select
                    value={api.auth}
                    onValueChange={(v) => setApiField("auth", v as SapAuth)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["Basic", "OAuth", "Bearer", "API Key"] as SapAuth[]).map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="SAP Client">
                  <Input
                    value={details.sapClient}
                    onChange={(e) => setDetails((d) => ({ ...d, sapClient: e.target.value }))}
                  />
                </Field>
              </div>

              <Field label="Timeout (ms)">
                <Input
                  value={details.timeout}
                  onChange={(e) => setDetails((d) => ({ ...d, timeout: e.target.value }))}
                />
              </Field>
              <div />

              <Field label="Connection Mode" hint="Route through a proxy server for on-premise SAP.">
                <Select
                  value={details.connectionMode}
                  onValueChange={(v) => setDetails((d) => ({ ...d, connectionMode: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Direct", "Via Proxy Server", "VPN Tunnel"].map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Deployment Mode" hint="Direct LAN/Docker access. Default port: 3002">
                <Select
                  value={details.deploymentMode}
                  onValueChange={(v) => setDetails((d) => ({ ...d, deploymentMode: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Self-Hosted (Client Server)", "Lovable Cloud Preview"].map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Middleware Port" hint="Cloud=3000, Self-Hosted=3002">
                <Input
                  value={details.middlewarePort}
                  onChange={(e) => setDetails((d) => ({ ...d, middlewarePort: e.target.value }))}
                />
              </Field>
              <Field label="Node.js Middleware URL" hint="Base URL only (do not append /proxy).">
                <Input
                  value={details.middlewareUrl}
                  onChange={(e) => setDetails((d) => ({ ...d, middlewareUrl: e.target.value }))}
                />
              </Field>

              <Field label="Proxy Secret / Password" hint="Shared secret sent as x-proxy-secret header.">
                <div className="relative">
                  <Input
                    type={showSecret ? "text" : "password"}
                    defaultValue="supersecretvalue123456"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>
            </div>
          </div>
        </TabsContent>

        {/* ============ REQUEST FIELDS ============ */}
        <TabsContent value="request" className="mt-5 space-y-5">
          <FieldsEditor
            title="Request — Header Fields"
            description="These render as inputs on the New DMR screen and are sent as the top-level POST body."
            variant="request"
            fields={api.requestHeaderFields ?? []}
            onChange={(next) => setApiField("requestHeaderFields", next)}
            onResetDefaults={
              isGate ? () => setApiField("requestHeaderFields", DEFAULT_GATE_REQUEST_HEADER) : undefined
            }
          />
          <FieldsEditor
            title="Request — Item Fields (_Item)"
            description="Columns of the editable line-item table on New DMR. Sent as the _Item array in the POST body."
            variant="request"
            fields={api.requestItemFields ?? []}
            onChange={(next) => setApiField("requestItemFields", next)}
            onResetDefaults={
              isGate ? () => setApiField("requestItemFields", DEFAULT_GATE_REQUEST_ITEM) : undefined
            }
          />
        </TabsContent>

        {/* ============ RESPONSE FIELDS ============ */}
        <TabsContent value="response" className="mt-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">
              Toggle <span className="font-semibold text-foreground">In Table</span> to control which
              columns appear on the DMR <span className="font-semibold text-foreground">SAP Gate Entries</span> tab.
            </div>
            <Button variant="outline" size="sm" onClick={() => setPasteOpen((o) => !o)} className="gap-1.5">
              <ClipboardPaste className="h-3.5 w-3.5" />
              {pasteOpen ? "Cancel" : "Auto-detect from sample JSON"}
            </Button>
          </div>

          {pasteOpen && (
            <div className="rounded-xl border bg-card p-4 shadow-card">
              <Label className="mb-2 block text-xs font-medium">
                Paste a sample SAP OData response (header + _Item)
              </Label>
              <Textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder='{ "value": [ { "gate_id": "...", "_Item": [ { ... } ] } ] }'
                className="min-h-32 font-mono text-xs"
              />
              <div className="mt-3 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setPasteOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={applyPasteSample} className="gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> Generate fields
                </Button>
              </div>
            </div>
          )}

          <FieldsEditor
            title="Response — Header Columns"
            description="Top-level OData fields. Each row with 'In Table' becomes a column on the DMR Gate Entries table."
            variant="response"
            fields={api.responseHeaderFields ?? []}
            onChange={(next) => setApiField("responseHeaderFields", next)}
            onResetDefaults={
              isGate ? () => setApiField("responseHeaderFields", DEFAULT_GATE_RESPONSE_HEADER) : undefined
            }
          />
          <FieldsEditor
            title="Response — Item Columns (_Item)"
            description="Child collection rendered when a header row is expanded."
            variant="response"
            fields={api.responseItemFields ?? []}
            onChange={(next) => setApiField("responseItemFields", next)}
            onResetDefaults={
              isGate ? () => setApiField("responseItemFields", DEFAULT_GATE_RESPONSE_ITEM) : undefined
            }
          />
        </TabsContent>

        {/* ============ SCHEDULER ============ */}
        <TabsContent value="scheduler" className="mt-5">
          <div className="rounded-xl border bg-card p-6 shadow-card">
            <div className="mb-5 flex items-center gap-2">
              <Timer className="h-5 w-5 text-primary" />
              <div>
                <h2 className="font-display text-lg font-semibold">Scheduler Configuration</h2>
                <p className="text-sm text-muted-foreground">
                  Set up automatic data synchronization with SAP
                </p>
              </div>
            </div>

            <div className="mb-5 flex items-center justify-between rounded-lg border bg-muted/20 p-4">
              <div>
                <div className="text-sm font-semibold">Enable Scheduler</div>
                <div className="text-xs text-muted-foreground">
                  Automatically sync data from SAP at scheduled intervals
                </div>
              </div>
              <Switch
                checked={api.scheduler?.enabled ?? false}
                onCheckedChange={(v) =>
                  setApiField("scheduler", { ...(api.scheduler ?? defaultScheduler()), enabled: v })
                }
              />
            </div>

            <div className="mb-4">
              <Label className="text-xs font-medium">Sync Frequency</Label>
              <Select
                value={api.scheduler?.frequency ?? "manual"}
                onValueChange={(v) =>
                  setApiField("scheduler", {
                    ...(api.scheduler ?? defaultScheduler()),
                    frequency: v as never,
                  })
                }
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual Only</SelectItem>
                  <SelectItem value="5m">Every 5 minutes</SelectItem>
                  <SelectItem value="15m">Every 15 minutes</SelectItem>
                  <SelectItem value="1h">Every 1 hour</SelectItem>
                  <SelectItem value="1d">Every 1 day</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="mb-4 grid gap-4 md:grid-cols-2">
              <Field label="Retry Count" hint="Number of retry attempts on failure">
                <Input
                  type="number"
                  value={api.scheduler?.retryCount ?? 3}
                  onChange={(e) =>
                    setApiField("scheduler", {
                      ...(api.scheduler ?? defaultScheduler()),
                      retryCount: Number(e.target.value),
                    })
                  }
                />
              </Field>
              <Field label="Retry Delay (ms)" hint="Delay between retry attempts in milliseconds">
                <Input
                  type="number"
                  value={api.scheduler?.retryDelayMs ?? 5000}
                  onChange={(e) =>
                    setApiField("scheduler", {
                      ...(api.scheduler ?? defaultScheduler()),
                      retryDelayMs: Number(e.target.value),
                    })
                  }
                />
              </Field>
            </div>

            <div className="mb-2">
              <Label className="text-xs font-medium">Sync Plants</Label>
              <p className="text-[11px] text-muted-foreground">
                Select which plants to sync. Only selected plants will be synced — if none are selected, no data
                will be synced.
              </p>
            </div>
            <div className="space-y-2">
              {(api.scheduler?.plants ?? []).map((p, i) => (
                <label
                  key={p.code}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border bg-muted/20 px-3 py-2.5"
                >
                  <Checkbox
                    checked={p.selected}
                    onCheckedChange={(v) => {
                      const plants = [...(api.scheduler?.plants ?? [])];
                      plants[i] = { ...p, selected: !!v };
                      setApiField("scheduler", {
                        ...(api.scheduler ?? defaultScheduler()),
                        plants,
                      });
                    }}
                  />
                  <span className="text-sm">
                    {p.code} — {p.name}
                  </span>
                </label>
              ))}
            </div>

            <div className="mt-5 rounded-lg border bg-muted/20 p-4">
              <div className="text-sm font-semibold">Sync Schedule Preview</div>
              <div className="text-xs text-muted-foreground">
                {api.scheduler?.enabled
                  ? `Will sync ${api.scheduler.frequency} for ${
                      (api.scheduler.plants ?? []).filter((p) => p.selected).length
                    } selected plant(s).`
                  : "Scheduler is disabled. Enable it to set up automatic syncing."}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ============ CREDENTIALS ============ */}
        <TabsContent value="credentials" className="mt-5">
          <div className="rounded-xl border bg-card p-6 shadow-card">
            <div className="mb-5 flex items-center gap-2">
              <Lock className="h-5 w-5 text-warning" />
              <div>
                <h2 className="font-display text-lg font-semibold">Credentials</h2>
                <p className="text-sm text-muted-foreground">
                  Authentication credentials for the SAP API ({api.auth} Auth)
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <Field label="SAP Username *">
                <Input
                  value={api.credentials?.user ?? ""}
                  onChange={(e) =>
                    setApiField("credentials", {
                      ...(api.credentials ?? defaultCreds()),
                      user: e.target.value,
                    })
                  }
                />
              </Field>
              <Field label="SAP Password *">
                <div className="relative">
                  <Input
                    type={showSapPwd ? "text" : "password"}
                    value={api.credentials?.password ?? ""}
                    onChange={(e) =>
                      setApiField("credentials", {
                        ...(api.credentials ?? defaultCreds()),
                        password: e.target.value,
                      })
                    }
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSapPwd((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showSapPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>
              <Field label="SAP Client (for auth header)" hint="Sent as sap-client header in Basic Auth requests">
                <Input
                  value={api.credentials?.sapClient ?? ""}
                  onChange={(e) =>
                    setApiField("credentials", {
                      ...(api.credentials ?? defaultCreds()),
                      sapClient: e.target.value,
                    })
                  }
                />
              </Field>
            </div>
          </div>
        </TabsContent>

        {/* ============ SETTINGS ============ */}
        <TabsContent value="settings" className="mt-5">
          <div className="rounded-xl border bg-card p-6 shadow-card">
            <div className="mb-5 flex items-center gap-2">
              <Cog className="h-5 w-5 text-primary" />
              <div>
                <h2 className="font-display text-lg font-semibold">Advanced Settings</h2>
                <p className="text-sm text-muted-foreground">
                  Configure advanced API behavior, logging, and data limits
                </p>
              </div>
            </div>

            <div className="mb-4 flex items-center justify-between rounded-lg border bg-muted/20 p-4">
              <div>
                <div className="text-sm font-semibold">Active</div>
                <div className="text-xs text-muted-foreground">Enable or disable this API configuration</div>
              </div>
              <Switch
                checked={api.advanced?.active ?? true}
                onCheckedChange={(v) =>
                  setApiField("advanced", { ...(api.advanced ?? defaultAdvanced()), active: v })
                }
              />
            </div>

            <div className="mb-4 flex items-center justify-between rounded-lg border bg-muted/20 p-4">
              <div>
                <div className="text-sm font-semibold">Enable Logging</div>
                <div className="text-xs text-muted-foreground">Log all API requests and responses for debugging</div>
              </div>
              <Switch
                checked={api.advanced?.logging ?? true}
                onCheckedChange={(v) =>
                  setApiField("advanced", { ...(api.advanced ?? defaultAdvanced()), logging: v })
                }
              />
            </div>

            <div className="mb-4 grid gap-4 md:grid-cols-2">
              <Field label="Max Records per Sync" hint="Maximum number of records to fetch per API call">
                <Input
                  type="number"
                  value={api.advanced?.maxRecords ?? 1000}
                  onChange={(e) =>
                    setApiField("advanced", {
                      ...(api.advanced ?? defaultAdvanced()),
                      maxRecords: Number(e.target.value),
                    })
                  }
                />
              </Field>
              <Field label="Timeout (ms)" hint="Request timeout in milliseconds">
                <Input
                  type="number"
                  value={api.advanced?.timeoutMs ?? 30000}
                  onChange={(e) =>
                    setApiField("advanced", {
                      ...(api.advanced ?? defaultAdvanced()),
                      timeoutMs: Number(e.target.value),
                    })
                  }
                />
              </Field>
            </div>

            <Field label="Custom Headers (JSON)" hint="Additional HTTP headers sent with every request (JSON format)">
              <Textarea
                value={api.advanced?.customHeaders ?? "{}"}
                onChange={(e) =>
                  setApiField("advanced", {
                    ...(api.advanced ?? defaultAdvanced()),
                    customHeaders: e.target.value,
                  })
                }
                className="min-h-24 font-mono text-xs"
              />
            </Field>

            <div className="mt-5 rounded-lg border bg-muted/20 p-4">
              <div className="mb-2 text-sm font-semibold">Configuration Summary</div>
              <div className="grid gap-1.5 text-xs md:grid-cols-2">
                <Row k="Status" v={api.advanced?.active ? "✅ Active" : "⛔ Inactive"} />
                <Row k="Logging" v={api.advanced?.logging ? "✅ Enabled" : "❌ Disabled"} />
                <Row k="Max Records" v={String(api.advanced?.maxRecords ?? 1000)} />
                <Row k="Timeout" v={`${api.advanced?.timeoutMs ?? 30000}ms`} />
                <Row k="Connection" v={api.tag} />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="sticky bottom-0 mt-6 flex justify-end gap-2 rounded-xl border bg-card/90 p-3 shadow-elegant backdrop-blur">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Cancel
        </Button>
        <Button
          className="gap-2"
          onClick={() => {
            if (!api.name.trim() || !api.endpoint.trim()) {
              toast.error("Name and Endpoint Path are required");
              return;
            }
            const payload: SapApi = {
              ...api,
              tag: (api.tag ?? (details.connectionMode === "VPN Tunnel" ? "VPN Tunnel" : "Proxy")) as SapTag,
              advanced: {
                ...(api.advanced ?? defaultAdvanced()),
                timeoutMs: Number(details.timeout) || api.advanced?.timeoutMs || 30000,
              },
            };
            if (isNew) {
              if (getSapApi(payload.name)) {
                toast.error(`An API named "${payload.name}" already exists`);
                return;
              }
              addApi(payload);
            } else {
              updateApi(decodeURIComponent(id ?? ""), payload);
            }
            toast.success("API details saved");
            navigate("/sap/settings");
          }}
        >
          <Save className="h-4 w-4" /> Save API Details
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{k}:</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}

function defaultScheduler() {
  return {
    enabled: false,
    frequency: "manual" as const,
    retryCount: 3,
    retryDelayMs: 5000,
    plants: [{ code: "1300", name: "HBL Plant 1300", selected: false }],
  };
}
function defaultCreds() {
  return { user: "", password: "", sapClient: "100" };
}
function defaultAdvanced() {
  return { active: true, logging: true, maxRecords: 1000, timeoutMs: 30000, customHeaders: "{}" };
}

function prettify(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function inferType(v: unknown): FieldDef["type"] {
  if (typeof v === "number") return "number";
  if (typeof v === "boolean") return "boolean";
  if (typeof v === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return "date";
    if (/^\d{2}:\d{2}:\d{2}$/.test(v)) return "time";
  }
  return "string";
}

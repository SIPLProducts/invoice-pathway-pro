import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSapApi, updateApi, addApi, type SapApi, type SapMethod, type SapAuth, type SapTag } from "@/lib/sapApisStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, Save, Settings as Cog, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

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
  const [tab, setTab] = useState("details");

  const existing = !isNew ? getSapApi(decodeURIComponent(id ?? "")) : undefined;
  const initial = isNew
    ? {
        name: "",
        description: "",
        baseUrl: "http://10.10.6.115:8000",
        endpoint: "",
        method: "POST",
        auth: "Basic Auth",
        sapClient: "234",
        timeout: "30000",
        connectionMode: "Via Proxy Server",
        deploymentMode: "Self-Hosted (Client Server)",
        middlewarePort: "3202",
        middlewareUrl: "http://10.10.4.178:3202",
      }
    : {
        name: existing?.name ?? decodeURIComponent(id ?? ""),
        description: existing?.description ?? "",
        baseUrl: existing?.baseUrl ?? "http://10.10.6.115:8000",
        endpoint: existing?.endpoint ?? "",
        method: (existing?.method ?? "PUT") as string,
        auth: existing?.auth === "Basic" ? "Basic Auth" : existing?.auth ?? "Basic Auth",
        sapClient: "234",
        timeout: "30000",
        connectionMode: "Via Proxy Server",
        deploymentMode: "Self-Hosted (Client Server)",
        middlewarePort: "3202",
        middlewareUrl: "http://10.10.4.178:3202",
      };

  const [form, setForm] = useState(initial);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

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
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
              </Field>
              <Field label="Description">
                <Input value={form.description} onChange={(e) => set("description", e.target.value)} />
              </Field>
              <Field label="Base URL *">
                <Input value={form.baseUrl} onChange={(e) => set("baseUrl", e.target.value)} />
              </Field>
              <Field label="Endpoint Path">
                <Input value={form.endpoint} onChange={(e) => set("endpoint", e.target.value)} />
              </Field>

              <div className="grid grid-cols-3 gap-3 md:col-span-2">
                <Field label="HTTP Method">
                  <Select value={form.method} onValueChange={(v) => set("method", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["GET", "POST", "PUT", "DELETE", "PATCH"].map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Auth Type">
                  <Select value={form.auth} onValueChange={(v) => set("auth", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["Basic Auth", "OAuth 2.0", "Bearer Token", "API Key"].map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="SAP Client">
                  <Input value={form.sapClient} onChange={(e) => set("sapClient", e.target.value)} />
                </Field>
              </div>

              <Field label="Timeout (ms)">
                <Input value={form.timeout} onChange={(e) => set("timeout", e.target.value)} />
              </Field>
              <div />

              <Field label="Connection Mode" hint="Route through a proxy server for on-premise SAP.">
                <Select value={form.connectionMode} onValueChange={(v) => set("connectionMode", v)}>
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
                <Select value={form.deploymentMode} onValueChange={(v) => set("deploymentMode", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "💻 Self-Hosted (Client Server)",
                      "☁️ Lovable Cloud Preview",
                    ].map((m) => (
                      <SelectItem key={m} value={m.replace(/^[^A-Za-z]+\s*/, "")}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Middleware Port" hint="Cloud=3000, Self-Hosted=3002">
                <Input value={form.middlewarePort} onChange={(e) => set("middlewarePort", e.target.value)} />
              </Field>
              <Field
                label="Node.js Middleware URL"
                hint={
                  <>
                    <span className="font-semibold text-foreground">Base URL only</span> (do not append{" "}
                    <code className="rounded bg-muted px-1 font-mono text-[11px]">/proxy</code>).
                  </>
                }
              >
                <Input value={form.middlewareUrl} onChange={(e) => set("middlewareUrl", e.target.value)} />
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

        <TabsContent value="request" className="mt-5">
          <Placeholder title="Request Fields" body="Map SAP request payload fields to DMR/GRN attributes." />
        </TabsContent>
        <TabsContent value="response" className="mt-5">
          <Placeholder title="Response Fields" body="Map SAP response fields back into the local data model." />
        </TabsContent>
        <TabsContent value="scheduler" className="mt-5">
          <Placeholder title="Scheduler" body="Configure auto-sync frequency, retry policy, and quiet hours." />
        </TabsContent>
        <TabsContent value="credentials" className="mt-5">
          <Placeholder title="Credentials" body="Manage SAP user, password, certificates, and OAuth tokens." />
        </TabsContent>
        <TabsContent value="settings" className="mt-5">
          <Placeholder title="Settings" body="Logging, throttling, and tolerance settings for this API." />
        </TabsContent>
      </Tabs>

      <div className="sticky bottom-0 mt-6 flex justify-end gap-2 rounded-xl border bg-card/90 p-3 shadow-elegant backdrop-blur">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Cancel
        </Button>
        <Button
          className="gap-2"
          onClick={() => {
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

function Placeholder({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border bg-card p-10 text-center shadow-card">
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

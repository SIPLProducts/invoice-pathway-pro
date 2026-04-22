import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Server,
  Timer,
  FileText,
  Link as LinkIcon,
  Plus,
  Edit3,
  Sliders,
  Play,
  Trash2,
  Download,
  Cloud,
  Monitor,
} from "lucide-react";

type ApiStatus = "Active" | "Inactive";
type AuthType = "Basic" | "OAuth" | "Bearer";
type Method = "GET" | "POST" | "PUT" | "DELETE";

interface SapApi {
  name: string;
  description: string;
  endpoint: string;
  method: Method;
  auth: AuthType;
  status: ApiStatus;
  tag?: "Proxy" | "VPN Tunnel";
}

const apis: SapApi[] = [
  {
    name: "SAP_343_Blocked_To_Unrestricted",
    description: "343 Movement - Moves blocked stock quantity to unrestricted stock in SAP.",
    endpoint: "/mrb/mb52/mat_stocks?sap-client=234",
    method: "PUT",
    auth: "Basic",
    status: "Active",
    tag: "Proxy",
  },
  {
    name: "SAP_344_Unrestricted_To_Blocked",
    description: "344 Movement - Moves unrestricted stock quantity to blocked stock in SAP.",
    endpoint: "/mrb/mb52/mat_stocks?sap-client=234",
    method: "GET",
    auth: "Basic",
    status: "Active",
    tag: "Proxy",
  },
  {
    name: "MB52_Stock_Report",
    description:
      "MB52 - Material Stock Report. Returns stock quantities (unrestricted, blocked, QI, transfer) by plant, storage location, material and batch.",
    endpoint: "/mrb/mb52/mat_stocks?sap-client=234",
    method: "POST",
    auth: "Basic",
    status: "Active",
    tag: "Proxy",
  },
  {
    name: "ZMRB_Inward_Inspection",
    description:
      "ZMRB01/ZMRB04 - Inward Inspection Report. Fetches inspection lots with vendor, PO, batch and quantity details. Use ART=01 for ZMRB01, ART=04 for ZMRB04.",
    endpoint: "/mrb/inward/report?sap-client=234",
    method: "POST",
    auth: "Basic",
    status: "Active",
    tag: "VPN Tunnel",
  },
];

const methodColor: Record<Method, string> = {
  GET: "bg-success/15 text-success border-success/30",
  POST: "bg-primary/15 text-primary border-primary/30",
  PUT: "bg-warning/15 text-warning border-warning/30",
  DELETE: "bg-destructive/15 text-destructive border-destructive/30",
};

export default function SAPSettings() {
  const [tab, setTab] = useState("apis");

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
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" /> Download PDF
            </Button>
          </div>

          <TabsContent value="apis" className="mt-5 space-y-5">
            {/* How SAP Connection Works */}
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

            {/* Auto Sync Scheduler */}
            <div className="rounded-xl border-2 border-success/40 bg-success/5 p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Timer className="h-5 w-5 text-success" />
                  <span className="font-display font-semibold">Auto-Sync Scheduler</span>
                  <Badge className="border-success/40 bg-success/15 text-success" variant="outline">
                    Active
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Checks every 30s · Last check: 10:55:53 am
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
                    <tr className="border-t">
                      <td className="px-4 py-3 font-medium">ZMRB_Inward_Inspection</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                          every 5 min
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">22/4/2026, 10:52:03 am</td>
                      <td className="px-4 py-3 font-mono text-xs">22/4/2026, 10:57:03 am</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="border-success/40 bg-success/10 text-success">
                          Idle
                        </Badge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Add API */}
            <div className="flex justify-end">
              <Link to="/sap/settings/edit/new">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" /> Add API Configuration
                </Button>
              </Link>
            </div>

            {/* API Configurations table */}
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
                          {api.tag && (
                            <Badge
                              variant="outline"
                              className={
                                api.tag === "VPN Tunnel"
                                  ? "mt-1 border-warning/40 bg-warning/10 text-warning"
                                  : "mt-1 border-primary/30 bg-primary/10 text-primary"
                              }
                            >
                              {api.tag}
                            </Badge>
                          )}
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
                          <Badge variant="outline" className="border-success/40 bg-success/10 text-success">
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
                            <Button variant="ghost" size="sm" className="gap-1.5">
                              <Play className="h-3.5 w-3.5" /> Test
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
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
    </>
  );
}

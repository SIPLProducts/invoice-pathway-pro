import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import {
  addApi,
  getSapApi,
  type SapApi,
  type SapAuth,
  type SapMethod,
  type SapTag,
  type SapType,
} from "@/lib/sapApisStore";

export function AddApiDialog() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    baseUrl: "http://10.10.6.115:8000",
    endpoint: "",
    method: "POST" as SapMethod,
    auth: "Basic" as SapAuth,
    tag: "Proxy" as SapTag,
    type: "sync" as SapType,
    autoSyncEnabled: false,
    frequencyMinutes: 5,
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const reset = () =>
    setForm({
      name: "",
      description: "",
      baseUrl: "http://10.10.6.115:8000",
      endpoint: "",
      method: "POST",
      auth: "Basic",
      tag: "Proxy",
      type: "sync",
      autoSyncEnabled: false,
      frequencyMinutes: 5,
    });

  const handleSave = (advanced = false) => {
    if (!form.name.trim()) {
      toast.error("API Name is required");
      return;
    }
    if (!form.endpoint.trim()) {
      toast.error("Endpoint Path is required");
      return;
    }
    if (getSapApi(form.name.trim())) {
      toast.error(`An API named "${form.name.trim()}" already exists`);
      return;
    }

    const api: SapApi = {
      name: form.name.trim(),
      description: form.description.trim(),
      baseUrl: form.baseUrl.trim(),
      endpoint: form.endpoint.trim(),
      method: form.method,
      auth: form.auth,
      status: "Active",
      tag: form.tag,
      type: form.type,
      autoSync: {
        enabled: form.autoSyncEnabled,
        frequencyMinutes: Number(form.frequencyMinutes) || 5,
      },
    };

    addApi(api);
    toast.success(`API "${api.name}" added`);
    setOpen(false);
    reset();
    if (advanced) navigate(`/sap/settings/edit/${encodeURIComponent(api.name)}`);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Add API Configuration
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add SAP API Configuration</DialogTitle>
          <DialogDescription>
            Quick-add a new SAP endpoint. You can configure request/response field mappings later.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs font-medium">Name *</Label>
            <Input
              placeholder="e.g. SAP_345_Transfer"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs font-medium">Description</Label>
            <Textarea
              rows={2}
              placeholder="Brief description of what this API does"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Base URL</Label>
            <Input value={form.baseUrl} onChange={(e) => set("baseUrl", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Endpoint Path *</Label>
            <Input
              placeholder="/mrb/..."
              value={form.endpoint}
              onChange={(e) => set("endpoint", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">HTTP Method</Label>
            <Select value={form.method} onValueChange={(v) => set("method", v as SapMethod)}>
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
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Auth Type</Label>
            <Select value={form.auth} onValueChange={(v) => set("auth", v as SapAuth)}>
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
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Connection</Label>
            <Select value={form.tag} onValueChange={(v) => set("tag", v as SapTag)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["Proxy", "VPN Tunnel", "Direct"] as SapTag[]).map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">API Type</Label>
            <Select value={form.type} onValueChange={(v) => set("type", v as SapType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sync">Sync — store data locally</SelectItem>
                <SelectItem value="live">Live — fetch on demand</SelectItem>
                <SelectItem value="action">Action — transactional trigger</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border bg-muted/30 p-3 md:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Enable Auto-Sync</Label>
                <p className="text-xs text-muted-foreground">
                  Schedule periodic background sync for this API.
                </p>
              </div>
              <Switch
                checked={form.autoSyncEnabled}
                onCheckedChange={(v) => set("autoSyncEnabled", v)}
              />
            </div>
            {form.autoSyncEnabled && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Frequency</Label>
                  <Select
                    value={String(form.frequencyMinutes)}
                    onValueChange={(v) => set("frequencyMinutes", Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[5, 15, 30, 60, 120, 360].map((m) => (
                        <SelectItem key={m} value={String(m)}>
                          every {m} min
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1 text-primary"
            onClick={() => handleSave(true)}
          >
            Save & open advanced editor <ArrowRight className="h-3.5 w-3.5" />
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleSave(false)}>Save API</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

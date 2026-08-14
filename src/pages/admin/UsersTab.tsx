import { useMemo, useState } from "react";
import { Loader2, Pencil, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { callAdmin, type PlantRow, type RoleRow, type UserRow } from "@/lib/rbac";

interface Props {
  users: UserRow[];
  plants: PlantRow[];
  roles: RoleRow[];
  loading: boolean;
  reload: () => void;
}

interface FormState {
  id?: string;
  sap_user_id: string;
  name: string;
  email: string;
  contact: string;
  password: string;
  status: string;
  plant_ids: string[];
  roleByPlant: Record<string, string>;
}

const emptyForm: FormState = {
  sap_user_id: "",
  name: "",
  email: "",
  contact: "",
  password: "",
  status: "active",
  plant_ids: [],
  roleByPlant: {},
};

export function UsersTab({ users, plants, roles, loading, reload }: Props) {
  const { can } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [plantFilter, setPlantFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showDeleted, setShowDeleted] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);

  const plantName = (id: string) => {
    const p = plants.find((x) => x.id === id);
    return p ? `${p.code} · ${p.name}` : "—";
  };
  const roleName = (id: string) => roles.find((r) => r.id === id)?.name ?? "—";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (!showDeleted && u.deleted_at) return false;
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      if (plantFilter !== "all" && !u.plants.some((p) => p.plant_id === plantFilter)) return false;
      if (roleFilter !== "all" && !u.roles.some((r) => r.role_id === roleFilter)) return false;
      if (!q) return true;
      return [u.name, u.email, u.sap_user_id, u.user_code, u.contact ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [users, search, statusFilter, plantFilter, roleFilter, showDeleted]);

  const openCreate = () => {
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (u: UserRow) => {
    const roleByPlant: Record<string, string> = {};
    for (const r of u.roles) roleByPlant[r.plant_id ?? "global"] = r.role_id;
    setForm({
      id: u.id,
      sap_user_id: u.sap_user_id,
      name: u.name,
      email: u.email,
      contact: u.contact ?? "",
      password: "",
      status: u.status,
      plant_ids: u.plants.map((p) => p.plant_id),
      roleByPlant,
    });
    setOpen(true);
  };

  const togglePlant = (id: string) => {
    setForm((f) => {
      const has = f.plant_ids.includes(id);
      const plant_ids = has ? f.plant_ids.filter((p) => p !== id) : [...f.plant_ids, id];
      const roleByPlant = { ...f.roleByPlant };
      if (has) delete roleByPlant[id];
      return { ...f, plant_ids, roleByPlant };
    });
  };

  const save = async () => {
    if (!form.sap_user_id.trim() || !form.name.trim() || !form.email.trim()) {
      toast.error("SAP User ID, Name and Email are required");
      return;
    }
    if (!form.id && form.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    const rolePairs = Object.entries(form.roleByPlant)
      .filter(([, roleId]) => !!roleId)
      .map(([plantKey, roleId]) => ({ plant_id: plantKey === "global" ? null : plantKey, role_id: roleId }));

    const seen = new Set<string>();
    for (const p of rolePairs) {
      const key = `${p.plant_id}|${p.role_id}`;
      if (seen.has(key)) {
        toast.error("Duplicate plant + role combination");
        return;
      }
      seen.add(key);
    }

    setSaving(true);
    try {
      await callAdmin(form.id ? "update_user" : "create_user", {
        id: form.id,
        sap_user_id: form.sap_user_id.trim(),
        name: form.name.trim(),
        email: form.email.trim(),
        contact: form.contact.trim(),
        password: form.password || undefined,
        status: form.status,
        plant_ids: form.plant_ids,
        roles: rolePairs,
      });
      toast.success(form.id ? "User updated" : "User created");
      setOpen(false);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save user");
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async (mode: "soft" | "permanent") => {
    if (!deleteTarget) return;
    try {
      await callAdmin("delete_user", { id: deleteTarget.id, mode });
      toast.success(mode === "permanent" ? "User permanently deleted" : "User moved to deleted");
      setDeleteTarget(null);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete user");
    }
  };

  const restore = async (u: UserRow) => {
    try {
      await callAdmin("restore_user", { id: u.id });
      toast.success("User restored");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not restore user");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, email, SAP ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={plantFilter} onValueChange={setPlantFilter}>
          <SelectTrigger className="h-9 w-[170px]"><SelectValue placeholder="Plant" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All plants</SelectItem>
            {plants.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.code} · {p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {roles.map((r) => (
              <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs">
          <Switch checked={showDeleted} onCheckedChange={setShowDeleted} />
          Show deleted
        </label>
        {can("user_management", "create") && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" /> New user
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
        <table className="w-full min-w-[1000px] text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">SAP User ID</th>
              <th className="px-4 py-3 text-left font-semibold">Name</th>
              <th className="px-4 py-3 text-left font-semibold">Email</th>
              <th className="px-4 py-3 text-left font-semibold">Contact</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
              <th className="px-4 py-3 text-left font-semibold">Plants</th>
              <th className="px-4 py-3 text-left font-semibold">Roles</th>
              <th className="px-4 py-3 text-left font-semibold">Last Login</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">No users found</td></tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id} className={u.deleted_at ? "bg-destructive/5" : "hover:bg-muted/40"}>
                  <td className="px-4 py-3 font-medium">
                    {u.sap_user_id}
                    <div className="text-[11px] text-muted-foreground">{u.user_code}</div>
                  </td>
                  <td className="px-4 py-3">{u.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.contact ?? "—"}</td>
                  <td className="px-4 py-3">
                    {u.deleted_at ? (
                      <Badge variant="destructive">Deleted</Badge>
                    ) : (
                      <Badge variant={u.status === "active" ? "default" : "secondary"}>{u.status}</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.plants.length === 0 ? <span className="text-muted-foreground">—</span> :
                        u.plants.map((p) => <Badge key={p.plant_id} variant="outline">{plantName(p.plant_id)}</Badge>)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.length === 0 ? <span className="text-muted-foreground">—</span> :
                        u.roles.map((r, i) => (
                          <Badge key={i} variant="secondary">
                            {roleName(r.role_id)}{r.plant_id ? ` @ ${plants.find((p) => p.id === r.plant_id)?.code ?? "?"}` : ""}
                          </Badge>
                        ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {u.deleted_at && can("user_management", "edit") && (
                        <Button size="sm" variant="ghost" onClick={() => restore(u)}>
                          <RotateCcw className="h-4 w-4" /> Restore
                        </Button>
                      )}
                      {!u.deleted_at && can("user_management", "edit") && (
                        <Button size="icon" variant="ghost" onClick={() => openEdit(u)} aria-label="Edit user">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {can("user_management", "delete") && (
                        <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(u)} aria-label="Delete user">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit user" : "Create user"}</DialogTitle>
            <DialogDescription>
              USER_ID is generated automatically. Assign plants first, then pick a role for each plant.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="SAP User ID">
              <Input value={form.sap_user_id} onChange={(e) => setForm({ ...form, sap_user_id: e.target.value })} />
            </Field>
            <Field label="Name">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Contact">
              <Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
            </Field>
            <Field label={form.id ? "New password (optional)" : "Password"}>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </Field>
            <Field label="Status">
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Plant assignment</Label>
            <div className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2">
              {plants.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={form.plant_ids.includes(p.id)} onCheckedChange={() => togglePlant(p.id)} />
                  {p.code} · {p.name}
                </label>
              ))}
              {plants.length === 0 && <span className="text-sm text-muted-foreground">No plants configured yet.</span>}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Role per plant</Label>
            <div className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <span className="w-40 shrink-0 text-sm font-medium">All plants (global)</span>
                <Select
                  value={form.roleByPlant["global"] ?? "none"}
                  onValueChange={(v) =>
                    setForm((f) => {
                      const roleByPlant = { ...f.roleByPlant };
                      if (v === "none") delete roleByPlant["global"];
                      else roleByPlant["global"] = v;
                      return { ...f, roleByPlant };
                    })
                  }
                >
                  <SelectTrigger className="h-9"><SelectValue placeholder="No role" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No role</SelectItem>
                    {roles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {form.plant_ids.map((pid) => (
                <div key={pid} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 text-sm font-medium">{plantName(pid)}</span>
                  <Select
                    value={form.roleByPlant[pid] ?? "none"}
                    onValueChange={(v) =>
                      setForm((f) => {
                        const roleByPlant = { ...f.roleByPlant };
                        if (v === "none") delete roleByPlant[pid];
                        else roleByPlant[pid] = v;
                        return { ...f, roleByPlant };
                      })
                    }
                  >
                    <SelectTrigger className="h-9"><SelectValue placeholder="No role" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No role</SelectItem>
                      {roles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Temporary delete blocks sign-in and can be restored later. Permanent delete removes the account and all
              assignments — this cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="outline" onClick={() => doDelete("soft")}>Temporary delete</Button>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => doDelete("permanent")}>
              Permanent delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
    </div>
  );
}

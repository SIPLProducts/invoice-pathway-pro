import { useMemo, useState } from "react";
import { ChevronDown, Eye, EyeOff, Loader2, Pencil, Plus, RotateCcw, Search, Trash2, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  first_name: string;
  last_name: string;
  email: string;
  contact: string;
  password: string;
  confirm_password: string;
  status: string;
  plant_ids: string[];
  role_ids: string[];
  roleByPlant: Record<string, string>;
}

const emptyForm: FormState = {
  sap_user_id: "",
  first_name: "",
  last_name: "",
  email: "",
  contact: "",
  password: "",
  confirm_password: "",
  status: "active",
  plant_ids: [],
  role_ids: [],
  roleByPlant: {},
};

const PHONE_RE = /^\+?[0-9][0-9\s-]{7,18}$/;


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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);

  const plantName = (id: string) => {
    const p = plants.find((x) => x.id === id);
    return p ? `${p.code} · ${p.name}` : "—";
  };
  const roleName = (id: string) => roles.find((r) => r.id === id)?.name ?? "—";
  const selectableRoles = useMemo(
    () => (form.role_ids.length ? roles.filter((r) => form.role_ids.includes(r.id)) : roles),
    [roles, form.role_ids],
  );

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
    setErrors({});
    setOpen(true);
  };

  const openEdit = (u: UserRow) => {
    const roleByPlant: Record<string, string> = {};
    for (const r of u.roles) roleByPlant[r.plant_id ?? "global"] = r.role_id;
    const parts = (u.name ?? "").trim().split(/\s+/);
    setForm({
      id: u.id,
      sap_user_id: u.sap_user_id,
      first_name: parts[0] ?? "",
      last_name: parts.slice(1).join(" "),
      email: u.email,
      contact: u.contact ?? "",
      password: "",
      confirm_password: "",
      status: u.status,
      plant_ids: u.plants.map((p) => p.plant_id),
      role_ids: Array.from(new Set(u.roles.map((r) => r.role_id))),
      roleByPlant,
    });
    setErrors({});
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

  const toggleRole = (id: string) => {
    setForm((f) => {
      const has = f.role_ids.includes(id);
      const role_ids = has ? f.role_ids.filter((r) => r !== id) : [...f.role_ids, id];
      const roleByPlant = { ...f.roleByPlant };
      if (has) {
        for (const k of Object.keys(roleByPlant)) if (roleByPlant[k] === id) delete roleByPlant[k];
      }
      return { ...f, role_ids, roleByPlant };
    });
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.first_name.trim()) e.first_name = "First name is required";
    if (!form.contact.trim()) e.contact = "Contact is required";
    else if (!PHONE_RE.test(form.contact.trim())) e.contact = "Enter a valid phone number";

    if (!form.id) {
      if (form.password.length < 8) e.password = "Password must be at least 8 characters";
      if (!form.confirm_password) e.confirm_password = "Confirm the password";
      else if (form.password !== form.confirm_password) e.confirm_password = "Passwords do not match";
    } else if (form.password || form.confirm_password) {
      if (form.password.length < 8) e.password = "Password must be at least 8 characters";
      if (form.password !== form.confirm_password) e.confirm_password = "Passwords do not match";
    }

    if (form.plant_ids.length === 0) e.plants = "Select at least one plant";
    if (form.plant_ids.some((pid) => !form.roleByPlant[pid])) e.rolePerPlant = "Assign a role for each selected plant";

    setErrors(e);
    if (Object.keys(e).length) {
      toast.error("Please fix the highlighted fields");
      return false;
    }
    return true;
  };

  const save = async () => {
    if (!validate()) return;

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
        sap_user_id: form.sap_user_id || undefined,
        name: `${form.first_name.trim()} ${form.last_name.trim()}`.trim(),
        email: form.email || undefined,
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
            <Field label="First Name" required error={errors.first_name}>
              <Input
                placeholder="Enter first name"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              />
            </Field>
            <Field label="Last Name (Optional)" error={errors.last_name}>
              <Input
                placeholder="Enter last name"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              />
            </Field>

            <Field label="Contact" required error={errors.contact}>
              <Input
                type="tel"
                inputMode="tel"
                placeholder="Enter contact number"
                value={form.contact}
                onChange={(e) => setForm({ ...form, contact: e.target.value })}
              />
            </Field>
            <Field label="Status" required error={errors.status}>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label={form.id ? "New password (optional)" : "Password"} required={!form.id} error={errors.password}>
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  placeholder="Enter password"
                  className="pr-10"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button"
                  aria-label={showPw ? "Hide password" : "Show password"}
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
            <Field label="Confirm Password" required={!form.id} error={errors.confirm_password}>
              <div className="relative">
                <Input
                  type={showPw2 ? "text" : "password"}
                  placeholder="Confirm password"
                  className="pr-10"
                  value={form.confirm_password}
                  onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                />
                <button
                  type="button"
                  aria-label={showPw2 ? "Hide password" : "Show password"}
                  onClick={() => setShowPw2((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPw2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Plant assignment <span className="text-destructive">*</span>
              </Label>
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border p-2">
                {plants.map((p) => (
                  <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                    <Checkbox checked={form.plant_ids.includes(p.id)} onCheckedChange={() => togglePlant(p.id)} />
                    {p.code} – {p.name}
                  </label>
                ))}
                {plants.length === 0 && <span className="block px-2 py-1.5 text-sm text-muted-foreground">No plants configured yet.</span>}
              </div>
              <p className="text-xs text-muted-foreground">{form.plant_ids.length} plant(s) selected</p>
              {errors.plants && <p className="text-xs text-destructive">{errors.plants}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Role assignment <span className="text-destructive">*</span>
              </Label>
              <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border p-3">
                {form.plant_ids.map((pid) => (
                  <div key={pid} className="space-y-1">
                    <span className="block text-sm font-medium">{plantName(pid)}</span>
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
                      <SelectTrigger className="h-9"><SelectValue placeholder="Select role for this plant" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No role</SelectItem>
                        {roles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
                {form.plant_ids.length === 0 && (
                  <p className="text-sm text-muted-foreground">Select a plant to assign a role.</p>
                )}
              </div>
              {errors.rolePerPlant && <p className="text-xs text-destructive">{errors.rolePerPlant}</p>}
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

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}


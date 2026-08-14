import { useState } from "react";
import { Loader2, Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { RoleRow, UserRow } from "@/lib/rbac";

interface Props {
  roles: RoleRow[];
  users: UserRow[];
  loading: boolean;
  reload: () => void;
}

interface RoleForm {
  id?: string;
  name: string;
  description: string;
  status: string;
}

const empty: RoleForm = { name: "", description: "", status: "active" };

export function RolesTab({ roles, users, loading, reload }: Props) {
  const { can } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<RoleForm>(empty);
  const [saving, setSaving] = useState(false);

  const usageCount = (roleId: string) => users.filter((u) => u.roles.some((r) => r.role_id === roleId)).length;

  const save = async () => {
    if (!form.name.trim()) return toast.error("Role name is required");
    if (roles.some((r) => r.name.toLowerCase() === form.name.trim().toLowerCase() && r.id !== form.id)) {
      return toast.error("A role with that name already exists");
    }
    setSaving(true);
    const payload = { name: form.name.trim(), description: form.description.trim() || null, status: form.status };
    const { error } = form.id
      ? await supabase.from("roles").update(payload).eq("id", form.id)
      : await supabase.from("roles").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(form.id ? "Role updated" : "Role created");
    setOpen(false);
    reload();
  };

  const remove = async (role: RoleRow) => {
    if (usageCount(role.id) > 0) {
      toast.error("This role is assigned to users — remove those assignments first");
      return;
    }
    const { error } = await supabase.from("roles").delete().eq("id", role.id);
    if (error) return toast.error(error.message);
    toast.success("Role deleted");
    reload();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {can("role_management", "create") && (
          <Button size="sm" onClick={() => { setForm(empty); setOpen(true); }}>
            <Plus className="h-4 w-4" /> New role
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Role Name</th>
              <th className="px-4 py-3 text-left font-semibold">Description</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
              <th className="px-4 py-3 text-left font-semibold">Users</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></td></tr>
            ) : roles.map((r) => (
              <tr key={r.id} className="hover:bg-muted/40">
                <td className="px-4 py-3 font-medium">
                  <div className="flex items-center gap-2">
                    {r.name}
                    {r.is_master && <Badge className="gap-1"><Lock className="h-3 w-3" /> Master</Badge>}
                    {r.is_system && !r.is_master && <Badge variant="outline">System</Badge>}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{r.description ?? "—"}</td>
                <td className="px-4 py-3">
                  <Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status}</Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{usageCount(r.id)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    {can("role_management", "edit") && !r.is_master && (
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Edit role"
                        onClick={() => {
                          setForm({ id: r.id, name: r.name, description: r.description ?? "", status: r.status });
                          setOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {can("role_management", "delete") && !r.is_system && (
                      <Button size="icon" variant="ghost" aria-label="Delete role" onClick={() => remove(r)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form.id ? "Edit role" : "Create role"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Role name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

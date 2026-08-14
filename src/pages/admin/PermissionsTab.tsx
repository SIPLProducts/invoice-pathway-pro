import { useEffect, useMemo, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type PermAction } from "@/lib/auth";
import type { PermissionRow, RoleRow, ScreenRow } from "@/lib/rbac";

interface Props {
  roles: RoleRow[];
  screens: ScreenRow[];
  permissions: PermissionRow[];
  loading: boolean;
  reload: () => void;
}

const ACTIONS: { key: PermAction; label: string; col: keyof PermissionRow }[] = [
  { key: "view", label: "View", col: "can_view" },
  { key: "create", label: "Create", col: "can_create" },
  { key: "edit", label: "Edit", col: "can_edit" },
  { key: "delete", label: "Delete", col: "can_delete" },
  { key: "approve", label: "Approve", col: "can_approve" },
];

type Matrix = Record<string, Record<PermAction, boolean>>;

export function PermissionsTab({ roles, screens, permissions, loading, reload }: Props) {
  const { can, refresh } = useAuth();
  const editable = can("role_management", "edit");
  const selectableRoles = useMemo(() => roles.filter((r) => !r.is_master), [roles]);
  const [roleId, setRoleId] = useState<string>("");
  const [matrix, setMatrix] = useState<Matrix>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!roleId && selectableRoles.length) setRoleId(selectableRoles[0].id);
  }, [selectableRoles, roleId]);

  useEffect(() => {
    const next: Matrix = {};
    for (const s of screens) {
      const row = permissions.find((p) => p.role_id === roleId && p.screen_id === s.id);
      next[s.id] = {
        view: !!row?.can_view,
        create: !!row?.can_create,
        edit: !!row?.can_edit,
        delete: !!row?.can_delete,
        approve: !!row?.can_approve,
      };
    }
    setMatrix(next);
  }, [roleId, screens, permissions]);

  const toggle = (screenId: string, action: PermAction) => {
    setMatrix((m) => {
      const cur = m[screenId];
      const value = !cur[action];
      const updated = { ...cur, [action]: value };
      if (action === "view" && !value) {
        updated.create = false;
        updated.edit = false;
        updated.delete = false;
        updated.approve = false;
      }
      if (action !== "view" && value) updated.view = true;
      return { ...m, [screenId]: updated };
    });
  };

  const setAll = (screenId: string, value: boolean) => {
    setMatrix((m) => ({
      ...m,
      [screenId]: { view: value, create: value, edit: value, delete: value, approve: value },
    }));
  };

  const save = async () => {
    if (!roleId) return;
    setSaving(true);
    const rows = screens.map((s) => ({
      role_id: roleId,
      screen_id: s.id,
      can_view: matrix[s.id]?.view ?? false,
      can_create: matrix[s.id]?.create ?? false,
      can_edit: matrix[s.id]?.edit ?? false,
      can_delete: matrix[s.id]?.delete ?? false,
      can_approve: matrix[s.id]?.approve ?? false,
    }));
    const { error } = await supabase.from("screen_permissions").upsert(rows, { onConflict: "role_id,screen_id" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Permissions saved");
    reload();
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={roleId} onValueChange={setRoleId}>
          <SelectTrigger className="h-9 w-[240px]"><SelectValue placeholder="Select role" /></SelectTrigger>
          <SelectContent>
            {selectableRoles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          The master role (Sharvi Admin) always has full access and cannot be edited.
        </p>
        {editable && (
          <Button size="sm" className="ml-auto" onClick={save} disabled={saving || !roleId}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save permissions
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Screen</th>
              {ACTIONS.map((a) => <th key={a.key} className="px-4 py-3 text-center font-semibold">{a.label}</th>)}
              <th className="px-4 py-3 text-center font-semibold">All</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></td></tr>
            ) : screens.map((s) => {
              const row = matrix[s.id];
              const all = row && ACTIONS.every((a) => row[a.key]);
              return (
                <tr key={s.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium">
                    {s.name}
                    <div className="text-[11px] text-muted-foreground">{s.route ?? s.key}</div>
                  </td>
                  {ACTIONS.map((a) => (
                    <td key={a.key} className="px-4 py-3 text-center">
                      <Checkbox
                        checked={!!row?.[a.key]}
                        disabled={!editable}
                        onCheckedChange={() => toggle(s.id, a.key)}
                        aria-label={`${s.name} ${a.label}`}
                      />
                    </td>
                  ))}
                  <td className="px-4 py-3 text-center">
                    <Checkbox
                      checked={!!all}
                      disabled={!editable}
                      onCheckedChange={() => setAll(s.id, !all)}
                      aria-label={`${s.name} all permissions`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

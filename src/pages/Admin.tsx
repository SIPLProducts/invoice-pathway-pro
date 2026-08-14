import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { NoAccess } from "@/components/RequirePermission";
import { UsersTab } from "@/pages/admin/UsersTab";
import { RolesTab } from "@/pages/admin/RolesTab";
import { PermissionsTab } from "@/pages/admin/PermissionsTab";
import {
  fetchPermissions,
  fetchPlants,
  fetchRoles,
  fetchScreens,
  fetchUsers,
  type PermissionRow,
  type PlantRow,
  type RoleRow,
  type ScreenRow,
  type UserRow,
} from "@/lib/rbac";

export default function Admin() {
  const { can, loading: authLoading } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "users";

  const [users, setUsers] = useState<UserRow[]>([]);
  const [plants, setPlants] = useState<PlantRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [screens, setScreens] = useState<ScreenRow[]>([]);
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const canUsers = can("user_management");
  const canRoles = can("role_management");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, p, r, s, perms] = await Promise.all([
        fetchUsers(true),
        fetchPlants(),
        fetchRoles(),
        fetchScreens(),
        fetchPermissions(),
      ]);
      setUsers(u);
      setPlants(p);
      setRoles(r);
      setScreens(s);
      setPermissions(perms);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load administration data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && (canUsers || canRoles)) load();
  }, [authLoading, canUsers, canRoles, load]);

  if (authLoading) return null;
  if (!canUsers && !canRoles) return <NoAccess screen="User Management" />;

  return (
    <>
      <PageHeader
        title="User Management & Access Control"
        description="Manage users, plant assignments, roles, and screen-level permissions."
      />

      <Tabs value={tab} onValueChange={(v) => setParams({ tab: v }, { replace: true })}>
        <TabsList>
          {canUsers && <TabsTrigger value="users">Users</TabsTrigger>}
          {canRoles && <TabsTrigger value="roles">Roles</TabsTrigger>}
          {canRoles && <TabsTrigger value="permissions">Screen Permissions</TabsTrigger>}
        </TabsList>

        {canUsers && (
          <TabsContent value="users" className="mt-5">
            <UsersTab users={users} plants={plants} roles={roles} loading={loading} reload={load} />
          </TabsContent>
        )}
        {canRoles && (
          <TabsContent value="roles" className="mt-5">
            <RolesTab roles={roles} users={users} loading={loading} reload={load} />
          </TabsContent>
        )}
        {canRoles && (
          <TabsContent value="permissions" className="mt-5">
            <PermissionsTab
              roles={roles}
              screens={screens}
              permissions={permissions}
              loading={loading}
              reload={load}
            />
          </TabsContent>
        )}
      </Tabs>
    </>
  );
}

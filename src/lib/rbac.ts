import { supabase } from "@/integrations/supabase/client";

export interface PlantRow {
  id: string;
  code: string;
  name: string;
  status: string;
  deleted_at: string | null;
}

export interface RoleRow {
  id: string;
  name: string;
  description: string | null;
  status: string;
  is_system: boolean;
  is_master: boolean;
  deleted_at: string | null;
}

export interface ScreenRow {
  id: string;
  key: string;
  name: string;
  route: string | null;
  sort_order: number;
}

export interface PermissionRow {
  id: string;
  role_id: string;
  screen_id: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_approve: boolean;
}

export interface UserRow {
  id: string;
  user_code: string;
  sap_user_id: string;
  name: string;
  email: string;
  contact: string | null;
  status: string;
  last_login_at: string | null;
  deleted_at: string | null;
  plants: { plant_id: string }[];
  roles: { plant_id: string | null; role_id: string }[];
}

export async function fetchPlants(): Promise<PlantRow[]> {
  const { data, error } = await supabase.from("plants").select("*").is("deleted_at", null).order("code");
  if (error) throw error;
  return (data ?? []) as PlantRow[];
}

export async function fetchRoles(): Promise<RoleRow[]> {
  const { data, error } = await supabase.from("roles").select("*").is("deleted_at", null).order("name");
  if (error) throw error;
  return (data ?? []) as RoleRow[];
}

export async function fetchScreens(): Promise<ScreenRow[]> {
  const { data, error } = await supabase.from("screens").select("*").order("sort_order");
  if (error) throw error;
  return (data ?? []) as ScreenRow[];
}

export async function fetchPermissions(): Promise<PermissionRow[]> {
  const { data, error } = await supabase.from("screen_permissions").select("*");
  if (error) throw error;
  return (data ?? []) as PermissionRow[];
}

export async function fetchUsers(includeDeleted: boolean): Promise<UserRow[]> {
  let q = supabase
    .from("profiles")
    .select("id,user_code,sap_user_id,name,email,contact,status,last_login_at,deleted_at")
    .order("created_at", { ascending: false });
  if (!includeDeleted) q = q.is("deleted_at", null);
  const { data: profiles, error } = await q;
  if (error) throw error;

  const [{ data: ups }, { data: urs }] = await Promise.all([
    supabase.from("user_plants").select("user_id,plant_id"),
    supabase.from("user_roles").select("user_id,plant_id,role_id"),
  ]);

  return (profiles ?? []).map((p) => ({
    ...(p as Omit<UserRow, "plants" | "roles">),
    plants: (ups ?? []).filter((u) => u.user_id === p.id).map((u) => ({ plant_id: u.plant_id })),
    roles: (urs ?? [])
      .filter((u) => u.user_id === p.id)
      .map((u) => ({ plant_id: u.plant_id, role_id: u.role_id })),
  }));
}

export async function callAdmin<T = unknown>(action: string, payload?: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke("admin-users", { body: { action, payload } });
  if (error) {
    const ctx = (error as unknown as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const body = await ctx.json();
        throw new Error(body?.error ?? error.message);
      } catch (e) {
        if (e instanceof Error && e.message !== error.message) throw e;
      }
    }
    throw new Error(error.message);
  }
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as T;
}

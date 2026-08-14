import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type PermAction = "view" | "create" | "edit" | "delete" | "approve";

export interface Profile {
  id: string;
  user_code: string;
  sap_user_id: string;
  name: string;
  email: string;
  contact: string | null;
  status: string;
  last_login_at: string | null;
  deleted_at: string | null;
}

export interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isMaster: boolean;
  roleNames: string[];
  permissions: Record<string, Record<PermAction, boolean>>;
  can: (screenKey: string, action?: PermAction) => boolean;
  refresh: () => Promise<void>;
  signIn: (login: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

const emptyPerm = (): Record<PermAction, boolean> => ({
  view: false,
  create: false,
  edit: false,
  delete: false,
  approve: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isMaster, setIsMaster] = useState(false);
  const [roleNames, setRoleNames] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<Record<string, Record<PermAction, boolean>>>({});
  const [loading, setLoading] = useState(true);

  const loadContext = useCallback(async (uid: string) => {
    const { data: prof } = await supabase
      .from("profiles")
      .select("id,user_code,sap_user_id,name,email,contact,status,last_login_at,deleted_at")
      .eq("id", uid)
      .maybeSingle();
    setProfile((prof as Profile) ?? null);

    const { data: urs } = await supabase
      .from("user_roles")
      .select("role_id, roles(id,name,status,is_master,deleted_at)")
      .eq("user_id", uid);

    const roles = (urs ?? [])
      .map((r) => (r as unknown as { roles: { id: string; name: string; status: string; is_master: boolean; deleted_at: string | null } | null }).roles)
      .filter((r): r is NonNullable<typeof r> => !!r && !r.deleted_at && r.status === "active");

    setRoleNames([...new Set(roles.map((r) => r.name))]);
    const master = roles.some((r) => r.is_master);
    setIsMaster(master);

    const roleIds = [...new Set(roles.map((r) => r.id))];
    const map: Record<string, Record<PermAction, boolean>> = {};
    if (roleIds.length) {
      const { data: perms } = await supabase
        .from("screen_permissions")
        .select("can_view,can_create,can_edit,can_delete,can_approve,screens(key)")
        .in("role_id", roleIds);
      for (const p of perms ?? []) {
        const key = (p as unknown as { screens: { key: string } | null }).screens?.key;
        if (!key) continue;
        const cur = map[key] ?? emptyPerm();
        map[key] = {
          view: cur.view || p.can_view,
          create: cur.create || p.can_create,
          edit: cur.edit || p.can_edit,
          delete: cur.delete || p.can_delete,
          approve: cur.approve || p.can_approve,
        };
      }
    }
    setPermissions(map);
  }, []);

  useEffect(() => {
    let active = true;
    let loadedFor: string | null = null;

    const clear = () => {
      setProfile(null);
      setPermissions({});
      setRoleNames([]);
      setIsMaster(false);
      loadedFor = null;
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (!active) return;
      if (import.meta.env.DEV) console.debug("[auth]", event, !!s);

      if (event === "SIGNED_OUT") {
        setSession(null);
        clear();
        setLoading(false);
        return;
      }

      // Transient null session on a non-sign-out event (e.g. a rate-limited
      // token refresh): keep the current state and re-check instead of
      // dropping the user back to the login screen.
      if (!s?.user) {
        setLoading(false);
        setTimeout(async () => {
          const { data } = await supabase.auth.getSession();
          if (!active) return;
          if (data.session?.user) {
            setSession(data.session);
          } else {
            setSession(null);
            clear();
          }
        }, 1500);
        return;
      }

      setSession(s);
      if (loadedFor === s.user.id) {
        // Same user, just a refreshed token — no need to refetch RBAC data.
        setLoading(false);
        return;
      }
      loadedFor = s.user.id;
      setTimeout(() => {
        loadContext(s.user.id).finally(() => active && setLoading(false));
      }, 0);
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession((prev) => prev ?? data.session);
      if (data.session?.user) {
        if (loadedFor === data.session.user.id) {
          setLoading(false);
          return;
        }
        loadedFor = data.session.user.id;
        loadContext(data.session.user.id).finally(() => active && setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadContext]);

  const can = useCallback(
    (screenKey: string, action: PermAction = "view") => {
      if (isMaster) return true;
      return permissions[screenKey]?.[action] ?? false;
    },
    [isMaster, permissions],
  );

  const refresh = useCallback(async () => {
    if (session?.user) await loadContext(session.user.id);
  }, [session, loadContext]);

  const signIn = useCallback(async (login: string, password: string) => {
    const value = login.trim();
    let email = value;
    if (!value.includes("@")) {
      const { data } = await supabase.rpc("resolve_login_email", { _login: value });
      if (!data) return { error: "No account found for that SAP User ID" };
      email = data as string;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    await supabase.rpc("touch_last_login");
    return {};
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthState>(
    () => ({ session, user: session?.user ?? null, profile, loading, isMaster, roleNames, permissions, can, refresh, signIn, signOut }),
    [session, profile, loading, isMaster, roleNames, permissions, can, refresh, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function initials(name?: string | null) {
  if (!name) return "??";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const MASTER_EMAIL = "masteradmin@sharviinfotech.com";
const MASTER_PASSWORD = "Vision@2026";
const MASTER_SAP_ID = "sharvi";

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function ensureMaster() {
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("email", MASTER_EMAIL)
    .maybeSingle();
  if (existing) return { seeded: false };

  const { data: roleRow } = await admin.from("roles").select("id").eq("is_master", true).maybeSingle();
  if (!roleRow) return { seeded: false, error: "master role missing" };

  // find or create the auth user
  let userId: string | null = null;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: MASTER_EMAIL,
    password: MASTER_PASSWORD,
    email_confirm: true,
    user_metadata: { name: "Sharvi Master Admin" },
  });
  if (createErr) {
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    userId = list?.users.find((u) => u.email?.toLowerCase() === MASTER_EMAIL)?.id ?? null;
    if (userId) await admin.auth.admin.updateUserById(userId, { password: MASTER_PASSWORD });
  } else {
    userId = created.user?.id ?? null;
  }
  if (!userId) return { seeded: false, error: createErr?.message ?? "could not create master" };

  await admin.from("profiles").insert({
    id: userId,
    sap_user_id: MASTER_SAP_ID,
    name: "Sharvi Master Admin",
    email: MASTER_EMAIL,
    status: "active",
  });
  await admin.from("user_roles").insert({ user_id: userId, role_id: roleRow.id, plant_id: null });
  return { seeded: true };
}

async function getCaller(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) return null;
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data } = await client.auth.getUser();
  return data.user ?? null;
}

async function callerCan(userId: string, action: string) {
  const { data } = await admin.rpc("has_permission", {
    _user_id: userId,
    _screen_key: "user_management",
    _action: action,
  });
  return data === true;
}

async function syncAssignments(userId: string, plantIds: string[], roles: { plant_id: string | null; role_id: string }[]) {
  await admin.from("user_plants").delete().eq("user_id", userId);
  await admin.from("user_roles").delete().eq("user_id", userId);
  if (plantIds.length) {
    await admin.from("user_plants").insert(plantIds.map((p) => ({ user_id: userId, plant_id: p })));
  }
  if (roles.length) {
    await admin.from("user_roles").insert(
      roles.map((r) => ({ user_id: userId, plant_id: r.plant_id, role_id: r.role_id })),
    );
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");

    if (action === "seed_master") {
      const result = await ensureMaster();
      return json({ ok: true, ...result });
    }

    const caller = await getCaller(req);
    if (!caller) return json({ error: "Not authenticated" }, 401);

    if (action === "create_user") {
      if (!(await callerCan(caller.id, "create"))) return json({ error: "Not allowed" }, 403);
      const payload = body.payload ?? {};
      const { name, contact, password, status, plant_ids = [], roles = [] } = payload;
      if (!name || !password) return json({ error: "Missing required fields" }, 400);

      const generated = `u${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      const sap_user_id: string = payload.sap_user_id?.trim() || generated;
      const email: string = payload.email?.trim() || `${sap_user_id.toLowerCase()}@siplusers.internal`;

      const { data: dup } = await admin
        .from("profiles")
        .select("id,email,sap_user_id")
        .is("deleted_at", null)
        .or(`email.eq.${email},sap_user_id.eq.${sap_user_id}`);
      if (dup && dup.length) return json({ error: "This user already exists" }, 409);

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });
      if (createErr || !created.user) return json({ error: createErr?.message ?? "Could not create account" }, 400);

      const { error: profErr } = await admin.from("profiles").insert({
        id: created.user.id,
        sap_user_id,
        name,
        email,
        contact: contact || null,
        status: status || "active",
        created_by: caller.id,
      });
      if (profErr) {
        await admin.auth.admin.deleteUser(created.user.id);
        return json({ error: profErr.message }, 400);
      }
      await syncAssignments(created.user.id, plant_ids, roles);
      return json({ ok: true, id: created.user.id });
    }

    if (action === "update_user") {
      if (!(await callerCan(caller.id, "edit"))) return json({ error: "Not allowed" }, 403);
      const payload = body.payload ?? {};
      const { id, name, contact, password, status, plant_ids = [], roles = [] } = payload;
      if (!id) return json({ error: "Missing user id" }, 400);
      const sap_user_id: string | undefined = payload.sap_user_id?.trim() || undefined;
      const email: string | undefined = payload.email?.trim() || undefined;

      const filters = [
        email ? `email.eq.${email}` : null,
        sap_user_id ? `sap_user_id.eq.${sap_user_id}` : null,
      ].filter(Boolean) as string[];
      if (filters.length) {
        const { data: dup } = await admin
          .from("profiles")
          .select("id")
          .is("deleted_at", null)
          .neq("id", id)
          .or(filters.join(","));
        if (dup && dup.length) return json({ error: "This user already exists" }, 409);
      }

      const authUpdate: Record<string, unknown> = {};
      if (email) authUpdate.email = email;
      if (password) authUpdate.password = password;
      if (Object.keys(authUpdate).length) {
        const { error } = await admin.auth.admin.updateUserById(id, authUpdate);
        if (error) return json({ error: error.message }, 400);
      }

      const profileUpdate: Record<string, unknown> = {
        name,
        contact: contact || null,
        status,
        updated_by: caller.id,
      };
      if (sap_user_id) profileUpdate.sap_user_id = sap_user_id;
      if (email) profileUpdate.email = email;

      const { error: profErr } = await admin.from("profiles").update(profileUpdate).eq("id", id);
      if (profErr) return json({ error: profErr.message }, 400);

      await syncAssignments(id, plant_ids, roles);
      return json({ ok: true });
    }


    if (action === "delete_user") {
      if (!(await callerCan(caller.id, "delete"))) return json({ error: "Not allowed" }, 403);
      const { id, mode } = body.payload ?? {};
      if (!id) return json({ error: "Missing user id" }, 400);

      const { data: isMaster } = await admin.rpc("is_master_admin", { _user_id: id });
      if (isMaster) return json({ error: "The master admin account cannot be deleted" }, 400);

      if (mode === "permanent") {
        const { error } = await admin.auth.admin.deleteUser(id);
        if (error) return json({ error: error.message }, 400);
        await admin.from("profiles").delete().eq("id", id);
      } else {
        const { error } = await admin
          .from("profiles")
          .update({ deleted_at: new Date().toISOString(), status: "inactive", updated_by: caller.id })
          .eq("id", id);
        if (error) return json({ error: error.message }, 400);
        await admin.auth.admin.updateUserById(id, { ban_duration: "876000h" });
      }
      return json({ ok: true });
    }

    if (action === "restore_user") {
      if (!(await callerCan(caller.id, "edit"))) return json({ error: "Not allowed" }, 403);
      const { id } = body.payload ?? {};
      if (!id) return json({ error: "Missing user id" }, 400);
      const { error } = await admin
        .from("profiles")
        .update({ deleted_at: null, status: "active", updated_by: caller.id })
        .eq("id", id);
      if (error) return json({ error: error.message }, 400);
      await admin.auth.admin.updateUserById(id, { ban_duration: "none" });
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});

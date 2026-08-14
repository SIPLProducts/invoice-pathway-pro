-- ============ TABLES ============
CREATE TABLE public.plants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);
CREATE UNIQUE INDEX plants_code_key ON public.plants (lower(code)) WHERE deleted_at IS NULL;

CREATE TABLE public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active',
  is_system boolean NOT NULL DEFAULT false,
  is_master boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);
CREATE UNIQUE INDEX roles_name_key ON public.roles (lower(name)) WHERE deleted_at IS NULL;

CREATE TABLE public.screens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  route text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE SEQUENCE public.user_code_seq START 1;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  user_code text NOT NULL DEFAULT ('USR-' || lpad(nextval('public.user_code_seq')::text, 5, '0')),
  sap_user_id text NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  contact text,
  status text NOT NULL DEFAULT 'active',
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);
CREATE UNIQUE INDEX profiles_sap_user_id_key ON public.profiles (lower(sap_user_id)) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX profiles_email_key ON public.profiles (lower(email)) WHERE deleted_at IS NULL;

CREATE TABLE public.user_plants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plant_id uuid NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (user_id, plant_id)
);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plant_id uuid REFERENCES public.plants(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE UNIQUE INDEX user_roles_unique_combo ON public.user_roles (user_id, coalesce(plant_id, '00000000-0000-0000-0000-000000000000'::uuid), role_id);

CREATE TABLE public.screen_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  screen_id uuid NOT NULL REFERENCES public.screens(id) ON DELETE CASCADE,
  can_view boolean NOT NULL DEFAULT false,
  can_create boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  can_approve boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  UNIQUE (role_id, screen_id)
);

-- ============ GRANTS ============
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.screens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_plants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.screen_permissions TO authenticated;
GRANT ALL ON public.plants, public.roles, public.screens, public.profiles,
  public.user_plants, public.user_roles, public.screen_permissions TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.user_code_seq TO authenticated, service_role;

-- ============ HELPERS ============
CREATE OR REPLACE FUNCTION public.is_master_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = _user_id AND r.is_master AND r.deleted_at IS NULL
      AND p.deleted_at IS NULL AND p.status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _screen_key text, _action text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_master_admin(_user_id) OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL AND r.status = 'active'
    JOIN public.screen_permissions sp ON sp.role_id = r.id
    JOIN public.screens s ON s.id = sp.screen_id AND s.key = _screen_key
    JOIN public.profiles p ON p.id = ur.user_id AND p.deleted_at IS NULL AND p.status = 'active'
    WHERE ur.user_id = _user_id
      AND CASE _action
        WHEN 'view' THEN sp.can_view
        WHEN 'create' THEN sp.can_create
        WHEN 'edit' THEN sp.can_edit
        WHEN 'delete' THEN sp.can_delete
        WHEN 'approve' THEN sp.can_approve
        ELSE false END
  )
$$;

CREATE OR REPLACE FUNCTION public.resolve_login_email(_login text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT email FROM public.profiles
  WHERE deleted_at IS NULL
    AND (lower(sap_user_id) = lower(trim(_login)) OR lower(email) = lower(trim(_login)))
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.resolve_login_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_login_email(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.touch_last_login()
RETURNS void LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.profiles SET last_login_at = now() WHERE id = auth.uid()
$$;

-- ============ RLS ============
ALTER TABLE public.plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screen_permissions ENABLE ROW LEVEL SECURITY;

-- plants: all authenticated can read; manage requires user management rights
CREATE POLICY plants_select ON public.plants FOR SELECT TO authenticated USING (true);
CREATE POLICY plants_insert ON public.plants FOR INSERT TO authenticated WITH CHECK (public.has_permission(auth.uid(), 'user_management', 'create'));
CREATE POLICY plants_update ON public.plants FOR UPDATE TO authenticated USING (public.has_permission(auth.uid(), 'user_management', 'edit')) WITH CHECK (public.has_permission(auth.uid(), 'user_management', 'edit'));
CREATE POLICY plants_delete ON public.plants FOR DELETE TO authenticated USING (public.has_permission(auth.uid(), 'user_management', 'delete'));

-- roles
CREATE POLICY roles_select ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY roles_insert ON public.roles FOR INSERT TO authenticated WITH CHECK (public.has_permission(auth.uid(), 'role_management', 'create'));
CREATE POLICY roles_update ON public.roles FOR UPDATE TO authenticated USING (public.has_permission(auth.uid(), 'role_management', 'edit') AND (NOT is_master OR public.is_master_admin(auth.uid()))) WITH CHECK (public.has_permission(auth.uid(), 'role_management', 'edit'));
CREATE POLICY roles_delete ON public.roles FOR DELETE TO authenticated USING (public.has_permission(auth.uid(), 'role_management', 'delete') AND NOT is_system);

-- screens: readable by all authenticated, managed by master only
CREATE POLICY screens_select ON public.screens FOR SELECT TO authenticated USING (true);
CREATE POLICY screens_write ON public.screens FOR ALL TO authenticated USING (public.is_master_admin(auth.uid())) WITH CHECK (public.is_master_admin(auth.uid()));

-- profiles
CREATE POLICY profiles_select_self ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_permission(auth.uid(), 'user_management', 'view'));
CREATE POLICY profiles_insert ON public.profiles FOR INSERT TO authenticated WITH CHECK (public.has_permission(auth.uid(), 'user_management', 'create'));
CREATE POLICY profiles_update ON public.profiles FOR UPDATE TO authenticated USING (public.has_permission(auth.uid(), 'user_management', 'edit')) WITH CHECK (public.has_permission(auth.uid(), 'user_management', 'edit'));
CREATE POLICY profiles_delete ON public.profiles FOR DELETE TO authenticated USING (public.has_permission(auth.uid(), 'user_management', 'delete'));

-- user_plants
CREATE POLICY user_plants_select ON public.user_plants FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_permission(auth.uid(), 'user_management', 'view'));
CREATE POLICY user_plants_insert ON public.user_plants FOR INSERT TO authenticated WITH CHECK (public.has_permission(auth.uid(), 'user_management', 'create') OR public.has_permission(auth.uid(), 'user_management', 'edit'));
CREATE POLICY user_plants_delete ON public.user_plants FOR DELETE TO authenticated USING (public.has_permission(auth.uid(), 'user_management', 'edit') OR public.has_permission(auth.uid(), 'user_management', 'delete'));

-- user_roles
CREATE POLICY user_roles_select ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_permission(auth.uid(), 'user_management', 'view'));
CREATE POLICY user_roles_insert ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_permission(auth.uid(), 'user_management', 'create') OR public.has_permission(auth.uid(), 'user_management', 'edit'));
CREATE POLICY user_roles_delete ON public.user_roles FOR DELETE TO authenticated USING (public.has_permission(auth.uid(), 'user_management', 'edit') OR public.has_permission(auth.uid(), 'user_management', 'delete'));

-- screen_permissions
CREATE POLICY screen_permissions_select ON public.screen_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY screen_permissions_write ON public.screen_permissions FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'role_management', 'edit'))
  WITH CHECK (public.has_permission(auth.uid(), 'role_management', 'edit'));

-- ============ TRIGGERS ============
CREATE TRIGGER trg_plants_updated BEFORE UPDATE ON public.plants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_roles_updated BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_screens_updated BEFORE UPDATE ON public.screens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_screen_permissions_updated BEFORE UPDATE ON public.screen_permissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- protect master role / master user
CREATE OR REPLACE FUNCTION public.protect_master()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_TABLE_NAME = 'roles' THEN
    IF TG_OP = 'DELETE' AND OLD.is_master THEN RAISE EXCEPTION 'The master role cannot be deleted'; END IF;
    IF TG_OP = 'UPDATE' AND OLD.is_master AND (NEW.is_master = false OR NEW.deleted_at IS NOT NULL OR NEW.status <> 'active') THEN
      RAISE EXCEPTION 'The master role cannot be disabled or deleted';
    END IF;
  ELSIF TG_TABLE_NAME = 'user_roles' THEN
    IF TG_OP = 'DELETE' AND EXISTS (SELECT 1 FROM public.roles r WHERE r.id = OLD.role_id AND r.is_master)
       AND (SELECT count(*) FROM public.user_roles ur JOIN public.roles r2 ON r2.id = ur.role_id WHERE r2.is_master) <= 1 THEN
      RAISE EXCEPTION 'At least one master admin must remain';
    END IF;
  ELSIF TG_TABLE_NAME = 'profiles' THEN
    IF EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id WHERE ur.user_id = OLD.id AND r.is_master) THEN
      IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'The master admin account cannot be deleted'; END IF;
      IF TG_OP = 'UPDATE' AND (NEW.deleted_at IS NOT NULL OR NEW.status <> 'active') THEN
        RAISE EXCEPTION 'The master admin account cannot be deactivated or deleted';
      END IF;
    END IF;
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;
CREATE TRIGGER trg_protect_roles BEFORE UPDATE OR DELETE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.protect_master();
CREATE TRIGGER trg_protect_user_roles BEFORE DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.protect_master();
CREATE TRIGGER trg_protect_profiles BEFORE UPDATE OR DELETE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_master();

-- ============ SEED ============
INSERT INTO public.roles (name, description, is_system, is_master) VALUES
  ('Sharvi Admin', 'Master administrator with unrestricted access', true, true),
  ('Super Admin', 'Full access except SAP screens', true, false),
  ('Admin', 'Administrative access except SAP screens', true, false);

INSERT INTO public.screens (key, name, route, sort_order) VALUES
  ('dashboard', 'Dashboard', '/', 1),
  ('dmr', 'DMR', '/dmr', 2),
  ('gate_entries', 'Gate Entries', '/ocr', 3),
  ('grn', 'GRN', '/grn', 4),
  ('sap_tracker', 'SAP Tracker', '/tracker', 5),
  ('sap_module', 'SAP Module', '/sap/settings', 6),
  ('approvals', 'Approvals', '/approvals', 7),
  ('documents', 'Documents', '/documents', 8),
  ('reports', 'Reports', '/reports', 9),
  ('user_management', 'User Management', '/admin/users', 10),
  ('role_management', 'Role Management', '/admin/users', 11);

INSERT INTO public.screen_permissions (role_id, screen_id, can_view, can_create, can_edit, can_delete, can_approve)
SELECT r.id, s.id, true, true, true, true, true
FROM public.roles r CROSS JOIN public.screens s
WHERE r.is_master;

INSERT INTO public.screen_permissions (role_id, screen_id, can_view, can_create, can_edit, can_delete, can_approve)
SELECT r.id, s.id,
  s.key NOT IN ('sap_module','sap_tracker'),
  s.key NOT IN ('sap_module','sap_tracker'),
  s.key NOT IN ('sap_module','sap_tracker'),
  s.key NOT IN ('sap_module','sap_tracker'),
  s.key NOT IN ('sap_module','sap_tracker')
FROM public.roles r CROSS JOIN public.screens s
WHERE r.name IN ('Super Admin','Admin');

INSERT INTO public.plants (code, name) VALUES ('1000', 'Main Plant'), ('2000', 'Secondary Plant');
-- Reusable updated_at trigger function (idempotent)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- SAP API configurations, shared across all devices/browsers/published builds.
CREATE TABLE public.sap_api_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  config JSONB NOT NULL,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sap_api_configs ENABLE ROW LEVEL SECURITY;

-- Demo-auth-only app today: allow anon + authenticated full access.
-- TODO: tighten to admin-only once real Supabase auth + roles table are wired up.
CREATE POLICY "Anyone can view sap api configs"
  ON public.sap_api_configs FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert sap api configs"
  ON public.sap_api_configs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update sap api configs"
  ON public.sap_api_configs FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete sap api configs"
  ON public.sap_api_configs FOR DELETE
  USING (true);

CREATE TRIGGER update_sap_api_configs_updated_at
BEFORE UPDATE ON public.sap_api_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime so changes on one device propagate to all others (preview <-> published).
ALTER TABLE public.sap_api_configs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sap_api_configs;
DROP POLICY IF EXISTS "Anyone can view sap api configs" ON public.sap_api_configs;
DROP POLICY IF EXISTS "Anyone can insert sap api configs" ON public.sap_api_configs;
DROP POLICY IF EXISTS "Anyone can update sap api configs" ON public.sap_api_configs;
DROP POLICY IF EXISTS "Anyone can delete sap api configs" ON public.sap_api_configs;

REVOKE ALL ON public.sap_api_configs FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sap_api_configs TO authenticated;
GRANT ALL ON public.sap_api_configs TO service_role;

ALTER TABLE public.sap_api_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sap api configs"
ON public.sap_api_configs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert sap api configs"
ON public.sap_api_configs FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update sap api configs"
ON public.sap_api_configs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete sap api configs"
ON public.sap_api_configs FOR DELETE TO authenticated USING (true);
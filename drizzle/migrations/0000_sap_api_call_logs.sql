CREATE TABLE public.sap_api_call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_name text NOT NULL,
  action text NOT NULL DEFAULT 'fetch',
  method text,
  url text,
  http_status integer,
  ok boolean NOT NULL DEFAULT false,
  record_count integer NOT NULL DEFAULT 0,
  bytes integer NOT NULL DEFAULT 0,
  duration_ms integer,
  message text,
  response_preview jsonb,
  user_id uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.sap_api_call_logs TO authenticated;
GRANT ALL ON public.sap_api_call_logs TO service_role;
ALTER TABLE public.sap_api_call_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY sap_logs_select ON public.sap_api_call_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY sap_logs_insert ON public.sap_api_call_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE INDEX sap_api_call_logs_api_time ON public.sap_api_call_logs (api_name, created_at DESC);
CREATE OR REPLACE FUNCTION public.prune_sap_api_call_logs() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.sap_api_call_logs WHERE created_at < now() - interval '30 days';
  RETURN NEW;
END $$;
CREATE TRIGGER sap_api_call_logs_prune AFTER INSERT ON public.sap_api_call_logs
FOR EACH STATEMENT EXECUTE FUNCTION public.prune_sap_api_call_logs();
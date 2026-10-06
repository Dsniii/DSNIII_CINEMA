ALTER TABLE public.recompensas ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.recompensas TO authenticated;

DROP POLICY IF EXISTS recompensas_authenticated_select ON public.recompensas;

CREATE POLICY recompensas_authenticated_select
  ON public.recompensas
  FOR SELECT
  TO authenticated
  USING (true);

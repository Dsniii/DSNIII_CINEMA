ALTER TABLE public.salas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.butacas ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE ON public.salas TO authenticated;
GRANT INSERT ON public.butacas TO authenticated;

CREATE POLICY salas_admin_select
  ON public.salas
  FOR SELECT
  TO authenticated
  USING ((SELECT public.rol_actual()) = 'admin');

CREATE POLICY salas_admin_insert
  ON public.salas
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.rol_actual()) = 'admin');

CREATE POLICY salas_admin_delete
  ON public.salas
  FOR DELETE
  TO authenticated
  USING ((SELECT public.rol_actual()) = 'admin');

CREATE POLICY butacas_admin_insert
  ON public.butacas
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.rol_actual()) = 'admin');

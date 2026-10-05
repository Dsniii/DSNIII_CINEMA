ALTER TABLE public.funciones ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.funciones TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.funciones TO authenticated;

DROP POLICY IF EXISTS funciones_select_publico ON public.funciones;
DROP POLICY IF EXISTS funciones_admin_insert ON public.funciones;
DROP POLICY IF EXISTS funciones_admin_update ON public.funciones;
DROP POLICY IF EXISTS funciones_admin_delete ON public.funciones;

CREATE POLICY funciones_select_publico
  ON public.funciones
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY funciones_admin_insert
  ON public.funciones
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.rol_actual()) = 'admin');

CREATE POLICY funciones_admin_update
  ON public.funciones
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.rol_actual()) = 'admin')
  WITH CHECK ((SELECT public.rol_actual()) = 'admin');

CREATE POLICY funciones_admin_delete
  ON public.funciones
  FOR DELETE
  TO authenticated
  USING ((SELECT public.rol_actual()) = 'admin');
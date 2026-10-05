ALTER TABLE public.peliculas ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.peliculas TO anon, authenticated;
GRANT INSERT, UPDATE ON public.peliculas TO authenticated;

CREATE POLICY peliculas_anon_select_activas
  ON public.peliculas
  FOR SELECT
  TO anon
  USING (activa IS TRUE);

CREATE POLICY peliculas_authenticated_select
  ON public.peliculas
  FOR SELECT
  TO authenticated
  USING (activa IS TRUE OR (SELECT public.rol_actual()) = 'admin');

CREATE POLICY peliculas_admin_insert
  ON public.peliculas
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.rol_actual()) = 'admin');

CREATE POLICY peliculas_admin_update
  ON public.peliculas
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.rol_actual()) = 'admin')
  WITH CHECK ((SELECT public.rol_actual()) = 'admin');

DROP POLICY IF EXISTS "admin ve todos los perfiles" ON public.perfiles;

CREATE POLICY "admin ve todos los perfiles"
  ON public.perfiles
  FOR SELECT
  TO authenticated
  USING ((SELECT public.rol_actual()) = 'admin');

ALTER TABLE public.cupones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.combos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.combo_productos ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.cupones TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.cupones TO authenticated;
GRANT SELECT ON public.combos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.combos TO authenticated;
GRANT SELECT ON public.combo_productos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.combo_productos TO authenticated;

DROP POLICY IF EXISTS cupones_select_activos ON public.cupones;
DROP POLICY IF EXISTS cupones_authenticated_select ON public.cupones;
DROP POLICY IF EXISTS cupones_admin_insert ON public.cupones;
DROP POLICY IF EXISTS cupones_admin_update ON public.cupones;
DROP POLICY IF EXISTS cupones_admin_delete ON public.cupones;

CREATE POLICY cupones_select_activos
  ON public.cupones
  FOR SELECT
  TO anon
  USING (activo IS TRUE);

CREATE POLICY cupones_authenticated_select
  ON public.cupones
  FOR SELECT
  TO authenticated
  USING (activo IS TRUE OR (SELECT public.rol_actual()) = 'admin');

CREATE POLICY cupones_admin_insert
  ON public.cupones
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.rol_actual()) = 'admin');

CREATE POLICY cupones_admin_update
  ON public.cupones
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.rol_actual()) = 'admin')
  WITH CHECK ((SELECT public.rol_actual()) = 'admin');

CREATE POLICY cupones_admin_delete
  ON public.cupones
  FOR DELETE
  TO authenticated
  USING ((SELECT public.rol_actual()) = 'admin');

DROP POLICY IF EXISTS combos_select_activos ON public.combos;
DROP POLICY IF EXISTS combos_authenticated_select ON public.combos;
DROP POLICY IF EXISTS combos_admin_insert ON public.combos;
DROP POLICY IF EXISTS combos_admin_update ON public.combos;
DROP POLICY IF EXISTS combos_admin_delete ON public.combos;

CREATE POLICY combos_select_activos
  ON public.combos
  FOR SELECT
  TO anon
  USING (activo IS TRUE);

CREATE POLICY combos_authenticated_select
  ON public.combos
  FOR SELECT
  TO authenticated
  USING (activo IS TRUE OR (SELECT public.rol_actual()) = 'admin');

CREATE POLICY combos_admin_insert
  ON public.combos
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.rol_actual()) = 'admin');

CREATE POLICY combos_admin_update
  ON public.combos
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.rol_actual()) = 'admin')
  WITH CHECK ((SELECT public.rol_actual()) = 'admin');

CREATE POLICY combos_admin_delete
  ON public.combos
  FOR DELETE
  TO authenticated
  USING ((SELECT public.rol_actual()) = 'admin');

DROP POLICY IF EXISTS combo_productos_select_publico ON public.combo_productos;
DROP POLICY IF EXISTS combo_productos_admin_insert ON public.combo_productos;
DROP POLICY IF EXISTS combo_productos_admin_update ON public.combo_productos;
DROP POLICY IF EXISTS combo_productos_admin_delete ON public.combo_productos;

CREATE POLICY combo_productos_select_publico
  ON public.combo_productos
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY combo_productos_admin_insert
  ON public.combo_productos
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.rol_actual()) = 'admin');

CREATE POLICY combo_productos_admin_update
  ON public.combo_productos
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.rol_actual()) = 'admin')
  WITH CHECK ((SELECT public.rol_actual()) = 'admin');

CREATE POLICY combo_productos_admin_delete
  ON public.combo_productos
  FOR DELETE
  TO authenticated
  USING ((SELECT public.rol_actual()) = 'admin');
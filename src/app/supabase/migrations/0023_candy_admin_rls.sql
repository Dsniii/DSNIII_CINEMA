ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_producto ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.productos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.productos TO authenticated;
GRANT SELECT ON public.categorias_producto TO anon, authenticated;
GRANT INSERT, DELETE ON public.categorias_producto TO authenticated;

DROP POLICY IF EXISTS productos_anon_select_activos ON public.productos;
DROP POLICY IF EXISTS productos_authenticated_select ON public.productos;
DROP POLICY IF EXISTS productos_admin_insert ON public.productos;
DROP POLICY IF EXISTS productos_admin_update ON public.productos;
DROP POLICY IF EXISTS productos_admin_delete ON public.productos;

CREATE POLICY productos_anon_select_activos
  ON public.productos
  FOR SELECT
  TO anon
  USING (activo IS TRUE);

CREATE POLICY productos_authenticated_select
  ON public.productos
  FOR SELECT
  TO authenticated
  USING (activo IS TRUE OR (SELECT public.rol_actual()) = 'admin');

CREATE POLICY productos_admin_insert
  ON public.productos
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.rol_actual()) = 'admin');

CREATE POLICY productos_admin_update
  ON public.productos
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.rol_actual()) = 'admin')
  WITH CHECK ((SELECT public.rol_actual()) = 'admin');

CREATE POLICY productos_admin_delete
  ON public.productos
  FOR DELETE
  TO authenticated
  USING ((SELECT public.rol_actual()) = 'admin');

DROP POLICY IF EXISTS categorias_producto_select_publico ON public.categorias_producto;
DROP POLICY IF EXISTS categorias_producto_admin_insert ON public.categorias_producto;
DROP POLICY IF EXISTS categorias_producto_admin_delete ON public.categorias_producto;

CREATE POLICY categorias_producto_select_publico
  ON public.categorias_producto
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY categorias_producto_admin_insert
  ON public.categorias_producto
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.rol_actual()) = 'admin');

CREATE POLICY categorias_producto_admin_delete
  ON public.categorias_producto
  FOR DELETE
  TO authenticated
  USING ((SELECT public.rol_actual()) = 'admin');
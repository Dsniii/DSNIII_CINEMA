-- El empleado también puede gestionar funciones y el candy bar.
DROP POLICY IF EXISTS funciones_admin_insert ON public.funciones;
DROP POLICY IF EXISTS funciones_admin_update ON public.funciones;
DROP POLICY IF EXISTS funciones_admin_delete ON public.funciones;

CREATE POLICY funciones_admin_insert ON public.funciones FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.rol_actual()) IN ('admin', 'empleado'));
CREATE POLICY funciones_admin_update ON public.funciones FOR UPDATE TO authenticated
  USING ((SELECT public.rol_actual()) IN ('admin', 'empleado'))
  WITH CHECK ((SELECT public.rol_actual()) IN ('admin', 'empleado'));
CREATE POLICY funciones_admin_delete ON public.funciones FOR DELETE TO authenticated
  USING ((SELECT public.rol_actual()) IN ('admin', 'empleado'));

DROP POLICY IF EXISTS productos_authenticated_select ON public.productos;
DROP POLICY IF EXISTS productos_admin_insert ON public.productos;
DROP POLICY IF EXISTS productos_admin_update ON public.productos;
DROP POLICY IF EXISTS productos_admin_delete ON public.productos;

CREATE POLICY productos_authenticated_select ON public.productos FOR SELECT TO authenticated
  USING (activo IS TRUE OR (SELECT public.rol_actual()) IN ('admin', 'empleado'));
CREATE POLICY productos_admin_insert ON public.productos FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.rol_actual()) IN ('admin', 'empleado'));
CREATE POLICY productos_admin_update ON public.productos FOR UPDATE TO authenticated
  USING ((SELECT public.rol_actual()) IN ('admin', 'empleado'))
  WITH CHECK ((SELECT public.rol_actual()) IN ('admin', 'empleado'));
CREATE POLICY productos_admin_delete ON public.productos FOR DELETE TO authenticated
  USING ((SELECT public.rol_actual()) IN ('admin', 'empleado'));

DROP POLICY IF EXISTS categorias_producto_admin_insert ON public.categorias_producto;
DROP POLICY IF EXISTS categorias_producto_admin_delete ON public.categorias_producto;

CREATE POLICY categorias_producto_admin_insert ON public.categorias_producto FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.rol_actual()) IN ('admin', 'empleado'));
CREATE POLICY categorias_producto_admin_delete ON public.categorias_producto FOR DELETE TO authenticated
  USING ((SELECT public.rol_actual()) IN ('admin', 'empleado'));

GRANT INSERT, UPDATE, DELETE ON public.recompensas TO authenticated;
DROP POLICY IF EXISTS recompensas_personal_insert ON public.recompensas;
DROP POLICY IF EXISTS recompensas_personal_update ON public.recompensas;
DROP POLICY IF EXISTS recompensas_personal_delete ON public.recompensas;

CREATE POLICY recompensas_personal_insert ON public.recompensas FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.rol_actual()) IN ('admin', 'empleado'));
CREATE POLICY recompensas_personal_update ON public.recompensas FOR UPDATE TO authenticated
  USING ((SELECT public.rol_actual()) IN ('admin', 'empleado'))
  WITH CHECK ((SELECT public.rol_actual()) IN ('admin', 'empleado'));
CREATE POLICY recompensas_personal_delete ON public.recompensas FOR DELETE TO authenticated
  USING ((SELECT public.rol_actual()) IN ('admin', 'empleado'));

NOTIFY pgrst, 'reload schema';
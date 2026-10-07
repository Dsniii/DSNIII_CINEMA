-- El empleado también registra su actividad (funciones y candy) y solo a su nombre.
DROP POLICY IF EXISTS log_actividad_admin_insert ON public.log_actividad;
CREATE POLICY log_actividad_admin_insert
  ON public.log_actividad
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT public.rol_actual()) IN ('admin', 'empleado')
    AND usuario_id = (SELECT auth.uid())
  );

NOTIFY pgrst, 'reload schema';
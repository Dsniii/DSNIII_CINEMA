-- Pestaña Actividad: el admin puede leer el registro de auditoría completo.
-- (Los inserts ya los cubren 0035 y 0036; esta migración agrega la lectura.)
ALTER TABLE public.log_actividad ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.log_actividad TO authenticated;

DROP POLICY IF EXISTS log_actividad_admin_select ON public.log_actividad;
CREATE POLICY log_actividad_admin_select
  ON public.log_actividad
  FOR SELECT
  TO authenticated
  USING ((SELECT public.rol_actual()) = 'admin');

-- Orden y paginación por fecha, de lo más nuevo a lo más viejo.
CREATE INDEX IF NOT EXISTS log_actividad_fecha_hora_idx
  ON public.log_actividad (fecha_hora DESC);

NOTIFY pgrst, 'reload schema';

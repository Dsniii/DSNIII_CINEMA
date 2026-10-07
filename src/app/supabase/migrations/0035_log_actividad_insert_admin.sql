-- Permite que un admin inserte sus propios registros de auditoría desde el
-- cliente (admin-productos, gestion-funciones). El default de usuario_id
-- evita que el front tenga que mandar auth.uid() a mano en cada insert.
ALTER TABLE public.log_actividad ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.log_actividad ALTER COLUMN usuario_id SET DEFAULT auth.uid();

GRANT INSERT ON public.log_actividad TO authenticated;

DROP POLICY IF EXISTS log_actividad_admin_insert ON public.log_actividad;
CREATE POLICY log_actividad_admin_insert
  ON public.log_actividad
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.rol_actual()) = 'admin');

NOTIFY pgrst, 'reload schema';

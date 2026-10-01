GRANT UPDATE ON public.salas TO authenticated;
GRANT DELETE ON public.butacas TO authenticated;

CREATE POLICY salas_admin_update
  ON public.salas
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.rol_actual()) = 'admin')
  WITH CHECK ((SELECT public.rol_actual()) = 'admin');

CREATE POLICY butacas_admin_delete
  ON public.butacas
  FOR DELETE
  TO authenticated
  USING ((SELECT public.rol_actual()) = 'admin');

CREATE OR REPLACE FUNCTION public.eliminar_sala_con_butacas(p_sala_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF (SELECT public.rol_actual()) IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Solo un administrador puede eliminar salas'
      USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.butacas
  WHERE sala_id::text = p_sala_id;

  DELETE FROM public.salas
  WHERE id::text = p_sala_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No existe la sala solicitada'
      USING ERRCODE = 'P0002';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.eliminar_sala_con_butacas(text) TO authenticated;

-- La tabla public.canjes ya existe (id, usuario_id, recompensa_id, puntos_utilizados, fecha, qr_code uuid, entregado).
ALTER TABLE public.canjes ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.canjes TO authenticated;

DROP POLICY IF EXISTS canjes_select_propio ON public.canjes;

CREATE POLICY canjes_select_propio
  ON public.canjes
  FOR SELECT
  TO authenticated
  USING (usuario_id = (SELECT auth.uid()) OR (SELECT public.rol_actual()) IN ('admin', 'empleado'));

DROP FUNCTION IF EXISTS public.canjear_recompensa(uuid);

-- Resta los puntos y registra el canje en una sola transacción.
CREATE FUNCTION public.canjear_recompensa(p_recompensa_id uuid)
RETURNS TABLE (
  canje_id uuid,
  qr_code text,
  fecha timestamptz,
  puntos_utilizados integer,
  puntos_restantes integer,
  recompensa_nombre text,
  recompensa_tipo text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_usuario uuid := (SELECT auth.uid());
  v_recompensa public.recompensas%ROWTYPE;
  v_puntos integer;
  v_canje public.canjes%ROWTYPE;
BEGIN
  IF v_usuario IS NULL THEN
    RAISE EXCEPTION 'Debés iniciar sesión para canjear.';
  END IF;

  SELECT * INTO v_recompensa FROM public.recompensas r WHERE r.id = p_recompensa_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La recompensa no existe.';
  END IF;

  SELECT p.puntos_fidelizacion INTO v_puntos
  FROM public.perfiles p
  WHERE p.id = v_usuario
  FOR UPDATE;

  IF COALESCE(v_puntos, 0) < v_recompensa.costo_puntos THEN
    RAISE EXCEPTION 'No tenés puntos suficientes.';
  END IF;

  UPDATE public.perfiles p
  SET puntos_fidelizacion = v_puntos - v_recompensa.costo_puntos
  WHERE p.id = v_usuario;

  INSERT INTO public.canjes (usuario_id, recompensa_id, puntos_utilizados)
  VALUES (v_usuario, v_recompensa.id, v_recompensa.costo_puntos)
  RETURNING * INTO v_canje;

  RETURN QUERY SELECT
    v_canje.id,
    v_canje.qr_code::text,
    v_canje.fecha,
    v_canje.puntos_utilizados,
    v_puntos - v_recompensa.costo_puntos,
    v_recompensa.nombre::text,
    v_recompensa.tipo::text;
END;
$$;

REVOKE ALL ON FUNCTION public.canjear_recompensa(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.canjear_recompensa(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
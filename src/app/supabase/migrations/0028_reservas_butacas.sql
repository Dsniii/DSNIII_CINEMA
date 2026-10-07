-- Selección de butacas: lectura pública del mapa, reservas únicas por butaca,
-- Realtime y reserva atómica de 5 minutos.

-- 1. El mapa de butacas y el nombre de la sala los puede leer cualquiera.
GRANT SELECT ON public.salas, public.butacas TO anon, authenticated;

DROP POLICY IF EXISTS butacas_select_publico ON public.butacas;
CREATE POLICY butacas_select_publico
  ON public.butacas
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS salas_select_publico ON public.salas;
CREATE POLICY salas_select_publico
  ON public.salas
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 2. Una butaca no puede estar reservada dos veces en la misma función.
--    Si falla por filas duplicadas, borrá primero las reservas repetidas.
GRANT SELECT ON public.reservas_temporales TO anon, authenticated;
GRANT INSERT, DELETE ON public.reservas_temporales TO authenticated;

CREATE UNIQUE INDEX IF NOT EXISTS reservas_temporales_funcion_butaca_uk
  ON public.reservas_temporales (funcion_id, butaca_id);

CREATE INDEX IF NOT EXISTS reservas_temporales_expira_en_idx
  ON public.reservas_temporales (expira_en);

-- 3. Realtime: los cambios de la tabla llegan en vivo a quienes miran la función.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'reservas_temporales'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reservas_temporales;
  END IF;
END
$$;

-- 4. Reserva atómica. El vencimiento (5 minutos) lo fija la base, no el navegador.
--    Primero limpia las reservas vencidas de la función y las anteriores del mismo usuario;
--    si otra persona ganó alguna butaca, el índice único hace fallar todo (23505).
CREATE OR REPLACE FUNCTION public.reservar_butacas(p_funcion_id uuid, p_butacas uuid[])
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_usuario uuid := auth.uid();
  v_butacas uuid[] := ARRAY(SELECT DISTINCT unnest(p_butacas));
  v_expira timestamptz := now() + interval '5 minutes';
BEGIN
  IF v_usuario IS NULL THEN
    RAISE EXCEPTION 'Necesitás iniciar sesión para reservar butacas'
      USING ERRCODE = '28000';
  END IF;

  IF coalesce(array_length(v_butacas, 1), 0) = 0 THEN
    RAISE EXCEPTION 'No se indicaron butacas'
      USING ERRCODE = '22023';
  END IF;

  -- Las butacas tienen que ser de la sala donde se proyecta la función.
  IF (
    SELECT count(*)
    FROM public.butacas b
    JOIN public.funciones f ON f.sala_id = b.sala_id
    WHERE f.id = p_funcion_id
      AND b.id = ANY (v_butacas)
  ) <> array_length(v_butacas, 1) THEN
    RAISE EXCEPTION 'Las butacas no corresponden a la función'
      USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.reservas_temporales
  WHERE funcion_id = p_funcion_id
    AND (expira_en <= now() OR usuario_id = v_usuario);

  INSERT INTO public.reservas_temporales (id, funcion_id, butaca_id, usuario_id, creado_en, expira_en)
  SELECT gen_random_uuid(), p_funcion_id, b, v_usuario, now(), v_expira
  FROM unnest(v_butacas) AS b;

  RETURN v_expira;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Alguna de las butacas ya fue reservada por otra persona'
      USING ERRCODE = '23505';
END;
$$;

REVOKE ALL ON FUNCTION public.reservar_butacas(uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reservar_butacas(uuid, uuid[]) TO authenticated;

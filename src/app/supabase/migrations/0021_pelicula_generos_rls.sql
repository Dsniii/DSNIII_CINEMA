ALTER TABLE public.generos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pelicula_generos ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.generos TO anon, authenticated;
GRANT SELECT ON public.pelicula_generos TO anon, authenticated;
GRANT INSERT, DELETE ON public.pelicula_generos TO authenticated;

CREATE POLICY generos_select_publico
  ON public.generos
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY pelicula_generos_select_publico
  ON public.pelicula_generos
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY pelicula_generos_insert_admin
  ON public.pelicula_generos
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.rol_actual()) = 'admin');

CREATE POLICY pelicula_generos_delete_admin
  ON public.pelicula_generos
  FOR DELETE
  TO authenticated
  USING ((SELECT public.rol_actual()) = 'admin');

CREATE OR REPLACE FUNCTION public.reemplazar_generos_pelicula(
  p_pelicula_id uuid,
  p_genero_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF (SELECT public.rol_actual()) IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Solo un administrador puede modificar los géneros de películas'
      USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.pelicula_generos
  WHERE pelicula_id = p_pelicula_id;

  INSERT INTO public.pelicula_generos (pelicula_id, genero_id)
  SELECT p_pelicula_id, seleccion.genero_id
  FROM unnest(COALESCE(p_genero_ids, ARRAY[]::uuid[])) AS seleccion(genero_id);
END;
$$;

REVOKE ALL ON FUNCTION public.reemplazar_generos_pelicula(uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reemplazar_generos_pelicula(uuid, uuid[]) TO authenticated;

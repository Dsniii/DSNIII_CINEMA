CREATE OR REPLACE FUNCTION public.rol_actual()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
  SELECT perfiles.rol::text
  FROM public.perfiles
  WHERE perfiles.id = (SELECT auth.uid())
  LIMIT 1
$$;

ALTER FUNCTION public.rol_actual() OWNER TO postgres;

REVOKE ALL ON FUNCTION public.rol_actual() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rol_actual() TO authenticated;

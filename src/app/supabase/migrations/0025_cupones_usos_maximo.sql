ALTER TABLE public.cupones
  ADD COLUMN IF NOT EXISTS usos_maximo integer;

NOTIFY pgrst, 'reload schema';
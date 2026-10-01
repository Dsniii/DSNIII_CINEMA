ALTER TABLE public.butacas
  ALTER COLUMN fila TYPE integer
    USING CASE
      WHEN upper(btrim(fila::text)) ~ '^[A-T]$'
        THEN ascii(upper(btrim(fila::text))) - ascii('A') + 1
      ELSE btrim(fila::text)::integer
    END;

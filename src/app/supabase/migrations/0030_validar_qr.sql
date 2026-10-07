-- Validación de QR (entradas, productos y canjes) para empleados y admin.
-- Busca el código en `entradas`, `compra_productos` y `canjes`; si no está validado lo marca
-- (validada/validado = true con fecha actual; en canjes, entregado = true). El UPDATE es atómico: dos escaneos simultáneos del mismo QR
-- nunca validan dos veces.
--
-- Devuelve jsonb:
--   resultado: 'validado' | 'ya_validado' | 'no_encontrado' | 'codigo_invalido'
--   tipo: 'entrada' | 'producto' | 'canje' (si se encontró)
--   fecha_validacion: instante de la validación (la actual, o la anterior si ya estaba validado).
--                     Los canjes no guardan fecha de entrega, así que viene NULL.
--   datos: detalle para mostrar en pantalla

DROP FUNCTION IF EXISTS public.validar_qr(text);

CREATE FUNCTION public.validar_qr(p_codigo text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_codigo uuid;
  v_entrada record;
  v_producto record;
  v_canje record;
  v_resultado text;
  v_datos jsonb;
BEGIN
  IF coalesce(public.rol_actual(), '') NOT IN ('admin', 'empleado') THEN
    RAISE EXCEPTION 'No tenés permiso para validar códigos.' USING ERRCODE = '42501';
  END IF;

  BEGIN
    v_codigo := btrim(p_codigo)::uuid;
  EXCEPTION
    WHEN invalid_text_representation THEN
      RETURN jsonb_build_object('resultado', 'codigo_invalido');
  END;

  -- ---------- Entradas ----------
  UPDATE public.entradas e
  SET validada = true, fecha_validacion = now()
  WHERE e.qr_code = v_codigo AND e.validada IS NOT TRUE
  RETURNING e.funcion_id, e.butaca_id, e.fecha_validacion INTO v_entrada;

  IF FOUND THEN
    v_resultado := 'validado';
  ELSE
    SELECT e.funcion_id, e.butaca_id, e.fecha_validacion INTO v_entrada
    FROM public.entradas e
    WHERE e.qr_code = v_codigo;
    IF FOUND THEN
      v_resultado := 'ya_validado';
    END IF;
  END IF;

  IF v_resultado IS NOT NULL THEN
    SELECT jsonb_build_object(
      'pelicula', p.nombre,
      'sala', s.nombre,
      'fecha', f.fecha,
      'hora_inicio', f.hora_inicio,
      'butaca', chr(64 + b.fila) || b.columna
    )
    INTO v_datos
    FROM public.funciones f
    JOIN public.peliculas p ON p.id = f.pelicula_id
    JOIN public.salas s ON s.id = f.sala_id
    JOIN public.butacas b ON b.id = v_entrada.butaca_id
    WHERE f.id = v_entrada.funcion_id;

    RETURN jsonb_build_object(
      'resultado', v_resultado,
      'tipo', 'entrada',
      'fecha_validacion', v_entrada.fecha_validacion,
      'datos', v_datos
    );
  END IF;

  -- ---------- Productos ----------
  UPDATE public.compra_productos cp
  SET validado = true, fecha_validacion = now()
  WHERE cp.qr_code = v_codigo AND cp.validado IS NOT TRUE
  RETURNING cp.producto_id, cp.combo_id, cp.cantidad, cp.fecha_validacion INTO v_producto;

  IF FOUND THEN
    v_resultado := 'validado';
  ELSE
    SELECT cp.producto_id, cp.combo_id, cp.cantidad, cp.fecha_validacion INTO v_producto
    FROM public.compra_productos cp
    WHERE cp.qr_code = v_codigo;
    IF FOUND THEN
      v_resultado := 'ya_validado';
    END IF;
  END IF;

  IF v_resultado IS NOT NULL THEN
    v_datos := jsonb_build_object(
      'producto', coalesce(
        (SELECT pr.nombre FROM public.productos pr WHERE pr.id = v_producto.producto_id),
        (SELECT c.nombre FROM public.combos c WHERE c.id = v_producto.combo_id)
      ),
      'cantidad', v_producto.cantidad
    );

    RETURN jsonb_build_object(
      'resultado', v_resultado,
      'tipo', 'producto',
      'fecha_validacion', v_producto.fecha_validacion,
      'datos', v_datos
    );
  END IF;

  -- ---------- Canjes (productos canjeados con puntos) ----------
  UPDATE public.canjes c
  SET entregado = true
  WHERE c.qr_code = v_codigo AND c.entregado IS NOT TRUE
  RETURNING c.recompensa_id, c.puntos_utilizados, c.fecha INTO v_canje;

  IF FOUND THEN
    v_resultado := 'validado';
  ELSE
    SELECT c.recompensa_id, c.puntos_utilizados, c.fecha INTO v_canje
    FROM public.canjes c
    WHERE c.qr_code = v_codigo;
    IF FOUND THEN
      v_resultado := 'ya_validado';
    END IF;
  END IF;

  IF v_resultado IS NOT NULL THEN
    v_datos := jsonb_build_object(
      'recompensa', (SELECT r.nombre FROM public.recompensas r WHERE r.id = v_canje.recompensa_id),
      'producto', (
        SELECT pr.nombre
        FROM public.recompensas r
        JOIN public.productos pr ON pr.id = r.producto_id
        WHERE r.id = v_canje.recompensa_id
      ),
      'puntos', v_canje.puntos_utilizados,
      'fecha_canje', v_canje.fecha
    );

    RETURN jsonb_build_object(
      'resultado', v_resultado,
      'tipo', 'canje',
      'fecha_validacion', NULL,
      'datos', v_datos
    );
  END IF;

  RETURN jsonb_build_object('resultado', 'no_encontrado');
END;
$$;

REVOKE ALL ON FUNCTION public.validar_qr(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validar_qr(text) TO authenticated;

NOTIFY pgrst, 'reload schema';
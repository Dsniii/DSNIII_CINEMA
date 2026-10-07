-- Redefine validar_qr: log_actividad.entidad es NOT NULL y no se estaba
-- completando. Se agrega entidad (la tabla afectada) y entidad_id (la fila
-- exacta) a cada INSERT, además de accion/detalle.
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
  v_detalle text;
BEGIN
  IF coalesce(public.rol_actual(), '') NOT IN ('admin', 'empleado') THEN
    RAISE EXCEPTION 'No tenés permiso para validar códigos.' USING ERRCODE = '42501';
  END IF;

  BEGIN
    v_codigo := btrim(p_codigo)::uuid;
  EXCEPTION
    WHEN invalid_text_representation THEN
      INSERT INTO public.log_actividad (usuario_id, accion, entidad, entidad_id, detalle)
      VALUES (auth.uid(), 'validar_qr_invalido', 'validacion_qr', NULL, format('Código escaneado no es un QR válido: %s', p_codigo));
      RETURN jsonb_build_object('resultado', 'codigo_invalido');
  END;

  -- ---------- Entradas ----------
  UPDATE public.entradas e
  SET validada = true, fecha_validacion = now()
  WHERE e.qr_code = v_codigo AND e.validada IS NOT TRUE
  RETURNING e.id, e.funcion_id, e.butaca_id, e.fecha_validacion INTO v_entrada;

  IF FOUND THEN
    v_resultado := 'validado';
  ELSE
    SELECT e.id, e.funcion_id, e.butaca_id, e.fecha_validacion INTO v_entrada
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

    v_detalle := format(
      '%s: %s · %s · Butaca %s',
      CASE WHEN v_resultado = 'validado' THEN 'Entrada validada' ELSE 'Intento de revalidar entrada ya usada' END,
      v_datos->>'pelicula', v_datos->>'sala', v_datos->>'butaca'
    );
    INSERT INTO public.log_actividad (usuario_id, accion, entidad, entidad_id, detalle)
    VALUES (
      auth.uid(),
      CASE WHEN v_resultado = 'validado' THEN 'validar_entrada' ELSE 'validar_entrada_rechazada' END,
      'entradas',
      v_entrada.id,
      v_detalle
    );

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
  RETURNING cp.id, cp.producto_id, cp.combo_id, cp.cantidad, cp.fecha_validacion INTO v_producto;

  IF FOUND THEN
    v_resultado := 'validado';
  ELSE
    SELECT cp.id, cp.producto_id, cp.combo_id, cp.cantidad, cp.fecha_validacion INTO v_producto
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

    v_detalle := format(
      '%s: %s x%s',
      CASE WHEN v_resultado = 'validado' THEN 'Producto entregado' ELSE 'Intento de reentregar producto ya entregado' END,
      coalesce(v_datos->>'producto', 'Producto sin nombre'),
      v_datos->>'cantidad'
    );
    INSERT INTO public.log_actividad (usuario_id, accion, entidad, entidad_id, detalle)
    VALUES (
      auth.uid(),
      CASE WHEN v_resultado = 'validado' THEN 'validar_producto' ELSE 'validar_producto_rechazada' END,
      'compra_productos',
      v_producto.id,
      v_detalle
    );

    RETURN jsonb_build_object(
      'resultado', v_resultado,
      'tipo', 'producto',
      'fecha_validacion', v_producto.fecha_validacion,
      'datos', v_datos
    );
  END IF;

  -- ---------- Canjes (productos/entradas canjeados con puntos) ----------
  UPDATE public.canjes c
  SET entregado = true
  WHERE c.qr_code = v_codigo AND c.entregado IS NOT TRUE
  RETURNING c.id, c.recompensa_id, c.puntos_utilizados, c.fecha INTO v_canje;

  IF FOUND THEN
    v_resultado := 'validado';
  ELSE
    SELECT c.id, c.recompensa_id, c.puntos_utilizados, c.fecha INTO v_canje
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

    v_detalle := format(
      '%s: %s',
      CASE WHEN v_resultado = 'validado' THEN 'Canje entregado' ELSE 'Intento de reentregar canje ya entregado' END,
      coalesce(v_datos->>'recompensa', 'Recompensa sin nombre')
    );
    INSERT INTO public.log_actividad (usuario_id, accion, entidad, entidad_id, detalle)
    VALUES (
      auth.uid(),
      CASE WHEN v_resultado = 'validado' THEN 'entregar_canje' ELSE 'entregar_canje_rechazada' END,
      'canjes',
      v_canje.id,
      v_detalle
    );

    RETURN jsonb_build_object(
      'resultado', v_resultado,
      'tipo', 'canje',
      'fecha_validacion', NULL,
      'datos', v_datos
    );
  END IF;

  INSERT INTO public.log_actividad (usuario_id, accion, entidad, entidad_id, detalle)
  VALUES (auth.uid(), 'validar_qr_no_encontrado', 'validacion_qr', NULL, format('Código escaneado no corresponde a nada: %s', v_codigo));

  RETURN jsonb_build_object('resultado', 'no_encontrado');
END;
$$;

REVOKE ALL ON FUNCTION public.validar_qr(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validar_qr(text) TO authenticated;

NOTIFY pgrst, 'reload schema';
-- Confirmación de compra: todo en una sola transacción.
--  * Crea la compra, las entradas, los productos pagados con dinero y los canjes por puntos.
--  * Valida precios, cupón (usos por usuario), puntos y crédito en la base (no se confía en el navegador).
--  * Descuenta puntos y crédito del perfil recién al final.
--  * Las reservas de butacas confirmadas quedan sin vencimiento (expira_en = 9999-12-31).

-- 1. reservar_butacas: nunca borra ni pisa las reservas ya confirmadas (sin vencimiento).
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

  -- Solo se limpian reservas temporales; las confirmadas (sin vencimiento) se conservan.
  DELETE FROM public.reservas_temporales
  WHERE funcion_id = p_funcion_id
    AND expira_en < '9999-01-01 00:00:00+00'
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

-- 2. Cada usuario puede leer sus propios usos de cupones (el checkout los consulta
--    para avisar antes de confirmar). Los inserts los hace confirmar_compra.
ALTER TABLE public.cupones_usuarios ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.cupones_usuarios TO authenticated;

DROP POLICY IF EXISTS cupones_usuarios_select_propio ON public.cupones_usuarios;
CREATE POLICY cupones_usuarios_select_propio
  ON public.cupones_usuarios
  FOR SELECT
  TO authenticated
  USING (usuario_id = (SELECT auth.uid()) OR (SELECT public.rol_actual()) IN ('admin', 'empleado'));

-- 3. Confirmar compra.
--    p_items: [{"producto_id": "...", "cantidad": 2, "metodo": "dinero" | "puntos"}]
DROP FUNCTION IF EXISTS public.confirmar_compra(uuid, uuid[], jsonb, uuid, numeric);
DROP FUNCTION IF EXISTS public.confirmar_compra(uuid, uuid[], jsonb, uuid, numeric, integer);

CREATE FUNCTION public.confirmar_compra(
  p_funcion_id uuid DEFAULT NULL,
  p_butacas uuid[] DEFAULT '{}',
  p_items jsonb DEFAULT '[]'::jsonb,
  p_cupon_id uuid DEFAULT NULL,
  p_credito numeric DEFAULT 0,
  p_entradas_canje integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  -- AJUSTAR si tus columnas tienen un CHECK con otros valores.
  c_estado CONSTANT text := 'confirmada';
  c_sin_vencimiento CONSTANT timestamptz := '9999-12-31 23:59:59+00';
  -- Recompensa "Entrada gratis" (tabla recompensas, producto_id NULL), buscada por nombre.
  -- Solo se puede canjear por entradas comunes.
  c_nombre_recompensa_entrada CONSTANT text := 'entrada gratis';

  v_usuario uuid := (SELECT auth.uid());
  v_butacas uuid[] := ARRAY(SELECT DISTINCT unnest(coalesce(p_butacas, '{}'::uuid[])));
  v_credito_pedido numeric := round(coalesce(p_credito, 0), 2);

  v_puntos integer;
  v_saldo numeric;
  v_funcion public.funciones%ROWTYPE;
  v_cupon public.cupones%ROWTYPE;
  v_compra public.compras%ROWTYPE;
  v_canje public.canjes%ROWTYPE;
  v_producto public.productos%ROWTYPE;
  v_recompensa public.recompensas%ROWTYPE;
  v_butaca record;
  v_item jsonb;

  v_sub_entradas numeric := 0;
  v_sub_productos numeric := 0;
  v_subtotal numeric;
  v_descuento numeric := 0;
  v_base numeric;
  v_total numeric;
  v_puntos_usar integer := 0;
  v_puntos_ganados integer := 0;

  v_n_canje integer := coalesce(p_entradas_canje, 0);
  v_butacas_canje uuid[] := '{}';
  v_rec_entrada public.recompensas%ROWTYPE;
  v_precio_normal numeric;
  v_es_canje boolean;

  v_cantidad integer;
  v_metodo text;
  v_precio numeric;
  v_qr uuid;
  i integer;

  v_entradas jsonb := '[]'::jsonb;
  v_productos jsonb := '[]'::jsonb;
  v_canjes jsonb := '[]'::jsonb;
BEGIN
  IF v_usuario IS NULL THEN
    RAISE EXCEPTION 'Debés iniciar sesión para confirmar la compra.' USING ERRCODE = '28000';
  END IF;

  -- Bloquea el perfil hasta el final de la transacción (evita doble gasto).
  SELECT p.puntos_fidelizacion, p.credito INTO v_puntos, v_saldo
  FROM public.perfiles p
  WHERE p.id = v_usuario
  FOR UPDATE;
  v_puntos := coalesce(v_puntos, 0);
  v_saldo := coalesce(v_saldo, 0);

  -- ---------- Entradas ----------
  IF v_n_canje < 0 OR (v_n_canje > 0 AND coalesce(array_length(v_butacas, 1), 0) = 0) THEN
    RAISE EXCEPTION 'Cantidad de entradas a canjear inválida.' USING ERRCODE = '22023';
  END IF;

  IF coalesce(array_length(v_butacas, 1), 0) > 0 THEN
    SELECT * INTO v_funcion FROM public.funciones f WHERE f.id = p_funcion_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'La función no existe.' USING ERRCODE = '22023';
    END IF;

    IF (
      SELECT count(*) FROM public.butacas b
      WHERE b.sala_id = v_funcion.sala_id AND b.id = ANY (v_butacas)
    ) <> array_length(v_butacas, 1) THEN
      RAISE EXCEPTION 'Las butacas no corresponden a la función.' USING ERRCODE = '22023';
    END IF;

    -- La reserva de 5 minutos tiene que seguir vigente y ser de este usuario.
    IF (
      SELECT count(*) FROM public.reservas_temporales r
      WHERE r.funcion_id = p_funcion_id
        AND r.usuario_id = v_usuario
        AND r.butaca_id = ANY (v_butacas)
        AND r.expira_en > now()
    ) <> array_length(v_butacas, 1) THEN
      RAISE EXCEPTION 'Tu reserva de butacas venció. Volvé a elegirlas.' USING ERRCODE = '55000';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.entradas e
      WHERE e.funcion_id = p_funcion_id AND e.butaca_id = ANY (v_butacas)
    ) THEN
      RAISE EXCEPTION 'Alguna de las butacas ya fue vendida.' USING ERRCODE = '23505';
    END IF;

    SELECT coalesce(sum(
      CASE
        WHEN v_funcion.en_preventa THEN v_funcion.precio_preventa
        WHEN b.tipo = 'vip' THEN v_funcion.precio_vip
        ELSE v_funcion.precio_base
      END
    ), 0)
    INTO v_sub_entradas
    FROM public.butacas b
    WHERE b.id = ANY (v_butacas);

    -- Entradas gratis canjeadas con puntos: solo butacas NO VIP (normal o accesible).
    IF v_n_canje > 0 THEN
      SELECT * INTO v_rec_entrada
      FROM public.recompensas r
      WHERE lower(btrim(r.nombre)) = c_nombre_recompensa_entrada
      LIMIT 1;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'La recompensa de entrada gratis no está disponible.' USING ERRCODE = '22023';
      END IF;

      v_butacas_canje := ARRAY(
        SELECT b.id FROM public.butacas b
        WHERE b.id = ANY (v_butacas) AND b.tipo <> 'vip'
        ORDER BY b.fila, b.columna
        LIMIT v_n_canje
      );
      IF coalesce(array_length(v_butacas_canje, 1), 0) < v_n_canje THEN
        RAISE EXCEPTION 'La entrada gratis solo se puede canjear por entradas comunes (no VIP).'
          USING ERRCODE = '22023';
      END IF;

      v_precio_normal := CASE WHEN v_funcion.en_preventa THEN v_funcion.precio_preventa ELSE v_funcion.precio_base END;
      v_sub_entradas := v_sub_entradas - v_precio_normal * v_n_canje;
      v_puntos_usar := v_puntos_usar + v_rec_entrada.costo_puntos * v_n_canje;
    END IF;
  END IF;

  -- ---------- Productos (primera pasada: validar y sumar) ----------
  FOR v_item IN SELECT e FROM jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) AS e LOOP
    v_cantidad := (v_item ->> 'cantidad')::integer;
    v_metodo := coalesce(v_item ->> 'metodo', 'dinero');
    IF v_cantidad IS NULL OR v_cantidad <= 0 OR v_metodo NOT IN ('dinero', 'puntos') THEN
      RAISE EXCEPTION 'Hay un producto inválido en el carrito.' USING ERRCODE = '22023';
    END IF;

    SELECT * INTO v_producto
    FROM public.productos p
    WHERE p.id = (v_item ->> 'producto_id')::uuid AND p.activo IS TRUE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Un producto del carrito ya no está disponible.' USING ERRCODE = '22023';
    END IF;

    IF v_metodo = 'puntos' THEN
      SELECT * INTO v_recompensa
      FROM public.recompensas r
      WHERE r.tipo = 'producto' AND r.producto_id = v_producto.id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'El producto "%" no se puede canjear con puntos.', v_producto.nombre
          USING ERRCODE = '22023';
      END IF;
      v_puntos_usar := v_puntos_usar + v_recompensa.costo_puntos * v_cantidad;
    ELSE
      v_sub_productos := v_sub_productos + v_producto.precio * v_cantidad;
    END IF;
  END LOOP;

  v_subtotal := v_sub_entradas + v_sub_productos;

  IF v_subtotal = 0 AND v_puntos_usar = 0 THEN
    RAISE EXCEPTION 'No hay nada para comprar.' USING ERRCODE = '22023';
  END IF;

  -- ---------- Cupón ----------
  IF p_cupon_id IS NOT NULL THEN
    SELECT * INTO v_cupon FROM public.cupones c WHERE c.id = p_cupon_id;
    IF NOT FOUND OR v_cupon.activo IS NOT TRUE THEN
      RAISE EXCEPTION 'El cupón no existe o no está activo.' USING ERRCODE = '22023';
    END IF;
    IF v_cupon.fecha_inicio IS NOT NULL AND current_date < v_cupon.fecha_inicio THEN
      RAISE EXCEPTION 'El cupón todavía no está vigente.' USING ERRCODE = '22023';
    END IF;
    IF v_cupon.fecha_fin IS NOT NULL AND current_date > v_cupon.fecha_fin THEN
      RAISE EXCEPTION 'El cupón está vencido.' USING ERRCODE = '22023';
    END IF;
    -- usos_maximo es el límite POR USUARIO; los usos se cuentan en cupones_usuarios.
    IF v_cupon.usos_maximo IS NOT NULL
       AND (
         SELECT count(*) FROM public.cupones_usuarios cu
         WHERE cu.cupon_id = v_cupon.id AND cu.usuario_id = v_usuario
       ) >= v_cupon.usos_maximo THEN
      RAISE EXCEPTION 'Ya usaste este cupón el máximo de veces permitido.' USING ERRCODE = '22023';
    END IF;
    v_descuento := round(v_subtotal * least(100, greatest(0, v_cupon.porcentaje_descuento)) / 100, 2);
  END IF;

  v_base := greatest(0, v_subtotal - v_descuento);

  -- ---------- Crédito y puntos ----------
  IF v_credito_pedido < 0 OR v_credito_pedido > v_saldo OR v_credito_pedido > v_base THEN
    RAISE EXCEPTION 'El crédito indicado supera tu saldo o el total a pagar.' USING ERRCODE = '22023';
  END IF;
  IF v_puntos_usar > v_puntos THEN
    RAISE EXCEPTION 'No tenés puntos suficientes.' USING ERRCODE = '22023';
  END IF;

  v_total := v_base - v_credito_pedido;

  -- ---------- Compra ----------
  INSERT INTO public.compras
    (usuario_id, fecha_hora, cupon_id, subtotal, descuento_cupon, credito_utilizado, total, metodo_pago, estado)
  VALUES
    (v_usuario, now(), p_cupon_id, v_subtotal, v_descuento, v_credito_pedido, v_total,
     CASE WHEN v_total = 0 THEN 'credito' ELSE 'tarjeta' END, c_estado)
  RETURNING * INTO v_compra;

  -- Registra el uso del cupón para este usuario.
  IF p_cupon_id IS NOT NULL THEN
    INSERT INTO public.cupones_usuarios (id, cupon_id, usuario_id, fecha_uso)
    VALUES (gen_random_uuid(), p_cupon_id, v_usuario, now());
  END IF;

  -- Entradas
  IF coalesce(array_length(v_butacas, 1), 0) > 0 THEN
    FOR v_butaca IN SELECT b.id, b.tipo FROM public.butacas b WHERE b.id = ANY (v_butacas) LOOP
      v_es_canje := v_butaca.id = ANY (v_butacas_canje);
      v_precio := CASE
        WHEN v_es_canje THEN 0
        WHEN v_funcion.en_preventa THEN v_funcion.precio_preventa
        WHEN v_butaca.tipo = 'vip' THEN v_funcion.precio_vip
        ELSE v_funcion.precio_base
      END;
      v_qr := gen_random_uuid();

      IF v_es_canje THEN
        -- Queda registrado el canje (ya entregado: la entrada misma lleva su QR).
        INSERT INTO public.canjes (usuario_id, recompensa_id, puntos_utilizados, entregado)
        VALUES (v_usuario, v_rec_entrada.id, v_rec_entrada.costo_puntos, true);
      END IF;
      INSERT INTO public.entradas (id, compra_id, funcion_id, butaca_id, precio, qr_code, validada)
      VALUES (gen_random_uuid(), v_compra.id, p_funcion_id, v_butaca.id, v_precio, v_qr, false);
      v_entradas := v_entradas || jsonb_build_array(jsonb_build_object(
        'butaca_id', v_butaca.id, 'precio', v_precio, 'qr_code', v_qr::text, 'canjeada', v_es_canje));
    END LOOP;

    -- Las reservas confirmadas ya no vencen: la butaca queda tomada para siempre.
    UPDATE public.reservas_temporales r
    SET expira_en = c_sin_vencimiento
    WHERE r.funcion_id = p_funcion_id
      AND r.usuario_id = v_usuario
      AND r.butaca_id = ANY (v_butacas);
  END IF;

  -- Productos (segunda pasada: insertar)
  FOR v_item IN SELECT e FROM jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) AS e LOOP
    v_cantidad := (v_item ->> 'cantidad')::integer;
    v_metodo := coalesce(v_item ->> 'metodo', 'dinero');
    SELECT * INTO v_producto FROM public.productos p WHERE p.id = (v_item ->> 'producto_id')::uuid;

    IF v_metodo = 'puntos' THEN
      SELECT * INTO v_recompensa
      FROM public.recompensas r
      WHERE r.tipo = 'producto' AND r.producto_id = v_producto.id;

      -- Un canje por unidad: cada una tiene su propio QR para retirarla.
      FOR i IN 1..v_cantidad LOOP
        INSERT INTO public.canjes (usuario_id, recompensa_id, puntos_utilizados)
        VALUES (v_usuario, v_recompensa.id, v_recompensa.costo_puntos)
        RETURNING * INTO v_canje;
        v_canjes := v_canjes || jsonb_build_array(jsonb_build_object(
          'canje_id', v_canje.id,
          'producto_nombre', v_producto.nombre,
          'puntos_utilizados', v_canje.puntos_utilizados,
          'qr_code', v_canje.qr_code::text));
      END LOOP;
    ELSE
      v_qr := gen_random_uuid();
      INSERT INTO public.compra_productos
        (id, compra_id, producto_id, cantidad, precio_unitario, qr_code, validado)
      VALUES
        (gen_random_uuid(), v_compra.id, v_producto.id, v_cantidad, v_producto.precio, v_qr, false);
      v_productos := v_productos || jsonb_build_array(jsonb_build_object(
        'producto_id', v_producto.id,
        'nombre', v_producto.nombre,
        'cantidad', v_cantidad,
        'precio_unitario', v_producto.precio,
        'qr_code', v_qr::text));
    END IF;
  END LOOP;

  -- ---------- Recién ahora se descuentan puntos y crédito, y se suman los puntos ganados ----------
  -- 1 punto por cada peso pagado (total final, ya sin cupón ni crédito), redondeado hacia abajo.
  v_puntos_ganados := floor(v_total);

  UPDATE public.perfiles p
  SET puntos_fidelizacion = v_puntos - v_puntos_usar + v_puntos_ganados,
      credito = v_saldo - v_credito_pedido
  WHERE p.id = v_usuario;

  RETURN jsonb_build_object(
    'compra_id', v_compra.id,
    'fecha_hora', v_compra.fecha_hora,
    'subtotal', v_subtotal,
    'subtotal_entradas', v_sub_entradas,
    'subtotal_productos', v_sub_productos,
    'descuento_cupon', v_descuento,
    'cupon_codigo', v_cupon.codigo,
    'credito_utilizado', v_credito_pedido,
    'total', v_total,
    'puntos_utilizados', v_puntos_usar,
    'entradas_canjeadas', v_n_canje,
    'puntos_entradas', coalesce(v_rec_entrada.costo_puntos, 0) * v_n_canje,
    'puntos_ganados', v_puntos_ganados,
    'puntos_restantes', v_puntos - v_puntos_usar + v_puntos_ganados,
    'credito_restante', v_saldo - v_credito_pedido,
    'entradas', v_entradas,
    'productos', v_productos,
    'canjes', v_canjes
  );
END;
$$;

REVOKE ALL ON FUNCTION public.confirmar_compra(uuid, uuid[], jsonb, uuid, numeric, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirmar_compra(uuid, uuid[], jsonb, uuid, numeric, integer) TO authenticated;

NOTIFY pgrst, 'reload schema';

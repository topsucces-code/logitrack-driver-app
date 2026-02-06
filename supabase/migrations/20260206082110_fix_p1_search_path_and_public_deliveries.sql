-- =============================================
-- P1 SECURITY FIX: Add search_path to SECURITY DEFINER functions
-- and restrict public access to deliveries table
-- =============================================

-- =============================================
-- 1. register_logitrack_driver (without search_path version)
-- =============================================
CREATE OR REPLACE FUNCTION public.register_logitrack_driver(
  p_user_id uuid,
  p_full_name character varying,
  p_phone character varying,
  p_vehicle_type vehicle_type DEFAULT 'moto'::vehicle_type
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_driver_id UUID;
  v_result JSON;
BEGIN
  SELECT id INTO v_driver_id
  FROM logitrack_drivers
  WHERE user_id = p_user_id;

  IF v_driver_id IS NOT NULL THEN
    SELECT json_build_object(
      'success', true,
      'driver_id', id,
      'message', 'Driver already exists'
    ) INTO v_result
    FROM logitrack_drivers
    WHERE id = v_driver_id;

    RETURN v_result;
  END IF;

  INSERT INTO logitrack_drivers (
    user_id, full_name, phone, vehicle_type,
    status, verification_status, driver_type,
    is_online, is_available,
    total_deliveries, total_earnings, rating_sum, rating_count,
    acceptance_rate, completion_rate, wallet_balance,
    notification_sound, auto_accept, max_distance_km, preferred_language,
    created_at, updated_at
  ) VALUES (
    p_user_id, p_full_name, p_phone, p_vehicle_type,
    'pending', 'pending', 'independent',
    false, true,
    0, 0, 0, 0,
    100.00, 100.00, 0,
    true, false, 10, 'fr',
    NOW(), NOW()
  )
  RETURNING id INTO v_driver_id;

  RETURN json_build_object(
    'success', true,
    'driver_id', v_driver_id,
    'message', 'Driver created successfully'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$function$;

-- =============================================
-- 2. handle_new_admin_user (trigger function)
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_admin_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.email LIKE 'admin_%' THEN
    INSERT INTO logitrack_admin_users (user_id, email, full_name, role, is_active)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      'viewer',
      true
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

-- =============================================
-- 3. api_get_delivery
-- =============================================
CREATE OR REPLACE FUNCTION public.api_get_delivery(
  p_client_id uuid,
  p_tracking_code text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_delivery RECORD;
BEGIN
  SELECT d.*, dr.full_name as driver_name, dr.phone as driver_phone, dr.photo_url as driver_photo
  INTO v_delivery
  FROM logitrack_deliveries d
  LEFT JOIN logitrack_drivers dr ON d.driver_id = dr.id
  WHERE d.tracking_code = p_tracking_code AND d.business_client_id = p_client_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Delivery not found');
  END IF;

  RETURN json_build_object(
    'success', true,
    'delivery', json_build_object(
      'id', v_delivery.id, 'tracking_code', v_delivery.tracking_code, 'status', v_delivery.status,
      'pickup', json_build_object('address', v_delivery.pickup_address, 'contact_name', v_delivery.pickup_contact_name, 'contact_phone', v_delivery.pickup_contact_phone),
      'delivery', json_build_object('address', v_delivery.delivery_address, 'contact_name', v_delivery.delivery_contact_name, 'contact_phone', v_delivery.delivery_contact_phone),
      'pricing', json_build_object('estimated_price', v_delivery.total_price, 'distance_km', v_delivery.distance_km),
      'driver', CASE WHEN v_delivery.driver_id IS NOT NULL THEN json_build_object('name', v_delivery.driver_name, 'phone', v_delivery.driver_phone) ELSE NULL END,
      'timestamps', json_build_object('created_at', v_delivery.created_at, 'picked_up_at', v_delivery.picked_up_at, 'delivered_at', v_delivery.delivered_at)
    )
  );
END;
$function$;

-- =============================================
-- 4. api_list_deliveries
-- =============================================
CREATE OR REPLACE FUNCTION public.api_list_deliveries(
  p_client_id uuid,
  p_status text DEFAULT NULL::text,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_deliveries JSON;
  v_total INTEGER;
BEGIN
  SELECT json_agg(t) INTO v_deliveries
  FROM (
    SELECT
      d.id, d.tracking_code, d.status::TEXT,
      d.pickup_address, d.delivery_address,
      d.total_price as estimated_price, d.created_at
    FROM logitrack_deliveries d
    WHERE d.business_client_id = p_client_id
      AND (p_status IS NULL OR d.status::TEXT = p_status)
    ORDER BY d.created_at DESC
    LIMIT p_limit OFFSET p_offset
  ) t;

  SELECT COUNT(*) INTO v_total
  FROM logitrack_deliveries
  WHERE business_client_id = p_client_id
    AND (p_status IS NULL OR status::TEXT = p_status);

  RETURN json_build_object(
    'success', true,
    'deliveries', COALESCE(v_deliveries, '[]'::json),
    'total', v_total
  );
END;
$function$;

-- =============================================
-- 5. api_create_delivery
-- =============================================
CREATE OR REPLACE FUNCTION public.api_create_delivery(
  p_client_id uuid,
  p_pickup jsonb,
  p_delivery jsonb,
  p_package jsonb DEFAULT '{}'::jsonb,
  p_options jsonb DEFAULT '{}'::jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_delivery_id UUID;
  v_tracking_code TEXT;
  v_estimated_price INTEGER;
  v_distance_km DECIMAL;
  v_size TEXT;
  v_payment TEXT;
BEGIN
  v_tracking_code := 'LT-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
  v_size := COALESCE(p_package->>'size', 'medium');
  v_payment := COALESCE(p_options->>'payment_method', 'prepaid');

  v_distance_km := ROUND(
    111.111 * DEGREES(ACOS(LEAST(1, GREATEST(-1,
      COS(RADIANS((p_pickup->>'latitude')::DECIMAL)) * COS(RADIANS((p_delivery->>'latitude')::DECIMAL)) *
      COS(RADIANS((p_pickup->>'longitude')::DECIMAL) - RADIANS((p_delivery->>'longitude')::DECIMAL)) +
      SIN(RADIANS((p_pickup->>'latitude')::DECIMAL)) * SIN(RADIANS((p_delivery->>'latitude')::DECIMAL))
    ))))::DECIMAL, 2
  );

  v_estimated_price := 500 + (COALESCE(v_distance_km, 5) * 200)::INTEGER;

  INSERT INTO logitrack_deliveries (
    business_client_id, tracking_code, external_reference, status,
    pickup_address, pickup_latitude, pickup_longitude,
    pickup_contact_name, pickup_contact_phone, pickup_instructions,
    delivery_address, delivery_latitude, delivery_longitude,
    delivery_contact_name, delivery_contact_phone, delivery_instructions,
    package_description, package_size, package_weight, is_fragile, requires_signature,
    payment_method, cod_amount, total_price, distance_km, metadata
  ) VALUES (
    p_client_id, v_tracking_code, p_options->>'external_id', 'pending'::delivery_status,
    p_pickup->>'address', (p_pickup->>'latitude')::DECIMAL, (p_pickup->>'longitude')::DECIMAL,
    p_pickup->>'contact_name', p_pickup->>'contact_phone', p_pickup->>'instructions',
    p_delivery->>'address', (p_delivery->>'latitude')::DECIMAL, (p_delivery->>'longitude')::DECIMAL,
    p_delivery->>'contact_name', p_delivery->>'contact_phone', p_delivery->>'instructions',
    p_package->>'description', v_size::package_size, (p_package->>'weight')::DECIMAL,
    COALESCE((p_package->>'is_fragile')::BOOLEAN, false), COALESCE((p_package->>'requires_signature')::BOOLEAN, false),
    v_payment::payment_method, COALESCE((p_options->>'cod_amount')::INTEGER, 0),
    v_estimated_price, v_distance_km, p_options->'metadata'
  )
  RETURNING id INTO v_delivery_id;

  UPDATE logitrack_business_clients SET total_deliveries = total_deliveries + 1, updated_at = NOW() WHERE id = p_client_id;

  RETURN json_build_object(
    'success', true,
    'delivery', json_build_object(
      'id', v_delivery_id,
      'tracking_code', v_tracking_code,
      'status', 'pending',
      'estimated_price', v_estimated_price,
      'distance_km', v_distance_km
    )
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- =============================================
-- 6. api_cancel_delivery
-- =============================================
CREATE OR REPLACE FUNCTION public.api_cancel_delivery(
  p_client_id uuid,
  p_tracking_code text,
  p_reason text DEFAULT NULL::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_delivery RECORD;
BEGIN
  SELECT * INTO v_delivery FROM logitrack_deliveries WHERE tracking_code = p_tracking_code AND business_client_id = p_client_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Delivery not found');
  END IF;

  IF v_delivery.status NOT IN ('pending', 'accepted') THEN
    RETURN json_build_object('success', false, 'error', 'Cannot cancel delivery in status: ' || v_delivery.status);
  END IF;

  UPDATE logitrack_deliveries SET status = 'cancelled'::delivery_status, cancellation_reason = p_reason, cancelled_at = NOW(), updated_at = NOW() WHERE id = v_delivery.id;

  RETURN json_build_object('success', true, 'message', 'Delivery cancelled', 'tracking_code', p_tracking_code);
END;
$function$;

-- =============================================
-- 7. update_driver_wallet (version without search_path)
-- =============================================
CREATE OR REPLACE FUNCTION public.update_driver_wallet(
  p_driver_id uuid,
  p_amount integer,
  p_type transaction_type,
  p_delivery_id uuid DEFAULT NULL::uuid,
  p_description text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_balance_before INTEGER;
  v_balance_after INTEGER;
  v_transaction_id UUID;
BEGIN
  SELECT wallet_balance INTO v_balance_before
  FROM logitrack_drivers
  WHERE id = p_driver_id
  FOR UPDATE;

  IF p_type IN ('earning', 'bonus', 'adjustment') THEN
    v_balance_after := v_balance_before + p_amount;
  ELSE
    v_balance_after := v_balance_before - p_amount;
  END IF;

  UPDATE logitrack_drivers
  SET wallet_balance = v_balance_after,
      updated_at = NOW()
  WHERE id = p_driver_id;

  INSERT INTO logitrack_driver_transactions (
    driver_id, type, amount, balance_before, balance_after,
    delivery_id, description, status
  ) VALUES (
    p_driver_id, p_type, p_amount, v_balance_before, v_balance_after,
    p_delivery_id, p_description, 'completed'
  ) RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$function$;

-- =============================================
-- 8. Fix: deliveries table - replace USING(true) public SELECT
--    Anon users should NOT have unrestricted access to all deliveries.
--    Public tracking should use get_delivery_tracking() RPC instead.
-- =============================================
DROP POLICY IF EXISTS "Public can view delivery by ID for tracking" ON deliveries;

-- Replace with restricted policy: anon can only see deliveries
-- that have an active shared_tracking link (proper tracking flow)
CREATE POLICY "Public can view shared deliveries only" ON deliveries
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM shared_tracking st
      WHERE st.delivery_id = deliveries.id
        AND st.is_active = true
        AND st.expires_at > now()
    )
  );

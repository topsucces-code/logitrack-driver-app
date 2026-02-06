-- =============================================
-- P2/P3 SECURITY HARDENING
-- =============================================

-- =============================================
-- P2: spatial_ref_sys - Revoke write access
-- Cannot enable RLS (owned by supabase_admin),
-- but we can revoke INSERT/UPDATE/DELETE from public roles.
-- This prevents any non-admin user from modifying coordinate
-- system reference data.
-- =============================================
REVOKE INSERT, UPDATE, DELETE ON public.spatial_ref_sys FROM anon, authenticated;

-- =============================================
-- P2: Tighten SELECT-only tables for anon users
-- Some legacy tables have "Anyone can view" SELECT with USING(true)
-- which exposes data to anonymous users unnecessarily.
-- Restrict to authenticated users only where appropriate.
-- =============================================

-- insurance_claims: only authenticated users should see claims
DROP POLICY IF EXISTS "Anyone can view claims" ON insurance_claims;
CREATE POLICY "Authenticated can view related claims" ON insurance_claims
  FOR SELECT TO authenticated
  USING (
    driver_id = get_current_driver_id() OR is_admin()
  );

-- delivery_proofs: restrict to authenticated (drivers viewing proof)
DROP POLICY IF EXISTS "Anyone can view proofs" ON delivery_proofs;
CREATE POLICY "Authenticated can view proofs" ON delivery_proofs
  FOR SELECT TO authenticated
  USING (
    driver_id = get_current_driver_id()
    OR is_admin()
    OR EXISTS (
      SELECT 1 FROM deliveries d
      WHERE d.id = delivery_proofs.delivery_id
        AND d.api_client_id = get_api_client_id()
    )
  );

-- delivery_signatures: restrict to authenticated
DROP POLICY IF EXISTS "Anyone can view signatures" ON delivery_signatures;
CREATE POLICY "Authenticated can view signatures" ON delivery_signatures
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deliveries d
      WHERE d.id = delivery_signatures.delivery_id
        AND (
          d.driver_id = get_current_driver_id()
          OR d.api_client_id = get_api_client_id()
          OR is_admin()
        )
    )
  );

-- tracking_updates: keep public read for shared tracking use case
-- but restrict to updates linked to active shared tracking for anon
DROP POLICY IF EXISTS "Anyone can view tracking updates" ON tracking_updates;

CREATE POLICY "Authenticated can view tracking updates" ON tracking_updates
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deliveries d
      WHERE d.id = tracking_updates.delivery_id
        AND (
          d.driver_id = get_current_driver_id()
          OR d.api_client_id = get_api_client_id()
          OR is_admin()
        )
    )
  );

CREATE POLICY "Anon can view shared tracking updates" ON tracking_updates
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM shared_tracking st
      WHERE st.delivery_id = tracking_updates.delivery_id
        AND st.is_active = true
        AND st.expires_at > now()
    )
  );

-- =============================================
-- P0 SECURITY FIX: Remove overly permissive RLS policies
-- Replace USING(true) ALL policies with proper access controls
-- =============================================

-- =============================================
-- 1. delivery_proofs
-- Drop: "System can manage proofs" (ALL, USING true)
-- Keep: "Anyone can view proofs" (SELECT)
-- =============================================
DROP POLICY IF EXISTS "System can manage proofs" ON delivery_proofs;

CREATE POLICY "Drivers can insert own proofs" ON delivery_proofs
  FOR INSERT TO authenticated
  WITH CHECK (driver_id = get_current_driver_id());

CREATE POLICY "Admins can manage proofs" ON delivery_proofs
  FOR ALL USING (is_admin());

-- =============================================
-- 2. delivery_signatures
-- Drop: "System can manage signatures" (ALL, USING true)
-- Keep: "Anyone can view signatures" (SELECT)
-- =============================================
DROP POLICY IF EXISTS "System can manage signatures" ON delivery_signatures;

CREATE POLICY "Drivers can insert signatures" ON delivery_signatures
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM deliveries d
      WHERE d.id = delivery_signatures.delivery_id
        AND d.driver_id = get_current_driver_id()
    )
  );

CREATE POLICY "Admins can manage signatures" ON delivery_signatures
  FOR ALL USING (is_admin());

-- =============================================
-- 3. driver_badges
-- Drop: "System can manage badges" (ALL, USING true)
-- Keep: "Anyone can view badges" (SELECT)
-- Badges are system-assigned only
-- =============================================
DROP POLICY IF EXISTS "System can manage badges" ON driver_badges;

CREATE POLICY "Admins can manage badges" ON driver_badges
  FOR ALL USING (is_admin());

-- =============================================
-- 4. driver_reliability_scores
-- Drop: "System can manage scores" (ALL, USING true)
-- Keep: "Anyone can view reliability scores" (SELECT)
-- Scores are system-calculated only
-- =============================================
DROP POLICY IF EXISTS "System can manage scores" ON driver_reliability_scores;

CREATE POLICY "Admins can manage scores" ON driver_reliability_scores
  FOR ALL USING (is_admin());

-- =============================================
-- 5. insurance_claims
-- Drop: "System can manage claims" (ALL, USING true)
-- Keep: "Anyone can view claims" (SELECT)
-- =============================================
DROP POLICY IF EXISTS "System can manage claims" ON insurance_claims;

CREATE POLICY "Drivers can insert own claims" ON insurance_claims
  FOR INSERT TO authenticated
  WITH CHECK (driver_id = get_current_driver_id());

CREATE POLICY "Admins can manage claims" ON insurance_claims
  FOR ALL USING (is_admin());

-- =============================================
-- 6. package_insurance
-- Drop: "System can manage insurance" (ALL, USING true)
-- Keep: "Drivers can view related insurance" (SELECT)
-- Insurance records are admin-managed only
-- =============================================
DROP POLICY IF EXISTS "System can manage insurance" ON package_insurance;

CREATE POLICY "Admins can manage insurance" ON package_insurance
  FOR ALL USING (is_admin());

-- =============================================
-- 7. shared_tracking
-- Drop: "System can manage shared tracking" (ALL, USING true)
-- Keep: "Anyone can view active shared tracking" (SELECT with conditions)
-- =============================================
DROP POLICY IF EXISTS "System can manage shared tracking" ON shared_tracking;

CREATE POLICY "Drivers can create shared tracking" ON shared_tracking
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM deliveries d
      WHERE d.id = shared_tracking.delivery_id
        AND d.driver_id = get_current_driver_id()
    )
  );

CREATE POLICY "Drivers can update own shared tracking" ON shared_tracking
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deliveries d
      WHERE d.id = shared_tracking.delivery_id
        AND d.driver_id = get_current_driver_id()
    )
  );

CREATE POLICY "Admins can manage shared tracking" ON shared_tracking
  FOR ALL USING (is_admin());

-- =============================================
-- 8. tracking_updates
-- Drop: "System can manage tracking updates" (ALL, USING true)
-- Keep: "Anyone can view tracking updates" (SELECT)
-- =============================================
DROP POLICY IF EXISTS "System can manage tracking updates" ON tracking_updates;

CREATE POLICY "Drivers can insert tracking updates" ON tracking_updates
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM deliveries d
      WHERE d.id = tracking_updates.delivery_id
        AND d.driver_id = get_current_driver_id()
    )
  );

CREATE POLICY "Admins can manage tracking updates" ON tracking_updates
  FOR ALL USING (is_admin());

-- =============================================
-- 9. logitrack_company_auth (CRITICAL - contains password_hash, reset_token)
-- Drop: "Company auth: authenticated access" (ALL for any authenticated)
-- =============================================
DROP POLICY IF EXISTS "Company auth: authenticated access" ON logitrack_company_auth;

CREATE POLICY "Users can view own company auth" ON logitrack_company_auth
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own company auth" ON logitrack_company_auth
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage company auth" ON logitrack_company_auth
  FOR ALL USING (is_admin());

-- =============================================
-- 10. logitrack_delivery_companies
-- Drop: "Companies: authenticated full access" (ALL for any authenticated)
-- Keep: "Companies: public read for active" (SELECT, status='active')
-- =============================================
DROP POLICY IF EXISTS "Companies: authenticated full access" ON logitrack_delivery_companies;

CREATE POLICY "Company owners can update own company" ON logitrack_delivery_companies
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM logitrack_company_users cu
      WHERE cu.company_id = logitrack_delivery_companies.id
        AND cu.user_id = auth.uid()
        AND cu.role = 'owner'
        AND cu.is_active = true
    )
  );

CREATE POLICY "Admins can manage companies" ON logitrack_delivery_companies
  FOR ALL USING (is_admin());

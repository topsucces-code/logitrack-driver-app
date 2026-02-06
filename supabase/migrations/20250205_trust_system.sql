-- ============================================
-- SYSTÈME DE CONFIANCE RENFORCÉ - LogiTrack Africa
-- Migration: 20250205_trust_system.sql
-- ============================================

-- Extension pour UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. VÉRIFICATION D'IDENTITÉ
-- ============================================

CREATE TABLE IF NOT EXISTS identity_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    document_type VARCHAR(20) NOT NULL CHECK (document_type IN ('cni', 'passport', 'permis', 'carte_consulaire')),
    document_number VARCHAR(50),
    front_image_url TEXT NOT NULL,
    back_image_url TEXT,
    selfie_url TEXT NOT NULL,
    expiry_date DATE,

    -- Résultats de vérification IA
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'processing', 'verified', 'rejected', 'expired')),
    verification_score INTEGER CHECK (verification_score >= 0 AND verification_score <= 100),
    face_match_score INTEGER CHECK (face_match_score >= 0 AND face_match_score <= 100),
    document_authenticity_score INTEGER CHECK (document_authenticity_score >= 0 AND document_authenticity_score <= 100),
    rejection_reason TEXT,

    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_identity_documents_driver ON identity_documents(driver_id);
CREATE INDEX idx_identity_documents_status ON identity_documents(verification_status);

-- ============================================
-- 2. SCORE DE FIABILITÉ
-- ============================================

CREATE TABLE IF NOT EXISTS driver_reliability_scores (
    driver_id UUID PRIMARY KEY REFERENCES drivers(id) ON DELETE CASCADE,
    overall_score INTEGER DEFAULT 50 CHECK (overall_score >= 0 AND overall_score <= 100),
    trust_level VARCHAR(20) DEFAULT 'bronze' CHECK (trust_level IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),

    -- Composantes du score
    delivery_success_rate INTEGER DEFAULT 100,
    on_time_rate INTEGER DEFAULT 100,
    customer_rating_avg DECIMAL(2,1) DEFAULT 5.0,
    incident_rate DECIMAL(4,2) DEFAULT 0,
    verification_bonus INTEGER DEFAULT 0,
    experience_bonus INTEGER DEFAULT 0,

    -- Statistiques
    total_deliveries INTEGER DEFAULT 0,
    successful_deliveries INTEGER DEFAULT 0,
    failed_deliveries INTEGER DEFAULT 0,
    total_incidents INTEGER DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,

    -- Badges (JSON array)
    badges JSONB DEFAULT '[]',

    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Badges de confiance
CREATE TABLE IF NOT EXISTS driver_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    badge_id VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(10),
    earned_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(driver_id, badge_id)
);

CREATE INDEX idx_driver_badges_driver ON driver_badges(driver_id);

-- Ajouter colonnes au drivers si pas existantes
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'is_identity_verified') THEN
        ALTER TABLE drivers ADD COLUMN is_identity_verified BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'identity_verified_at') THEN
        ALTER TABLE drivers ADD COLUMN identity_verified_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'reliability_score') THEN
        ALTER TABLE drivers ADD COLUMN reliability_score INTEGER DEFAULT 50;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'trust_level') THEN
        ALTER TABLE drivers ADD COLUMN trust_level VARCHAR(20) DEFAULT 'bronze';
    END IF;
END $$;

-- ============================================
-- 3. ASSURANCE COLIS
-- ============================================

CREATE TABLE IF NOT EXISTS package_insurance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,

    insurance_type VARCHAR(20) NOT NULL CHECK (insurance_type IN ('basic', 'standard', 'premium')),
    declared_value INTEGER NOT NULL,
    premium_amount INTEGER NOT NULL,
    coverage_amount INTEGER NOT NULL,

    is_active BOOLEAN DEFAULT TRUE,
    activated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_package_insurance_delivery ON package_insurance(delivery_id);
CREATE INDEX idx_package_insurance_active ON package_insurance(is_active) WHERE is_active = TRUE;

-- Réclamations d'assurance
CREATE TABLE IF NOT EXISTS insurance_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    insurance_id UUID NOT NULL REFERENCES package_insurance(id) ON DELETE CASCADE,
    delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,

    claim_type VARCHAR(20) NOT NULL CHECK (claim_type IN ('damage', 'loss', 'theft', 'delay')),
    description TEXT NOT NULL,
    evidence_urls JSONB DEFAULT '[]',
    claimed_amount INTEGER NOT NULL,

    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'approved', 'rejected', 'paid')),
    approved_amount INTEGER,
    rejection_reason TEXT,
    processed_by UUID REFERENCES auth.users(id),
    processed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_insurance_claims_insurance ON insurance_claims(insurance_id);
CREATE INDEX idx_insurance_claims_status ON insurance_claims(status);

-- ============================================
-- 4. TRACKING PARTAGEABLE
-- ============================================

CREATE TABLE IF NOT EXISTS shared_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,

    share_code VARCHAR(10) UNIQUE NOT NULL,
    share_url TEXT NOT NULL,

    -- Permissions
    show_driver_name BOOLEAN DEFAULT TRUE,
    show_driver_phone BOOLEAN DEFAULT FALSE,
    show_driver_photo BOOLEAN DEFAULT TRUE,
    show_eta BOOLEAN DEFAULT TRUE,

    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMPTZ NOT NULL,
    view_count INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shared_tracking_code ON shared_tracking(share_code);
CREATE INDEX idx_shared_tracking_delivery ON shared_tracking(delivery_id);
CREATE INDEX idx_shared_tracking_active ON shared_tracking(is_active, expires_at);

-- Mises à jour de position
CREATE TABLE IF NOT EXISTS tracking_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,

    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(6, 2),

    status VARCHAR(50),
    eta_minutes INTEGER,
    distance_remaining DECIMAL(10, 2),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tracking_updates_delivery ON tracking_updates(delivery_id);
CREATE INDEX idx_tracking_updates_time ON tracking_updates(delivery_id, created_at DESC);

-- ============================================
-- 5. PREUVES DE LIVRAISON
-- ============================================

CREATE TABLE IF NOT EXISTS delivery_proofs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,

    photo_url TEXT NOT NULL,
    photo_type VARCHAR(20) NOT NULL CHECK (photo_type IN ('package', 'recipient', 'signature', 'location')),

    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    taken_at TIMESTAMPTZ DEFAULT NOW(),

    is_verified BOOLEAN DEFAULT FALSE,
    ai_analysis JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_delivery_proofs_delivery ON delivery_proofs(delivery_id);
CREATE INDEX idx_delivery_proofs_driver ON delivery_proofs(driver_id);

-- Signatures de livraison
CREATE TABLE IF NOT EXISTS delivery_signatures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    delivery_id UUID UNIQUE NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,

    signature_data TEXT NOT NULL,
    signer_name VARCHAR(100) NOT NULL,
    signer_phone VARCHAR(20),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_delivery_signatures_delivery ON delivery_signatures(delivery_id);

-- ============================================
-- 6. STORAGE BUCKETS
-- ============================================

-- Bucket pour les documents d'identité
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'documents',
    'documents',
    FALSE,
    5242880, -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Bucket pour les preuves de livraison
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'delivery-proofs',
    'delivery-proofs',
    TRUE,
    5242880, -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 7. ROW LEVEL SECURITY
-- ============================================

-- Identity documents
ALTER TABLE identity_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can view own documents" ON identity_documents
    FOR SELECT USING (driver_id = auth.uid());

CREATE POLICY "Drivers can insert own documents" ON identity_documents
    FOR INSERT WITH CHECK (driver_id = auth.uid());

-- Reliability scores
ALTER TABLE driver_reliability_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reliability scores" ON driver_reliability_scores
    FOR SELECT USING (true);

CREATE POLICY "System can update scores" ON driver_reliability_scores
    FOR ALL USING (true);

-- Badges
ALTER TABLE driver_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view badges" ON driver_badges
    FOR SELECT USING (true);

-- Package insurance
ALTER TABLE package_insurance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can view related insurance" ON package_insurance
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM deliveries d
            WHERE d.id = delivery_id AND d.driver_id = auth.uid()
        )
    );

-- Shared tracking (public)
ALTER TABLE shared_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active shared tracking" ON shared_tracking
    FOR SELECT USING (is_active = TRUE AND expires_at > NOW());

-- Tracking updates
ALTER TABLE tracking_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tracking updates for shared deliveries" ON tracking_updates
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM shared_tracking st
            WHERE st.delivery_id = tracking_updates.delivery_id
            AND st.is_active = TRUE
            AND st.expires_at > NOW()
        )
    );

CREATE POLICY "Drivers can insert tracking updates" ON tracking_updates
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM deliveries d
            WHERE d.id = delivery_id AND d.driver_id = auth.uid()
        )
    );

-- Delivery proofs
ALTER TABLE delivery_proofs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can manage own proofs" ON delivery_proofs
    FOR ALL USING (driver_id = auth.uid());

CREATE POLICY "Anyone can view proofs for shared deliveries" ON delivery_proofs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM shared_tracking st
            WHERE st.delivery_id = delivery_proofs.delivery_id
            AND st.is_active = TRUE
        )
    );

-- Delivery signatures
ALTER TABLE delivery_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can manage signatures" ON delivery_signatures
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM deliveries d
            WHERE d.id = delivery_id AND d.driver_id = auth.uid()
        )
    );

-- ============================================
-- 8. FONCTIONS HELPER
-- ============================================

-- Fonction pour calculer automatiquement le score de fiabilité
CREATE OR REPLACE FUNCTION calculate_driver_reliability_score(p_driver_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_total_deliveries INTEGER;
    v_successful INTEGER;
    v_on_time INTEGER;
    v_incidents INTEGER;
    v_avg_rating DECIMAL;
    v_is_verified BOOLEAN;
    v_months_active INTEGER;
    v_score INTEGER;
BEGIN
    -- Récupérer les statistiques
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'delivered'),
        COUNT(*) FILTER (WHERE NOT is_late),
        COALESCE(AVG(customer_rating), 5)
    INTO v_total_deliveries, v_successful, v_on_time, v_avg_rating
    FROM deliveries
    WHERE driver_id = p_driver_id;

    -- Incidents
    SELECT COUNT(*) INTO v_incidents
    FROM incidents WHERE driver_id = p_driver_id;

    -- Vérification
    SELECT is_identity_verified,
           EXTRACT(MONTH FROM AGE(NOW(), created_at))::INTEGER
    INTO v_is_verified, v_months_active
    FROM drivers WHERE id = p_driver_id;

    -- Calcul du score
    IF v_total_deliveries = 0 THEN
        v_score := 50;
    ELSE
        v_score := (
            (v_successful::DECIMAL / v_total_deliveries * 100) * 0.25 +
            (v_on_time::DECIMAL / v_total_deliveries * 100) * 0.20 +
            (v_avg_rating / 5 * 100) * 0.25 +
            GREATEST(0, 100 - (v_incidents::DECIMAL / v_total_deliveries * 100)) * 0.15 +
            CASE WHEN v_is_verified THEN 10 ELSE 0 END +
            LEAST(v_months_active, 10) * 0.5
        )::INTEGER;
    END IF;

    RETURN LEAST(100, GREATEST(0, v_score));
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour le score après chaque livraison
CREATE OR REPLACE FUNCTION update_reliability_on_delivery()
RETURNS TRIGGER AS $$
BEGIN
    -- Mettre à jour le score du livreur
    UPDATE drivers
    SET reliability_score = calculate_driver_reliability_score(NEW.driver_id)
    WHERE id = NEW.driver_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_reliability_on_delivery
    AFTER INSERT OR UPDATE OF status ON deliveries
    FOR EACH ROW
    EXECUTE FUNCTION update_reliability_on_delivery();

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================

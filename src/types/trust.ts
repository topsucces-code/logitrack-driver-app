// Types pour le Système de Confiance Renforcé

// === VÉRIFICATION D'IDENTITÉ ===
export type DocumentType = 'cni' | 'passport' | 'permis' | 'carte_consulaire';
export type VerificationStatus = 'pending' | 'processing' | 'verified' | 'rejected' | 'expired';

export interface IdentityDocument {
  id: string;
  driver_id: string;
  document_type: DocumentType;
  document_number: string;
  front_image_url: string;
  back_image_url?: string;
  selfie_url: string;
  expiry_date?: string;

  // Résultats de la vérification IA
  verification_status: VerificationStatus;
  verification_score: number; // 0-100
  face_match_score: number; // 0-100
  document_authenticity_score: number; // 0-100
  rejection_reason?: string;

  verified_at?: string;
  created_at: string;
  updated_at: string;
}

export interface VerificationResult {
  success: boolean;
  status: VerificationStatus;
  scores: {
    overall: number;
    faceMatch: number;
    documentAuthenticity: number;
    dataExtraction: number;
  };
  extractedData?: {
    fullName: string;
    dateOfBirth: string;
    documentNumber: string;
    expiryDate?: string;
    nationality?: string;
  };
  rejectionReason?: string;
}

// === SCORE DE FIABILITÉ ===
export interface DriverReliabilityScore {
  driver_id: string;

  // Score global (0-100)
  overall_score: number;
  trust_level: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

  // Composantes du score
  delivery_success_rate: number; // Taux de livraisons réussies
  on_time_rate: number; // Taux de ponctualité
  customer_rating_avg: number; // Note moyenne clients (1-5)
  incident_rate: number; // Taux d'incidents (inversé)
  verification_bonus: number; // Bonus si vérifié
  experience_bonus: number; // Bonus ancienneté

  // Statistiques
  total_deliveries: number;
  successful_deliveries: number;
  failed_deliveries: number;
  total_incidents: number;
  total_reviews: number;

  // Badges de confiance
  badges: TrustBadge[];

  updated_at: string;
}

export interface TrustBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned_at: string;
}

export const TRUST_LEVELS = {
  bronze: { min: 0, max: 40, color: '#CD7F32', label: 'Bronze' },
  silver: { min: 41, max: 60, color: '#C0C0C0', label: 'Argent' },
  gold: { min: 61, max: 75, color: '#FFD700', label: 'Or' },
  platinum: { min: 76, max: 90, color: '#E5E4E2', label: 'Platine' },
  diamond: { min: 91, max: 100, color: '#B9F2FF', label: 'Diamant' },
} as const;

// === ASSURANCE COLIS ===
export type InsuranceType = 'basic' | 'standard' | 'premium';
export type ClaimStatus = 'pending' | 'processing' | 'approved' | 'rejected' | 'paid';

export interface PackageInsurance {
  id: string;
  delivery_id: string;

  // Détails de l'assurance
  insurance_type: InsuranceType;
  declared_value: number; // Valeur déclarée en FCFA
  premium_amount: number; // Prime d'assurance
  coverage_amount: number; // Montant couvert

  // Statut
  is_active: boolean;
  activated_at: string;
  expires_at: string;

  created_at: string;
}

export interface InsuranceClaim {
  id: string;
  insurance_id: string;
  delivery_id: string;
  driver_id: string;

  // Détails de la réclamation
  claim_type: 'damage' | 'loss' | 'theft' | 'delay';
  description: string;
  evidence_urls: string[];
  claimed_amount: number;

  // Traitement
  status: ClaimStatus;
  approved_amount?: number;
  rejection_reason?: string;
  processed_by?: string;
  processed_at?: string;

  created_at: string;
}

export const INSURANCE_PLANS = {
  basic: {
    name: 'Basique',
    coveragePercent: 50,
    maxCoverage: 50000, // 50,000 FCFA
    premiumPercent: 2,
    minPremium: 500,
  },
  standard: {
    name: 'Standard',
    coveragePercent: 80,
    maxCoverage: 200000, // 200,000 FCFA
    premiumPercent: 3.5,
    minPremium: 1000,
  },
  premium: {
    name: 'Premium',
    coveragePercent: 100,
    maxCoverage: 1000000, // 1,000,000 FCFA
    premiumPercent: 5,
    minPremium: 2500,
  },
} as const;

// === TRACKING PARTAGEABLE ===
export interface SharedTracking {
  id: string;
  delivery_id: string;

  // Lien de partage
  share_code: string; // Code unique court
  share_url: string;

  // Permissions
  show_driver_name: boolean;
  show_driver_phone: boolean;
  show_driver_photo: boolean;
  show_eta: boolean;

  // Validité
  is_active: boolean;
  expires_at: string;
  view_count: number;

  created_at: string;
}

export interface TrackingUpdate {
  id: string;
  delivery_id: string;

  // Position
  latitude: number;
  longitude: number;
  accuracy: number;

  // Infos
  status: string;
  eta_minutes?: number;
  distance_remaining?: number;

  created_at: string;
}

// === PREUVE DE LIVRAISON ===
export interface DeliveryProof {
  id: string;
  delivery_id: string;
  driver_id: string;

  // Photos
  photo_url: string;
  photo_type: 'package' | 'recipient' | 'signature' | 'location';

  // Métadonnées
  latitude?: number;
  longitude?: number;
  taken_at: string;

  // Vérification
  is_verified: boolean;
  ai_analysis?: {
    hasPackage: boolean;
    hasPerson: boolean;
    confidence: number;
  };

  created_at: string;
}

export interface DeliverySignature {
  id: string;
  delivery_id: string;

  signature_data: string; // Base64 ou URL
  signer_name: string;
  signer_phone?: string;

  created_at: string;
}

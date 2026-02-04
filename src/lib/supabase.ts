import { createClient } from '@supabase/supabase-js';

// LogiTrack Supabase configuration
// IMPORTANT: Ces valeurs doivent être définies dans les variables d'environnement
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'implicit',
  },
  global: {
    headers: {
      'x-client-info': 'logitrack-driver-app',
    },
  },
});

// ============================================
// TYPES - Tables logitrack_*
// ============================================

// Types de véhicule
export type VehicleType = 'moto' | 'tricycle' | 'voiture' | 'velo';

// Statut du livreur
export type DriverStatus = 'pending' | 'approved' | 'rejected' | 'suspended' | 'inactive';

// Statut de vérification
export type VerificationStatus = 'pending' | 'verified' | 'rejected';

// Fournisseur Mobile Money
export type MomoProvider = 'orange_money' | 'mtn_momo' | 'moov_money' | 'wave';

// Statut de livraison
export type DeliveryStatus = 'pending' | 'assigned' | 'accepted' | 'picking_up' | 'picked_up' | 'in_transit' | 'delivering' | 'delivered' | 'completed' | 'cancelled' | 'failed';

// Taille du colis
export type PackageSize = 'small' | 'medium' | 'large' | 'extra_large';

// Méthode de paiement
export type PaymentMethod = 'cash' | 'mobile_money' | 'card' | 'wallet' | 'prepaid';

// Statut de paiement
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

// Créneau horaire
export type TimeSlot = 'morning' | 'afternoon' | 'evening' | 'night';

// Pattern de récurrence
export type RecurrencePattern = 'daily' | 'weekly' | 'monthly';

// ============================================
// DRIVER - logitrack_drivers
// ============================================
export interface Driver {
  id: string;
  user_id?: string;
  full_name: string;
  phone: string;
  email?: string;
  photo_url?: string;
  date_of_birth?: string;
  address?: string;

  // Documents
  id_card_front_url?: string;
  id_card_back_url?: string;
  driving_license_url?: string;
  vehicle_registration_url?: string;
  insurance_url?: string;

  // Véhicule
  vehicle_type: VehicleType;
  vehicle_brand?: string;
  vehicle_model?: string;
  vehicle_plate?: string;
  vehicle_year?: number;

  // Zones
  primary_zone_id?: string;
  secondary_zones?: string[];

  // Mobile Money
  momo_provider?: MomoProvider;
  momo_number?: string;
  momo_name?: string;

  // Statuts
  status: DriverStatus;
  verification_status: VerificationStatus;
  verified_at?: string;
  verified_by?: string;
  rejection_reason?: string;

  // Disponibilité
  is_online: boolean;
  is_available: boolean;

  // Position actuelle
  current_latitude?: number;
  current_longitude?: number;
  last_location_update?: string;

  // Statistiques
  total_deliveries: number;
  total_earnings: number;
  rating_sum: number;
  rating_count: number;
  acceptance_rate: number;
  completion_rate: number;

  // Portefeuille
  wallet_balance: number;

  // Préférences
  notification_sound: boolean;
  auto_accept: boolean;
  max_distance_km: number;
  preferred_language: string;

  // Multi-tenant
  company_id?: string;
  driver_type: 'independent' | 'company';

  // Timestamps
  created_at: string;
  updated_at?: string;
  last_active_at?: string;
}

// ============================================
// DELIVERY COMPANY - logitrack_delivery_companies
// ============================================
export interface DeliveryCompany {
  id: string;
  company_name: string;
  legal_name?: string;
  registration_number?: string;
  tax_id?: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  country: string;

  // Propriétaire
  owner_name: string;
  owner_phone?: string;
  owner_email?: string;

  // Documents
  logo_url?: string;
  license_url?: string;
  insurance_url?: string;
  contract_url?: string;

  // Configuration
  status: 'pending' | 'active' | 'suspended' | 'inactive';
  commission_rate: number;
  min_commission: number;
  can_set_custom_rates: boolean;
  max_concurrent_deliveries: number;

  // Zones
  operating_zones?: string[];
  primary_zone_id?: string;

  // Finances
  wallet_balance: number;
  total_earnings: number;
  pending_payout: number;

  // Statistiques
  total_drivers: number;
  active_drivers: number;
  total_deliveries: number;
  completed_deliveries: number;
  rating_sum: number;
  rating_count: number;

  // Paiement
  payout_method: 'mobile_money' | 'bank_transfer';
  momo_provider?: string;
  momo_number?: string;
  momo_name?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_name?: string;

  // API
  api_enabled: boolean;
  api_key_prefix?: string;

  // Métadonnées
  settings?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  notes?: string;

  // Timestamps
  created_at: string;
  updated_at?: string;
  verified_at?: string;
  verified_by?: string;
  suspended_at?: string;
  suspension_reason?: string;
}

// ============================================
// DELIVERY - logitrack_deliveries
// ============================================
export interface Delivery {
  id: string;
  tracking_code: string;

  // Relations
  vendor_id?: string;
  vendor_name?: string;
  vendor_phone?: string;
  driver_id?: string;
  external_order_id?: string;
  external_reference?: string;
  business_client_id?: string;
  company_id?: string;

  // Pickup
  pickup_address: string;
  pickup_latitude?: number;
  pickup_longitude?: number;
  pickup_contact_name?: string;
  pickup_contact_phone?: string;
  pickup_instructions?: string;
  pickup_zone_id?: string;

  // Delivery
  delivery_address?: string;
  delivery_latitude?: number;
  delivery_longitude?: number;
  delivery_contact_name?: string;
  delivery_contact_phone?: string;
  delivery_instructions?: string;
  delivery_zone_id?: string;

  // Multi-drop
  is_multi_drop: boolean;
  total_stops: number;
  completed_stops: number;
  current_stop_id?: string;

  // Colis
  package_description?: string;
  package_size: PackageSize;
  package_weight?: number;
  package_value?: number;
  is_fragile: boolean;
  requires_signature: boolean;

  // Tarification
  distance_km?: number;
  base_price?: number;
  distance_price?: number;
  multi_drop_fee: number;
  multi_drop_base_price?: number;
  multi_drop_stop_price: number;
  surge_multiplier: number;
  total_price: number;
  driver_earnings?: number;
  company_earnings: number;
  platform_fee?: number;

  // Paiement
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  amount_collected?: number;
  collected_at?: string;
  cod_amount: number;

  // Statut
  status: DeliveryStatus;
  confirmation_code?: string;
  confirmation_photo_url?: string;
  signature_url?: string;

  // Planification
  is_scheduled: boolean;
  scheduled_pickup_at?: string;
  scheduled_delivery_at?: string;
  time_slot?: TimeSlot;
  is_recurring: boolean;
  recurrence_pattern?: RecurrencePattern;
  recurrence_days?: number[];
  parent_delivery_id?: string;

  // Options
  is_express: boolean;
  webhook_url?: string;
  metadata?: Record<string, unknown>;

  // Timestamps
  created_at: string;
  updated_at?: string;
  assigned_at?: string;
  accepted_at?: string;
  picked_up_at?: string;
  delivered_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  cancelled_by?: string;

  // Estimations
  estimated_pickup_at?: string;
  estimated_delivery_at?: string;

  // Évaluations
  customer_rating?: number;
  customer_review?: string;
  driver_rating?: number;
  rated_at?: string;
}

// ============================================
// DRIVER TRANSACTION - logitrack_driver_transactions
// ============================================
export interface DriverTransaction {
  id: string;
  driver_id: string;
  delivery_id?: string;
  amount: number;
  balance_after: number;
  type: 'earning' | 'bonus' | 'withdrawal' | 'penalty' | 'adjustment' | 'commission';
  description?: string;
  reference?: string;

  // Retrait
  payout_status?: 'pending' | 'processing' | 'completed' | 'failed';
  payout_method?: string;
  payout_account?: string;
  payout_reference?: string;

  created_at: string;
}

// ============================================
// COMPANY TRANSACTION - logitrack_company_transactions
// ============================================
export interface CompanyTransaction {
  id: string;
  company_id: string;
  delivery_id?: string;
  driver_id?: string;
  amount: number;
  balance_after: number;
  type: 'earning' | 'commission' | 'withdrawal' | 'penalty' | 'adjustment' | 'deposit';
  description?: string;
  reference?: string;

  payout_status?: 'pending' | 'processing' | 'completed' | 'failed';
  payout_method?: string;
  payout_reference?: string;

  created_at: string;
}

// ============================================
// BUSINESS CLIENT - logitrack_business_clients
// ============================================
export interface BusinessClient {
  id: string;
  company_name: string;
  slug?: string;
  logo_url?: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  address?: string;
  city?: string;
  country: string;

  // Webhook
  webhook_url?: string;
  webhook_secret?: string;
  callback_url?: string;

  // Plan
  plan: 'starter' | 'growth' | 'enterprise';
  monthly_delivery_limit: number;
  commission_rate: number;
  fixed_fee_per_delivery: number;

  // Statut
  status: 'pending' | 'active' | 'suspended' | 'inactive';
  verified_at?: string;

  // Statistiques
  total_deliveries: number;
  total_spent: number;
  current_balance: number;

  created_at: string;
  updated_at?: string;
}

// ============================================
// ZONE - logitrack_zones
// ============================================
export interface Zone {
  id: string;
  name: string;
  code: string;
  city: string;
  country: string;
  is_active: boolean;
  base_fee: number;
  per_km_fee: number;
  surge_multiplier: number;
  boundaries?: unknown;
  created_at: string;
}

// ============================================
// INCIDENT - logitrack_incidents
// ============================================
export interface Incident {
  id: string;
  delivery_id: string;
  tracking_code?: string;
  reporter_type: 'driver' | 'customer' | 'vendor' | 'system';
  reporter_id: string;
  incident_type: string;
  title: string;
  description: string;
  photos: string[];
  disputed_amount?: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved' | 'closed' | 'escalated';
  resolution?: string;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
  updated_at?: string;
}

// ============================================
// HELPERS
// ============================================

// Calcul du rating moyen
export function calculateRating(ratingSum: number, ratingCount: number): number {
  if (ratingCount === 0) return 0;
  return Math.round((ratingSum / ratingCount) * 10) / 10;
}

// Vérifier si le livreur est vérifié et actif
export function isDriverVerified(driver: Driver): boolean {
  return driver.verification_status === 'verified' && driver.status === 'approved';
}

// Obtenir l'étape d'inscription (pour la compatibilité)
export function getRegistrationStep(driver: Driver): number {
  if (!driver.full_name || !driver.phone) return 1;
  if (!driver.vehicle_type || !driver.vehicle_plate) return 2;
  if (!driver.driving_license_url) return 3;
  if (!driver.primary_zone_id) return 4;
  if (!driver.momo_provider || !driver.momo_number) return 5;
  return 6; // Complet
}

// Alias pour la compatibilité avec l'ancien code
export type WalletTransaction = DriverTransaction;

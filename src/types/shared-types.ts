// ============================================
// LOGITRACK SHARED TYPES
// Source de vérité : Enums PostgreSQL du projet Supabase nyxqnkldtdzgvudleshn
// Ce fichier est identique dans les 3 projets :
//   - mientiorplateforme/src/types/shared-types.ts
//   - logitrack-driver-app/src/types/shared-types.ts
//   - logitrack-admin/src/types/shared-types.ts
// Dernière synchronisation : 2026-02-06
// ============================================

// --- Enums PostgreSQL (colonnes avec type enum) ---

export type DriverStatus = 'pending' | 'approved' | 'rejected' | 'suspended' | 'inactive';
export type VerificationStatus = 'pending' | 'verified' | 'rejected';
export type VehicleType = 'moto' | 'velo' | 'voiture' | 'camionnette' | 'tricycle';
export type MomoProvider = 'mtn' | 'moov' | 'orange' | 'wave';

export type DeliveryStatus =
  | 'pending'
  | 'searching'
  | 'assigned'
  | 'accepted'
  | 'picking_up'
  | 'picked_up'
  | 'in_transit'
  | 'arriving'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'failed'
  | 'returned';

export type PackageSize = 'small' | 'medium' | 'large' | 'xlarge';
export type PaymentMethod = 'cash' | 'momo' | 'card' | 'wallet' | 'prepaid';
export type PaymentStatus = 'pending' | 'collected' | 'paid' | 'refunded';
export type TransactionType = 'earning' | 'withdrawal' | 'bonus' | 'penalty' | 'adjustment';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled';
export type WithdrawalStatus = 'pending' | 'approved' | 'rejected' | 'processing' | 'paid' | 'failed';
export type TimeSlotType = 'morning' | 'afternoon' | 'evening' | 'custom';
export type RecurrencePattern = 'daily' | 'weekly' | 'biweekly' | 'monthly';

export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled';

export type IncidentCategory = 'driver' | 'customer' | 'vendor';
export type IncidentReporterType = 'driver' | 'customer' | 'vendor' | 'system';
export type IncidentStatus = 'open' | 'investigating' | 'resolved' | 'closed' | 'escalated';
export type IncidentPriority = 'low' | 'medium' | 'high' | 'critical';
export type IncidentResolution =
  | 'refund_full'
  | 'refund_partial'
  | 'redelivery'
  | 'compensation'
  | 'no_action'
  | 'driver_warning'
  | 'driver_suspended'
  | 'vendor_warning';

export type AppealStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 'withdrawn';

export type NotificationChannel = 'sms' | 'whatsapp' | 'push' | 'email';
export type NotificationEventType =
  | 'driver_assigned'
  | 'picked_up'
  | 'in_transit'
  | 'delivered'
  | 'failed'
  | 'new_offer'
  | 'pickup_reminder'
  | 'rating_request';
export type NotificationRecipientType = 'customer' | 'vendor' | 'driver';
export type NotificationStatus = 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled';

export type ScheduleType = 'once' | 'recurring';
export type ScheduledDeliveryStatus = 'active' | 'paused' | 'completed' | 'cancelled';
export type StopType = 'pickup' | 'delivery';
export type StopStatus = 'pending' | 'arrived' | 'completed' | 'failed' | 'skipped';
export type ApiKeyEnvironment = 'live' | 'test';

// --- Types applicatifs (colonnes varchar, pas d'enum PostgreSQL) ---

export type DriverType = 'independent' | 'company' | 'company_employed' | 'freelance';
export type CompanyTransactionType =
  | 'earning'
  | 'delivery_earning'
  | 'commission'
  | 'commission_deduction'
  | 'withdrawal'
  | 'bonus'
  | 'penalty'
  | 'adjustment'
  | 'deposit'
  | 'refund';
export type DeliveryCompanyStatus = 'pending' | 'active' | 'suspended' | 'inactive' | 'terminated';
export type BusinessClientPlan = 'starter' | 'growth' | 'business' | 'enterprise';
export type BusinessClientStatus = 'pending' | 'active' | 'suspended' | 'inactive';
export type AdminRole = 'super_admin' | 'admin' | 'support' | 'viewer';
export type CompanyUserRole = 'owner' | 'admin' | 'manager' | 'dispatcher' | 'accountant';
export type PayoutMethod = 'mobile_money' | 'bank_transfer';

// --- Types module Trust (applicatifs, driver-app) ---

export type DocumentType = 'cni' | 'passport' | 'permis' | 'carte_consulaire';
export type DocumentVerificationStatus = 'pending' | 'processing' | 'verified' | 'rejected' | 'expired';
export type TrustLevel = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
export type InsuranceType = 'basic' | 'standard' | 'premium';
export type ClaimStatus = 'pending' | 'processing' | 'approved' | 'rejected' | 'paid';

// --- Types module Mobile Money (applicatifs, driver-app) ---

export type MobileMoneyTransactionType = 'payment' | 'withdrawal' | 'deposit' | 'transfer' | 'refund' | 'earnings';
export type MobileMoneyTransactionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'expired';

// --- Types incidents (varchar, pas d'enum PostgreSQL) ---

export type IncidentTypeCode =
  | 'package_damaged'
  | 'package_lost'
  | 'delivery_delayed'
  | 'wrong_address'
  | 'customer_unavailable'
  | 'driver_misconduct'
  | 'payment_issue'
  | 'customer_absent'
  | 'address_not_found'
  | 'customer_refused'
  | 'vehicle_breakdown'
  | 'security_issue'
  | 'other';

// --- Permissions API ---

export type ApiPermission =
  | 'deliveries:read'
  | 'deliveries:create'
  | 'deliveries:update'
  | 'deliveries:cancel'
  | 'tracking:read'
  | 'webhooks:manage'
  | 'stats:read';

// --- Alias de compatibilité ---

export type TimeSlot = TimeSlotType;
export type RecipientType = NotificationRecipientType;

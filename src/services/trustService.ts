// Service de Confiance Renforcé - LogiTrack Africa
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';
import {
  IdentityDocument,
  VerificationResult,
  VerificationStatus,
  DocumentType,
  DriverReliabilityScore,
  TrustBadge,
  TRUST_LEVELS,
  PackageInsurance,
  InsuranceClaim,
  InsuranceType,
  INSURANCE_PLANS,
  SharedTracking,
  TrackingUpdate,
  DeliveryProof,
} from '../types/trust';

// ============================================
// VÉRIFICATION D'IDENTITÉ AVEC IA
// ============================================

export async function uploadIdentityDocument(
  driverId: string,
  documentType: DocumentType,
  frontImage: File,
  backImage: File | null,
  selfieImage: File
): Promise<{ success: boolean; documentId?: string; error?: string }> {
  try {
    // Upload des images vers Supabase Storage
    const timestamp = Date.now();
    const basePath = `identity/${driverId}/${timestamp}`;

    // Upload front
    const { data: frontData, error: frontError } = await supabase.storage
      .from('documents')
      .upload(`${basePath}/front.jpg`, frontImage);
    if (frontError) throw frontError;

    // Upload back (si applicable)
    let backUrl = null;
    if (backImage) {
      const { data: backData, error: backError } = await supabase.storage
        .from('documents')
        .upload(`${basePath}/back.jpg`, backImage);
      if (backError) throw backError;
      backUrl = backData.path;
    }

    // Upload selfie
    const { data: selfieData, error: selfieError } = await supabase.storage
      .from('documents')
      .upload(`${basePath}/selfie.jpg`, selfieImage);
    if (selfieError) throw selfieError;

    // Obtenir les URLs publiques
    const frontUrl = supabase.storage.from('documents').getPublicUrl(frontData.path).data.publicUrl;
    const selfieUrl = supabase.storage.from('documents').getPublicUrl(selfieData.path).data.publicUrl;
    const backPublicUrl = backUrl
      ? supabase.storage.from('documents').getPublicUrl(backUrl).data.publicUrl
      : null;

    // Créer l'enregistrement de document
    const { data: doc, error: docError } = await supabase
      .from('identity_documents')
      .insert({
        driver_id: driverId,
        document_type: documentType,
        front_image_url: frontUrl,
        back_image_url: backPublicUrl,
        selfie_url: selfieUrl,
        verification_status: 'pending',
      })
      .select()
      .single();

    if (docError) throw docError;

    // Update driver verification status to pending
    await supabase
      .from('logitrack_drivers')
      .update({ verification_status: 'pending' })
      .eq('id', driverId);

    return { success: true, documentId: doc.id };
  } catch (error: any) {
    logger.error('Error uploading identity document', { error });
    return { success: false, error: error.message };
  }
}

export async function getVerificationStatus(driverId: string): Promise<IdentityDocument | null> {
  const { data, error } = await supabase
    .from('identity_documents')
    .select('*')
    .eq('driver_id', driverId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) return null;
  return data;
}

// ============================================
// SCORE DE FIABILITÉ
// ============================================

export async function calculateReliabilityScore(driverId: string): Promise<DriverReliabilityScore> {
  try {
    // Récupérer les statistiques du livreur
    const { data: driver } = await supabase
      .from('logitrack_drivers')
      .select('*, logitrack_deliveries(*), logitrack_incidents(*)')
      .eq('id', driverId)
      .single();

    if (!driver) throw new Error('Driver not found');

    const deliveries = driver.logitrack_deliveries || [];
    const incidents = driver.logitrack_incidents || [];

    // Calculer les métriques
    const totalDeliveries = deliveries.length;
    const successfulDeliveries = deliveries.filter((d: any) => d.status === 'delivered').length;
    const onTimeDeliveries = deliveries.filter((d: any) => !d.is_late).length;

    // Taux
    const deliverySuccessRate = totalDeliveries > 0 ? (successfulDeliveries / totalDeliveries) * 100 : 100;
    const onTimeRate = totalDeliveries > 0 ? (onTimeDeliveries / totalDeliveries) * 100 : 100;
    const incidentRate = totalDeliveries > 0 ? (incidents.length / totalDeliveries) * 100 : 0;

    // Note moyenne clients
    const reviews = deliveries.filter((d: any) => d.customer_rating);
    const customerRatingAvg = reviews.length > 0
      ? reviews.reduce((sum: number, d: any) => sum + d.customer_rating, 0) / reviews.length
      : 5;

    // Bonus vérification
    const verificationBonus = driver.is_identity_verified ? 10 : 0;

    // Bonus ancienneté (1 point par mois, max 10)
    const monthsActive = Math.floor(
      (Date.now() - new Date(driver.created_at).getTime()) / (30 * 24 * 60 * 60 * 1000)
    );
    const experienceBonus = Math.min(monthsActive, 10);

    // Score global pondéré
    const overallScore = Math.round(
      deliverySuccessRate * 0.25 +
      onTimeRate * 0.20 +
      (customerRatingAvg / 5) * 100 * 0.25 +
      (100 - incidentRate) * 0.15 +
      verificationBonus +
      experienceBonus * 0.5
    );

    // Déterminer le niveau de confiance
    let trustLevel: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' = 'bronze';
    if (overallScore >= 91) trustLevel = 'diamond';
    else if (overallScore >= 76) trustLevel = 'platinum';
    else if (overallScore >= 61) trustLevel = 'gold';
    else if (overallScore >= 41) trustLevel = 'silver';

    // Récupérer les badges existants
    const { data: badgesData } = await supabase
      .from('driver_badges')
      .select('*')
      .eq('driver_id', driverId);

    const badges: TrustBadge[] = badgesData || [];

    const score: DriverReliabilityScore = {
      driver_id: driverId,
      overall_score: Math.min(100, Math.max(0, overallScore)),
      trust_level: trustLevel,
      delivery_success_rate: Math.round(deliverySuccessRate),
      on_time_rate: Math.round(onTimeRate),
      customer_rating_avg: Math.round(customerRatingAvg * 10) / 10,
      incident_rate: Math.round(incidentRate * 10) / 10,
      verification_bonus: verificationBonus,
      experience_bonus: experienceBonus,
      total_deliveries: totalDeliveries,
      successful_deliveries: successfulDeliveries,
      failed_deliveries: totalDeliveries - successfulDeliveries,
      total_incidents: incidents.length,
      total_reviews: reviews.length,
      badges,
      updated_at: new Date().toISOString(),
    };

    // Sauvegarder le score
    const { driver_id: _, ...scoreWithoutDriverId } = score;
    await supabase
      .from('driver_reliability_scores')
      .upsert({
        driver_id: driverId,
        ...scoreWithoutDriverId,
        badges: JSON.stringify(badges),
      });

    // Mettre à jour le driver
    await supabase
      .from('logitrack_drivers')
      .update({
        reliability_score: score.overall_score,
        trust_level: trustLevel,
      })
      .eq('id', driverId);

    return score;
  } catch (error) {
    logger.error('Error calculating reliability score', { error });
    throw error;
  }
}

export async function getReliabilityScore(driverId: string): Promise<DriverReliabilityScore | null> {
  const { data, error } = await supabase
    .from('driver_reliability_scores')
    .select('*')
    .eq('driver_id', driverId)
    .single();

  if (error || !data) {
    // Si pas de score, le calculer
    return calculateReliabilityScore(driverId);
  }

  return {
    ...data,
    badges: typeof data.badges === 'string' ? JSON.parse(data.badges) : data.badges,
  };
}

async function addTrustBadge(driverId: string, badge: TrustBadge): Promise<void> {
  await supabase
    .from('driver_badges')
    .upsert({
      driver_id: driverId,
      badge_id: badge.id,
      name: badge.name,
      description: badge.description,
      icon: badge.icon,
      earned_at: badge.earned_at,
    });
}

// ============================================
// ASSURANCE COLIS
// ============================================

export function calculateInsurancePremium(
  declaredValue: number,
  insuranceType: InsuranceType
): { premium: number; coverage: number } {
  const plan = INSURANCE_PLANS[insuranceType];

  const calculatedPremium = Math.round(declaredValue * (plan.premiumPercent / 100));
  const premium = Math.max(calculatedPremium, plan.minPremium);

  const calculatedCoverage = Math.round(declaredValue * (plan.coveragePercent / 100));
  const coverage = Math.min(calculatedCoverage, plan.maxCoverage);

  return { premium, coverage };
}

export async function createPackageInsurance(
  deliveryId: string,
  declaredValue: number,
  insuranceType: InsuranceType
): Promise<{ success: boolean; insurance?: PackageInsurance; error?: string }> {
  try {
    const { premium, coverage } = calculateInsurancePremium(declaredValue, insuranceType);

    const { data, error } = await supabase
      .from('package_insurance')
      .insert({
        delivery_id: deliveryId,
        insurance_type: insuranceType,
        declared_value: declaredValue,
        premium_amount: premium,
        coverage_amount: coverage,
        is_active: true,
        activated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 jours
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, insurance: data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function fileClaim(
  insuranceId: string,
  deliveryId: string,
  driverId: string,
  claimType: 'damage' | 'loss' | 'theft' | 'delay',
  description: string,
  evidenceUrls: string[],
  claimedAmount: number
): Promise<{ success: boolean; claimId?: string; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('insurance_claims')
      .insert({
        insurance_id: insuranceId,
        delivery_id: deliveryId,
        driver_id: driverId,
        claim_type: claimType,
        description,
        evidence_urls: evidenceUrls,
        claimed_amount: claimedAmount,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, claimId: data.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============================================
// TRACKING PARTAGEABLE
// ============================================

export async function createShareableTracking(
  deliveryId: string,
  options: {
    showDriverName?: boolean;
    showDriverPhone?: boolean;
    showDriverPhoto?: boolean;
    showEta?: boolean;
    expiresInHours?: number;
  } = {}
): Promise<{ success: boolean; shareUrl?: string; shareCode?: string; error?: string }> {
  try {
    // Générer un code unique court
    const shareCode = generateShareCode();
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/track/${shareCode}`;

    const expiresAt = new Date(
      Date.now() + (options.expiresInHours || 24) * 60 * 60 * 1000
    ).toISOString();

    const { data, error } = await supabase
      .from('shared_tracking')
      .insert({
        delivery_id: deliveryId,
        share_code: shareCode,
        share_url: shareUrl,
        show_driver_name: options.showDriverName ?? true,
        show_driver_phone: options.showDriverPhone ?? false,
        show_driver_photo: options.showDriverPhoto ?? true,
        show_eta: options.showEta ?? true,
        is_active: true,
        expires_at: expiresAt,
        view_count: 0,
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, shareUrl, shareCode };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

function generateShareCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function generateWhatsAppShareLink(shareUrl: string, recipientPhone?: string): string {
  const message = encodeURIComponent(
    `📦 Suivez votre livraison en temps réel!\n\n` +
    `🔗 ${shareUrl}\n\n` +
    `Powered by LogiTrack Africa`
  );

  if (recipientPhone) {
    // Nettoyer le numéro
    const cleanPhone = recipientPhone.replace(/\D/g, '');
    const fullPhone = cleanPhone.startsWith('225') ? cleanPhone : `225${cleanPhone}`;
    return `https://wa.me/${fullPhone}?text=${message}`;
  }

  return `https://wa.me/?text=${message}`;
}

export async function getTrackingByCode(shareCode: string): Promise<{
  tracking: SharedTracking;
  delivery: any;
  driver: any;
  updates: TrackingUpdate[];
} | null> {
  try {
    const { data: tracking, error } = await supabase
      .from('shared_tracking')
      .select(`
        *,
        delivery:logitrack_deliveries(
          *,
          driver:logitrack_drivers(
            id, full_name, phone, avatar_url, reliability_score, trust_level
          )
        )
      `)
      .eq('share_code', shareCode)
      .eq('is_active', true)
      .single();

    if (error || !tracking) return null;

    // Vérifier l'expiration
    if (new Date(tracking.expires_at) < new Date()) {
      return null;
    }

    // Incrémenter le compteur de vues
    await supabase
      .from('shared_tracking')
      .update({ view_count: tracking.view_count + 1 })
      .eq('id', tracking.id);

    // Récupérer les mises à jour de position
    const { data: updates } = await supabase
      .from('tracking_updates')
      .select('*')
      .eq('delivery_id', tracking.delivery_id)
      .order('created_at', { ascending: false })
      .limit(50);

    return {
      tracking,
      delivery: tracking.delivery,
      driver: tracking.delivery?.driver,
      updates: updates || [],
    };
  } catch (error) {
    logger.error('Error getting tracking', { error });
    return null;
  }
}

export async function updateTrackingPosition(
  deliveryId: string,
  latitude: number,
  longitude: number,
  accuracy: number,
  etaMinutes?: number,
  distanceRemaining?: number
): Promise<void> {
  await supabase
    .from('tracking_updates')
    .insert({
      delivery_id: deliveryId,
      latitude,
      longitude,
      accuracy,
      eta_minutes: etaMinutes,
      distance_remaining: distanceRemaining,
    });
}

// ============================================
// PREUVE DE LIVRAISON (PHOTO)
// ============================================

export async function uploadDeliveryProof(
  deliveryId: string,
  driverId: string,
  photo: File,
  photoType: 'package' | 'recipient' | 'signature' | 'location',
  location?: { latitude: number; longitude: number }
): Promise<{ success: boolean; proofId?: string; error?: string }> {
  try {
    const timestamp = Date.now();
    const path = `proofs/${deliveryId}/${photoType}_${timestamp}.jpg`;

    // Upload de la photo
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('delivery-proofs')
      .upload(path, photo);

    if (uploadError) throw uploadError;

    const photoUrl = supabase.storage.from('delivery-proofs').getPublicUrl(path).data.publicUrl;

    // Analyser la photo avec l'IA (simulation)
    const aiAnalysis = await analyzeDeliveryPhoto(photoUrl, photoType);

    // Créer l'enregistrement de preuve
    const { data, error } = await supabase
      .from('delivery_proofs')
      .insert({
        delivery_id: deliveryId,
        driver_id: driverId,
        photo_url: photoUrl,
        photo_type: photoType,
        latitude: location?.latitude,
        longitude: location?.longitude,
        taken_at: new Date().toISOString(),
        is_verified: aiAnalysis.confidence > 0.7,
        ai_analysis: aiAnalysis,
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, proofId: data.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function analyzeDeliveryPhoto(
  photoUrl: string,
  photoType: string
): Promise<{ hasPackage: boolean; hasPerson: boolean; confidence: number }> {
  // Simulation - en prod, utiliser une vraie API de vision IA
  await new Promise(resolve => setTimeout(resolve, 1000));

  return {
    hasPackage: photoType === 'package' || photoType === 'recipient',
    hasPerson: photoType === 'recipient',
    confidence: 0.75 + Math.random() * 0.25,
  };
}

export async function getDeliveryProofs(deliveryId: string): Promise<DeliveryProof[]> {
  const { data, error } = await supabase
    .from('delivery_proofs')
    .select('*')
    .eq('delivery_id', deliveryId)
    .order('created_at', { ascending: true });

  if (error) return [];
  return data;
}

export async function saveSignature(
  deliveryId: string,
  signatureData: string,
  signerName: string,
  signerPhone?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('delivery_signatures')
      .insert({
        delivery_id: deliveryId,
        signature_data: signatureData,
        signer_name: signerName,
        signer_phone: signerPhone,
      });

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

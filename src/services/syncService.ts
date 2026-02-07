// Service de synchronisation - LogiTrack Africa
// Gère la synchronisation des données hors-ligne vers le serveur

import { supabase } from '../lib/supabase';
import { offlineLogger } from '../utils/logger';
import {
  getPendingActions,
  updateActionStatus,
  getPendingPhotos,
  cleanupSyncedActions,
  getOfflineStats,
} from './offlineStorageService';

interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

let isSyncing = false;
let syncListeners: ((status: SyncStatus) => void)[] = [];

export interface SyncStatus {
  isSyncing: boolean;
  lastSync: Date | null;
  pendingActions: number;
  pendingPhotos: number;
  progress: number;
  error?: string;
}

let currentStatus: SyncStatus = {
  isSyncing: false,
  lastSync: null,
  pendingActions: 0,
  pendingPhotos: 0,
  progress: 0,
};

/**
 * Ajoute un listener pour les mises à jour de statut
 */
export function addSyncListener(listener: (status: SyncStatus) => void): () => void {
  syncListeners.push(listener);
  listener(currentStatus); // Envoyer le statut actuel immédiatement
  return () => {
    syncListeners = syncListeners.filter(l => l !== listener);
  };
}

function notifyListeners() {
  syncListeners.forEach(listener => listener({ ...currentStatus }));
}

function updateStatus(updates: Partial<SyncStatus>) {
  currentStatus = { ...currentStatus, ...updates };
  notifyListeners();
}

/**
 * Lance la synchronisation complète
 */
export async function syncAll(): Promise<SyncResult> {
  if (isSyncing) {
    return { success: false, synced: 0, failed: 0, errors: ['Synchronisation déjà en cours'] };
  }

  // Vérifier la connexion
  if (!navigator.onLine) {
    return { success: false, synced: 0, failed: 0, errors: ['Pas de connexion internet'] };
  }

  isSyncing = true;
  updateStatus({ isSyncing: true, progress: 0, error: undefined });

  const result: SyncResult = {
    success: true,
    synced: 0,
    failed: 0,
    errors: [],
  };

  try {
    // 1. Synchroniser les actions en attente
    const actionsResult = await syncPendingActions();
    result.synced += actionsResult.synced;
    result.failed += actionsResult.failed;
    result.errors.push(...actionsResult.errors);
    updateStatus({ progress: 50 });

    // 2. Synchroniser les photos en attente
    const photosResult = await syncPendingPhotos();
    result.synced += photosResult.synced;
    result.failed += photosResult.failed;
    result.errors.push(...photosResult.errors);
    updateStatus({ progress: 90 });

    // 3. Nettoyer les anciennes données synchronisées
    await cleanupSyncedActions();
    updateStatus({ progress: 100 });

    // Mettre à jour les stats
    const stats = await getOfflineStats();
    updateStatus({
      pendingActions: stats.pendingActions,
      pendingPhotos: stats.pendingPhotos,
      lastSync: new Date(),
    });

    result.success = result.failed === 0;
  } catch (error: any) {
    result.success = false;
    result.errors.push(error.message);
    updateStatus({ error: error.message });
  } finally {
    isSyncing = false;
    updateStatus({ isSyncing: false });
  }

  return result;
}

/**
 * Synchronise les actions en attente
 */
async function syncPendingActions(): Promise<SyncResult> {
  const result: SyncResult = { success: true, synced: 0, failed: 0, errors: [] };

  const pendingActions = await getPendingActions();

  for (const action of pendingActions) {
    try {
      await updateActionStatus(action.id, 'syncing');

      switch (action.type) {
        case 'update_status':
          await syncUpdateStatus(action);
          break;
        case 'add_proof':
          await syncAddProof(action);
          break;
        case 'add_tracking':
          await syncAddTracking(action);
          break;
        case 'complete_delivery':
          await syncCompleteDelivery(action);
          break;
      }

      await updateActionStatus(action.id, 'synced');
      result.synced++;
    } catch (error: any) {
      await updateActionStatus(action.id, 'error', error.message);
      result.failed++;
      result.errors.push(`Action ${action.id}: ${error.message}`);

      // Si trop de tentatives, abandonner
      if (action.retryCount >= 5) {
        offlineLogger.error(`Abandon de l'action ${action.id} après 5 tentatives`);
      }
    }
  }

  return result;
}

/**
 * Synchronise les photos en attente
 */
async function syncPendingPhotos(): Promise<SyncResult> {
  const result: SyncResult = { success: true, synced: 0, failed: 0, errors: [] };

  const pendingPhotos = await getPendingPhotos();

  for (const photo of pendingPhotos) {
    try {
      // Convertir base64 en blob
      const blob = await fetch(photo.photoData).then(r => r.blob());

      // Upload vers Supabase Storage
      const path = `proofs/${photo.deliveryId}/${photo.photoType}_${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('delivery-proofs')
        .upload(path, blob);

      if (uploadError) throw uploadError;

      // Créer l'enregistrement de preuve
      const photoUrl = supabase.storage.from('delivery-proofs').getPublicUrl(path).data.publicUrl;

      await supabase.from('delivery_proofs').insert({
        delivery_id: photo.deliveryId,
        driver_id: photo.metadata?.driverId,
        photo_url: photoUrl,
        photo_type: photo.photoType,
        latitude: photo.metadata?.latitude,
        longitude: photo.metadata?.longitude,
        taken_at: new Date(photo.createdAt).toISOString(),
      });

      result.synced++;
    } catch (error: any) {
      result.failed++;
      result.errors.push(`Photo ${photo.id}: ${error.message}`);
    }
  }

  return result;
}

// Fonctions de synchronisation spécifiques

async function syncUpdateStatus(action: any): Promise<void> {
  const { deliveryId, payload } = action;

  const { error } = await supabase
    .from('deliveries')
    .update({
      status: payload.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', deliveryId);

  if (error) throw error;
}

async function syncAddProof(action: any): Promise<void> {
  const { deliveryId, payload } = action;

  const { error } = await supabase.from('delivery_proofs').insert({
    delivery_id: deliveryId,
    driver_id: payload.driverId,
    photo_url: payload.photoUrl,
    photo_type: payload.photoType,
    latitude: payload.latitude,
    longitude: payload.longitude,
    taken_at: payload.takenAt,
  });

  if (error) throw error;
}

async function syncAddTracking(action: any): Promise<void> {
  const { deliveryId, payload } = action;

  const { error } = await supabase.from('tracking_updates').insert({
    delivery_id: deliveryId,
    latitude: payload.latitude,
    longitude: payload.longitude,
    accuracy: payload.accuracy,
    eta_minutes: payload.etaMinutes,
    distance_remaining: payload.distanceRemaining,
  });

  if (error) throw error;
}

async function syncCompleteDelivery(action: any): Promise<void> {
  const { deliveryId, payload } = action;

  const { error } = await supabase
    .from('deliveries')
    .update({
      status: 'delivered',
      delivered_at: payload.deliveredAt,
      recipient_signature: payload.signature,
      updated_at: new Date().toISOString(),
    })
    .eq('id', deliveryId);

  if (error) throw error;
}

/**
 * Configure la synchronisation automatique
 */
export function setupAutoSync(intervalMs = 60000): () => void {
  // Synchroniser quand on revient en ligne
  const handleOnline = () => {
    offlineLogger.info('Connexion rétablie, synchronisation...');
    syncAll();
  };

  window.addEventListener('online', handleOnline);

  // Synchronisation périodique
  const intervalId = setInterval(() => {
    if (navigator.onLine) {
      syncAll();
    }
  }, intervalMs);

  // Synchronisation au focus de l'app
  const handleVisibilityChange = () => {
    if (!document.hidden && navigator.onLine) {
      syncAll();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Retourner une fonction de nettoyage
  return () => {
    window.removeEventListener('online', handleOnline);
    clearInterval(intervalId);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}

/**
 * Vérifie s'il y a des données à synchroniser
 */
export async function hasPendingData(): Promise<boolean> {
  const stats = await getOfflineStats();
  return stats.pendingActions > 0 || stats.pendingPhotos > 0;
}

/**
 * Obtient le statut actuel
 */
export function getSyncStatus(): SyncStatus {
  return { ...currentStatus };
}

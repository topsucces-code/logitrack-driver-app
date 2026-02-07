// Service de stockage hors-ligne avancé - LogiTrack Africa
// Utilise IndexedDB pour un stockage persistant

import { offlineLogger } from '../utils/logger';

const DB_NAME = 'logitrack-offline';
const DB_VERSION = 1;

interface OfflineDelivery {
  id: string;
  data: any;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'error';
  createdAt: number;
  updatedAt: number;
  retryCount: number;
}

interface OfflineAction {
  id: string;
  type: 'update_status' | 'add_proof' | 'add_tracking' | 'complete_delivery';
  deliveryId: string;
  payload: any;
  createdAt: number;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'error';
  errorMessage?: string;
  retryCount: number;
}

interface CachedZone {
  id: string;
  data: any;
  cachedAt: number;
}

let db: IDBDatabase | null = null;

/**
 * Initialise la base de données IndexedDB
 */
export async function initOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      offlineLogger.error('Erreur ouverture IndexedDB', { error: request.error });
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      offlineLogger.info('IndexedDB initialisée');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Store pour les livraisons en cache
      if (!database.objectStoreNames.contains('deliveries')) {
        const deliveriesStore = database.createObjectStore('deliveries', { keyPath: 'id' });
        deliveriesStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        deliveriesStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      // Store pour les actions hors-ligne
      if (!database.objectStoreNames.contains('actions')) {
        const actionsStore = database.createObjectStore('actions', { keyPath: 'id' });
        actionsStore.createIndex('deliveryId', 'deliveryId', { unique: false });
        actionsStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        actionsStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // Store pour les zones en cache
      if (!database.objectStoreNames.contains('zones')) {
        database.createObjectStore('zones', { keyPath: 'id' });
      }

      // Store pour les cartes hors-ligne
      if (!database.objectStoreNames.contains('mapTiles')) {
        const mapStore = database.createObjectStore('mapTiles', { keyPath: 'key' });
        mapStore.createIndex('zoneId', 'zoneId', { unique: false });
      }

      // Store pour les paramètres utilisateur
      if (!database.objectStoreNames.contains('settings')) {
        database.createObjectStore('settings', { keyPath: 'key' });
      }

      // Store pour les photos en attente
      if (!database.objectStoreNames.contains('pendingPhotos')) {
        const photosStore = database.createObjectStore('pendingPhotos', { keyPath: 'id' });
        photosStore.createIndex('deliveryId', 'deliveryId', { unique: false });
      }
    };
  });
}

// ========================================
// GESTION DES LIVRAISONS HORS-LIGNE
// ========================================

/**
 * Cache une livraison localement
 */
export async function cacheDelivery(delivery: any): Promise<void> {
  const database = await initOfflineDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['deliveries'], 'readwrite');
    const store = transaction.objectStore('deliveries');

    const offlineDelivery: OfflineDelivery = {
      id: delivery.id,
      data: delivery,
      syncStatus: 'synced',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      retryCount: 0,
    };

    const request = store.put(offlineDelivery);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Récupère une livraison du cache
 */
export async function getCachedDelivery(id: string): Promise<any | null> {
  const database = await initOfflineDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['deliveries'], 'readonly');
    const store = transaction.objectStore('deliveries');
    const request = store.get(id);

    request.onsuccess = () => {
      const result = request.result as OfflineDelivery | undefined;
      resolve(result?.data || null);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Récupère toutes les livraisons en cache
 */
export async function getAllCachedDeliveries(): Promise<any[]> {
  const database = await initOfflineDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['deliveries'], 'readonly');
    const store = transaction.objectStore('deliveries');
    const request = store.getAll();

    request.onsuccess = () => {
      const results = request.result as OfflineDelivery[];
      resolve(results.map(r => r.data));
    };
    request.onerror = () => reject(request.error);
  });
}

// ========================================
// GESTION DES ACTIONS HORS-LIGNE
// ========================================

/**
 * Enregistre une action à synchroniser
 */
export async function queueOfflineAction(
  type: OfflineAction['type'],
  deliveryId: string,
  payload: any
): Promise<string> {
  const database = await initOfflineDB();
  const actionId = `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['actions'], 'readwrite');
    const store = transaction.objectStore('actions');

    const action: OfflineAction = {
      id: actionId,
      type,
      deliveryId,
      payload,
      createdAt: Date.now(),
      syncStatus: 'pending',
      retryCount: 0,
    };

    const request = store.add(action);

    request.onsuccess = () => resolve(actionId);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Récupère les actions en attente de synchronisation
 */
export async function getPendingActions(): Promise<OfflineAction[]> {
  const database = await initOfflineDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['actions'], 'readonly');
    const store = transaction.objectStore('actions');
    const index = store.index('syncStatus');
    const request = index.getAll('pending');

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Met à jour le statut d'une action
 */
export async function updateActionStatus(
  actionId: string,
  status: OfflineAction['syncStatus'],
  errorMessage?: string
): Promise<void> {
  const database = await initOfflineDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['actions'], 'readwrite');
    const store = transaction.objectStore('actions');
    const getRequest = store.get(actionId);

    getRequest.onsuccess = () => {
      const action = getRequest.result as OfflineAction;
      if (action) {
        action.syncStatus = status;
        if (errorMessage) action.errorMessage = errorMessage;
        if (status === 'error') action.retryCount++;

        const updateRequest = store.put(action);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(updateRequest.error);
      } else {
        resolve();
      }
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

/**
 * Supprime les actions synchronisées (nettoyage)
 */
export async function cleanupSyncedActions(olderThanDays = 7): Promise<number> {
  const database = await initOfflineDB();
  const cutoffTime = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['actions'], 'readwrite');
    const store = transaction.objectStore('actions');
    const index = store.index('syncStatus');
    const request = index.openCursor('synced');
    let deletedCount = 0;

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        const action = cursor.value as OfflineAction;
        if (action.createdAt < cutoffTime) {
          cursor.delete();
          deletedCount++;
        }
        cursor.continue();
      } else {
        resolve(deletedCount);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

// ========================================
// GESTION DES PHOTOS HORS-LIGNE
// ========================================

/**
 * Stocke une photo en attente de synchronisation
 */
export async function storePendingPhoto(
  deliveryId: string,
  photoType: string,
  photoData: string, // Base64
  metadata?: any
): Promise<string> {
  const database = await initOfflineDB();
  const photoId = `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Compress photo before storing to reduce IndexedDB size
  let compressedData = photoData;
  try {
    compressedData = await compressImage(photoData, 800, 0.7);
  } catch {
    // If compression fails, use original
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['pendingPhotos'], 'readwrite');
    const store = transaction.objectStore('pendingPhotos');

    const photo = {
      id: photoId,
      deliveryId,
      photoType,
      photoData: compressedData,
      metadata,
      createdAt: Date.now(),
      synced: false,
    };

    const request = store.add(photo);

    request.onsuccess = () => resolve(photoId);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Récupère les photos en attente pour une livraison
 */
export async function getPendingPhotos(deliveryId?: string): Promise<any[]> {
  const database = await initOfflineDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['pendingPhotos'], 'readonly');
    const store = transaction.objectStore('pendingPhotos');

    if (deliveryId) {
      const index = store.index('deliveryId');
      const request = index.getAll(deliveryId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    } else {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result.filter((p: any) => !p.synced));
      request.onerror = () => reject(request.error);
    }
  });
}

// ========================================
// GESTION DES PARAMÈTRES
// ========================================

/**
 * Sauvegarde un paramètre
 */
export async function saveSetting(key: string, value: any): Promise<void> {
  const database = await initOfflineDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['settings'], 'readwrite');
    const store = transaction.objectStore('settings');
    const request = store.put({ key, value, updatedAt: Date.now() });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Récupère un paramètre
 */
export async function getSetting<T>(key: string, defaultValue?: T): Promise<T | undefined> {
  const database = await initOfflineDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['settings'], 'readonly');
    const store = transaction.objectStore('settings');
    const request = store.get(key);

    request.onsuccess = () => {
      const result = request.result;
      resolve(result?.value ?? defaultValue);
    };
    request.onerror = () => reject(request.error);
  });
}

// ========================================
// STATISTIQUES ET UTILITAIRES
// ========================================

/**
 * Obtient les statistiques du cache
 */
export async function getOfflineStats(): Promise<{
  cachedDeliveries: number;
  pendingActions: number;
  pendingPhotos: number;
  totalSize: string;
}> {
  const database = await initOfflineDB();

  const [deliveries, actions, photos] = await Promise.all([
    new Promise<number>((resolve) => {
      const tx = database.transaction(['deliveries'], 'readonly');
      const req = tx.objectStore('deliveries').count();
      req.onsuccess = () => resolve(req.result);
    }),
    new Promise<number>((resolve) => {
      const tx = database.transaction(['actions'], 'readonly');
      const index = tx.objectStore('actions').index('syncStatus');
      const req = index.count('pending');
      req.onsuccess = () => resolve(req.result);
    }),
    new Promise<number>((resolve) => {
      const tx = database.transaction(['pendingPhotos'], 'readonly');
      const req = tx.objectStore('pendingPhotos').count();
      req.onsuccess = () => resolve(req.result);
    }),
  ]);

  // Estimation de la taille
  let totalSize = 0;
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    totalSize = estimate.usage || 0;
  }

  return {
    cachedDeliveries: deliveries,
    pendingActions: actions,
    pendingPhotos: photos,
    totalSize: formatBytes(totalSize),
  };
}

/**
 * Vide le cache (dangereux - demander confirmation)
 */
export async function clearAllCache(): Promise<void> {
  const database = await initOfflineDB();

  const stores = ['deliveries', 'actions', 'zones', 'mapTiles', 'pendingPhotos'];

  for (const storeName of stores) {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

/**
 * Compresse une image base64 avant stockage
 * Réduit les photos de 2-5MB à 50-200KB
 */
export function compressImage(
  base64: string,
  maxWidth = 800,
  quality = 0.7
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;

      // Scale down if needed
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64); // Fallback to original
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const compressed = canvas.toDataURL('image/jpeg', quality);
      resolve(compressed);
    };
    img.onerror = () => reject(new Error('Failed to load image for compression'));

    // Handle both raw base64 and data URL formats
    img.src = base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
  });
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Initialiser automatiquement
if (typeof window !== 'undefined') {
  initOfflineDB().catch((err) => offlineLogger.error('Failed to init IndexedDB', { error: err }));
}

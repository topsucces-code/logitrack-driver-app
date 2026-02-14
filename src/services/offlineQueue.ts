/**
 * Offline Queue Service
 * Stores failed API requests and retries them when back online
 */

import { offlineLogger } from "../utils/logger";

const QUEUE_STORAGE_KEY = "logitrack_offline_queue";
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY = 5000; // 5 seconds
const MAX_RETRY_DELAY = 60000; // 60 seconds

function getRetryDelay(retries: number): number {
  return Math.min(BASE_RETRY_DELAY * Math.pow(2, retries), MAX_RETRY_DELAY);
}

export interface QueuedAction {
  id: string;
  type:
    | "update_status"
    | "update_location"
    | "report_incident"
    | "accept_delivery";
  payload: Record<string, unknown>;
  timestamp: number;
  retries: number;
}

interface QueueState {
  isOnline: boolean;
  isProcessing: boolean;
  queue: QueuedAction[];
}

const state: QueueState = {
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  isProcessing: false,
  queue: [],
};

// Action handlers map
type ActionHandler = (
  payload: Record<string, unknown>,
) => Promise<{ success: boolean; error?: string }>;
const actionHandlers: Map<string, ActionHandler> = new Map();

/**
 * Initialize the offline queue
 * Call this on app startup
 */
export function initOfflineQueue(): void {
  // Load queue from storage
  loadQueueFromStorage();

  // Listen for online/offline events
  if (typeof window !== "undefined") {
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Check initial state
    state.isOnline = navigator.onLine;

    // Process queue if online
    if (state.isOnline && state.queue.length > 0) {
      processQueue();
    }
  }
}

/**
 * Register an action handler
 */
export function registerActionHandler(
  type: string,
  handler: ActionHandler,
): void {
  actionHandlers.set(type, handler);
}

/**
 * Add an action to the queue
 */
export function queueAction(
  type: QueuedAction["type"],
  payload: Record<string, unknown>,
): string {
  const action: QueuedAction = {
    id: generateId(),
    type,
    payload,
    timestamp: Date.now(),
    retries: 0,
  };

  state.queue.push(action);
  saveQueueToStorage();

  offlineLogger.info(`Action queued: ${type}`, { actionId: action.id });

  // Try to process immediately if online
  if (state.isOnline && !state.isProcessing) {
    processQueue();
  }

  return action.id;
}

/**
 * Execute an action with offline fallback
 * Returns immediately if successful, otherwise queues for later
 */
export async function executeWithOfflineFallback<T>(
  type: QueuedAction["type"],
  payload: Record<string, unknown>,
  executor: () => Promise<T>,
): Promise<{ success: boolean; data?: T; queued?: boolean }> {
  // If offline, queue immediately
  if (!state.isOnline) {
    const id = queueAction(type, payload);
    return { success: false, queued: true };
  }

  try {
    const data = await executor();
    return { success: true, data };
  } catch (error) {
    // Network error - queue for retry
    if (isNetworkError(error)) {
      const id = queueAction(type, payload);
      return { success: false, queued: true };
    }
    // Other error - don't queue
    throw error;
  }
}

/**
 * Get current queue status
 */
export function getQueueStatus(): {
  isOnline: boolean;
  pendingCount: number;
  isProcessing: boolean;
} {
  return {
    isOnline: state.isOnline,
    pendingCount: state.queue.length,
    isProcessing: state.isProcessing,
  };
}

/**
 * Clear the queue
 */
export function clearQueue(): void {
  state.queue = [];
  saveQueueToStorage();
}

/**
 * Remove a specific action from queue
 */
export function removeFromQueue(actionId: string): void {
  state.queue = state.queue.filter((a) => a.id !== actionId);
  saveQueueToStorage();
}

// Private functions

function handleOnline(): void {
  offlineLogger.info("Network online");
  state.isOnline = true;

  // Process pending queue
  if (state.queue.length > 0) {
    processQueue();
  }
}

function handleOffline(): void {
  offlineLogger.info("Network offline");
  state.isOnline = false;
}

async function processQueue(): Promise<void> {
  if (state.isProcessing || state.queue.length === 0) return;

  state.isProcessing = true;
  offlineLogger.info(`Processing ${state.queue.length} queued actions`);

  // Process actions one by one
  const actionsToProcess = [...state.queue];

  for (const action of actionsToProcess) {
    if (!state.isOnline) {
      offlineLogger.info("Went offline during processing, stopping");
      break;
    }

    const handler = actionHandlers.get(action.type);

    if (!handler) {
      offlineLogger.warn(`No handler for action type: ${action.type}`);
      removeFromQueue(action.id);
      continue;
    }

    try {
      const result = await handler(action.payload);

      if (result.success) {
        offlineLogger.info(`Action ${action.id} processed successfully`);
        removeFromQueue(action.id);
      } else {
        // Increment retry count
        action.retries++;

        if (action.retries >= MAX_RETRIES) {
          offlineLogger.warn(
            `Action ${action.id} failed after ${MAX_RETRIES} retries, removing`,
          );
          removeFromQueue(action.id);
        } else {
          offlineLogger.info(
            `Action ${action.id} failed, will retry (${action.retries}/${MAX_RETRIES})`,
          );
          saveQueueToStorage();
        }
      }
    } catch (error) {
      offlineLogger.error(`Error processing action ${action.id}`, { error });
      action.retries++;

      if (action.retries >= MAX_RETRIES) {
        removeFromQueue(action.id);
      }
    }

    // Small delay between actions
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  state.isProcessing = false;

  // If still have items and online, schedule another process with backoff
  if (state.queue.length > 0 && state.isOnline) {
    const maxRetries = Math.max(...state.queue.map((a) => a.retries), 0);
    setTimeout(() => processQueue(), getRetryDelay(maxRetries));
  }
}

function loadQueueFromStorage(): void {
  try {
    const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (stored) {
      state.queue = JSON.parse(stored);
      offlineLogger.info(
        `Loaded ${state.queue.length} queued actions from storage`,
      );
    }
  } catch (error) {
    offlineLogger.error("Failed to load queue from storage", { error });
    state.queue = [];
  }
}

function saveQueueToStorage(): void {
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(state.queue));
  } catch (error) {
    offlineLogger.error("Failed to save queue to storage", { error });
  }
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError && error.message === "Failed to fetch") {
    return true;
  }
  if (error instanceof Error && error.message.includes("network")) {
    return true;
  }
  return false;
}

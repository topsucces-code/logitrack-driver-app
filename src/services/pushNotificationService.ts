import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { supabase } from '../lib/supabase';

interface PushNotificationState {
  token: string | null;
  isRegistered: boolean;
  permissionStatus: string;
}

const state: PushNotificationState = {
  token: null,
  isRegistered: false,
  permissionStatus: 'unknown',
};

// Callbacks for notification events
type NotificationCallback = (notification: PushNotificationSchema) => void;
type ActionCallback = (action: ActionPerformed) => void;

let onNotificationReceived: NotificationCallback | null = null;
let onNotificationActionPerformed: ActionCallback | null = null;

/**
 * Initialize push notifications
 * Call this after user authentication
 */
export async function initPushNotifications(
  onReceived?: NotificationCallback,
  onAction?: ActionCallback
): Promise<boolean> {
  // Only available on native platforms
  if (!Capacitor.isNativePlatform()) {
    console.log('Push notifications not available on web');
    return false;
  }

  // Set callbacks
  if (onReceived) onNotificationReceived = onReceived;
  if (onAction) onNotificationActionPerformed = onAction;

  try {
    // Check current permission status
    const permStatus = await PushNotifications.checkPermissions();
    state.permissionStatus = permStatus.receive;

    if (permStatus.receive === 'prompt') {
      // Request permission
      const requestResult = await PushNotifications.requestPermissions();
      state.permissionStatus = requestResult.receive;
    }

    if (state.permissionStatus !== 'granted') {
      console.log('Push notifications permission denied');
      return false;
    }

    // Register listeners
    setupListeners();

    // Register with FCM/APNs
    await PushNotifications.register();
    state.isRegistered = true;

    return true;
  } catch (error) {
    console.error('Failed to initialize push notifications:', error);
    return false;
  }
}

/**
 * Setup push notification listeners
 */
function setupListeners() {
  // On registration success - get token
  PushNotifications.addListener('registration', async (token: Token) => {
    console.log('Push registration success, token:', token.value);
    state.token = token.value;

    // Save token to database
    await saveTokenToDatabase(token.value);
  });

  // On registration error
  PushNotifications.addListener('registrationError', (error) => {
    console.error('Push registration error:', error);
  });

  // On notification received (app in foreground)
  PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
    console.log('Push notification received:', notification);

    if (onNotificationReceived) {
      onNotificationReceived(notification);
    }
  });

  // On notification action (user tapped notification)
  PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
    console.log('Push notification action:', action);

    if (onNotificationActionPerformed) {
      onNotificationActionPerformed(action);
    }
  });
}

/**
 * Save push token to database
 */
async function saveTokenToDatabase(token: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.log('No user logged in, cannot save push token');
      return;
    }

    // Get driver profile
    const { data: driver } = await supabase
      .from('logitrack_drivers')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!driver) {
      console.log('No driver profile found');
      return;
    }

    // Update driver with push token
    const { error } = await supabase
      .from('logitrack_drivers')
      .update({
        push_token: token,
        push_token_updated_at: new Date().toISOString(),
      })
      .eq('id', driver.id);

    if (error) {
      console.error('Failed to save push token:', error);
    } else {
      console.log('Push token saved successfully');
    }
  } catch (error) {
    console.error('Error saving push token:', error);
  }
}

/**
 * Remove push token from database (on logout)
 */
export async function removePushToken(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    const { data: driver } = await supabase
      .from('logitrack_drivers')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (driver) {
      await supabase
        .from('logitrack_drivers')
        .update({
          push_token: null,
          push_token_updated_at: new Date().toISOString(),
        })
        .eq('id', driver.id);
    }

    state.token = null;
  } catch (error) {
    console.error('Error removing push token:', error);
  }
}

/**
 * Get current push notification state
 */
export function getPushState(): PushNotificationState {
  return { ...state };
}

/**
 * Check if push notifications are available
 */
export function isPushAvailable(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Unregister push notifications
 */
export async function unregisterPushNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await removePushToken();
    await PushNotifications.removeAllListeners();
    state.isRegistered = false;
    state.token = null;
  } catch (error) {
    console.error('Error unregistering push notifications:', error);
  }
}

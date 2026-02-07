import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface AppNotification {
  id: string;
  recipient_type: string;
  recipient_id: string;
  delivery_id?: string;
  channel: string;
  template?: string;
  title?: string;
  body: string;
  data?: Record<string, unknown>;
  status: string;
  sent_at?: string;
  delivered_at?: string;
  created_at: string;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  push_enabled: boolean;
  sms_enabled: boolean;
  whatsapp_enabled: boolean;
  email_enabled: boolean;
  driver_assigned_enabled: boolean;
  picked_up_enabled: boolean;
  in_transit_enabled: boolean;
  delivered_enabled: boolean;
  failed_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
}

/**
 * Get notifications for a driver
 */
export async function getNotifications(
  driverId: string,
  limit = 30
): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('logitrack_notifications')
    .select('*')
    .eq('recipient_id', driverId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return [];
  return data as AppNotification[];
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(driverId: string): Promise<number> {
  const { count, error } = await supabase
    .from('logitrack_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', driverId)
    .is('delivered_at', null);

  if (error) return 0;
  return count || 0;
}

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId: string): Promise<void> {
  await supabase
    .from('logitrack_notifications')
    .update({ delivered_at: new Date().toISOString() })
    .eq('id', notificationId);
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(driverId: string): Promise<void> {
  await supabase
    .from('logitrack_notifications')
    .update({ delivered_at: new Date().toISOString() })
    .eq('recipient_id', driverId)
    .is('delivered_at', null);
}

/**
 * Subscribe to new notifications via Realtime
 */
export function subscribeToNotifications(
  driverId: string,
  onNotification: (notification: AppNotification) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`notifications_${driverId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'logitrack_notifications',
        filter: `recipient_id=eq.${driverId}`,
      },
      (payload) => {
        onNotification(payload.new as AppNotification);
      }
    )
    .subscribe();

  return channel;
}

/**
 * Get notification preferences
 */
export async function getPreferences(
  userId: string
): Promise<NotificationPreferences | null> {
  const { data, error } = await supabase
    .from('logitrack_notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as NotificationPreferences;
}

/**
 * Update notification preferences
 */
export async function updatePreferences(
  userId: string,
  prefs: Partial<Omit<NotificationPreferences, 'id' | 'user_id'>>
): Promise<boolean> {
  const { error } = await supabase
    .from('logitrack_notification_preferences')
    .upsert({
      user_id: userId,
      user_type: 'driver',
      ...prefs,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  return !error;
}

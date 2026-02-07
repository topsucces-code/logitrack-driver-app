import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface SubscriptionConfig {
  channelName: string;
  table: string;
  schema?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onPayload: (payload: RealtimePostgresChangesPayload<any>) => void;
}

/**
 * Custom hook for handling Supabase realtime subscriptions
 * Handles cleanup gracefully to prevent AbortError on navigation
 */
export function useRealtimeSubscription({
  channelName,
  table,
  schema = 'public',
  event = '*',
  filter,
  onPayload,
}: SubscriptionConfig) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    // Build subscription config
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config: any = {
      event,
      schema,
      table,
    };

    if (filter) {
      config.filter = filter;
    }

    // Create channel
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', config, (payload) => {
        // Only process if component is still mounted
        if (isMountedRef.current) {
          onPayload(payload);
        }
      });

    // Subscribe with error handling
    channel.subscribe((status, err) => {
      if (err) {
        // Only log if component is still mounted
        if (isMountedRef.current) {
          logger.debug(`Realtime subscription error for ${channelName}`, { error: err.message });
        }
      }
    });

    channelRef.current = channel;

    return () => {
      isMountedRef.current = false;

      // Graceful cleanup - remove channel without causing AbortError
      if (channelRef.current) {
        // Use setTimeout to allow pending operations to complete
        const channelToRemove = channelRef.current;
        channelRef.current = null;

        // Remove after a small delay to prevent race conditions
        setTimeout(() => {
          supabase.removeChannel(channelToRemove).catch(() => {
            // Silently ignore removal errors during cleanup
          });
        }, 100);
      }
    };
  }, [channelName, table, schema, event, filter, onPayload]);

  return channelRef;
}

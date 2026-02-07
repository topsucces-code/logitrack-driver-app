import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { chatLogger } from '../utils/logger';

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_type: 'driver' | 'support' | 'system';
  sender_id: string;
  sender_name: string;
  message: string;
  message_type: 'text' | 'image' | 'location' | 'delivery_info';
  metadata?: Record<string, any>;
  read_at?: string;
  created_at: string;
}

export interface ChatConversation {
  id: string;
  driver_id: string;
  status: 'active' | 'resolved' | 'waiting';
  subject?: string;
  delivery_id?: string;
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Create or get existing active conversation
 */
export async function getOrCreateConversation(
  driverId: string,
  subject?: string,
  deliveryId?: string
): Promise<{ conversation: ChatConversation | null; error: string | null }> {
  try {
    // Check for existing active conversation
    const { data: existing } = await supabase
      .from('logitrack_chat_conversations')
      .select('*')
      .eq('driver_id', driverId)
      .in('status', ['active', 'waiting'])
      .order('created_at', { ascending: false })
      .limit(1);

    if (existing && existing.length > 0) {
      return { conversation: existing[0] as ChatConversation, error: null };
    }

    // Create new conversation
    const { data: newConv, error } = await supabase
      .from('logitrack_chat_conversations')
      .insert({
        driver_id: driverId,
        status: 'waiting',
        subject: subject || 'Support général',
        delivery_id: deliveryId,
        unread_count: 0,
      })
      .select()
      .single();

    if (error) {
      return { conversation: null, error: error.message };
    }

    return { conversation: newConv as ChatConversation, error: null };
  } catch (err: any) {
    return { conversation: null, error: err.message };
  }
}

/**
 * Send a message in a conversation
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  senderName: string,
  message: string,
  messageType: ChatMessage['message_type'] = 'text',
  metadata?: Record<string, any>
): Promise<{ message: ChatMessage | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('logitrack_chat_messages')
      .insert({
        conversation_id: conversationId,
        sender_type: 'driver',
        sender_id: senderId,
        sender_name: senderName,
        message,
        message_type: messageType,
        metadata,
      })
      .select()
      .single();

    if (error) {
      return { message: null, error: error.message };
    }

    // Update conversation last message
    await supabase
      .from('logitrack_chat_conversations')
      .update({
        last_message: message.slice(0, 100),
        last_message_at: new Date().toISOString(),
        status: 'active',
      })
      .eq('id', conversationId);

    return { message: data as ChatMessage, error: null };
  } catch (err: any) {
    return { message: null, error: err.message };
  }
}

/**
 * Get messages for a conversation
 */
export async function getMessages(
  conversationId: string,
  limit = 50,
  before?: string
): Promise<{ messages: ChatMessage[]; error: string | null }> {
  try {
    let query = supabase
      .from('logitrack_chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data, error } = await query;

    if (error) {
      chatLogger.error('Error fetching messages', { error });
      return { messages: [], error: error.message };
    }

    return { messages: (data as ChatMessage[]).reverse(), error: null };
  } catch (err: any) {
    return { messages: [], error: err.message };
  }
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(
  conversationId: string,
  readerId: string
): Promise<void> {
  try {
    await supabase
      .from('logitrack_chat_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .neq('sender_id', readerId)
      .is('read_at', null);

    await supabase
      .from('logitrack_chat_conversations')
      .update({ unread_count: 0 })
      .eq('id', conversationId);
  } catch (err) {
    chatLogger.warn('Failed to mark messages as read', { error: err });
  }
}

/**
 * Subscribe to new messages in a conversation
 */
export function subscribeToMessages(
  conversationId: string,
  onMessage: (message: ChatMessage) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`chat_${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'logitrack_chat_messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        onMessage(payload.new as ChatMessage);
      }
    )
    .subscribe();

  return channel;
}

/**
 * Get quick reply suggestions based on context
 */
export function getQuickReplies(context?: 'delivery' | 'payment' | 'general'): string[] {
  const general = [
    'Bonjour, j\'ai besoin d\'aide',
    'Merci pour votre aide !',
    'Je comprends, merci',
  ];

  const delivery = [
    'Le client n\'est pas à l\'adresse',
    'Je ne trouve pas l\'adresse',
    'Le colis est endommagé',
    'Le client refuse le colis',
  ];

  const payment = [
    'Je n\'ai pas reçu mon paiement',
    'Il y a une erreur sur mes gains',
    'Comment retirer mes gains ?',
  ];

  switch (context) {
    case 'delivery':
      return [...delivery, ...general];
    case 'payment':
      return [...payment, ...general];
    default:
      return general;
  }
}

/**
 * Close a conversation
 */
export async function closeConversation(conversationId: string): Promise<void> {
  try {
    await supabase
      .from('logitrack_chat_conversations')
      .update({ status: 'resolved' })
      .eq('id', conversationId);
  } catch (err) {
    chatLogger.warn('Failed to close conversation', { error: err });
  }
}

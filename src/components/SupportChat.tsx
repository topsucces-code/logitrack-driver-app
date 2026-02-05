import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  ChevronDown,
  Headphones,
} from 'lucide-react';
import { Button } from './ui/Button';
import {
  getOrCreateConversation,
  sendMessage,
  getMessages,
  markMessagesAsRead,
  subscribeToMessages,
  getQuickReplies,
  ChatMessage,
  ChatConversation,
} from '../services/chatService';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { hapticLight } from '../hooks/useHapticFeedback';

interface SupportChatProps {
  deliveryId?: string;
  onClose: () => void;
}

export function SupportChat({ deliveryId, onClose }: SupportChatProps) {
  const { driver } = useAuth();
  const { showError } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);

  const quickReplies = getQuickReplies(deliveryId ? 'delivery' : 'general');

  // Initialize conversation
  useEffect(() => {
    if (!driver) return;

    const currentDriver = driver;

    async function initChat() {
      const { conversation: conv, error } = await getOrCreateConversation(
        currentDriver.id,
        deliveryId ? 'Problème avec une livraison' : 'Support général',
        deliveryId
      );

      if (error) {
        showError('Erreur lors de l\'initialisation du chat');
        return;
      }

      if (conv) {
        setConversation(conv);

        // Load existing messages
        const { messages: msgs } = await getMessages(conv.id);
        setMessages(msgs);

        // Mark as read
        markMessagesAsRead(conv.id, currentDriver.id);
      }

      setLoading(false);
    }

    initChat();
  }, [driver, deliveryId, showError]);

  // Subscribe to new messages
  useEffect(() => {
    if (!conversation || !driver) return;

    const driverId = driver.id;
    const conversationId = conversation.id;

    const channel = subscribeToMessages(conversationId, (message) => {
      setMessages((prev) => [...prev, message]);
      markMessagesAsRead(conversationId, driverId);
    });

    return () => {
      channel.unsubscribe();
    };
  }, [conversation, driver]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!newMessage.trim() || !conversation || !driver || sending) return;

    hapticLight();
    setSending(true);
    setShowQuickReplies(false);

    const messageText = newMessage.trim();
    setNewMessage('');

    // Optimistic update
    const tempMessage: ChatMessage = {
      id: `temp_${Date.now()}`,
      conversation_id: conversation.id,
      sender_type: 'driver',
      sender_id: driver.id,
      sender_name: driver.full_name,
      message: messageText,
      message_type: 'text',
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMessage]);

    const { error } = await sendMessage(
      conversation.id,
      driver.id,
      driver.full_name,
      messageText
    );

    if (error) {
      showError('Erreur lors de l\'envoi du message');
      // Remove temp message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
      setNewMessage(messageText);
    }

    setSending(false);
  }, [newMessage, conversation, driver, sending, showError]);

  const handleQuickReply = (reply: string) => {
    hapticLight();
    setNewMessage(reply);
    setShowQuickReplies(false);
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto" />
          <p className="text-gray-600 mt-3">Connexion au support...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col safe-top safe-bottom">
      {/* Header */}
      <header className="bg-primary-500 text-white p-4 flex items-center gap-3">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Headphones className="w-5 h-5" />
            <h1 className="font-semibold">Support LogiTrack</h1>
          </div>
          <p className="text-sm text-white/80">
            {conversation?.status === 'waiting'
              ? 'En attente d\'un agent...'
              : 'En ligne'}
          </p>
        </div>
        <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-800">
        {/* Welcome message */}
        {messages.length === 0 && (
          <div className="bg-white dark:bg-gray-700 rounded-xl p-4 text-center">
            <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mx-auto mb-3">
              <MessageCircle className="w-8 h-8 text-primary-500" />
            </div>
            <h2 className="font-semibold text-gray-900 dark:text-white mb-1">
              Comment pouvons-nous vous aider ?
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Notre équipe est là pour vous assister 24h/24
            </p>
          </div>
        )}

        {/* Message list */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.sender_type === 'driver' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                msg.sender_type === 'driver'
                  ? 'bg-primary-500 text-white rounded-br-sm'
                  : msg.sender_type === 'system'
                  ? 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-center text-sm'
                  : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-sm shadow-sm'
              }`}
            >
              {msg.sender_type === 'support' && (
                <p className="text-xs font-medium text-primary-500 mb-1">
                  {msg.sender_name}
                </p>
              )}
              <p className="whitespace-pre-wrap">{msg.message}</p>
              <p
                className={`text-xs mt-1 ${
                  msg.sender_type === 'driver'
                    ? 'text-white/70'
                    : 'text-gray-400'
                }`}
              >
                {formatTime(msg.created_at)}
              </p>
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Replies */}
      {showQuickReplies && messages.length === 0 && (
        <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Réponses rapides
            </p>
            <button
              onClick={() => setShowQuickReplies(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {quickReplies.slice(0, 4).map((reply, index) => (
              <button
                key={index}
                onClick={() => handleQuickReply(reply)}
                className="px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-sm text-gray-700 dark:text-gray-300 transition-colors"
              >
                {reply}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-end gap-2">
          <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-2">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Écrivez votre message..."
              rows={1}
              className="w-full bg-transparent resize-none focus:outline-none text-gray-900 dark:text-white placeholder-gray-500 max-h-32"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className="!rounded-full !p-3"
          >
            {sending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default SupportChat;

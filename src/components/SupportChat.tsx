import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Send,
  Loader2,
  ChevronDown,
  Headphones,
  MessageCircle,
} from 'lucide-react';
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
  onClose?: () => void;
}

export function SupportChat({ deliveryId, onClose }: SupportChatProps) {
  const navigate = useNavigate();
  const { driver } = useAuth();
  const { showError } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
        const { messages: msgs } = await getMessages(conv.id);
        setMessages(msgs);
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
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        const hasTempFromSender = prev.some(
          (m) => m.id.startsWith('temp_') && m.sender_id === message.sender_id
        );
        if (hasTempFromSender) {
          const filtered = prev.filter(
            (m) => !(m.id.startsWith('temp_') && m.sender_id === message.sender_id)
          );
          return [...filtered, message];
        }
        return [...prev, message];
      });
      markMessagesAsRead(conversationId, driverId);
    });

    return () => {
      channel.unsubscribe();
    };
  }, [conversation, driver]);

  // Scroll messages to bottom when new messages arrive (only the messages div, not the page)
  useEffect(() => {
    if (messages.length > 0 && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
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

    const { message: sentMessage, error } = await sendMessage(
      conversation.id,
      driver.id,
      driver.full_name,
      messageText
    );

    if (error) {
      showError('Erreur lors de l\'envoi du message');
      setMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
      setNewMessage(messageText);
    } else if (sentMessage) {
      setMessages((prev) => prev.map((m) => m.id === tempMessage.id ? sentMessage : m));
    }

    setSending(false);
  }, [newMessage, conversation, driver, sending, showError]);

  const handleQuickReply = (reply: string) => {
    hapticLight();
    setNewMessage(reply);
    setShowQuickReplies(false);
    inputRef.current?.focus();
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="h-mobile-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 safe-top px-3 py-2.5 flex items-center gap-2.5">
          <button
            onClick={() => onClose ? onClose() : navigate(-1)}
            className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
          <h1 className="text-base font-bold text-gray-900 dark:text-white">Support LogiTrack</h1>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary-500 mx-auto" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Connexion au support...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-mobile-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 safe-top px-3 py-2.5 flex items-center gap-2.5">
        <button
          onClick={() => onClose ? onClose() : navigate(-1)}
          className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center"
        >
          <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        </button>
        <Headphones className="w-4 h-4 text-primary-500" />
        <h1 className="text-base font-bold text-gray-900 dark:text-white">Support LogiTrack</h1>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-[10px] text-gray-500 dark:text-gray-400">
            {conversation?.status === 'waiting' ? 'En attente...' : 'En ligne'}
          </span>
        </div>
      </header>

      {/* Scrollable content area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto pb-16">
        {/* Welcome message */}
        {messages.length === 0 && (
          <div className="px-3 py-6">
            <div className="bg-white dark:bg-gray-700 rounded-lg p-4 text-center">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mx-auto mb-2">
                <MessageCircle className="w-6 h-6 text-primary-500" />
              </div>
              <h2 className="font-semibold text-sm text-gray-900 dark:text-white mb-0.5">
                Comment pouvons-nous vous aider ?
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Notre équipe est là pour vous assister 24h/24
              </p>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.length > 0 && (
          <div className="px-3 py-3 space-y-2.5">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.sender_type === 'driver' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 ${
                    msg.sender_type === 'driver'
                      ? 'bg-primary-500 text-white rounded-br-sm'
                      : msg.sender_type === 'system'
                      ? 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-center'
                      : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-sm shadow-sm'
                  }`}
                >
                  {msg.sender_type === 'support' && (
                    <p className="text-[10px] font-medium text-primary-500 mb-0.5">
                      {msg.sender_name}
                    </p>
                  )}
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                  <p
                    className={`text-[10px] mt-0.5 ${
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
          </div>
        )}

        {/* Quick Replies */}
        {showQuickReplies && messages.length === 0 && (
          <div className="px-3 py-2">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Réponses rapides
              </p>
              <button
                onClick={() => setShowQuickReplies(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {quickReplies.slice(0, 4).map((reply, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickReply(reply)}
                  className="px-2.5 py-1.5 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-xs text-gray-700 dark:text-gray-300 transition-colors border border-gray-200 dark:border-gray-600"
                >
                  {reply}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input bar - fixed at bottom like Dashboard nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-3 py-2 safe-bottom z-10">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Écrivez votre message..."
            className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full px-4 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className="w-9 h-9 rounded-full bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white flex items-center justify-center flex-shrink-0 transition-colors"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SupportChat;

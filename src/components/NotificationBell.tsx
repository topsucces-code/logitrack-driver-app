import { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck, Package, Wallet, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  subscribeToNotifications,
  type AppNotification,
} from '../services/notificationService';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export function NotificationBell() {
  const { driver } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Fetch unread count
  useEffect(() => {
    if (!driver) return;

    getUnreadCount(driver.id).then(setUnreadCount);

    const channel = subscribeToNotifications(driver.id, (notif) => {
      setUnreadCount((prev) => prev + 1);
      setNotifications((prev) => [notif, ...prev]);
    });

    return () => {
      channel.unsubscribe();
    };
  }, [driver]);

  // Close panel on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowPanel(false);
      }
    }
    if (showPanel) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [showPanel]);

  async function openPanel() {
    if (!driver) return;
    setShowPanel(!showPanel);

    if (!showPanel) {
      setLoading(true);
      const data = await getNotifications(driver.id);
      setNotifications(data);
      setLoading(false);
    }
  }

  async function handleMarkAsRead(notifId: string) {
    await markAsRead(notifId);
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notifId ? { ...n, delivered_at: new Date().toISOString() } : n
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }

  async function handleMarkAllRead() {
    if (!driver) return;
    await markAllAsRead(driver.id);
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, delivered_at: n.delivered_at || new Date().toISOString() }))
    );
    setUnreadCount(0);
  }

  function getNotifIcon(notif: AppNotification) {
    const title = (notif.title || '').toLowerCase();
    if (title.includes('livraison') || title.includes('colis')) {
      return <Package className="w-4 h-4 text-primary-500" />;
    }
    if (title.includes('paiement') || title.includes('gain')) {
      return <Wallet className="w-4 h-4 text-green-500" />;
    }
    if (title.includes('urgent') || title.includes('alerte')) {
      return <AlertTriangle className="w-4 h-4 text-red-500" />;
    }
    return <Bell className="w-4 h-4 text-gray-500" />;
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={openPanel}
        className="p-2.5 bg-white/20 rounded-full relative"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center min-w-[18px] h-[18px]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {showPanel && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-[70vh] flex flex-col">
          {/* Header */}
          <div className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-primary-600 font-medium flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Tout lire
              </button>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center">
                <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center">
                <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Aucune notification</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => !notif.delivered_at && handleMarkAsRead(notif.id)}
                  className={`w-full px-3 py-2.5 flex items-start gap-2.5 border-b border-gray-50 dark:border-gray-700 text-left transition-colors ${
                    !notif.delivered_at
                      ? 'bg-primary-50/50 dark:bg-primary-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    {getNotifIcon(notif)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                        {notif.title || 'Notification'}
                      </p>
                      {!notif.delivered_at && (
                        <span className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                      {notif.body}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                      {formatDistanceToNow(new Date(notif.created_at), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </p>
                  </div>
                  {notif.delivered_at && (
                    <Check className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-1" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

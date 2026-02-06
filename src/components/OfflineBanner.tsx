import { WifiOff, RefreshCw } from 'lucide-react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { getQueueStatus } from '../services/offlineQueue';
import { useState, useEffect } from 'react';

export function OfflineBanner() {
  const { isOnline } = useNetworkStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Update pending count
    const updateCount = () => {
      const status = getQueueStatus();
      setPendingCount(status.pendingCount);
    };

    updateCount();

    // Only poll when offline or there are pending actions
    if (!isOnline || pendingCount > 0) {
      const interval = setInterval(updateCount, 2000);
      return () => clearInterval(interval);
    }
  }, [isOnline, pendingCount]);

  useEffect(() => {
    // Show banner when offline or has pending actions
    if (!isOnline || pendingCount > 0) {
      setShow(true);
    } else {
      // Delay hiding to show "back online" message
      const timeout = setTimeout(() => setShow(false), 2000);
      return () => clearTimeout(timeout);
    }
  }, [isOnline, pendingCount]);

  if (!show) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-sm font-medium safe-top transition-colors ${
        isOnline
          ? pendingCount > 0
            ? 'bg-yellow-500 text-yellow-900'
            : 'bg-green-500 text-white'
          : 'bg-red-500 text-white'
      }`}
    >
      <div className="flex items-center justify-center gap-2">
        {!isOnline ? (
          <>
            <WifiOff className="w-4 h-4" />
            <span>Vous êtes hors ligne</span>
          </>
        ) : pendingCount > 0 ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Synchronisation de {pendingCount} action{pendingCount > 1 ? 's' : ''}...</span>
          </>
        ) : (
          <span>Connexion rétablie</span>
        )}
      </div>
    </div>
  );
}

export default OfflineBanner;

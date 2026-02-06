import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';

// Capacitor plugins initialization
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

// PWA service worker registration
import { registerSW } from 'virtual:pwa-register';

// Initialize app
async function initApp() {
  // Configure status bar on native
  if (Capacitor.isNativePlatform()) {
    try {
      await StatusBar.setStyle({ style: Style.Light });
      await StatusBar.setBackgroundColor({ color: '#f97316' });
    } catch {
      // StatusBar not available on web
    }
  }

  // Register service worker with auto-update
  if ('serviceWorker' in navigator) {
    const updateSW = registerSW({
      immediate: true,
      onRegisteredSW(swUrl: string, registration: ServiceWorkerRegistration | undefined) {
        console.log('SW registered:', swUrl);
        // Check for updates every hour, only when app is in foreground
        if (registration) {
          let intervalId: ReturnType<typeof setInterval> | null = null;

          const startUpdateCheck = () => {
            if (!intervalId) {
              intervalId = setInterval(() => {
                registration.update();
              }, 60 * 60 * 1000);
            }
          };

          const stopUpdateCheck = () => {
            if (intervalId) {
              clearInterval(intervalId);
              intervalId = null;
            }
          };

          // Only check for updates when app is visible
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
              registration.update(); // Check immediately on return
              startUpdateCheck();
            } else {
              stopUpdateCheck();
            }
          });

          // Start checking if currently visible
          if (document.visibilityState === 'visible') {
            startUpdateCheck();
          }
        }
      },
      onOfflineReady() {
        console.log('App ready to work offline');
      },
      onNeedRefresh() {
        // Auto-update SW and reload cleanly
        console.log('New version available, updating...');
        updateSW(true);
      },
    });
  }

  // Render React app with ErrorBoundary
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );

  // Hide splash screen
  if (Capacitor.isNativePlatform()) {
    await SplashScreen.hide();
  }
}

initApp();

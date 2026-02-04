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
    registerSW({
      immediate: true,
      onRegisteredSW(swUrl: string, registration: ServiceWorkerRegistration | undefined) {
        console.log('SW registered:', swUrl);
        // Check for updates every hour
        if (registration) {
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000);
        }
      },
      onOfflineReady() {
        console.log('App ready to work offline');
      },
      onNeedRefresh() {
        // Auto-refresh when new version available
        console.log('New version available, refreshing...');
        window.location.reload();
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

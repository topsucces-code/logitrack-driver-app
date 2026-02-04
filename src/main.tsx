import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Capacitor plugins initialization
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

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

  // Render React app (StrictMode disabled to fix Supabase auth issues)
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <App />
  );

  // Hide splash screen
  if (Capacitor.isNativePlatform()) {
    await SplashScreen.hide();
  }
}

initApp();

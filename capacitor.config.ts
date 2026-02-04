import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'africa.logitrack.driver',
  appName: 'LogiTrack Livreur',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#f97316',
      showSpinner: true,
      spinnerColor: '#ffffff',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Geolocation: {
      // Permission sur Android
    },
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;

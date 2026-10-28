import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'id.go.polri.satnarkoba.lapor',
  appName: 'SIPINAR - Satresnarkoba',
  webDir: 'www/browser',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#102a43',
      showSpinner: false
    }
  }
};

export default config;

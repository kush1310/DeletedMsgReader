import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.noticatch.app',
  appName: 'NotiCatch',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#008069',
    },
    Keyboard: {
      resize: 'body',
    },
  },
};

export default config;

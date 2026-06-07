import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.footballacademy.managerpro',
  appName: 'Academy Pro',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https'
  }
};

export default config;

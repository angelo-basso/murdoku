import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.murdoku.app',
  appName: 'Murdoku',
  webDir: 'www',
  server: {
    androidScheme: 'https',
  },
};

export default config;

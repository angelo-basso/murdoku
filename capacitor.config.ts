import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'fr.straswebngine.huisclos',
  appName: 'Huis Clos',
  webDir: 'www',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    // Captures d'écran bloquées uniquement pendant une enquête (activé par l'écran de jeu),
    // pour qu'on ne photographie pas la solution ; les menus restent capturables.
    PrivacyScreen: { enable: false, preventScreenshots: true },
  },
};

export default config;

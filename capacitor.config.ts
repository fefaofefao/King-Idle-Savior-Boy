import type { CapacitorConfig } from '@capacitor/cli';
import { APP_ID, APP_NAME_EN } from './src/config/identity.ts';

const config: CapacitorConfig = {
  appId: APP_ID,
  appName: APP_NAME_EN,
  webDir: 'dist',
  android: { backgroundColor: '#1b2a4a' },
  plugins: {
    // Android 15+ força edge-to-edge: injeta --safe-area-inset-* no CSS e usa texto claro nas barras.
    SystemBars: {
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover',
      style: 'DARK',
    },
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#1b2a4a',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
    LocalNotifications: { smallIcon: 'ic_stat_icon', iconColor: '#f5c542' },
  },
};

export default config;

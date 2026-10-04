import type { CapacitorConfig } from '@capacitor/cli';
import { APP_ID, APP_NAME_EN } from './src/config/app.ts';

const config: CapacitorConfig = {
  appId: APP_ID,
  appName: APP_NAME_EN,
  webDir: 'dist',
  android: { backgroundColor: '#1b2a4a' },
  plugins: {
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

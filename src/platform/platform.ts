import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';
import { SplashScreen } from '@capacitor/splash-screen';
import type { KeyValueStore } from '../core/save';

export const isNative = (): boolean => Capacitor.isNativePlatform();

/** Save em Capacitor Preferences (SharedPreferences no Android, localStorage no navegador). */
export const preferencesStore: KeyValueStore = {
  async get(key) {
    return (await Preferences.get({ key })).value;
  },
  async set(key, value) {
    await Preferences.set({ key, value });
  },
  async remove(key) {
    await Preferences.remove({ key });
  },
};

// ---------- Vibração ----------
let vibrationEnabled = true;
export const setVibration = (on: boolean): void => {
  vibrationEnabled = on;
};
export function vibrate(strong = false): void {
  if (!vibrationEnabled) return;
  if (isNative()) {
    Haptics.impact({ style: strong ? ImpactStyle.Medium : ImpactStyle.Light }).catch(() => {});
  } else if ('vibrate' in navigator) {
    navigator.vibrate?.(strong ? 30 : 12);
  }
}

// ---------- Ciclo de vida ----------
export function onPauseResume(onPause: () => void, onResume: () => void): void {
  if (isNative()) {
    App.addListener('appStateChange', ({ isActive }) => (isActive ? onResume() : onPause()));
  }
  document.addEventListener('visibilitychange', () =>
    document.hidden ? onPause() : onResume(),
  );
  window.addEventListener('pagehide', onPause);
}

export function onBackButton(handler: () => void): void {
  if (isNative()) App.addListener('backButton', handler);
  else window.addEventListener('keydown', (e) => e.key === 'Escape' && handler());
}

export function exitApp(): void {
  if (isNative()) App.exitApp();
}

export async function hideSplash(): Promise<void> {
  if (isNative()) await SplashScreen.hide().catch(() => {});
}

// ---------- Notificações locais ----------
const OFFLINE_FULL_ID = 1001;

export async function scheduleOfflineFull(at: Date, title: string, body: string): Promise<void> {
  if (!isNative()) return;
  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      const req = await LocalNotifications.requestPermissions();
      if (req.display !== 'granted') return;
    }
    await LocalNotifications.cancel({ notifications: [{ id: OFFLINE_FULL_ID }] });
    await LocalNotifications.schedule({
      notifications: [{ id: OFFLINE_FULL_ID, title, body, schedule: { at, allowWhileIdle: true } }],
    });
  } catch (e) {
    console.warn('[notif] falha ao agendar', e);
  }
}

export async function cancelOfflineFull(): Promise<void> {
  if (!isNative()) return;
  await LocalNotifications.cancel({ notifications: [{ id: OFFLINE_FULL_ID }] }).catch(() => {});
}

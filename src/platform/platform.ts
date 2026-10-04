import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';
import { SplashScreen } from '@capacitor/splash-screen';
import type { KeyValueStore } from '../core/save';

export const isNative = (): boolean => Capacitor.isNativePlatform();

/**
 * Abre um link fora do jogo. No Android, navegar para um domínio externo faz o Capacitor
 * abrir o navegador do sistema (a WebView do jogo não sai da tela).
 */
export function openExternal(url: string): void {
  if (isNative()) window.location.href = url;
  else window.open(url, '_blank', 'noopener');
}

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

/** Pede a permissão de notificação (Android 13+) com o app em primeiro plano. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display === 'granted') return true;
    if (perm.display === 'denied') return false;
    return (await LocalNotifications.requestPermissions()).display === 'granted';
  } catch {
    return false;
  }
}

export async function scheduleOfflineFull(at: Date, title: string, body: string): Promise<void> {
  if (!isNative()) return;
  try {
    // Não pede permissão aqui: o app está indo para segundo plano.
    if ((await LocalNotifications.checkPermissions()).display !== 'granted') return;
    await LocalNotifications.cancel({ notifications: [{ id: OFFLINE_FULL_ID }] });
    await LocalNotifications.schedule({
      notifications: [{ id: OFFLINE_FULL_ID, title, body, schedule: { at, allowWhileIdle: false } }],
    });
  } catch (e) {
    console.warn('[notif] falha ao agendar', e);
  }
}

export async function cancelOfflineFull(): Promise<void> {
  if (!isNative()) return;
  await LocalNotifications.cancel({ notifications: [{ id: OFFLINE_FULL_ID }] }).catch(() => {});
}

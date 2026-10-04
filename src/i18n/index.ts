import type { Lang } from '../core/state';
import { en } from './locales/en';
import { es } from './locales/es';
import { ptBR, type Locale, type LocaleKey } from './locales/pt-BR';

export const LOCALES: Record<Lang, Locale> = { 'pt-BR': ptBR, en, es };

/** Idiomas oferecidos na tela de escolha (ordem de exibição). */
export const LANGUAGES: { id: Lang; label: string; flag: string }[] = [
  { id: 'pt-BR', label: 'Português', flag: '🇧🇷' },
  { id: 'en', label: 'English', flag: '🇺🇸' },
  { id: 'es', label: 'Español', flag: '🇪🇸' },
];

let current: Lang = 'en';
const listeners: (() => void)[] = [];

/** Idioma do aparelho mapeado para um dos idiomas suportados (padrão: inglês). */
export function detectLang(languages: readonly string[] = navigator.languages ?? [navigator.language]): Lang {
  for (const l of languages) {
    const code = l.toLowerCase();
    if (code.startsWith('pt')) return 'pt-BR';
    if (code.startsWith('es')) return 'es';
    if (code.startsWith('en')) return 'en';
  }
  return 'en';
}

export function setLang(lang: Lang): void {
  current = LOCALES[lang] ? lang : 'en';
  document.documentElement.lang = current;
  for (const l of listeners) l();
}

export const getLang = (): Lang => current;

export function onLangChange(fn: () => void): void {
  listeners.push(fn);
}

export function t(key: LocaleKey, params?: Record<string, string | number>): string {
  let str = LOCALES[current][key] ?? ptBR[key] ?? key;
  if (params) for (const [k, v] of Object.entries(params)) str = str.split(`{${k}}`).join(String(v));
  return str;
}

/** Versão para chaves dinâmicas (ex.: `member.${id}`). */
export const tk = (key: string, params?: Record<string, string | number>): string =>
  t(key as LocaleKey, params);

/** Traduz um idioma específico sem mudar o atual (usado nas notificações). */
export const tIn = (lang: Lang, key: LocaleKey): string => LOCALES[lang][key];

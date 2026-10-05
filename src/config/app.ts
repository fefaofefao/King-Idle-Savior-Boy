// Identidade do app (arquivo separado porque o capacitor.config.ts também a importa, fora do Vite).
export { APP_ID, APP_NAME_EN, GAME_TITLE } from './identity';

/** Flags de recursos. */
export const FEATURES = {
  /** Banner não é usado (decisão de design). */
  ENABLE_BANNER: false,
  /** Compra "Remover anúncios": estrutura pronta, desligada até integrar o Play Billing. */
  ENABLE_IAP: false,
  /** Painel de testes (tocar 5× na versão, no Menu). Ligado só no APK de teste (VITE_TEST_BUILD=1). */
  TEST_TOOLS: import.meta.env.VITE_TEST_BUILD === '1' || import.meta.env.DEV,
} as const;

/**
 * Anúncios NÃO personalizados para todos os usuários (ECA Digital, Lei 15.211/2025).
 * Ligado: toda requisição do AdMob (premiado e intersticial) vai com `npa: true`.
 */
export const ADS_NON_PERSONALIZED = true;

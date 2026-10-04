/**
 * Identidade do app. O APP_ID NÃO pode mudar depois da publicação na Play Store.
 */
export const APP_ID = 'br.com.fernando.idleknight';
/** Nome do jogo (igual nos 3 idiomas). */
export const GAME_TITLE = 'King Idle Savior Boy';
export const APP_NAME_EN = GAME_TITLE;

/** Flags de recursos. */
export const FEATURES = {
  /** Banner não é usado (decisão de design). */
  ENABLE_BANNER: false,
  /** Compra "Remover anúncios": estrutura pronta, desligada até integrar o Play Billing. */
  ENABLE_IAP: false,
} as const;

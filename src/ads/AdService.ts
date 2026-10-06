/**
 * Interface única de anúncios. No Android usa AdMob; no navegador, um mock.
 * Regras de frequência (interstitial) ficam em AdPolicy.
 */
export type RewardedPlacement = 'offline2x' | 'goldBuff' | 'bossTime' | 'chest5x' | 'prestigeBonus';

export interface AdService {
  init(): Promise<void>;
  /** Mostra um rewarded. Resolve true somente se a recompensa foi concedida. */
  showRewarded(placement: RewardedPlacement): Promise<boolean>;
  showInterstitial(): Promise<boolean>;
  /** Reabre o formulário de consentimento/privacidade (UMP). */
  showPrivacyOptions(): Promise<void>;
  readonly privacyOptionsAvailable: boolean;
}

/** IDs de anúncio. Os reais vêm de variáveis de build (VITE_*); o padrão são os IDs de TESTE do Google. */
export const AD_IDS = {
  rewarded: import.meta.env.VITE_ADMOB_REWARDED_ID || 'ca-app-pub-3940256099942544/5224354917',
  interstitial: import.meta.env.VITE_ADMOB_INTERSTITIAL_ID || 'ca-app-pub-3940256099942544/1033173712',
  isTesting: !import.meta.env.VITE_ADMOB_REWARDED_ID,
};

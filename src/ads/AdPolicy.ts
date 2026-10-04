import { BALANCE } from '../config/balance';

/** Regras de frequência do interstitial. Funções puras para facilitar o teste. */
export interface InterstitialContext {
  now: number;
  /** Início da primeira sessão do jogador. */
  firstPlayedAt: number;
  lastInterstitialAt: number;
  lastRewardedAt: number;
  noAds: boolean;
}

export function canShowInterstitial(c: InterstitialContext): boolean {
  const A = BALANCE.ads;
  if (c.noAds) return false;
  if (c.now - c.firstPlayedAt < A.interstitialFirstSessionGraceSec * 1000) return false;
  if (c.now - c.lastInterstitialAt < A.interstitialMinIntervalSec * 1000) return false;
  if (c.now - c.lastRewardedAt < A.interstitialAfterRewardedGraceSec * 1000) return false;
  return true;
}

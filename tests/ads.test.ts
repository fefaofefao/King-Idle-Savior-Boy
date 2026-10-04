import { describe, expect, it } from 'vitest';
import { canShowInterstitial } from '../src/ads/AdPolicy';

const MIN = 60_000;
const base = { firstPlayedAt: 0, lastInterstitialAt: 0, lastRewardedAt: 0, noAds: false };

describe('regras do interstitial', () => {
  it('nunca nos primeiros 10 min da primeira sessão', () => {
    expect(canShowInterstitial({ ...base, now: 9 * MIN })).toBe(false);
    expect(canShowInterstitial({ ...base, now: 11 * MIN })).toBe(true);
  });
  it('intervalo mínimo de 3 min', () => {
    expect(canShowInterstitial({ ...base, now: 20 * MIN, lastInterstitialAt: 18 * MIN })).toBe(false);
    expect(canShowInterstitial({ ...base, now: 20 * MIN, lastInterstitialAt: 16 * MIN })).toBe(true);
  });
  it('nunca logo após um rewarded', () => {
    expect(canShowInterstitial({ ...base, now: 20 * MIN, lastRewardedAt: 20 * MIN - 5000 })).toBe(false);
  });
  it('desligado com "remover anúncios"', () => {
    expect(canShowInterstitial({ ...base, now: 60 * MIN, noAds: true })).toBe(false);
  });
});

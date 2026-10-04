import { t } from '../i18n';
import type { AdService } from './AdService';

/** Simula 2 s de anúncio no navegador e concede a recompensa. */
export class MockAdService implements AdService {
  readonly privacyOptionsAvailable = true;
  /** Use `?adfail=1` na URL para testar a falha de anúncio. */
  private fail = new URLSearchParams(location.search).has('adfail');

  async init(): Promise<void> {}

  private overlay(label: string): Promise<void> {
    return new Promise((resolve) => {
      const el = document.createElement('div');
      el.className = 'mock-ad';
      el.innerHTML = `<div class="mock-ad-box"><div class="mock-ad-tag">AD · MOCK</div><div>${label}</div><div class="mock-ad-bar"><i></i></div></div>`;
      document.body.appendChild(el);
      setTimeout(() => {
        el.remove();
        resolve();
      }, 2000);
    });
  }

  async showRewarded(): Promise<boolean> {
    if (this.fail) return false;
    await this.overlay(t('ads.watching'));
    return true;
  }

  async showInterstitial(): Promise<boolean> {
    if (this.fail) return false;
    await this.overlay('Interstitial');
    return true;
  }

  async showPrivacyOptions(): Promise<void> {
    alert('UMP (mock): no Android abre o formulário de consentimento do Google.');
  }
}

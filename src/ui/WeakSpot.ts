import type { App } from '../App';
import { BALANCE } from '../config/balance';
import { sfx } from '../audio/Sfx';
import { t } from '../i18n';
import { h } from './dom';

/**
 * Ponto Fraco: um alvo brilhante aparece num lugar aleatório do corpo do inimigo por ~1,7 s.
 * Tocar nele causa um golpe enorme (crítico × 8) e atravessa a armadura dos Blindados.
 * Recompensa atenção e toque preciso, sem quebrar o idle: aparece no máximo a cada 3,5–6,5 s.
 */
export class WeakSpot {
  private el: HTMLButtonElement;
  private timer = 3;
  private life = 0;
  private dx = 0;
  private yFrac = 0.5;

  constructor(
    private app: App,
    private stage: HTMLElement,
  ) {
    this.el = h('button', { class: 'weak-spot', 'aria-label': 'weak spot' }, [h('i'), h('b')]);
    this.el.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.hit();
    });
    stage.appendChild(this.el);
  }

  private hide(): void {
    this.life = 0;
    this.el.classList.remove('show');
  }

  private hit(): void {
    if (this.life <= 0) return;
    const pos = this.el.getBoundingClientRect();
    this.hide();
    this.app.state.tutorial.weakHintDone = true;
    this.app.weakSpotHit(pos.left + pos.width / 2, pos.top + pos.height / 2);
  }

  update(dt: number): void {
    const W = BALANCE.monsters.weakSpot;
    const g = this.app.game;
    const canShow = g.enemyAlive && !g.bossPaused && g.state.stage >= W.minStage && !this.app.modals.isOpen;
    if (this.life > 0) {
      this.life -= dt;
      if (this.life <= 0 || !canShow) {
        this.hide();
        this.timer = W.intervalMin + Math.random() * (W.intervalMax - W.intervalMin);
        return;
      }
      this.place();
      return;
    }
    if (!canShow) return;
    this.timer -= dt;
    if (this.timer <= 0) {
      // Primeira vez: fica mais tempo e explica o que é.
      const first = !this.app.state.tutorial.weakHintDone;
      this.life = first ? W.durationSec * 2.5 : W.durationSec;
      if (first) this.el.setAttribute('aria-label', t('tutorial.weak'));
      sfx.play('spot');
      this.dx = (Math.random() - 0.5) * 0.5;
      this.yFrac = 0.35 + Math.random() * 0.45;
      this.place();
      this.el.classList.remove('show');
      void this.el.offsetWidth;
      this.el.classList.add('show');
    }
  }

  private place(): void {
    const p = this.app.scene.enemyScreenAt(this.dx, this.yFrac);
    const r = this.stage.getBoundingClientRect();
    this.el.style.transform = `translate(${p.x - r.left}px, ${p.y - r.top}px) translate(-50%, -50%)`;
  }
}

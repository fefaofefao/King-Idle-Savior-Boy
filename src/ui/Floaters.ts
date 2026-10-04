import type { Decimal } from '../core/bignum';
import { formatNumber } from '../core/format';
import type { Notation } from '../core/state';
import { ICONS } from './icons';

export type DamageKind = 'tap' | 'mage' | 'strike' | 'weak';
import { h } from './dom';

/** Números de dano, moedas voando até o contador e toasts. Tudo em DOM sobre o canvas. */
export class Floaters {
  private layer: HTMLElement;
  private toastBox: HTMLElement;
  private active = 0;

  constructor(root: HTMLElement) {
    this.layer = h('div', { class: 'floaters' });
    this.toastBox = h('div', { class: 'toasts' });
    root.append(this.layer, this.toastBox);
  }

  /** Último número de toque normal: toques rápidos somam no mesmo número em vez de empilhar. */
  private lastTap: { el: HTMLElement; sum: Decimal; at: number } | null = null;

  damage(x: number, y: number, amount: Decimal, notation: Notation, crit: boolean, kind: DamageKind = 'tap'): void {
    const now = performance.now();
    if (kind === 'tap' && !crit && this.lastTap && now - this.lastTap.at < 220 && this.lastTap.el.isConnected) {
      // Mescla: atualiza o número existente e reinicia a animação dele.
      const lt = this.lastTap;
      lt.sum = lt.sum.plus(amount);
      lt.at = now;
      lt.el.textContent = formatNumber(lt.sum, notation);
      lt.el.classList.remove('merge');
      void lt.el.offsetWidth;
      lt.el.classList.add('merge');
      return;
    }
    if (this.active > 24) return; // limite para aparelhos fracos
    const el = h('div', { class: `dmg ${crit ? 'crit' : ''} ${kind}`, text: formatNumber(amount, notation) });
    const dx = kind === 'tap' && !crit ? (Math.random() - 0.5) * 40 : (Math.random() - 0.5) * 90;
    el.style.left = `${x + dx}px`;
    el.style.top = `${y + (Math.random() - 0.5) * 16}px`;
    this.layer.appendChild(el);
    this.active++;
    if (kind === 'tap' && !crit) this.lastTap = { el, sum: amount, at: now };
    el.addEventListener('animationend', (ev) => {
      if ((ev as AnimationEvent).animationName !== 'float-up') return;
      el.remove();
      this.active--;
    });
  }

  /** Efeito do Ponto Fraco: anel que explode + texto. */
  weakBurst(x: number, y: number, text: string): void {
    const el = h('div', { class: 'weak-burst' }, [h('i'), h('span', { text })]);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    this.layer.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }

  /** Moedas saindo de (x,y) até o elemento alvo (contador de ouro). */
  coins(x: number, y: number, target: HTMLElement, count: number, onArrive?: () => void): void {
    const r = target.getBoundingClientRect();
    const tx = r.left + 14;
    const ty = r.top + r.height / 2;
    let arrived = false;
    for (let i = 0; i < count; i++) {
      const el = h('div', { class: 'coin', html: ICONS.gold });
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      this.layer.appendChild(el);
      const sx = (Math.random() - 0.5) * 120;
      const sy = -40 - Math.random() * 60;
      const anim = el.animate(
        [
          { transform: 'translate(-50%,-50%) scale(0.6)', opacity: 1 },
          { transform: `translate(calc(-50% + ${sx}px), calc(-50% + ${sy}px)) scale(1)`, opacity: 1, offset: 0.3 },
          { transform: `translate(calc(-50% + ${tx - x}px), calc(-50% + ${ty - y}px)) scale(0.7)`, opacity: 0.9 },
        ],
        { duration: 650 + i * 60, easing: 'cubic-bezier(.5,0,.6,1)' },
      );
      anim.onfinish = () => {
        el.remove();
        if (!arrived) {
          arrived = true;
          onArrive?.();
          target.classList.remove('bump');
          void target.offsetWidth;
          target.classList.add('bump');
        }
      };
    }
  }

  toast(text: string, icon = '', ms = 2200): void {
    // No máximo 2 avisos ao mesmo tempo: o mais antigo sai.
    const live = [...this.toastBox.querySelectorAll('.toast:not(.out)')];
    while (live.length >= 2) live.shift()!.remove();
    const el = h('div', { class: 'toast', html: `${icon}<span></span>` });
    el.querySelector('span')!.textContent = text;
    this.toastBox.appendChild(el);
    setTimeout(() => el.classList.add('out'), ms);
    setTimeout(() => el.remove(), ms + 400);
  }

  banner(text: string, cls = ''): void {
    const el = h('div', { class: `banner ${cls}`, text });
    this.layer.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}

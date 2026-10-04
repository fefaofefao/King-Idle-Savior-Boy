import { ICONS } from './icons';
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

  damage(x: number, y: number, text: string, crit: boolean, kind: 'tap' | 'mage' | 'strike' = 'tap'): void {
    if (this.active > 40) return; // limite para aparelhos fracos
    const el = h('div', { class: `dmg ${crit ? 'crit' : ''} ${kind}`, text });
    const dx = (Math.random() - 0.5) * 70;
    el.style.left = `${x + dx}px`;
    el.style.top = `${y + (Math.random() - 0.5) * 20}px`;
    this.layer.appendChild(el);
    this.active++;
    el.addEventListener('animationend', () => {
      el.remove();
      this.active--;
    });
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

  toast(text: string, icon = '', ms = 2600): void {
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

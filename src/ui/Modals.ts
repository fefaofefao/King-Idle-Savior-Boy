import { t } from '../i18n';
import { h } from './dom';

export interface ModalButton {
  label: string;
  /** 'primary' | 'ad' | 'secondary' | 'danger' */
  kind?: string;
  /** Retorne false para manter o modal aberto. */
  onClick?: () => void | boolean | Promise<void | boolean>;
  icon?: string;
}

interface OpenModal {
  el: HTMLElement;
  onClose?: () => void;
  dismissible: boolean;
}

/** Pilha de modais. O botão voltar do Android fecha o modal do topo. */
export class Modals {
  private stack: OpenModal[] = [];

  constructor(private root: HTMLElement) {}

  get isOpen(): boolean {
    return this.stack.length > 0;
  }

  open(opts: {
    title: string;
    body?: (Node | string)[];
    buttons?: ModalButton[];
    dismissible?: boolean;
    onClose?: () => void;
    className?: string;
  }): () => void {
    const dismissible = opts.dismissible ?? true;
    const close = () => this.close(entry);
    const buttons = (opts.buttons ?? [{ label: t('common.ok'), kind: 'primary' }]).map((b) => {
      const btn = h('button', { class: `btn ${b.kind ?? 'secondary'}`, html: (b.icon ?? '') + `<span>${b.label}</span>` });
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        const r = await b.onClick?.();
        btn.disabled = false;
        if (r !== false) close();
      });
      return btn;
    });
    const box = h('div', { class: `modal ${opts.className ?? ''}`, role: 'dialog' }, [
      h('h2', { text: opts.title }),
      h('div', { class: 'modal-body' }, opts.body ?? []),
      h('div', { class: 'modal-buttons' }, buttons),
    ]);
    if (dismissible) {
      box.prepend(h('button', { class: 'modal-x', 'aria-label': t('common.close'), text: '✕', onClick: close }));
    }
    const backdrop = h('div', { class: 'modal-backdrop' }, [box]);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop && dismissible) close();
    });
    const entry: OpenModal = { el: backdrop, onClose: opts.onClose, dismissible };
    this.stack.push(entry);
    this.root.appendChild(backdrop);
    requestAnimationFrame(() => backdrop.classList.add('show'));
    return close;
  }

  private close(entry: OpenModal): void {
    const i = this.stack.indexOf(entry);
    if (i < 0) return;
    this.stack.splice(i, 1);
    entry.el.classList.remove('show');
    setTimeout(() => entry.el.remove(), 180);
    entry.onClose?.();
  }

  /** Fecha o modal do topo. Retorna false se não havia modal fechável. */
  closeTop(): boolean {
    const top = this.stack[this.stack.length - 1];
    if (!top) return false;
    if (top.dismissible) this.close(top);
    return true;
  }

  confirm(title: string, text: string, yes = t('common.yes'), no = t('common.no')): Promise<boolean> {
    return new Promise((resolve) => {
      let answered = false;
      this.open({
        title,
        body: [h('p', { text })],
        buttons: [
          { label: no, kind: 'secondary', onClick: () => void ((answered = true), resolve(false)) },
          { label: yes, kind: 'primary', onClick: () => void ((answered = true), resolve(true)) },
        ],
        onClose: () => !answered && resolve(false),
      });
    });
  }
}

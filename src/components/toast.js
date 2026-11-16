import { h } from '../utils/dom.js';

let box = null;

// Small message that fades away. type: 'info' | 'error' | 'success'
export function toast(message, type = 'info', ms = 3500) {
  if (!box) {
    box = h('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' });
    document.body.append(box);
  }
  const item = h('div', { class: 'toast ' + type }, message);
  box.append(item);
  setTimeout(() => {
    item.classList.add('out');
    setTimeout(() => item.remove(), 300);
  }, ms);
}

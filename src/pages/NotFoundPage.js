import { h } from '../utils/dom.js';
import { AppBar } from '../components/AppBar.js';

export function NotFoundPage() {
  return { element: h('div', { class: 'page' }, AppBar(), h('main', { class: 'panel center' },
    h('div', { class: 'big-icon' }, '🧭'), h('h2', {}, 'Page not found'),
    h('a', { class: 'btn', href: '#/' }, 'Back to PLAYZONE'))) };
}

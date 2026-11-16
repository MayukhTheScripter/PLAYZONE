import { h } from '../utils/dom.js';
import { getProfile } from '../state.js';

export function Logo() {
  return h('a', { class: 'logo', href: '#/', 'aria-label': 'PLAYZONE home' },
    h('span', { class: 'logo-mark', 'aria-hidden': 'true' }, 'P'),
    h('span', { class: 'logo-text' }, 'PLAYZONE'));
}

// Top bar: logo on the left, optional back link and the player's avatar.
export function AppBar({ back = null, title = '' } = {}) {
  const p = getProfile();
  return h('header', { class: 'appbar' },
    back ? h('a', { class: 'back', href: back, 'aria-label': 'Back' }, '←') : Logo(),
    title ? h('h1', { class: 'bar-title' }, title) : h('span'),
    h('a', { class: 'me', href: '#/profile', title: 'Your profile' }, h('span', { 'aria-hidden': 'true' }, p.avatar), p.nickname ? h('span', { class: 'me-name' }, p.nickname) : null)
  );
}

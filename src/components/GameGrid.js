import { h } from '../utils/dom.js';
import { CATEGORIES, GAMES } from '../config/games.js';
import { GameCard } from './GameCard.js';

// Category tabs + a grid of game cards. Used on the home page, the local game
// picker and the online lobby, so all three look and behave the same.
export function GameGrid({ onSelect, selectedId = null, disabled = false, context = 'home', playerCount = 4 } = {}) {
  let active = 'all';
  const tabs = h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Game categories' });
  const grid = h('div', { class: 'game-grid' });
  const root = h('div', { class: 'game-section' }, tabs, grid);

  function draw() {
    tabs.replaceChildren(
      ...[{ id: 'all', name: 'All', icon: '🎮' }, ...CATEGORIES].map((c) =>
        h('button', {
          class: 'tab' + (active === c.id ? ' active' : ''),
          role: 'tab', type: 'button', 'aria-selected': active === c.id ? 'true' : 'false',
          onClick: () => { active = c.id; draw(); },
        }, `${c.icon} ${c.name}`)
      )
    );
    const list = GAMES.filter((g) => active === 'all' || g.category === active);
    grid.replaceChildren(...list.map((g) => GameCard(g, { onSelect, selected: g.id === selectedId, disabled, context, playerCount })));
  }
  draw();
  root.setSelected = (id) => { selectedId = id; draw(); };
  return root;
}

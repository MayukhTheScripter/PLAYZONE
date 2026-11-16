import { h } from '../utils/dom.js';
import { AppBar } from '../components/AppBar.js';
import { GameGrid } from '../components/GameGrid.js';
import { getSession } from '../state.js';
import { navigate } from '../router.js';
import { toast } from '../components/toast.js';

// Local multiplayer: pick which game to play.
export function LocalGamesPage() {
  const session = getSession();
  if (!session || session.mode !== 'local') {
    setTimeout(() => navigate('/local'), 0);
    return { element: h('p', { class: 'muted pad' }, 'One moment…') };
  }
  const grid = GameGrid({
    context: 'local', playerCount: session.players.length,
    onSelect: (game, usable, reason) => {
      if (!usable) { toast(reason || game.name + ' is not available.'); return; }
      navigate('/play/' + game.id);
    },
  });
  return { element: h('div', { class: 'page' }, AppBar({ back: '#/', title: 'Pick a game' }),
    h('main', { class: 'panel wide' },
      h('div', { class: 'players-strip' }, session.players.map((p) => h('span', { class: 'pill', style: { '--pc': p.color } }, p.name)),
        h('a', { class: 'link', href: '#/local' }, 'Change players')),
      grid)) };
}

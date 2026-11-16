import { h, iconEl } from '../utils/dom.js';
import { getCategory, supportsMode, localPlayable } from '../config/games.js';

// One game tile. `selected` is used by the lobby to highlight the host's pick.
//   context: 'home' | 'local' | 'online'  - decides which badge is shown
//   playerCount: used in 'local' context (how many people share the phone)
// onSelect(game, usable, reason) - `usable` is false for games that cannot be played here.
export function GameCard(game, { onSelect, selected = false, disabled = false, context = 'home', playerCount = 4 } = {}) {
  const cat = getCategory(game.category);
  let usable = game.playable, badge = 'Ready', tone = 'ok', reason = '';
  if (!game.playable) { usable = false; badge = 'Coming soon'; tone = 'wait'; reason = game.name + ' is not built yet.'; }
  else if (context === 'online' && !supportsMode(game, 'online')) { usable = false; badge = 'Local only'; tone = 'wait'; reason = game.name + ' is Local only for now. Pick another game.'; }
  else if (context === 'local' && !localPlayable(game, playerCount)) { usable = false; badge = 'Needs ' + game.minPlayers + '+ players'; tone = 'wait'; reason = game.name + ' needs at least ' + game.minPlayers + ' players.'; }
  else if (context === 'home' && !supportsMode(game, 'online')) { badge = 'Local only'; tone = 'ok'; }
  return h('button', {
    class: 'game-card' + (selected ? ' selected' : '') + (usable ? '' : ' soon'),
    style: { '--accent': cat.color },
    type: 'button',
    disabled,
    'aria-pressed': selected ? 'true' : 'false',
    onClick: () => onSelect && onSelect(game, usable, reason),
  },
    iconEl('gc-icon', game.icon),
    h('span', { class: 'gc-name' }, game.name),
    h('span', { class: 'gc-desc' }, game.description),
    h('span', { class: 'gc-meta' },
      h('span', { class: 'chip' }, game.turnBased ? 'Turns' : 'Together'),
      h('span', { class: 'chip' }, game.minPlayers === 1 && game.cpu ? '1-' + game.maxPlayers + ' players' : `${game.minPlayers}-${game.maxPlayers} players`),
      h('span', { class: 'chip ' + tone }, badge)
    )
  );
}

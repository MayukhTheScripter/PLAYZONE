// ---------------------------------------------------------------------------
// LOCAL SESSION (one phone, 2-4 players)
// No internet needed. This just builds the player list the games receive.
// ---------------------------------------------------------------------------
import { colorFor, cleanNickname } from '../utils/players.js';

export function buildLocalPlayers(names) {
  const used = new Set();
  return names.map((raw, i) => {
    let name = cleanNickname(raw) || 'Player ' + (i + 1);
    // make duplicate names unique so the scoreboard is never confusing
    while (used.has(name.toLowerCase())) name = name + ' ' + (i + 1);
    used.add(name.toLowerCase());
    return { id: 'local-' + i, name, color: colorFor(i), index: i };
  });
}

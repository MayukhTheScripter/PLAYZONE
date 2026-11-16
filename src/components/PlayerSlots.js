import { h } from '../utils/dom.js';
import { MAX_PLAYERS } from '../config/games.js';
import { colorFor } from '../utils/players.js';

// Always shows 4 slots so players can see how many seats are still free.
// showReady: true once the database has the "ready" column (migration 001).
export function PlayerSlots({ players, hostId, meId, onlineIds, showReady = false }) {
  const items = [];
  for (let i = 0; i < MAX_PLAYERS; i++) {
    const p = players[i];
    if (!p) {
      items.push(h('li', { class: 'slot empty' }, h('span', { class: 'slot-av' }, '?'), h('span', { class: 'slot-name' }, 'Waiting for player…')));
      continue;
    }
    const online = onlineIds ? onlineIds.includes(p.player_id) : true;
    items.push(h('li', { class: 'slot', style: { '--pc': colorFor(i) } },
      h('span', { class: 'slot-av' }, p.nickname.slice(0, 1).toUpperCase()),
      h('span', { class: 'slot-name' }, p.nickname, p.player_id === meId ? h('em', {}, ' (you)') : null),
      p.player_id === hostId ? h('span', { class: 'chip host' }, '👑 Host') : null,
      showReady ? h('span', { class: 'chip ' + (p.ready ? 'ready' : 'notready') }, p.ready ? '✔ Ready' : 'Not ready') : null,
      h('span', { class: 'status ' + (online ? 'on' : 'off'), title: online ? 'Connected' : 'Disconnected' }, online ? 'Online' : 'Offline')
    ));
  }
  return h('ul', { class: 'slots' }, items);
}

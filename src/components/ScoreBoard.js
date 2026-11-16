import { h } from '../utils/dom.js';

// The row of player chips with live scores. Online mode also shows a
// green/grey dot for "connected".  Call  board.update(scores, onlineIds).
export function ScoreBoard(players, { showPresence = false } = {}) {
  const root = h('div', { class: 'scoreboard', 'aria-label': 'Scoreboard' });
  const cells = new Map();
  players.forEach((p) => {
    const dot = h('span', { class: 'dot' });
    const score = h('b', { class: 'sb-score' }, '0');
    const cell = h('div', { class: 'sb-cell', style: { '--pc': p.color } },
      showPresence ? dot : null, h('span', { class: 'sb-name' }, p.name), score);
    cells.set(p.id, { cell, dot, score });
    root.append(cell);
  });
  root.update = (scores, onlineIds = null) => {
    let best = -Infinity;
    players.forEach((p) => { best = Math.max(best, scores[p.id] || 0); });
    players.forEach((p) => {
      const c = cells.get(p.id);
      const value = scores[p.id] || 0;
      c.score.textContent = value;
      c.cell.classList.toggle('lead', best > 0 && value === best);
      if (onlineIds) c.dot.classList.toggle('on', onlineIds.includes(p.id));
    });
  };
  // Highlight whose turn it is (pass null to clear).
  root.setTurn = (playerId) => {
    players.forEach((p) => cells.get(p.id).cell.classList.toggle('turn', p.id === playerId));
  };
  return root;
}

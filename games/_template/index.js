// ---------------------------------------------------------------------------
// GAME TEMPLATE  (example of how every game is written)
//
// A game is ONE function. PLAYZONE calls it with a "ctx" object and expects
// back an object with the game's HTML element and an optional destroy().
//
// ctx contains:
//   ctx.game      -> { id, name, ... } from config/games.js
//   ctx.mode      -> 'local' (one phone) or 'online' (separate phones)
//   ctx.players   -> [{ id, name, color, index }]  everyone in the match
//   ctx.me        -> online only: { id } the player using THIS phone (null in local mode)
//   ctx.isHost    -> online only: true on the host's phone
//   ctx.scores    -> { get(id), set(id, n), add(id, n), all() }  updates the shared scoreboard
//   ctx.network   -> online only: { send(type, data), on(type, fn) }  live messages (null in local mode)
//   ctx.finish(winnerIds) -> end the match and show the result screen
//
// This example: every player has a button. First to 10 taps wins.
// To use it:
//   1. copy this folder to  games/<your-id>   (lowercase-with-dashes)
//   2. add  games/<your-id>/manifest.json   (see docs/GAMES.md), with "kind": "module"
//      and "entry": "index.js"
//   3. run  npm run dev  (or build). The game appears on its own. Folders that start
//      with an underscore, like this one, are never loaded.
// ---------------------------------------------------------------------------
import { h } from '../../src/utils/dom.js';

const GOAL = 10;

export default function createGame(ctx) {
  let finished = false;
  const buttons = [];

  function tap(playerId) {
    if (finished) return;
    ctx.scores.add(playerId, 1);
    if (ctx.network) ctx.network.send('tap', { playerId }); // tell the other phones
    check(playerId);
  }

  function check(playerId) {
    if (!finished && ctx.scores.get(playerId) >= GOAL) {
      finished = true;
      ctx.finish([playerId]);
    }
  }

  // In online mode the other phones tell us about their taps.
  // (The shell already syncs scores; here we only check for a winner.)
  const stopListening = ctx.network
    ? ctx.network.on('tap', ({ playerId }) => check(playerId))
    : () => {};

  const element = h('div', { class: 'tpl-game' },
    h('p', { class: 'muted' }, `First to ${GOAL} taps wins!`),
    h('div', { class: 'tpl-buttons' },
      ctx.players.map((p) => {
        // online: you can only press your own button
        const mine = ctx.mode === 'local' || (ctx.me && ctx.me.id === p.id);
        const btn = h('button', {
          class: 'btn big',
          style: { background: p.color, color: '#10102a' },
          disabled: !mine,
          onClick: () => tap(p.id),
        }, p.name);
        buttons.push(btn);
        return btn;
      })
    )
  );

  return {
    element,
    destroy() { stopListening(); },
  };
}

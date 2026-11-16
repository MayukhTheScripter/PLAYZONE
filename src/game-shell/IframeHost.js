// ---------------------------------------------------------------------------
// IFRAME HOST - shows a standalone HTML game inside PLAYZONE, safely.
//
// How it works
//   1. The game page is loaded in an <iframe sandbox="allow-scripts">.
//      Without "allow-same-origin" the game gets an opaque origin: it CANNOT read
//      PLAYZONE's localStorage, cookies, the Supabase session or any key.
//   2. The game's SDK (games/_shared/playzone-sdk.js) says "hello". We check the
//      message really came from OUR iframe window, then create a private
//      MessageChannel and send one end of it to the game together with the match
//      info (players, mode...). Nothing secret is in that message.
//   3. From then on all traffic uses that private channel. Every message is
//      checked here: known type, small size, not too many per second, and the
//      values must make sense (known player ids, finite numbers...).
//
// Who may do what (see docs/GAMES.md)
//   - Local mode: one phone, so the game may report scores and the winner.
//   - Online mode: only the HOST's copy may report scores/winners, and only for
//     games whose manifest says  "trust": "host".  Games with "trust": "server"
//     must get results from the server, so the browser's claims are ignored.
// ---------------------------------------------------------------------------
import { h } from '../utils/dom.js';
import { load, save } from '../utils/storage.js';

const PROTOCOL = 1;
const MAX_BYTES = 8192;          // biggest accepted message
const MAX_PER_SECOND = 120;      // simple flood protection
const ALLOWED_TYPES = new Set(['score', 'turn', 'finish', 'event', 'pref']);
const PREF_KEYS = new Set(['mg-sound']);   // settings a game may remember for the player

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

export function createIframeGame(manifest) {
  return function createGame(ctx) {
    const src = import.meta.env.BASE_URL + 'games/' + manifest.id + '/' + manifest.entry;
    const frame = h('iframe', {
      class: 'pz-frame', src, title: manifest.name,
      sandbox: 'allow-scripts',          // nothing else: no same-origin, no popups, no top navigation
      allow: '', referrerpolicy: 'no-referrer',
    });
    const element = h('div', { class: 'pz-frame-wrap' }, frame);

    const ids = new Set(ctx.players.map((p) => p.id));
    const online = ctx.mode === 'online';
    // May this browser's game instance decide scores and winners?
    const mayReport = !online || (ctx.isHost && manifest.trust === 'host');

    let port = null, finished = false, closed = false, stopListening = null;
    let windowStart = Date.now(), windowCount = 0;

    // ---- step 2: handshake ----
    function onWindowMessage(e) {
      if (e.source !== frame.contentWindow) return;                       // only our iframe
      const d = e.data;
      if (!isObj(d) || d.pz !== PROTOCOL || d.type !== 'hello' || port) return;
      const channel = new MessageChannel();
      port = channel.port1;
      port.onmessage = onGameMessage;
      frame.contentWindow.postMessage({
        pz: PROTOCOL, type: 'init',
        init: {
          standalone: false, mode: ctx.mode,
          players: ctx.players.map((p) => ({ id: p.id, name: p.name, color: p.color, index: p.index, cpu: !!p.cpu })),
          me: ctx.me ? { id: ctx.me.id } : null, isHost: !!ctx.isHost, hostId: typeof ctx.hostId === 'string' ? ctx.hostId : null,
          prefs: load('prefs', {}),
        },
      }, '*', [channel.port2]);   // '*' is needed: a sandboxed page has no usable origin. Nothing secret is sent.
    }
    window.addEventListener('message', onWindowMessage);

    // Messages other players' copies of the game sent (online mode): hand them to our game.
    if (online && ctx.network) {
      stopListening = ctx.network.on('game', (p, fromId) => {
        if (!port || closed || !isObj(p) || typeof p.name !== 'string' || p.name.length > 40 || typeof fromId !== 'string') return;
        if (!ids.has(fromId)) return;                                   // only people in this room
        try { port.postMessage({ pz: PROTOCOL, type: 'event', name: p.name, data: p.data, from: fromId }); } catch { /* ignore */ }
      });
    }

    // ---- step 3: validated messages from the game ----
    function tooMany() {
      const now = Date.now();
      if (now - windowStart > 1000) { windowStart = now; windowCount = 0; }
      return ++windowCount > MAX_PER_SECOND;
    }

    function onGameMessage(e) {
      if (closed || tooMany()) return;
      const m = e.data;
      if (!isObj(m) || m.pz !== PROTOCOL || !ALLOWED_TYPES.has(m.type)) return;
      let size = 0;
      try { size = JSON.stringify(m).length; } catch { return; }
      if (size > MAX_BYTES) return;

      switch (m.type) {
        case 'score': {
          if (!mayReport || !ids.has(m.id) || typeof m.value !== 'number' || !Number.isFinite(m.value) || Math.abs(m.value) > 1e6) return;
          ctx.scores.set(m.id, m.value);
          break;
        }
        case 'turn': {
          if (m.id !== null && !ids.has(m.id)) return;
          if (ctx.setTurn) ctx.setTurn(m.id);
          break;
        }
        case 'finish': {
          if (!mayReport || finished || !Array.isArray(m.winnerIds) || m.winnerIds.length > 4) return;
          const winners = [...new Set(m.winnerIds)];
          if (winners.some((id) => !ids.has(id))) return;
          finished = true;
          ctx.finish(winners);
          break;
        }
        case 'event': {
          // Game-to-game messages for online play (relayed to the other phones).
          if (!online || !ctx.network || typeof m.name !== 'string' || m.name.length > 40) return;
          ctx.network.send('game', { name: m.name, data: m.data });
          break;
        }
        case 'pref': {
          if (typeof m.key !== 'string' || !PREF_KEYS.has(m.key) || typeof m.value !== 'string' || m.value.length > 200) return;
          save('prefs', { ...load('prefs', {}), [m.key]: m.value });
          break;
        }
        default:
      }
    }

    return {
      element,
      destroy() {
        closed = true;
        window.removeEventListener('message', onWindowMessage);
        if (stopListening) stopListening();
        if (port) { port.onmessage = null; port.close(); port = null; }
        frame.remove();
      },
    };
  };
}

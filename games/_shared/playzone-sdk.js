/* =============================================================================
 * playzone-sdk.js - the tiny bridge between a standalone HTML game and PLAYZONE
 *
 * Add it to any game with:   <script src="../_shared/playzone-sdk.js"></script>
 *
 * INSIDE PLAYZONE the game runs in a sandboxed iframe. This file performs the
 * handshake and then talks to PLAYZONE over a private MessageChannel.
 * OUTSIDE PLAYZONE (you opened index.html yourself, or file://) it switches to
 * "standalone" mode, so you can develop and test the game on its own.
 *
 * API (all calls are safe to make in both modes):
 *   PlayZone.onInit(function (init) { ... })   called once with the match info:
 *        init = { mode: 'local' | 'online', standalone: bool,
 *                 players: [{ id, name, color, index, cpu? }],
 *                 me: { id } | null, isHost: bool, prefs: {} }
 *   PlayZone.setScore(playerId, value)         report a score
 *   PlayZone.turn(playerId | null)             whose turn it is (highlights them)
 *   PlayZone.finish([winnerIds], summary)      the match is over (empty list = no winner)
 *   PlayZone.send(name, data)                  (online) send an event to the other players
 *   PlayZone.on(name, function (data, fromId)) (online) receive such an event (fromId = that player's id)
 *   PlayZone.off(name, fn)                     stop listening
 *   PlayZone.setPref(key, string)              remember a small setting for this player
 *
 * SECURITY: PLAYZONE validates every message and never gives a game the Supabase
 * session or keys. Scores and winners reported by a game are only accepted where
 * the game's manifest allows it (see docs/GAMES.md).
 * ========================================================================== */
(function (root) {
  'use strict';
  var PROTOCOL = 1;
  var port = null, inited = false, initCbs = [], handlers = {}, lastInit = null, prefs = {};

  var PlayZone = {
    protocol: PROTOCOL,
    embedded: false,
    onInit: function (cb) { if (inited) cb(lastInit); else initCbs.push(cb); },
    setScore: function (id, value) { post({ type: 'score', id: id, value: value }); },
    turn: function (id) { post({ type: 'turn', id: id == null ? null : id }); },
    finish: function (winnerIds, summary) { post({ type: 'finish', winnerIds: winnerIds || [], summary: String(summary || '').slice(0, 200) }); },
    send: function (name, data) { post({ type: 'event', name: String(name), data: data }); },
    on: function (name, cb) { (handlers[name] = handlers[name] || []).push(cb); },
    off: function (name, cb) { handlers[name] = (handlers[name] || []).filter(function (f) { return f !== cb; }); },
    setPref: function (key, value) { prefs[key] = String(value); post({ type: 'pref', key: String(key), value: String(value) }); },
    getPref: function (key) { return Object.prototype.hasOwnProperty.call(prefs, key) ? prefs[key] : null; },
  };

  function post(msg) {
    msg.pz = PROTOCOL;
    if (port) { try { port.postMessage(msg); } catch (e) { /* ignore */ } }
    else if (!PlayZone.embedded && root.console) { console.log('[PlayZone standalone]', msg); }
  }

  function deliverInit(init) {
    if (inited) return;
    inited = true; lastInit = init; prefs = init.prefs || {};
    PlayZone.embedded = !init.standalone;
    initCbs.splice(0).forEach(function (cb) { try { cb(init); } catch (e) { console.error(e); } });
  }

  // ---- standalone (development) mode ----
  function standalone() {
    if (inited) return;
    var q = /[?&]players=(\d)/.exec(root.location.search);
    var n = Math.max(1, Math.min(4, q ? Number(q[1]) : 2));
    var colors = ['#ff5d9e', '#4cc9f0', '#ffd166', '#7bf1a8'], players = [];
    for (var i = 0; i < n; i++) players.push({ id: 'p' + (i + 1), name: 'Player ' + (i + 1), color: colors[i], index: i });
    deliverInit({ standalone: true, mode: 'local', players: players, me: null, isHost: true, prefs: {} });
  }

  // ---- embedded mode: handshake with PLAYZONE ----
  function onMessage(e) {
    // Only the window that embeds us may answer, and only with a MessagePort.
    if (e.source !== root.parent || !e.data || e.data.pz !== PROTOCOL || e.data.type !== 'init' || !e.ports || !e.ports[0]) return;
    port = e.ports[0];
    port.onmessage = function (ev) {
      var m = ev.data;
      if (!m || m.pz !== PROTOCOL) return;
      if (m.type === 'event') (handlers[m.name] || []).forEach(function (cb) { try { cb(m.data, m.from); } catch (err) { console.error(err); } });
    };
    root.removeEventListener('message', onMessage);
    deliverInit(e.data.init || {});
  }

  if (root.parent && root.parent !== root) {
    root.addEventListener('message', onMessage);
    var tries = 0;
    (function hello() {
      if (inited) return;
      if (tries++ > 12) { standalone(); return; }      // nobody answered: run on our own
      try { root.parent.postMessage({ pz: PROTOCOL, type: 'hello' }, '*'); } catch (e) { /* ignore */ }
      setTimeout(hello, 250);
    })();
  } else {
    setTimeout(standalone, 0);
  }

  root.PlayZone = PlayZone;
})(window);

// ---------------------------------------------------------------------------
// GAME SHELL (the page every game is shown inside)
//
// It provides the parts all games share, so a game only needs to contain its
// own gameplay:
//   * top bar with the game name and a Quit button
//   * the live scoreboard (and connection dots in online mode)
//   * loading, "coming soon" and error screens
//   * the end-of-match result screen
//   * the `ctx` object that a game receives (see games/_template/index.js)
// ---------------------------------------------------------------------------
import { h, iconEl } from '../utils/dom.js';
import { getGame } from '../config/games.js';
import { getSession, recordWin } from '../state.js';
import { navigate } from '../router.js';
import { loadGame } from '../games/registry.js';
import { ScoreBoard } from '../components/ScoreBoard.js';
import { openGameChannel } from '../multiplayer/gameChannel.js';
import { openLobbyChannel } from '../multiplayer/lobbyChannel.js';
import { fetchRoom, backToLobby, leaveRoom } from '../multiplayer/roomService.js';
import { toast } from '../components/toast.js';

export function GameShell({ id }) {
  const session = getSession();
  const game = getGame(id);

  // No match chosen (for example the page was refreshed): go back home.
  if (!session || !game) {
    setTimeout(() => navigate('/'), 0);
    return { element: h('p', { class: 'muted pad' }, 'Taking you home…') };
  }

  const online = session.mode === 'online';
  // One person alone plays against the Computer, in games that have one (manifest "cpu": true).
  const players = !online && session.players.length === 1 && game.cpu
    ? [...session.players, { id: 'cpu', name: 'Computer', color: '#8d96ad', index: 4, cpu: true }]
    : session.players;
  const scores = Object.fromEntries(players.map((p) => [p.id, 0]));
  let onlineIds = online ? [] : null;
  let gameInstance = null;
  let gameChannel = null;
  let lobbyChannel = null;
  let finished = false;
  let destroyed = false;

  const board = ScoreBoard(players, { showPresence: online });
  const stage = h('div', { class: 'stage' }, h('p', { class: 'muted pad' }, 'Loading game…'));
  const overlay = h('div', { class: 'result', hidden: true });

  const quit = h('button', { class: 'shell-quit', type: 'button', onClick: onQuit, 'aria-label': online ? 'Leave game' : 'Quit game', title: online ? 'Leave' : 'Quit' }, '✕');
  // Full screen (where the browser allows it: Android, desktop, iPad). Hidden on browsers that cannot do it.
  const fsDoc = document, fsRoot = document.documentElement;
  const fsOk = !!(fsDoc.fullscreenEnabled || fsDoc.webkitFullscreenEnabled);
  const fsIsOn = () => !!(fsDoc.fullscreenElement || fsDoc.webkitFullscreenElement);
  function fsEnter() { try { const p = (fsRoot.requestFullscreen || fsRoot.webkitRequestFullscreen).call(fsRoot, { navigationUI: 'hide' }); if (p && p.catch) p.catch(() => {}); } catch (e) { /* not allowed */ } }
  function fsToggle() { if (fsIsOn()) { try { (fsDoc.exitFullscreen || fsDoc.webkitExitFullscreen).call(fsDoc); } catch (e) { /* ignore */ } } else fsEnter(); }
  const fsBtn = fsOk ? h('button', { class: 'shell-quit shell-fs', type: 'button', onClick: fsToggle, 'aria-label': 'Toggle full screen', title: 'Full screen' }, '⛶') : null;
  if (fsOk && !fsIsOn()) setTimeout(fsEnter, 0);   // works when the game opens straight from a tap
  const element = h('section', { class: 'shell' },
    h('header', { class: 'shell-bar' }, quit, fsBtn, board),
    stage, overlay);

  function refreshBoard() { board.update(scores, onlineIds); }
  refreshBoard();

  // ----- scores (shared with the game through ctx.scores) -----
  const scoreApi = {
    get: (pid) => scores[pid] || 0,
    all: () => ({ ...scores }),
    set(pid, value, fromNetwork = false) {
      scores[pid] = value;
      refreshBoard();
      if (online && gameChannel && !fromNetwork) gameChannel.send('__score', { pid, value });
    },
    add(pid, amount) { scoreApi.set(pid, (scores[pid] || 0) + amount); },
  };

  // ----- ending the match -----
  function finish(winnerIds, fromNetwork = false) {
    if (finished) return;
    finished = true;
    if (online && gameChannel && !fromNetwork) gameChannel.send('__finish', { winnerIds });
    if (!online) winnerIds.forEach((wid) => { const p = players.find((x) => x.id === wid); if (p && !p.cpu) recordWin(p.name); });
    showResult(winnerIds);
  }

  function showResult(winnerIds) {
    const winners = winnerIds.map((wid) => players.find((p) => p.id === wid)).filter(Boolean);
    const ranked = [...players].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));
    const buttons = [];
    if (online) {
      if (session.isHost) buttons.push(h('button', { class: 'btn', type: 'button', onClick: onBackToLobby }, 'Back to lobby'));
      else buttons.push(h('p', { class: 'muted' }, 'Waiting for the host…'));
      buttons.push(h('button', { class: 'btn ghost', type: 'button', onClick: onQuit }, 'Leave room'));
    } else {
      buttons.push(
        h('button', { class: 'btn', type: 'button', onClick: restart }, 'Play again'),
        h('a', { class: 'btn ghost', href: '#/local/games' }, 'Pick another game'));
    }
    overlay.replaceChildren(h('div', { class: 'result-card' },
      h('div', { class: 'trophy', 'aria-hidden': 'true' }, '🏆'),
      h('h2', {}, winners.length ? (winners.length === 1 ? winners[0].name + ' wins!' : 'It is a tie!') : 'Match over'),
      h('ol', { class: 'rank' }, ranked.map((p) => h('li', { style: { '--pc': p.color } }, h('span', {}, p.name), h('b', {}, scores[p.id] || 0)))),
      h('div', { class: 'row center' }, buttons)));
    overlay.hidden = false;
  }

  // ----- play again: reset scores and start a fresh copy of the game -----
  function restart() {
    try { gameInstance && gameInstance.destroy && gameInstance.destroy(); } catch (e) { console.error(e); }
    gameInstance = null; finished = false;
    players.forEach((p) => { scores[p.id] = 0; });
    board.setTurn(null); refreshBoard();
    overlay.hidden = true;
    stage.replaceChildren(h('p', { class: 'muted pad' }, 'Loading game…'));
    start();
  }

  // ----- leaving -----
  async function onQuit() {
    if (!online) { navigate('/local/games'); return; }
    try { await leaveRoom(session.roomCode); } catch (e) { toast(e.message, 'error'); }
    navigate('/');
  }
  async function onBackToLobby() {
    try { await backToLobby(session.roomCode); navigate('/lobby/' + session.roomCode); } catch (e) { toast(e.message, 'error'); }
  }

  // ----- online connections -----
  function connectOnline() {
    gameChannel = openGameChannel({
      code: session.roomCode, userId: session.me.id,
      onPresence: (ids) => { onlineIds = ids; refreshBoard(); },
    });
    gameChannel.on('__score', ({ pid, value }) => scoreApi.set(pid, value, true));
    gameChannel.on('__finish', ({ winnerIds }) => finish(winnerIds, true));
    // If the host sends everyone back to the lobby, follow them.
    lobbyChannel = openLobbyChannel({
      code: session.roomCode, userId: session.me.id, nickname: '',
      onPresence: () => {},
      onChange: async () => {
        try {
          const data = await fetchRoom(session.roomCode);
          if (destroyed) return;
          if (!data) { navigate('/'); return; }
          if (data.room.status === 'lobby') navigate('/lobby/' + session.roomCode);
        } catch { /* ignore temporary network errors */ }
      },
    });
  }

  // ----- start the game -----
  async function start() {
    if (online) connectOnline();
    try {
      const factory = await loadGame(id);
      if (destroyed) return;
      if (!factory) {
        stage.replaceChildren(h('div', { class: 'soon-panel' },
          iconEl('big-icon', game.icon, 'div'),
          h('h2', {}, game.name),
          h('p', { class: 'muted' }, 'This game is coming in a later stage. The scoreboard, players and navigation are already wired up and waiting for it.'),
          h('p', { class: 'muted small' }, 'Developer note: add src/games/' + id + '/index.js (copy src/games/_template).'),
          h('a', { class: 'btn', href: online ? '#/lobby/' + session.roomCode : '#/local/games' }, 'Choose another game')));
        return;
      }
      const ctx = {
        game, mode: session.mode, players,
        me: online ? session.me : null, isHost: online ? session.isHost : false, hostId: online ? (session.hostId || null) : null,
        scores: scoreApi,
        network: online ? { send: (t, d) => gameChannel.send(t, d), on: (t, fn) => gameChannel.on(t, fn) } : null,
        finish: (winnerIds) => finish(winnerIds),
        setTurn: (pid) => board.setTurn(pid),
      };
      gameInstance = factory(ctx);
      stage.replaceChildren(gameInstance.element);
    } catch (e) {
      console.error(e);
      stage.replaceChildren(h('div', { class: 'soon-panel' }, h('h2', {}, 'Could not load the game'), h('p', { class: 'muted' }, e.message),
        h('button', { class: 'btn', type: 'button', onClick: () => navigate('/play/' + id) }, 'Try again')));
    }
  }
  start();

  return {
    element,
    destroy() {
      destroyed = true;
      try { gameInstance && gameInstance.destroy && gameInstance.destroy(); } catch (e) { console.error(e); }
      gameChannel && gameChannel.close();
      lobbyChannel && lobbyChannel.close();
    },
  };
}

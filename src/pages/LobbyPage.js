// ---------------------------------------------------------------------------
// LOBBY PAGE (online)
// Shows the room code, the four seats, the game picker (host only) and the
// Start button (host only). It listens to Supabase Realtime so every phone
// updates instantly when somebody joins, leaves or the host picks a game.
// ---------------------------------------------------------------------------
import { h, mount } from '../utils/dom.js';
import { AppBar } from '../components/AppBar.js';
import { PlayerSlots } from '../components/PlayerSlots.js';
import { GameGrid } from '../components/GameGrid.js';
import { GameCard } from '../components/GameCard.js';
import { toast } from '../components/toast.js';
import { getProfile, setSession, updateProfile } from '../state.js';
import { isSupabaseConfigured, ensureSignedIn } from '../supabase/client.js';
import { fetchRoom, joinRoom, leaveRoom, selectGame, startMatch, setReady } from '../multiplayer/roomService.js';
import { openLobbyChannel } from '../multiplayer/lobbyChannel.js';
import { cleanRoomCode } from '../utils/format.js';
import { cleanNickname, colorFor, NICKNAME_MAX } from '../utils/players.js';
import { getGame } from '../config/games.js';
import { isGameReady } from '../games/registry.js';
import { navigate } from '../router.js';
import { supportsMode } from '../config/games.js';
import { copyText, shareRoom, roomLink } from '../utils/share.js';

export function LobbyPage({ code: rawCode }) {
  const code = cleanRoomCode(rawCode);
  const body = h('main', { class: 'panel wide' }, h('p', { class: 'muted pad' }, 'Connecting to the room…'));
  const element = h('div', { class: 'page' }, AppBar({ back: '#/', title: 'Room ' + code }), body);

  let userId = null;
  let data = null; // { room, players }
  let onlineIds = [];
  let connection = 'connecting';
  let channel = null;
  let grid = null;
  let destroyed = false;
  let loading = false;
  let again = false;

  if (!isSupabaseConfigured) {
    mount(body, h('div', { class: 'notice' }, h('h2', {}, 'Supabase is not set up'), h('p', {}, 'Online rooms need Supabase. See README.md.'), h('a', { class: 'btn', href: '#/' }, 'Home')));
    return { element };
  }

  // ----- load the room from the database (coalesces rapid updates) -----
  async function load() {
    if (loading) { again = true; return; }
    loading = true;
    try {
      data = await fetchRoom(code);
    } catch (e) { toast(e.message, 'error'); }
    loading = false;
    if (destroyed) return;
    if (again) { again = false; load(); return; }
    route();
  }

  function isMember() { return data && data.players.some((p) => p.player_id === userId); }

  function route() {
    // A person who is not in the room yet (for example someone who opened a shared link)
    // cannot read it, because the database only lets members read their own room.
    // So "no data" and "not a member" both lead to the join form. If the room really
    // does not exist, joining shows a clear error from the server.
    if (!data || !isMember()) { showJoinForm(); return; }
    if (!channel) openChannel();
    if (data.room.status === 'playing' && data.room.game_id) { goToGame(); return; }
    render();
  }

  function openChannel() {
    const me = data.players.find((p) => p.player_id === userId);
    channel = openLobbyChannel({
      code, userId, nickname: me ? me.nickname : '',
      onChange: load,
      onPresence: (ids) => { onlineIds = ids; if (data && isMember() && data.room.status === 'lobby') render(); },
      onStatus: (s) => { connection = s === 'SUBSCRIBED' ? 'online' : (s === 'CLOSED' || s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') ? 'offline' : 'connecting'; if (data && isMember() && data.room.status === 'lobby') render(); },
    });
  }

  function goToGame() {
    const players = data.players.map((p, i) => ({ id: p.player_id, name: p.nickname, color: colorFor(i), index: i }));
    setSession({ mode: 'online', roomCode: code, me: { id: userId }, isHost: data.room.host_id === userId, hostId: data.room.host_id, players, gameId: data.room.game_id });
    navigate('/play/' + data.room.game_id);
  }

  // ----- screens -----
  function showMessage(title, text) {
    mount(body, h('div', { class: 'notice center' }, h('div', { class: 'big-icon' }, '🚪'), h('h2', {}, title), h('p', { class: 'muted' }, text), h('a', { class: 'btn', href: '#/online' }, 'Back')));
  }

  function showJoinForm() {
    const nick = h('input', { type: 'text', maxlength: NICKNAME_MAX, value: getProfile().nickname, placeholder: 'Your nickname', autocomplete: 'off' });
    mount(body, h('form', { class: 'notice', onSubmit: async (e) => {
      e.preventDefault();
      const n = cleanNickname(nick.value);
      if (!n) { toast('Please type a nickname.', 'error'); return; }
      updateProfile({ nickname: n });
      try { await joinRoom(code, n); await load(); } catch (err) { toast(err.message, 'error', 6000); }
    } }, h('h2', {}, 'Join room ' + code), h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Nickname'), nick), h('button', { class: 'btn big', type: 'submit' }, 'Join')));
  }

  function render() {
    const room = data.room;
    const isHost = room.host_id === userId;
    const chosen = room.game_id ? getGame(room.game_id) : null;

    if (isHost && !grid) grid = GameGrid({ onSelect: pickGame, selectedId: room.game_id, context: 'online' });
    if (isHost && grid) grid.setSelected(room.game_id);

    // "ready" only exists after supabase/migrations/001_ready.sql has been run.
    const readySupported = data.players.length > 0 && data.players.every((p) => 'ready' in p);
    const me = data.players.find((p) => p.player_id === userId);
    const waiting = data.players.filter((p) => !p.ready).length;
    const allReady = !readySupported || waiting === 0;

    const canStart = isHost && chosen && isGameReady(chosen.id) && supportsMode(chosen, 'online') && data.players.length >= 2 && allReady;
    const startHint = !isHost ? (readySupported && me && !me.ready ? 'Press Ready when you are set. The host starts once everyone is ready.' : 'Waiting for the host to start…')
      : !chosen ? 'Pick a game below.'
      : !isGameReady(chosen.id) ? chosen.name + ' is not built yet. Pick another game.'
      : !supportsMode(chosen, 'online') ? chosen.name + ' is Local only for now. Pick another game.'
      : data.players.length < 2 ? 'Waiting for at least one more player…'
      : !allReady ? 'Waiting for ' + waiting + ' player' + (waiting === 1 ? '' : 's') + ' to be ready…' : '';

    mount(body,
      h('section', { class: 'room-head' },
        h('div', {}, h('p', { class: 'field-label' }, 'Room code'), h('div', { class: 'room-code', 'aria-label': 'Room code ' + code.split('').join(' ') }, code)),
        h('div', { class: 'row' },
          h('button', { class: 'btn small', type: 'button', onClick: copyCode }, 'Copy code'),
          h('button', { class: 'btn small ghost', type: 'button', onClick: shareCode }, 'Share')),
        h('span', { class: 'status ' + (connection === 'online' ? 'on' : 'off') }, connection === 'online' ? 'Live' : connection === 'connecting' ? 'Connecting…' : 'Reconnecting…')),
      h('h2', { class: 'section-title' }, `Players (${data.players.length}/4)`),
      PlayerSlots({ players: data.players, hostId: room.host_id, meId: userId, onlineIds: connection === 'online' ? onlineIds : null, showReady: readySupported }),
      h('h2', { class: 'section-title' }, isHost ? 'Choose a game' : 'Selected game'),
      isHost ? grid : (chosen ? h('div', { class: 'game-grid single' }, GameCard(chosen, { disabled: true, selected: true, context: 'online' })) : h('p', { class: 'muted' }, 'The host is choosing a game…')),
      !readySupported ? h('p', { class: 'muted center small' }, 'Ready/Unready is off: run supabase/migrations/001_ready.sql in Supabase to turn it on.') : null,
      h('div', { class: 'actions' },
        readySupported && me ? h('button', { class: 'btn big ' + (me.ready ? 'ghost' : 'ready-btn'), type: 'button', onClick: toggleReady }, me.ready ? 'Not ready' : "I'm ready") : null,
        isHost ? h('button', { class: 'btn big', type: 'button', disabled: !canStart, onClick: start }, 'Start match') : null,
        startHint ? h('p', { class: 'muted center' }, startHint) : null,
        h('button', { class: 'btn ghost', type: 'button', onClick: leave }, 'Leave room')));
  }

  // ----- actions -----
  async function pickGame(game, usable, reason) {
    try { await selectGame(code, game.id); if (!usable) toast(reason || game.name + ' is not available online.'); } catch (e) { toast(e.message, 'error'); }
  }
  async function toggleReady() {
    const me = data.players.find((p) => p.player_id === userId);
    try { await setReady(code, !(me && me.ready)); await load(); } catch (e) { toast(e.message, 'error', 6000); }
  }
  async function start() {
    try { await startMatch(code); } catch (e) { toast(e.message, 'error'); }
  }
  async function leave() {
    try { await leaveRoom(code); } catch (e) { toast(e.message, 'error'); }
    navigate('/');
  }
  async function copyCode() {
    if (await copyText(code)) toast('Code copied', 'success');
    else toast('Copy failed. The code is ' + code);
  }
  async function shareCode() {
    const result = await shareRoom(code);
    if (result === 'copied') toast('Invite link copied. Paste it to your friends.', 'success');
    else if (result === 'failed') toast('Could not copy. Share this link: ' + roomLink(code));
  }

  // ----- start up -----
  (async () => {
    try {
      const user = await ensureSignedIn();
      userId = user.id;
      await load();
    } catch (e) {
      showMessage('Could not connect', e.message);
    }
  })();

  return { element, destroy() { destroyed = true; channel && channel.close(); } };
}

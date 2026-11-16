import { h } from '../utils/dom.js';
import { AppBar, Logo } from '../components/AppBar.js';
import { GameGrid } from '../components/GameGrid.js';
import { localPlayable } from '../config/games.js';
import { toast } from '../components/toast.js';
import { getProfile, updateProfile, getSession, getLeaderboard } from '../state.js';
import { isSupabaseConfigured } from '../supabase/client.js';
import { getLastRoom } from '../multiplayer/roomService.js';
import { AVATARS, NICKNAME_MAX } from '../utils/players.js';
import { navigate } from '../router.js';

export function HomePage({ scrollTo } = {}) {
  const session = getSession();
  const modes = h('section', { class: 'modes', id: 'modes' },
    h('a', { class: 'mode online', href: '#/online' },
      h('span', { class: 'mode-icon', 'aria-hidden': 'true' }, '🌐'),
      h('span', { class: 'mode-title' }, 'Online Multiplayer'),
      h('span', { class: 'mode-desc' }, 'Four friends, four phones. Share a room code.'),
      isSupabaseConfigured ? null : h('span', { class: 'chip wait' }, 'Needs Supabase setup')),
    h('a', { class: 'mode local', href: '#/local' },
      h('span', { class: 'mode-icon', 'aria-hidden': 'true' }, '📱'),
      h('span', { class: 'mode-title' }, 'Local Multiplayer'),
      h('span', { class: 'mode-desc' }, 'Pass one phone around the table.'),
      h('span', { class: 'chip ok' }, 'Works offline')));

  // ----- banners -----
  const banners = [];
  const last = isSupabaseConfigured ? getLastRoom() : null;
  if (last) banners.push(h('div', { class: 'banner' }, h('span', {}, 'You were in room ', h('b', {}, last.code)),
    h('a', { class: 'btn small', href: '#/lobby/' + last.code }, 'Rejoin')));
  if (session && session.mode === 'local') banners.push(h('div', { class: 'banner' },
    h('span', {}, 'Local game: ' + session.players.map((p) => p.name).join(', ')),
    h('a', { class: 'btn small', href: '#/local/games' }, 'Pick a game')));

  // ----- game grid -----
  const grid = GameGrid({
    onSelect: (game, ready) => {
      const s = getSession();
      if (s && s.mode === 'local' && ready) {
        if (!localPlayable(game, s.players.length)) { toast(game.name + ' needs at least ' + game.minPlayers + ' players.'); return; }
        navigate('/play/' + game.id); return;
      }
      if (!ready) { toast(game.name + ' is coming in a later stage.'); return; }
      toast('Choose Online or Local Multiplayer first.');
      document.getElementById('modes')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },
  });

  // ----- leaderboard (wins stored on this phone) -----
  const board = getLeaderboard();
  const leaderboard = h('section', { class: 'panel', id: 'leaderboard' },
    h('h2', { class: 'section-title' }, '🏆 Leaderboard'),
    board.length
      ? h('ol', { class: 'lb' }, board.map((r, i) => h('li', {}, h('span', { class: 'rank-n' }, i + 1), h('span', { class: 'lb-name' }, r.name), h('b', {}, r.wins + (r.wins === 1 ? ' win' : ' wins')))))
      : h('p', { class: 'muted' }, 'No wins yet. Finish a local match and the winner appears here.'),
    h('p', { class: 'muted small' }, 'This board is stored on this phone only. A shared online leaderboard needs Supabase tables and is planned for a later stage.'));

  // ----- profile -----
  const profile = getProfile();
  const nick = h('input', { type: 'text', id: 'nick', maxlength: NICKNAME_MAX, value: profile.nickname, placeholder: 'Your nickname', autocomplete: 'off' });
  const avatars = h('div', { class: 'avatars', role: 'radiogroup', 'aria-label': 'Choose your avatar' });
  function drawAvatars() {
    avatars.replaceChildren(...AVATARS.map((a) => h('button', {
      type: 'button', role: 'radio', 'aria-checked': getProfile().avatar === a ? 'true' : 'false',
      class: 'av' + (getProfile().avatar === a ? ' on' : ''), onClick: () => { updateProfile({ avatar: a }); drawAvatars(); },
    }, a)));
  }
  drawAvatars();
  const profileSection = h('section', { class: 'panel', id: 'profile' },
    h('h2', { class: 'section-title' }, '🙂 Your profile'),
    h('label', { class: 'field', for: 'nick' }, h('span', { class: 'field-label' }, 'Nickname'), nick),
    h('p', { class: 'field-label' }, 'Avatar'), avatars,
    h('button', { class: 'btn', type: 'button', onClick: () => { updateProfile({ nickname: nick.value }); nick.value = getProfile().nickname; toast('Profile saved', 'success'); } }, 'Save profile'),
    h('p', { class: 'muted small' }, 'Saved on this phone only (localStorage).'));

  const element = h('div', { class: 'page home' },
    AppBar(),
    h('main', {},
      h('section', { class: 'hero' },
        h('div', { class: 'hero-logo' }, Logo()),
        h('h1', {}, 'Mini games for ', h('span', { class: 'grad' }, 'four friends')),
        h('p', { class: 'lead' }, '30 quick games are on the way. Play together on separate phones, or pass one phone around.')),
      modes, banners,
      h('section', { class: 'panel wide', id: 'games' }, h('h2', { class: 'section-title' }, '🎮 Games'), grid),
      leaderboard, profileSection),
    h('footer', { class: 'footer' }, 'PLAYZONE · Stage 1 build'));

  if (scrollTo) setTimeout(() => document.getElementById(scrollTo)?.scrollIntoView({ behavior: 'smooth' }), 60);
  return { element };
}

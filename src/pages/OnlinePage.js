import { h } from '../utils/dom.js';
import { AppBar } from '../components/AppBar.js';
import { toast } from '../components/toast.js';
import { getProfile, updateProfile } from '../state.js';
import { isSupabaseConfigured } from '../supabase/client.js';
import { createRoom, joinRoom } from '../multiplayer/roomService.js';
import { cleanRoomCode, isValidRoomCode, ROOM_CODE_MAX } from '../utils/format.js';
import { cleanNickname, NICKNAME_MAX } from '../utils/players.js';
import { navigate } from '../router.js';

// Online multiplayer entry: create a room or join one with a code.
export function OnlinePage() {
  const nick = h('input', { type: 'text', id: 'online-nick', maxlength: NICKNAME_MAX, placeholder: 'Your nickname', value: getProfile().nickname, autocomplete: 'off' });
  const code = h('input', {
    type: 'text', id: 'room-code', maxlength: ROOM_CODE_MAX, placeholder: 'ROOM CODE', autocomplete: 'off', autocapitalize: 'characters', inputmode: 'text', class: 'code-input',
    onInput: (e) => { e.target.value = cleanRoomCode(e.target.value); },
  });
  const createBtn = h('button', { class: 'btn big', type: 'button', onClick: onCreate }, 'Create a room');
  const joinBtn = h('button', { class: 'btn big alt', type: 'submit' }, 'Join room');

  function nickname() {
    const n = cleanNickname(nick.value);
    if (!n) { toast('Please type a nickname first.', 'error'); nick.focus(); return null; }
    updateProfile({ nickname: n });
    return n;
  }
  async function busy(buttons, fn) {
    buttons.forEach((b) => (b.disabled = true));
    try { await fn(); } catch (e) { toast(e.message, 'error', 6000); } finally { buttons.forEach((b) => (b.disabled = false)); }
  }
  function onCreate() {
    const n = nickname(); if (!n) return;
    busy([createBtn, joinBtn], async () => navigate('/lobby/' + (await createRoom(n))));
  }
  function onJoin(e) {
    e.preventDefault();
    const n = nickname(); if (!n) return;
    const c = cleanRoomCode(code.value);
    if (!isValidRoomCode(c)) { toast('Room codes have 4 to 6 characters.', 'error'); code.focus(); return; }
    busy([createBtn, joinBtn], async () => navigate('/lobby/' + (await joinRoom(c, n))));
  }

  const setupNotice = h('div', { class: 'notice' },
    h('h2', {}, '⚙️ Supabase is not set up yet'),
    h('p', {}, 'Online play needs a free Supabase project. Until you add your keys this page cannot create or join rooms. Nothing here is faked.'),
    h('ol', {},
      h('li', {}, 'Create a Supabase project and run supabase/schema.sql in its SQL Editor.'),
      h('li', {}, 'Copy .env.example to .env and paste your Project URL and anon key.'),
      h('li', {}, 'Restart the dev server (npm run dev).')),
    h('p', { class: 'muted small' }, 'Full step-by-step instructions are in README.md, section "Configure Supabase".'),
    h('a', { class: 'btn ghost', href: '#/local' }, 'Play locally instead'));

  const form = h('form', { class: 'online-form', onSubmit: onJoin },
    h('label', { class: 'field', for: 'online-nick' }, h('span', { class: 'field-label' }, 'Nickname'), nick),
    h('div', { class: 'split' },
      h('div', { class: 'card-block' }, h('h2', {}, 'Host a game'), h('p', { class: 'muted' }, 'You get a code to share with up to 3 friends.'), createBtn),
      h('div', { class: 'card-block' }, h('h2', {}, 'Join a game'), h('label', { class: 'field', for: 'room-code' }, h('span', { class: 'field-label' }, 'Room code'), code), joinBtn)));

  return { element: h('div', { class: 'page' }, AppBar({ back: '#/', title: 'Online Multiplayer' }),
    h('main', { class: 'panel' }, isSupabaseConfigured ? form : setupNotice)) };
}

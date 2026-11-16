import { h } from '../utils/dom.js';
import { AppBar } from '../components/AppBar.js';
import { getProfile, setSession } from '../state.js';
import { buildLocalPlayers } from '../multiplayer/localSession.js';
import { navigate } from '../router.js';
import { NICKNAME_MAX } from '../utils/players.js';
import { colorFor } from '../utils/players.js';

// Local multiplayer: choose 1-4 players (1 player faces the Computer in games that support it) and type their nicknames.
export function LocalSetupPage() {
  let count = 4;
  const names = [getProfile().nickname || '', '', '', ''];
  const inputs = h('div', { class: 'name-inputs' });
  const countRow = h('div', { class: 'seg', role: 'group', 'aria-label': 'Number of players' });

  function draw() {
    countRow.replaceChildren(...[1, 2, 3, 4].map((n) =>
      h('button', { type: 'button', class: count === n ? 'on' : '', 'aria-pressed': count === n ? 'true' : 'false', onClick: () => { count = n; draw(); } }, n === 1 ? '1 · vs Computer' : n + ' players')));
    inputs.replaceChildren(...Array.from({ length: count }, (_, i) =>
      h('label', { class: 'field', style: { '--pc': colorFor(i) } },
        h('span', { class: 'field-label' }, 'Player ' + (i + 1)),
        h('input', {
          type: 'text', maxlength: NICKNAME_MAX, placeholder: 'Player ' + (i + 1), value: names[i], autocomplete: 'off',
          onInput: (e) => { names[i] = e.target.value; },
        }))));
  }
  draw();

  function start(e) {
    e.preventDefault();
    const players = buildLocalPlayers(names.slice(0, count));
    setSession({ mode: 'local', players });
    navigate('/local/games');
  }

  return { element: h('div', { class: 'page' }, AppBar({ back: '#/', title: 'Local Multiplayer' }),
    h('main', { class: 'panel' },
      h('p', { class: 'lead' }, 'Everyone shares this phone. Pick how many players and enter nicknames. Playing alone? You face the Computer in games that have one.'),
      h('form', { onSubmit: start },
        h('h2', { class: 'label' }, 'How many players?'), countRow,
        h('h2', { class: 'label' }, 'Nicknames'), inputs,
        h('button', { class: 'btn big', type: 'submit' }, 'Choose a game →')))) };
}

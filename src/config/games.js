// ---------------------------------------------------------------------------
// GAME CATALOGUE
// This file holds the categories and the list of games we PLAN to build (shown
// as "Coming soon"). Real games are discovered automatically from
// games/<id>/manifest.json (see tools/playzone-games.js and src/games/registry.js)
// and appear in GAMES below without editing this file. A manifest can say
// "replaces": "<planned-id>" to take over a planned card.
// ---------------------------------------------------------------------------
import { manifests } from 'virtual:playzone-games';

export const MAX_PLAYERS = 4;

export const CATEGORIES = [
  { id: 'reaction', name: 'Reaction', icon: '⚡', color: '#ffd166' },
  { id: 'brain', name: 'Brain & Memory', icon: '🧠', color: '#4cc9f0' },
  { id: 'luck', name: 'Luck', icon: '🎲', color: '#ff5d9e' },
  { id: 'arcade', name: 'Arcade', icon: '🕹️', color: '#7bf1a8' },
  { id: 'party', name: 'Party', icon: '🎉', color: '#b18cff' },
];

// id        -> folder name in src/games and the URL piece (#/play/<id>)
// minPlayers/maxPlayers -> how many people can play
// turnBased -> true when players take turns, false when everyone plays at once
const g = (id, name, category, icon, description, turnBased = false) => ({
  id, name, category, icon, description, turnBased, minPlayers: 2, maxPlayers: MAX_PLAYERS,
});

const PLANNED = [
  // Reaction
  g('whack-a-mole', 'Whack-a-Mole', 'reaction', '🔨', 'Whack the moles before they hide.'),
  g('catch-the-star', 'Catch the Star', 'reaction', '⭐', 'Grab falling stars, dodge the rocks.'),
  g('color-rush', 'Color Rush', 'reaction', '🌈', 'Tap the colour that matches the word.'),
  // Brain and memory
  g('memory-master', 'Memory Master', 'brain', '🃏', 'Find the matching pairs.', true),
  g('emoji-decode', 'Emoji Decode', 'brain', '🔤', 'Guess the phrase from the emojis.'),
  g('number-sequence', 'Number Sequence', 'brain', '📈', 'Work out what comes next.'),
  // Luck
  g('pass-the-bomb', 'Pass the Bomb', 'luck', '💣', 'Do not be holding it when it explodes.', true),
  g('mystery-box', 'Mystery Box', 'luck', '🎁', 'Pick a box. Treasure or trap?', true),
  // Arcade
  g('flappy-challenge', 'Flappy Challenge', 'arcade', '🐤', 'Fly through the gaps. Last bird flying wins.'),
  g('jump-higher', 'Jump Higher', 'arcade', '🦘', 'Climb as high as you can.'),
  g('brick-breaker', 'Brick Breaker', 'arcade', '🧱', 'Smash the bricks for the best score.'),
  g('color-match', 'Color Match', 'arcade', '🎨', 'Match falling colours to the right lane.'),
  g('dont-get-hit', "Don't Get Hit", 'arcade', '☄️', 'Dodge everything that falls.'),
  g('pacman', 'Pacman', 'arcade', '🟡', 'Eat the dots, avoid the ghosts. Highest score wins.'),
  // Party
  g('rock-paper-scissors', 'Rock Paper Scissors', 'party', '✊', 'The classic showdown.', true),
  g('carrom-challenge', 'Carrom Challenge', 'party', '⚪', 'Flick the strikers and pocket the coins.', true),
  g('chess', 'Chess', 'party', '♟️', 'The classic two-player strategy game.', true),
];

// ---------- merge planned cards with the real games found at build time ----------
const replaced = new Set(manifests.map((m) => m.replaces).filter(Boolean));
const planned = PLANNED.filter((x) => !replaced.has(x.id) && !manifests.some((m) => m.id === x.id))
  .map((x) => ({ ...x, playable: false, modes: [], cpu: false, trust: null }));
const real = manifests.map((m) => ({
  id: m.id, name: m.name, category: m.category, icon: m.icon, description: m.description,
  turnBased: Boolean(m.turnBased), minPlayers: m.players.min, maxPlayers: m.players.max,
  playable: true, modes: m.modes, cpu: Boolean(m.cpu), trust: m.trust || null, kind: m.kind,
}));
const order = CATEGORIES.map((c) => c.id);
// playable games first inside each category
export const GAMES = [...real, ...planned].sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category));

export const supportsMode = (game, mode) => Boolean(game && game.playable && game.modes.includes(mode));
// Can this game start with `count` people sharing one phone? (1 player needs the Computer opponent.)
export const localPlayable = (game, count) =>
  supportsMode(game, 'local') && ((count >= game.minPlayers && count <= game.maxPlayers) || (count === 1 && game.cpu));

export const getGame = (id) => GAMES.find((x) => x.id === id) || null;
export const getCategory = (id) => CATEGORIES.find((x) => x.id === id) || null;

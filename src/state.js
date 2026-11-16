// ---------------------------------------------------------------------------
// APP STATE
// A very small store shared by all pages.
//   profile : the player's nickname + avatar (saved in localStorage)
//   session : what is being played right now
//             null                                   -> nothing chosen yet
//             { mode:'local',  players:[...] }       -> one phone, 2-4 players
//             { mode:'online', roomCode, me, ... }   -> set by the lobby page
// ---------------------------------------------------------------------------
import { load, save } from './utils/storage.js';
import { cleanNickname, AVATARS } from './utils/players.js';

const listeners = new Set();

const state = {
  profile: load('profile', { nickname: '', avatar: AVATARS[0] }),
  session: null,
};

export const getProfile = () => state.profile;
export const getSession = () => state.session;

export function updateProfile(patch) {
  const next = { ...state.profile, ...patch };
  next.nickname = cleanNickname(next.nickname);
  state.profile = next;
  save('profile', next);
  emit();
}

export function setSession(session) {
  state.session = session;
  emit();
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  listeners.forEach((fn) => fn(state));
}

// ----- simple local leaderboard (wins per nickname, kept on this phone) -----
export function getLeaderboard() {
  const board = load('leaderboard', {});
  return Object.entries(board)
    .map(([name, wins]) => ({ name, wins }))
    .sort((a, b) => b.wins - a.wins)
    .slice(0, 5);
}

export function recordWin(name) {
  const board = load('leaderboard', {});
  board[name] = (board[name] || 0) + 1;
  save('leaderboard', board);
}

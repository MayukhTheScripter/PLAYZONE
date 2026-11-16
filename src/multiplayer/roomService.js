// ---------------------------------------------------------------------------
// ROOM SERVICE (online mode)
// Every function here talks to Supabase. The heavy rules (4 players maximum,
// only the host can start, and so on) are enforced INSIDE the database by the
// functions in supabase/schema.sql, not just in the browser.
// ---------------------------------------------------------------------------
import { supabase, ensureSignedIn } from '../supabase/client.js';
import { cleanRoomCode } from '../utils/format.js';
import { cleanNickname } from '../utils/players.js';
import { save, load, remove } from '../utils/storage.js';

function need() {
  if (!supabase) throw new Error('Online play needs Supabase. See the README.');
  return supabase;
}

// Supabase errors carry a readable message from our SQL functions.
function fail(error) {
  throw new Error(error?.message || 'Something went wrong. Please try again.');
}

export async function createRoom(nickname) {
  const db = need();
  await ensureSignedIn();
  const { data, error } = await db.rpc('create_room', { p_nickname: cleanNickname(nickname) });
  if (error) fail(error);
  save('lastRoom', { code: data, nickname: cleanNickname(nickname) });
  return data;
}

export async function joinRoom(code, nickname) {
  const db = need();
  await ensureSignedIn();
  const clean = cleanRoomCode(code);
  const { error } = await db.rpc('join_room', { p_code: clean, p_nickname: cleanNickname(nickname) });
  if (error) fail(error);
  save('lastRoom', { code: clean, nickname: cleanNickname(nickname) });
  return clean;
}

export async function leaveRoom(code) {
  const db = need();
  await ensureSignedIn();
  const { error } = await db.rpc('leave_room', { p_code: code });
  remove('lastRoom');
  if (error) fail(error);
}

export async function selectGame(code, gameId) {
  const { error } = await need().rpc('select_game', { p_code: code, p_game_id: gameId });
  if (error) fail(error);
}

// Toggle MY ready flag. The database only lets you change your own row.
export async function setReady(code, ready) {
  const { error } = await need().rpc('set_ready', { p_code: code, p_ready: !!ready });
  if (error) fail(error);
}

export async function startMatch(code) {
  const { error } = await need().rpc('start_match', { p_code: code });
  if (error) fail(error);
}

export async function backToLobby(code) {
  const { error } = await need().rpc('back_to_lobby', { p_code: code });
  if (error) fail(error);
}

// Returns { room, players } or null when the room does not exist.
export async function fetchRoom(code) {
  const db = need();
  const { data: room, error } = await db.from('rooms').select('*').eq('code', code).maybeSingle();
  if (error) fail(error);
  if (!room) return null;
  const { data: players, error: e2 } = await db.from('room_players').select('*').eq('room_code', code).order('joined_at');
  if (e2) fail(e2);
  return { room, players: players || [] };
}

// The last room this phone was in, so the home page can offer "Rejoin".
export const getLastRoom = () => load('lastRoom', null);
export const forgetLastRoom = () => remove('lastRoom');

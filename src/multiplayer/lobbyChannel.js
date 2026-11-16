// ---------------------------------------------------------------------------
// LOBBY CHANNEL
// Keeps the lobby live using Supabase Realtime:
//   * database changes  -> a player joined/left, host picked a game, match started
//   * presence          -> who currently has the page open (green/grey dot)
// ---------------------------------------------------------------------------
import { supabase } from '../supabase/client.js';

export function openLobbyChannel({ code, userId, nickname, onChange, onPresence, onStatus }) {
  const channel = supabase.channel('lobby:' + code, { config: { presence: { key: userId } } });

  const refresh = () => onChange();
  channel
    .on('postgres_changes', { event: '*', schema: 'public', table: 'room_players', filter: 'room_code=eq.' + code }, refresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: 'code=eq.' + code }, refresh)
    .on('presence', { event: 'sync' }, () => onPresence(Object.keys(channel.presenceState())))
    .subscribe(async (status) => {
      onStatus?.(status);
      if (status === 'SUBSCRIBED') {
        await channel.track({ nickname, at: Date.now() });
        refresh(); // catch anything that changed while we were connecting
      }
    });

  return {
    close: () => supabase.removeChannel(channel),
  };
}

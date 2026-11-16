// ---------------------------------------------------------------------------
// GAME CHANNEL
// A live message pipe between the phones during a match. Games use it through
// ctx.network (see src/game-shell/GameShell.js):
//
//     ctx.network.send('tap', { count: 12 });         // tell everyone
//     ctx.network.on('tap', (payload, fromId) => {}); // listen
//
// Messages are broadcast to everyone in the room, including a copy to yourself
// when you pass { self: true }.
// ---------------------------------------------------------------------------
import { supabase } from '../supabase/client.js';

export function openGameChannel({ code, userId, onPresence, onStatus }) {
  const channel = supabase.channel('game:' + code, { config: { broadcast: { self: false }, presence: { key: userId } } });
  const handlers = new Map(); // event name -> Set of callbacks

  channel.on('broadcast', { event: 'msg' }, ({ payload }) => {
    const set = handlers.get(payload.type);
    if (set) set.forEach((fn) => fn(payload.data, payload.from));
  });
  channel.on('presence', { event: 'sync' }, () => onPresence?.(Object.keys(channel.presenceState())));
  channel.subscribe(async (status) => {
    onStatus?.(status);
    if (status === 'SUBSCRIBED') await channel.track({ at: Date.now() });
  });

  return {
    send(type, data) {
      return channel.send({ type: 'broadcast', event: 'msg', payload: { type, data, from: userId } });
    },
    on(type, fn) {
      if (!handlers.has(type)) handlers.set(type, new Set());
      handlers.get(type).add(fn);
      return () => handlers.get(type).delete(fn);
    },
    close: () => supabase.removeChannel(channel),
  };
}

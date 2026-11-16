// Room codes avoid look-alike characters (no 0/O, 1/I/L).
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_MIN = 4;
export const ROOM_CODE_MAX = 6;

export function cleanRoomCode(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, ROOM_CODE_MAX);
}

export function isValidRoomCode(code) {
  return code.length >= ROOM_CODE_MIN && code.length <= ROOM_CODE_MAX;
}

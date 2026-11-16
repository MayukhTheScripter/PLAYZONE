// Shared player look: colours and avatars, plus nickname cleaning.
export const PLAYER_COLORS = ['#ff5d73', '#4cc9f0', '#7bf1a8', '#ffd166'];
export const AVATARS = ['🦊', '🐼', '🐸', '🦁', '🐙', '🦄', '🐵', '🐧', '🐯', '🐶', '🐱', '🦉'];

export const NICKNAME_MAX = 14;

// Remove odd characters and extra spaces, limit the length.
export function cleanNickname(value) {
  return String(value || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, NICKNAME_MAX);
}

export function colorFor(index) {
  return PLAYER_COLORS[index % PLAYER_COLORS.length];
}

// Vite configuration.
// `host: true` lets you open the dev server from your phone on the same Wi-Fi.
import { defineConfig } from 'vite';
import playzoneGames from './tools/playzone-games.js';

export default defineConfig({
  plugins: [playzoneGames()],
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
});

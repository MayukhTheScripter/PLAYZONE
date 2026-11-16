// ---------------------------------------------------------------------------
// GAME REGISTRY - how games are found and started
//
// You never edit this file to add a game. The build step (tools/playzone-games.js)
// scans  games/<id>/manifest.json  and gives us the list as a virtual module.
//   kind "iframe" -> a standalone HTML game, shown through IframeHost (sandboxed)
//   kind "module" -> a JavaScript module that exports  createGame(ctx)  by default
// A game "exists" when its folder (with a valid manifest) exists. Delete the
// folder and the game disappears; its card goes back to "Coming soon".
// ---------------------------------------------------------------------------
import { manifests, moduleLoaders } from 'virtual:playzone-games';
import { createIframeGame } from '../game-shell/IframeHost.js';

export const MANIFESTS = manifests;

export const getManifest = (id) => manifests.find((m) => m.id === id) || null;

export function isGameReady(id) {
  return Boolean(getManifest(id));
}

// Returns a function  (ctx) => ({ element, destroy })  or null when the game is not built yet.
export async function loadGame(id) {
  const manifest = getManifest(id);
  if (!manifest) return null;
  if (manifest.kind === 'iframe') return createIframeGame(manifest);
  const loader = moduleLoaders[id];
  if (!loader) return null;
  const mod = await loader();
  return mod.default;
}

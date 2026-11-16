// -----------------------------------------------------------------------------
// BUILD-TIME GAME DISCOVERY  (a tiny Vite plugin, no extra dependencies)
//
// Every folder inside  games/  that has a  manifest.json  is a game. When you run
// `npm run dev` or `npm run build` this plugin:
//   1. reads and VALIDATES every manifest (a broken one is skipped with a warning,
//      it never breaks the other games or the build),
//   2. hands the list to the app as the virtual module  "virtual:playzone-games",
//   3. in development serves  /games/...  as plain static files (exactly how they
//      will be served in production), and watches the folder so a new game appears
//      without restarting,
//   4. on build, copies  games/  into  dist/games/  (the folders that start with
//      an underscore are shared code or templates; _shared is copied, _template is not).
//
// To add a game:  create games/<id>/ with a manifest.json  ->  run the build.
// To remove one:  delete its folder.
// -----------------------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';

const VIRTUAL_ID = 'virtual:playzone-games';
const RESOLVED_ID = '\0' + VIRTUAL_ID;
export const CATEGORY_IDS = ['reaction', 'brain', 'luck', 'arcade', 'party'];
const KINDS = ['iframe', 'module'];
const MODES = ['local', 'online'];
const TRUST = ['server', 'host'];
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain; charset=utf-8',
};

/** Returns an error message when the manifest is not valid, otherwise null. */
export function validateManifest(m, folder, dir) {
  if (!m || typeof m !== 'object' || Array.isArray(m)) return 'manifest.json must contain a JSON object';
  if (m.id !== folder) return `"id" must equal the folder name ("${folder}"), found "${m.id}"`;
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(m.id)) return '"id" may only use lowercase letters, digits and dashes';
  for (const k of ['name', 'description', 'icon']) if (typeof m[k] !== 'string' || !m[k].trim()) return `"${k}" is required (text)`;
  if (!CATEGORY_IDS.includes(m.category)) return `"category" must be one of: ${CATEGORY_IDS.join(', ')}`;
  if (!KINDS.includes(m.kind)) return `"kind" must be one of: ${KINDS.join(', ')}`;
  if (typeof m.entry !== 'string' || m.entry.includes('..') || !fs.existsSync(path.join(dir, m.entry))) return `"entry" file not found: ${m.entry}`;
  const p = m.players;
  if (!p || !Number.isInteger(p.min) || !Number.isInteger(p.max) || p.min < 1 || p.max > 4 || p.min > p.max) return '"players" must be {min, max} with 1 <= min <= max <= 4';
  if (!Array.isArray(m.modes) || !m.modes.length || m.modes.some((x) => !MODES.includes(x))) return `"modes" must list one or more of: ${MODES.join(', ')}`;
  if (m.modes.includes('online') && !TRUST.includes(m.trust)) return `online games need "trust": ${TRUST.join(' or ')}`;
  if (m.kind === 'module' && !m.entry.endsWith('.js')) return 'module games need a .js entry';
  if (m.kind === 'iframe' && !m.entry.endsWith('.html')) return 'iframe games need an .html entry';
  return null;
}

/** Reads every manifest.json inside games/. Returns { games: [...], problems: ['games/x: reason'] }. */
export function scanGames(root, gamesDirName = 'games') {
  const dir = path.join(root, gamesDirName);
  const games = [], problems = [];
  if (!fs.existsSync(dir)) return { games, problems };
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('_') || entry.name.startsWith('.')) continue;
    const gdir = path.join(dir, entry.name);
    const file = path.join(gdir, 'manifest.json');
    if (!fs.existsSync(file)) { problems.push(`${gamesDirName}/${entry.name}: no manifest.json (folder ignored)`); continue; }
    let m;
    try { m = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { problems.push(`${gamesDirName}/${entry.name}: manifest.json is not valid JSON (${e.message})`); continue; }
    const err = validateManifest(m, entry.name, gdir);
    if (err) { problems.push(`${gamesDirName}/${entry.name}: ${err}`); continue; }
    games.push(m);
  }
  games.sort((a, b) => a.name.localeCompare(b.name));
  const seen = new Set();
  return { games: games.filter((g) => !seen.has(g.id) && seen.add(g.id)), problems };
}

/** Source code of the virtual module. Used by the plugin and by tests. */
export function generateModule(games, root, gamesDirName = 'games') {
  const clean = games.map((g) => ({ ...g }));
  const loaders = games.filter((g) => g.kind === 'module').map((g) => {
    const abs = path.join(root, gamesDirName, g.id, g.entry).split(path.sep).join('/');
    return `  ${JSON.stringify(g.id)}: () => import(${JSON.stringify(abs)}),`;
  });
  return `export const manifests = ${JSON.stringify(clean, null, 2)};\nexport const moduleLoaders = {\n${loaders.join('\n')}\n};\n`;
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const a = path.join(from, e.name), b = path.join(to, e.name);
    if (e.isDirectory()) copyDir(a, b); else fs.copyFileSync(a, b);
  }
}

export default function playzoneGames({ gamesDir = 'games' } = {}) {
  let root = process.cwd(), outDir = 'dist';
  const warn = (problems) => problems.forEach((p) => console.warn('\x1b[33m[playzone-games] skipped ' + p + '\x1b[0m'));
  return {
    name: 'playzone-games',
    configResolved(config) { root = config.root; outDir = path.resolve(config.root, config.build.outDir); },
    resolveId(id) { return id === VIRTUAL_ID ? RESOLVED_ID : null; },
    load(id) {
      if (id !== RESOLVED_ID) return null;
      const { games, problems } = scanGames(root, gamesDir);
      warn(problems);
      console.log(`[playzone-games] ${games.length} game(s): ${games.map((g) => g.id).join(', ') || 'none'}`);
      return generateModule(games, root, gamesDir);
    },
    configureServer(server) {
      const gdir = path.join(root, gamesDir);
      server.watcher.add(gdir);
      const refresh = (file) => {
        if (!file.startsWith(gdir)) return;
        if (path.basename(file) !== 'manifest.json' && !/[\\/]games[\\/][^\\/]+$/.test(file)) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', refresh).on('change', refresh).on('unlink', refresh).on('addDir', refresh).on('unlinkDir', refresh);
      // Serve /games/... exactly as the file is (no Vite transforms), like production does.
      server.middlewares.use((req, res, next) => {
        const url = decodeURIComponent((req.url || '').split('?')[0]);
        if (!url.startsWith('/games/')) return next();
        const file = path.normalize(path.join(root, url));
        if (!file.startsWith(gdir + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return next();
        res.setHeader('Content-Type', MIME[path.extname(file).toLowerCase()] || 'application/octet-stream');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'no-cache');
        fs.createReadStream(file).pipe(res);
      });
    },
    closeBundle() {
      const src = path.join(root, gamesDir);
      if (!fs.existsSync(src)) return;
      const { games } = scanGames(root, gamesDir);
      const dest = path.join(outDir, 'games');
      fs.rmSync(dest, { recursive: true, force: true });
      if (fs.existsSync(path.join(src, '_shared'))) copyDir(path.join(src, '_shared'), path.join(dest, '_shared'));
      for (const g of games) if (g.kind === 'iframe') copyDir(path.join(src, g.id), path.join(dest, g.id));
    },
  };
}

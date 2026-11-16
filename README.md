# PLAYZONE – Four Player Mini Games (Stage 1)

Stage 1 contains: homepage, 30 game cards in 5 categories, nickname/profile,
Online vs Local selection, room create/join, a realtime lobby, and a modular
game-loading system. **No real games are built yet** (cards say "Coming soon").

## 1. Set up
1. Install Node.js 18+ from https://nodejs.org
2. In this folder run: `npm install`
3. (Optional now, needed for Online) `cp .env.example .env` and fill it in (see section 4).

## 2. Run locally
`npm run dev` → open http://localhost:5173
Local mode works with no Supabase. Online mode shows a setup notice until configured.

## 3. Preview on your phone
`npm run dev` already listens on your network. Put phone and PC on the same Wi-Fi,
find your PC's IP (`ipconfig` / `ifconfig`, e.g. 192.168.1.20) and open
`http://192.168.1.20:5173` on the phone. If it doesn't load, allow Node through the PC firewall.

## 4. Configure Supabase (needed for Online mode only)
1. Create a free project at https://supabase.com
2. SQL Editor → paste all of `supabase/schema.sql` → Run.
3. Authentication → Providers → enable **Anonymous sign-ins**.
4. Project Settings → API: copy **Project URL** and **anon public key** into `.env`:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
5. Restart `npm run dev`. Open the site on two devices to test a room.

All room writes go through SQL functions (security definer), so players can't
edit rooms directly. Only the host can pick a game or start.

## 5. Deploy on Netlify
1. Push the project to GitHub.
2. Netlify → Add new site → Import from Git. Build command `npm run build`, publish dir `dist` (already in `netlify.toml`).
3. Site settings → Environment variables: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then redeploy.

## Adding a game
1. Copy `src/games/_template` to `src/games/my-game`.
2. Edit its `index.js` (export `createGame(ctx)` returning `{element, destroy}`).
3. Make sure the id matches the entry in `src/config/games.js`. It is picked up automatically.
Games receive `ctx`: players, me, isHost, scores, `network` (online only) and `finish(winnerIds)`.

## Status
Verified in a test browser: homepage, local setup, 404, online-unconfigured notice, and a
two-player lobby using a *simulated* Supabase. Not yet tested against a real Supabase project.

---

## What is in this version (Stages 2-6)

| Stage | What |
|---|---|
| 2 | Share button restored; Copy/Share work on http, in every browser; invite link built dynamically; guests opening a link can join (`docs/TESTING-AND-DEPLOY.md`). |
| 3 | **Ready/Unready**: everyone (host too) must be ready before the host can start. Enforced in the database (`supabase/migrations/001_ready.sql`). |
| 4 | **Game manifests + automatic discovery**: add a folder in `games/`, no central file to edit (`tools/playzone-games.js`, `docs/GAMES.md`). |
| 5 | **Sandboxed iframe bridge + SDK** for standalone HTML games (`src/game-shell/IframeHost.js`, `games/_shared/playzone-sdk.js`). |
| 6 | The **12 classic games plus 18 newer ones (30 in total, all playable in Local mode)** moved into their own folders on one shared runtime (`games/_shared/`). Playable in **Local** mode (1-4 players, Computer opponent for 1 player). The other 30 show **Local only** in online lobbies. |
| 7a | **8-Ball Pool is playable online** (2-4 phones, host-authoritative). Other games follow one at a time. |

### One manual Supabase step (Stage 3)
Open Supabase -> SQL Editor -> New query, paste `supabase/migrations/001_ready.sql`, press Run.
Until you do, the lobby still works but shows "Ready/Unready is off". It is safe to run twice and does not touch your data or existing grants.

### Try a game by itself (no lobby)
`npm run dev`, then open `http://localhost:5173/games/snakes-ladders/index.html?players=3`
(or double-click `games/snakes-ladders/index.html`).

### Adding / removing a game
See `docs/GAMES.md`. In short: create `games/<id>/` with `manifest.json` + your files, run the dev server or build. Delete the folder to remove it.

## Games list (26)
- **Luck:** Snakes & Ladders, Ludo, Pass the Bomb, Mystery Box
- **Brain & Memory:** Memory Match, Dots & Boxes, Emoji Decode, Number Sequence
- **Reaction:** Sumo Tap, Whack-a-Mole (20 holes, 4 coloured moles, race to 50), Catch the Star, Color Rush
- **Party:** Rock Paper Scissors, Carrom Challenge, Chess
- **Arcade:** 8-Ball Pool (also online), River Derby, Spin Arena, Table Tennis, Flappy Challenge, Jump Higher, Brick Breaker, Color Match, Don't Get Hit (space shooter: 3 bosses, 7 enemy ship types, destroyable asteroids), Pacman, Lantern Quest (full-screen landscape adventure: 10 levels, 10 bosses, 30 monsters, NPC weapons, 4-player online co-op or Computer companion; files in `games/lantern-quest/`: `data.js`, `art.js`, `game.js`)

The 18 newer games share `games/_shared/kit.js` (turn-taking, quiz rounds, canvas helpers). To add another, copy the pattern in `games/whack-a-mole/`.

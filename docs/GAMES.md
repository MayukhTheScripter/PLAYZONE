# Adding, removing and developing games

Every game is its own folder in `games/`. Nothing else needs editing.

```
games/
├── _shared/            code used by the classic games (not a game itself)
│   ├── playzone-sdk.js   the bridge to PLAYZONE (works standalone too)
│   ├── hub-runtime.js    sound, scoreboard, touch controls, setup + play screens
│   └── hub.css
├── _template/          example module game (ignored by the build)
├── snakes-ladders/
│   ├── index.html      entry point
│   ├── game.js         game logic
│   ├── style.css       styles used only by this game
│   └── manifest.json   what PLAYZONE needs to know
└── ludo/ ...
```
Folders starting with `_` are never treated as games.

## Add a game
1. Create `games/<id>/` (lowercase letters, digits, dashes) with your files and a `manifest.json`.
2. Run `npm run dev` (it also picks up new folders while running) or `npm run build`.
3. The game appears on the home page, the local game picker and the online lobby.

## Remove a game
Delete its folder. Its card goes back to "Coming soon" (if it replaced a planned game).
Nothing else references it. Other games are not affected.

## manifest.json
```json
{
  "id": "ludo",                       // must equal the folder name
  "name": "Ludo",
  "category": "luck",                 // reaction | brain | luck | arcade | party
  "icon": "♟️",                       // emoji for the card
  "description": "Race four pawns around the board.",
  "kind": "iframe",                   // iframe = standalone HTML game, module = JS module
  "entry": "index.html",              // iframe: an .html file. module: a .js file (default export createGame(ctx))
  "players": { "min": 1, "max": 4 },
  "cpu": true,                        // optional: 1 player gets a Computer opponent
  "modes": ["local"],                 // "local", "online" or both. Games without "online" show "Local only"
  "trust": "host",                    // required when modes includes "online": "host" or "server" (see below)
  "turnBased": true,                  // optional, for the card label
  "replaces": "memory-master"         // optional: hides that "Coming soon" planned card
}
```
A manifest with a mistake is skipped with a yellow warning in the terminal; the rest still build.

## Developing a game on its own
Open `games/<id>/index.html` directly (double-click, or `http://localhost:5173/games/<id>/index.html?players=3`).
The SDK notices there is no PLAYZONE around it and runs in **standalone mode**; reported scores and the
winner are just logged to the console.

## The game <-> PLAYZONE bridge (`playzone-sdk.js`)
```html
<script src="../_shared/playzone-sdk.js"></script>
<script>
  PlayZone.onInit(function (init) {
    // init.players = [{ id, name, color, index, cpu? }], init.mode, init.me, init.isHost
  });
  PlayZone.setScore(playerId, 12);
  PlayZone.turn(playerId);
  PlayZone.finish([winnerId], 'Reached 100');   // [] means "no winner"
</script>
```
Security model:
- The game is in `<iframe sandbox="allow-scripts">` (no `allow-same-origin`): it cannot read PLAYZONE's
  storage, cookies or the Supabase session. No keys are ever sent to it.
- PLAYZONE checks that the handshake message comes from its own iframe, then talks over a private
  `MessageChannel`. Every message is validated (type, size <= 8 KB, <= 120/s, known player ids,
  finite numbers, <= 4 winners, finish only once).
- Settings a game may save are limited to a short allow-list (sound volume).

## Trust levels (important)
| `trust` | Who decides scores and the winner | Use for |
|---|---|---|
| `server` | The database (server clock, server randomness, stored scores). The browser's claims are ignored. | Games where cheating matters: reaction times, dice, hidden numbers/words, quiz timing. **Needs a database migration per game (not built yet).** |
| `host` | The host's browser runs the game and reports results; other players' reports are ignored. | Casual games where simulating everything on the server is impractical (physics, real-time arcade). |

**Limits of `host` games (be honest with your friends!):** a player who is the host and knows how to use the browser
developer tools can fake scores or declare themselves the winner. PLAYZONE only enforces *who may* report
(the host, never a guest), not *whether the numbers are true*. Fine for friendly games; not for prizes.
All 12 classic games currently run in **local** mode only, where everyone shares one phone.

## Online example: 8-Ball Pool (`games/eight-ball-pool`)

Online games use `ctx.net` (provided by `hub-runtime.js`; for hand-built games it is `PlayZone.send/on`).

- **Setup:** the host picks the difficulty and presses Start (`hub:start`); guests wait and ask (`hub:need`) until they get it.
- **Host runs everything:** physics, rules, foul checks and who wins. Guests only draw.
- **Streaming:** while balls move the host sends `fr` messages (about 30 table snapshots per second, 4 per message, with sound/pocket events). Guests replay them about 0.2 s behind, smoothed. After each shot, and at the start of each turn, the host sends the full table (`st`) so everyone ends up identical.
- **What a guest can send:** `aim` (cue angle, power), `place` (cue ball in hand) and `shot` (angle, power). The host ignores them unless the sender really is the current shooter, it is the aiming phase, and power is 0.07-1.
- **Late join / bad connection:** a guest sends `sync` and the host replies with the full table.
- **Limit (host-authoritative):** a modified host phone could cheat, e.g. report a false winner. This is acceptable for friendly games; it is not for money or ranked play.

## Shared kit for new games (`games/_shared/kit.js`)
Load it after `hub-runtime.js` in a game's `index.html`. It provides:
- `Kit.runTurns(C, {intro, play(idx, box, done), cpuScore(lv), fmt, low, sub})` - every player takes a run; the best score wins; a Computer gets a simulated score.
- `Kit.quiz(C, {rounds, time:[..], make(lv), cpuAcc:[..]})` - hot-seat multiple choice with a speed bonus.
- `Kit.tall(box, W, H)` / `Kit.canvas(box, W, H)` - a scaled canvas (portrait / landscape-rotating), `Kit.loop`, `Kit.keys`, `Kit.rnd/ri/pick/clamp`.
Chess keeps its rules engine in `games/chess/engine.js` (pure functions, checked with standard move-count tests).

# Testing on 4 devices and deploying PLAYZONE

The app never hard-codes a URL. Supabase is reached through the two values in `.env`,
and invite links are built from whatever address the page was opened on, so the same
build works on localhost, your Wi-Fi, a Netlify preview and production.

## 1. Localhost
    npm run dev        ->  http://localhost:5173
(If 5173 is busy Vite uses 5174 – that is fine.)

## 2. Same Wi-Fi (4 real devices)
    npm run dev        (vite.config.js already has host: true)
1. Find your PC's IPv4 address: Windows `ipconfig`, Mac/Linux `ifconfig` / `ip a` (e.g. 192.168.1.20).
2. On each phone (same Wi-Fi) open `http://192.168.1.20:5173`.
3. If it does not load: allow Node.js through the Windows firewall (Private networks),
   and make sure the router has no "AP/client isolation" turned on.
Notes:
- Plain http on a LAN address is not a "secure context". PLAYZONE already handles this:
  Copy/Share use a fallback, and Supabase anonymous sign-in and Realtime work over http.
- Features needing https (native share sheet, clipboard API, camera, etc.) only work on
  localhost or an https site. Use a Netlify preview (below) to test those on phones.

## 3. Temporary public preview on Netlify (does not touch production)
Option A – CLI draft deploy (nothing is published to your live site):
    npm install -g netlify-cli
    netlify login
    npm run build
    netlify deploy --dir=dist          # NO --prod flag
It prints a "Website draft URL" like https://64f2a1b--yoursite.netlify.app. Open it on all 4 phones.
Option B – Git branch/Deploy Preview: push a branch such as `preview`, and in Netlify
Site configuration -> Build & deploy -> Branches enable branch deploys / deploy previews.
Your production branch stays the only one that updates the main URL.
Environment variables: the preview uses the same Netlify env vars as production
(`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). Keep them unchanged – they are what points the app at your existing Supabase project.
Alternatively, to test without Netlify env vars, the CLI build reads your local `.env`.

## 4. Production
    netlify deploy --dir=dist --prod   (or merge to your production branch)

## 5. Supabase settings
- Keep the existing project, URL and anon key. No code change is needed.
- Anonymous sign-in does not use redirects, so **no Redirect URL is required** for it.
  Only if you later add email/OAuth login: Authentication -> URL Configuration -> add
  Site URL (production) and Redirect URLs for `http://localhost:5173/**`,
  `http://localhost:5174/**`, your Netlify draft/preview pattern
  (e.g. `https://*--yoursite.netlify.app/**`) and the production URL.
- Realtime and the SQL functions are not tied to a domain, so they work from any device
  or network. (Supabase "API settings -> allowed origins" is not restricted by default; if you
  ever enable CORS limits, add the same origins.)
- `.env` is read when `npm run dev` starts: restart after editing it. On Netlify, changing
  env vars needs a new deploy.

## 6. Four-device checklist
1. Phone A: Online -> Create room (note the code, press Share/Copy).
2. Phones B, C, D: Online -> enter code -> Join. All 4 appear in every lobby.
3. A 5th device should get "room is full".
4. Turn Wi-Fi off on one phone for 10 s: it shows Reconnecting…, then Live again.

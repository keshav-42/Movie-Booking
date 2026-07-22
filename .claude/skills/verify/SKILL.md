---
name: verify
description: Build, launch and drive the Movie-Booking client to verify frontend changes end-to-end.
---

# Verify Movie-Booking (client)

Node isn't on PATH in this environment — prepend it first:

```powershell
$env:Path = "C:\Program Files\nodejs;$env:Path"
cd client
npm run build      # compile check
npm run dev        # serves http://localhost:5173 (run in background)
```

No backend needed: movies and events fall back to bundled data
(`client/src/assets/events.js`, `assets.js`). `VITE_BASE_URL` in
`client/.env` points at a deployed API that may answer
`{success:true, movie:null}` for unknown ids — the app treats that as
unavailable and uses the fallback.

## Drive it (headless Chrome + puppeteer-core)

System Chrome lives at `C:/Program Files/Google/Chrome/Application/chrome.exe`.
`npm i puppeteer-core` in a scratch dir, launch with
`--use-angle=swiftshader` (WebGL for the 3D seat view works in software).

Routes worth driving (date must match the app's schedule keys — replicate
`daysFromNow(n)`: local midnight → `toISOString().split('T')[0]`; n=1 is
always valid):

- `/` — home rails + hero
- `/event/evt-nba-01/<date>` — arena seat map
- `/event/evt-mlb-01/<date>` — stadium seat map
- `/event/evt-the-01/<date>` — theater seat map
- `/movies/324544/<date>` — cinema seat map (fallback movie id)

Booking-page checks: wait for `svg circle` count > 50 (map rendered);
interactive seats have inline `pointer-events: auto`; listing cards are the
buttons under the "N listings" header; 3D inset appears after selecting a
listing/section (`button[aria-label="Expand view"]`); the checkout bar's
Checkout button only exists once seats are selected. Zoom controls:
`button[aria-label="Zoom in"|"Zoom out"|"Reset view"]`.

Gotcha: allow ~1.5–2s after clicking a listing for the viewBox flight
animation before screenshotting.

## Full-stack verification (server + client together)

`server/.env` has a working MongoDB Atlas URI — `node server.js` in `server/`
boots on :3000 (it is the PRODUCTION database; clean up any fixtures).
`server/scripts/seedTestEvent.mjs` inserts a test event+show and prints the
showId; `--cleanup` removes them.

To point the client at the local server, write `client/.env.local` with
`VITE_BASE_URL=http://localhost:3000` and restart Vite (setting the env var
in the shell does NOT override the .env file reliably — use .env.local, and
delete it afterwards).

Admin routes (`/api/event/upstream`, `/api/event/add`, `/api/show/add`) are
Clerk-protected — not drivable headless; verify them unauthenticated (expect
`{"success":false,"message":"not authorized"}`) and exercise the DB layer via
the seed script + public endpoints instead.

After editing `client/src/lib/venueModel.js`, regenerate server pricing:
`node scripts/generateVenuePricing.mjs` in `server/`.

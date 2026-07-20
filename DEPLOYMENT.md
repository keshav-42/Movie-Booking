# Deploying QuickShow

QuickShow is a two-part app, so it deploys as **two Vercel projects** from the same
GitHub repository:

| Project | Root directory | What it is |
| --- | --- | --- |
| `quickshow-client` | `client/` | The React + Vite frontend (static build) |
| `quickshow-server` | `server/` | The Express API (Vercel serverless function) |

The database is **MongoDB Atlas** (already used in development). Both `client/` and
`server/` already contain a `vercel.json`, so Vercel knows how to build each one.

> You deploy through the Vercel dashboard by connecting the GitHub repo. Every
> `git push` to `main` then redeploys automatically — no CLI required.

---

## Prerequisites

- The repo is pushed to GitHub: <https://github.com/keshav-42/Movie-Booking>
- A [Vercel](https://vercel.com) account (sign in with GitHub)
- A **MongoDB Atlas** cluster, with **Network Access → Add IP → `0.0.0.0/0`**
  (allow from anywhere) so Vercel's serverless functions can connect
- Your production keys for Clerk, Stripe, TMDB, and an SMTP provider (Brevo)

---

## Step 1 — Deploy the backend (`server/`)

1. Go to <https://vercel.com/new> and **Import** the `keshav-42/Movie-Booking` repo.
2. **Project name:** `quickshow-server`
3. **Root Directory:** click *Edit* and select **`server`**.
4. **Framework Preset:** *Other* (the included `vercel.json` handles the build).
5. Open **Environment Variables** and add every key from
   [`server/.env.example`](server/.env.example) with your **production** values:

   | Key | Notes |
   | --- | --- |
   | `MONGODB_URI` | Atlas connection string (no trailing db name) |
   | `CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | From the Clerk dashboard |
   | `TMDB_API_KEY` | TMDB v4 read token |
   | `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Stripe (fill the webhook secret in Step 4) |
   | `SMTP_USER` / `SMTP_PASS` / `SENDER_EMAIL` | Brevo SMTP |
   | `CLIENT_URL` | Your frontend URL (fill after Step 2) |

6. Click **Deploy**. When it finishes, copy the URL, e.g.
   `https://quickshow-server.vercel.app`. Visiting it should show **"Server is Live"**.

---

## Step 2 — Deploy the frontend (`client/`)

1. Again go to <https://vercel.com/new> and **Import** the same repo.
2. **Project name:** `quickshow-client`
3. **Root Directory:** select **`client`**.
4. **Framework Preset:** **Vite** (auto-detected). Build command `npm run build`,
   output directory `dist`.
5. Add these **Environment Variables** (from [`client/.env.example`](client/.env.example)):

   | Key | Value |
   | --- | --- |
   | `VITE_BASE_URL` | your backend URL from Step 1, e.g. `https://quickshow-server.vercel.app` |
   | `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
   | `VITE_TMDB_IMAGE_BASE_URL` | `https://image.tmdb.org/t/p/original` |
   | `VITE_CURRENCY` | `$` (or your preference) |

6. Click **Deploy**, then copy the frontend URL, e.g.
   `https://quickshow-client.vercel.app`.

---

## Step 3 — Wire the two together

1. In the **backend** project (`quickshow-server`) → **Settings → Environment
   Variables**, set `CLIENT_URL` to the frontend URL from Step 2, then
   **Redeploy** the backend so email links point at the live site.
2. Confirm the **frontend's** `VITE_BASE_URL` points at the backend URL. If you
   change it, redeploy the frontend (Vite bakes env vars in at build time).

---

## Step 4 — Webhooks and background jobs

These make payments, auth sync, and emails work end to end.

**Clerk** (user sync)
- Clerk Dashboard → **Webhooks** → add endpoint:
  `https://quickshow-server.vercel.app/api/inngest`
- Subscribe to `user.created`, `user.updated`, `user.deleted`.

**Stripe** (payment confirmation)
- Stripe Dashboard → **Developers → Webhooks** → add endpoint:
  `https://quickshow-server.vercel.app/api/stripe`
- Subscribe to `checkout.session.completed`.
- Copy the **Signing secret** (`whsec_...`) into the backend's
  `STRIPE_WEBHOOK_SECRET`, then redeploy the backend.

**Inngest** (emails, reminders, seat release)
- Create an [Inngest](https://www.inngest.com/) app and connect it to the serve
  endpoint: `https://quickshow-server.vercel.app/api/inngest`.

---

## Step 5 — Seed some data (optional)

The live site is empty until shows exist. Either use the **admin panel** to add
shows, or run the seed script locally against your production database:

```bash
cd server
# temporarily point server/.env's MONGODB_URI at the Atlas cluster
node seed.mjs
```

---

## Redeploying

After the one-time setup, everything is automatic:

```bash
git add .
git commit -m "your change"
git push origin main
```

Both Vercel projects rebuild and redeploy on push to `main`.

---

## Troubleshooting

- **Frontend loads but no movies appear** — `VITE_BASE_URL` is wrong, or the
  backend can't reach Atlas. Check Atlas Network Access allows `0.0.0.0/0`.
- **CORS errors in the browser console** — the backend currently allows all
  origins (`cors()`); to lock it down, restrict it to your `CLIENT_URL`.
- **"Missing Publishable Key" on load** — `VITE_CLERK_PUBLISHABLE_KEY` is not set
  on the frontend project.
- **Payments succeed but booking stays unpaid** — the Stripe webhook isn't
  reaching `/api/stripe`, or `STRIPE_WEBHOOK_SECRET` is wrong.
- **Env var change didn't take effect** — Vite inlines env vars at build time;
  redeploy the frontend after changing any `VITE_*` value.

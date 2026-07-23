# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary (in-product): the attendee.** Someone browsing for something to do — a movie, a game, a concert, a show, a comedy night — who wants to go from "what's on" to a confirmed seat and an emailed ticket in one sitting, without bouncing between sites. They care about seeing real availability and price before committing, and about trusting that the seat they picked is still theirs at checkout.

**Secondary (in-product): the operator/admin.** Publishes shows and events, sets prices and times, and tracks bookings and revenue from a single panel. Admin routes are Clerk-guarded.

**Ultimate audience (context): recruiters / technical reviewers.** QuickShow is a portfolio/showcase project (confirmed with the user). The deployed demo is the pitch — it exists to demonstrate that one person can ship a coherent, complete, production-shaped booking platform end to end. Design decisions serve the in-product attendee, but completeness, polish, and a flawless working demo are themselves the point.

## Product Purpose

QuickShow unifies the entire ticket-booking journey — discovery, live per-section pricing, real venue seat selection, secure payment, and an emailed ticket — into one uninterrupted flow. It exists because online booking is normally fragmented: discovery on one site, seat maps as static images elsewhere, payment on a third, with no confidence the chosen seat survives to checkout. Success is an attendee completing discover → pick seats → pay → receive ticket without ever leaving the app, and a reviewer seeing that whole flow work.

## Positioning

The differentiators a neighboring clone could not truthfully copy without building the same machinery:
- **Honest, live availability.** Real venue seat maps (cinema, theater, arena, stadium) show which exact seats remain, per-section price, and live selected/taken state — not a static image. A background-jobs layer (Inngest) releases held seats and deletes the booking if payment isn't completed within 10 minutes, so availability stays true.
- **One unified, multi-category flow.** A single discovery surface for movies *and* live events (sports, concerts, theater, comedy) that hands off to the same seat map, checkout, and ticketing. Multi-category is a core pillar, not a movies app with extras (confirmed with the user) — every category warrants equal design investment.

## Operating Context

The attendee's path: **discover** (category / city / search) → **event or movie detail** → **date & showtime** → **venue seat map** (pick exact seats, see per-section price and remaining count) → **Stripe Checkout** (30-minute session window; seats auto-released if unpaid within 10 minutes) → **emailed confirmation**, with showtime reminders and new-show announcements following automatically.

The operator's path: an admin panel to add shows (search TMDB, set dates/times/price, publish), add live events, and review all shows and bookings, plus a dashboard of totals (bookings, revenue, active shows, users).

A one-click **demo login** exists so a reviewer can enter the authenticated flow with no signup.

## Capabilities and Constraints

- **Stack (fixed):** React 19, Vite, React Router 7, Tailwind CSS 4, Lucide icons, React Hot Toast, React Player (client); Node.js + Express 5, MongoDB/Mongoose (server); Clerk auth; Stripe Checkout + webhooks; Inngest background jobs; Nodemailer over Brevo SMTP; TMDB for movie data (catalog, cast, images, trailers).
- **Data sources:** Movies come live from the backend/TMDB. Live events are admin-published; a bundled demo catalog (`src/assets/events.js`) fills the rails so discovery never looks empty, and bundled fallback movies keep the app working when the backend is unreachable. Fallback/demo rows are flagged so the booking flow can tell them apart.
- **Deployment:** two Vercel projects from one repo (`client/` static build, `server/` serverless), MongoDB Atlas.
- **Terminology:** *show* = a scheduled movie showing; *event* = a non-movie live event; *showtime* = a specific date+time slot; *seat hold* = a temporary reservation released on abandoned payment. Venue label surfaced to users: "QuickShow Cinemas". Currency is configurable via `VITE_CURRENCY` (defaults to `$`).
- **Venue types supported:** cinema, theater, arena, stadium (each with its own seat-map model).

## Brand Commitments

- **Name:** QuickShow (binding; used consistently across app, README, and deploy names).
- **Voice:** clear, benefit-led, and confident — problem/solution framing without hype (see README). Controls name their action; the flow is described as "one uninterrupted experience."
- **Assets present:** logo (`client/src/assets/logo.svg`), plus icon/store badges. No brand color/type system is treated as binding by the user at init time — visual world is left to design work, not fixed here.

## Evidence on Hand

- **Real:** a working end-to-end flow; live TMDB movie data; real integrations (Clerk auth, Stripe test-mode checkout + webhooks, Brevo email, Inngest jobs); one-click demo login; `README.md` and `DEPLOYMENT.md` documenting the system.
- **Demo / not real — must not be presented as genuine:** the bundled live-events catalog (specific teams, artists, venues, prices, dates in `events.js`) and fallback movies are invented placeholder content for exercising the flow.
- **Absent — must not be fabricated:** real customers, testimonials, booking volumes, revenue figures, ratings-as-social-proof, press, or pricing tiers. There are none; future work must not invent them.

## Product Principles

1. **One uninterrupted flow.** Discovery, seat selection, payment, and ticketing live in one product; never send the user elsewhere to finish.
2. **Honest availability over pretty pictures.** Show real remaining seats, real per-section price, and real hold/release behavior; a seat map must reflect truth, not decorate.
3. **Multi-category is first-class.** Movies and every live-event type share the same quality bar, the same flow, and the same design investment.
4. **The demo is the argument.** As a showcase, completeness and a flawless working path are evidence; a broken or half-built surface undercuts the whole pitch more than a plain one would.
5. **Operator clarity mirrors attendee clarity.** The admin side earns the same scanability and correctness as the front of house.

## Accessibility & Inclusion

Target **WCAG 2.1 AA** as a hard requirement (confirmed with the user): body/placeholder contrast ≥ 4.5:1, keyboard operability with visible focus on every interactive element (cards, filters, seat cells, modals), correct focus handling for overlays (booking + trailer), and honoring reduced-motion for the carousel/ken-burns/hover motion.

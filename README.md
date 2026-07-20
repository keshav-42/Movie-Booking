<div align="center">

# 🎬 QuickShow

### A full-stack ticket-booking platform for movies, sports, concerts & live events

*Browse what's on, pick your seats on a real venue map, pay securely, and get your ticket in your inbox — all in one flow.*

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-Express_5-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Stripe](https://img.shields.io/badge/Payments-Stripe-635BFF?logo=stripe&logoColor=white)](https://stripe.com/)
[![Clerk](https://img.shields.io/badge/Auth-Clerk-6C47FF?logo=clerk&logoColor=white)](https://clerk.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

</div>

---

## Overview

**QuickShow** is a MERN-stack booking application that takes a user all the way from *discovery* to a *confirmed ticket*. Live movie data is pulled from **TMDB**, users sign in with **Clerk**, seats are reserved on an interactive **venue map**, and checkout runs through **Stripe**. Behind the scenes, a background-jobs layer (**Inngest**) sends confirmation emails, fires showtime reminders, and automatically releases seats that were held but never paid for.

It ships with a full **admin panel** for adding shows and tracking revenue, and goes beyond movies with a discovery experience for **sports, concerts, theater, and comedy** events — each with its own venue layout.

## ✨ Features

### For moviegoers
- 🎟️ **Real seat selection** — reserve seats on an interactive 2D/3D venue map; occupied seats update live so two people can't grab the same spot.
- 🔍 **Unified discovery** — a category + city + search bar to browse movies *and* live events (sports / concerts / theater / comedy).
- 🎬 **Live movie catalog** — now-playing titles, posters, cast, ratings, trailers and runtime sourced from the TMDB API.
- 💳 **Secure checkout** — Stripe Checkout with a 30-minute session window; seats auto-release if payment isn't completed in 10 minutes.
- ❤️ **Favourites & bookings** — save movies you love and view your booking history and payment status any time.
- 📧 **Transactional email** — booking confirmations, "new show added" announcements, and showtime reminders delivered automatically.

### For admins
- 📊 **Dashboard** — at-a-glance totals for bookings, revenue, active shows and users.
- ➕ **Add shows** — search TMDB, pick dates/times, set a price, and publish a show in a few clicks.
- 🗂️ **Manage** — list every scheduled show and every booking across the platform.
- 🔐 **Protected routes** — admin APIs and pages are guarded by Clerk-backed middleware.

## 🛠️ Tech Stack

| Layer | Technologies |
| --- | --- |
| **Frontend** | React 19, Vite, React Router 7, Tailwind CSS 4, Lucide icons, React Hot Toast, React Player |
| **Backend** | Node.js, Express 5, MongoDB + Mongoose |
| **Auth** | Clerk (`@clerk/express` + `@clerk/clerk-react`) |
| **Payments** | Stripe Checkout + webhooks |
| **Background jobs** | Inngest (scheduled + event-driven functions) |
| **Email** | Nodemailer over Brevo SMTP |
| **External data** | TMDB API (movies, cast, images) |

## 🏗️ Architecture

```
                    ┌─────────────────────────────┐
                    │   React client (Vite)        │
                    │   discovery · seat map ·     │
                    │   checkout · admin panel     │
                    └──────────────┬──────────────┘
                                   │  REST (axios)
                                   ▼
        ┌───────────────────────────────────────────────┐
        │            Express API server                  │
        │  /api/show   /api/booking  /api/admin  /api/user│
        │           Clerk middleware · CORS              │
        └───┬───────────────┬──────────────┬────────────┘
            │               │              │
       ┌────▼────┐    ┌─────▼─────┐   ┌────▼──────┐
       │ MongoDB │    │  Stripe   │   │  Inngest  │
       │(Mongoose)│   │ Checkout  │   │  jobs     │
       └─────────┘    │+ webhooks │   │ email ·   │
                      └───────────┘   │ reminders·│
       ┌─────────┐                    │ seat      │
       │  TMDB   │◄─── movie data     │ release   │
       └─────────┘                    └───────────┘
```

**Background jobs (Inngest)** keep the system consistent and users informed:
- Sync Clerk users into MongoDB on create / update / delete.
- Release held seats and delete the booking if payment isn't made within 10 minutes.
- Send a booking-confirmation email after a successful payment.
- Send showtime reminders (cron, every 8 hours) and announce newly added shows.

## 📁 Project Structure

```
Movie-Booking/
├── client/                 # React + Vite frontend
│   └── src/
│       ├── components/     # Navbar, seat maps, venue map, discovery bar, cards…
│       ├── pages/          # Home, Movies, MovieDetails, SeatLayout, MyBookings…
│       │   └── admin/      # Dashboard, AddShows, ListShows, ListBookings
│       ├── context/        # AppContext (global state, API calls, auth)
│       └── lib/            # venue model, date/time formatters
└── server/                 # Express + MongoDB backend
    ├── controllers/        # show, booking, user, admin, stripe webhooks
    ├── models/             # Movie, Show, Booking, User (Mongoose schemas)
    ├── routes/             # /show, /booking, /admin, /user
    ├── middleware/         # admin auth guard
    ├── Inngest/            # background job definitions
    ├── configs/            # db + nodemailer setup
    └── seed.mjs            # one-off script to seed movies & shows
```

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+ and npm
- A **MongoDB** database (local or Atlas)
- Accounts / keys for **Clerk**, **Stripe**, **TMDB**, and an SMTP provider (e.g. Brevo)

### 1. Clone

```bash
git clone https://github.com/keshav-42/Movie-Booking.git
cd Movie-Booking
```

### 2. Configure the backend

```bash
cd server
npm install
cp .env.example .env      # then fill in your real keys
```

Fill in `server/.env` using [`server/.env.example`](server/.env.example) as a guide (MongoDB URI, Clerk keys, TMDB token, Stripe keys, SMTP credentials).

### 3. Configure the frontend

```bash
cd ../client
npm install
cp .env.example .env      # then fill in your real keys
```

Set `VITE_BASE_URL`, `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_TMDB_IMAGE_BASE_URL`, and `VITE_CURRENCY` in `client/.env`.

### 4. Run

```bash
# Terminal 1 — backend  (http://localhost:3000)
cd server && npm run server

# Terminal 2 — frontend (http://localhost:5173)
cd client && npm run dev
```

> 💡 **Optional:** seed the database with real TMDB movies and upcoming shows without using the admin UI:
> ```bash
> cd server && node seed.mjs
> ```

### 5. Webhooks (for local payment testing)

Point the **Stripe** and **Clerk** webhooks at your server (or use the Stripe CLI to forward events to `http://localhost:3000/api/stripe`), and register your Inngest app so background jobs can run.

## 🔑 Environment Variables

| Scope | Key | Purpose |
| --- | --- | --- |
| server | `MONGODB_URI` | MongoDB connection string |
| server | `CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | Authentication |
| server | `TMDB_API_KEY` | Movie data (v4 read token) |
| server | `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Payments |
| server | `SMTP_USER` / `SMTP_PASS` / `SENDER_EMAIL` | Transactional email |
| client | `VITE_BASE_URL` | Backend API base URL |
| client | `VITE_CLERK_PUBLISHABLE_KEY` | Frontend auth |
| client | `VITE_TMDB_IMAGE_BASE_URL` | TMDB image CDN base |
| client | `VITE_CURRENCY` | Display currency prefix |

> ⚠️ **Never commit real secrets.** `.env` files are gitignored; only the `.env.example` templates (with placeholder values) belong in the repo.

## 📜 License

Released under the **ISC License**. Feel free to fork, learn from, and build on it.

---

<div align="center">

Built with the MERN stack · Movies powered by <a href="https://www.themoviedb.org/">TMDB</a>

</div>

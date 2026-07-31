// One-off seed script: mirrors the addEventShow controller logic to populate
// the DB with real Ticketmaster events (sports, concerts, theater, comedy)
// across all four categories, without needing admin auth.
// Run from the server folder:  node seedEvents.mjs
import "dotenv/config";
import axios from "axios";
import connectDB from "./configs/db.js";
import Event from "./models/Event.js";
import Show from "./models/Show.js";

const DAYS_AHEAD = 14;
const PER_CATEGORY = 4; // 4 categories x 4 = up to 16, trimmed to MAX_EVENTS
const MAX_EVENTS = 15;
const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&q=80";

const TM_BASE = "https://app.ticketmaster.com/discovery/v2";
const SEGMENT_FOR = {
  sports: "Sports",
  concerts: "Music",
  theater: "Arts & Theatre",
  comedy: "Comedy",
};
const DEFAULT_PRICE = { sports: 45, concerts: 40, theater: 25, comedy: 20 };

const categoryFromClassification = (cls) => {
  const segment = cls?.segment?.name || "";
  const genre = cls?.genre?.name || "";
  if (segment === "Sports") return "sports";
  if (segment === "Music") return "concerts";
  if (/comedy/i.test(genre) || /comedy/i.test(segment)) return "comedy";
  return "theater";
};

const suggestedVenueType = (category) =>
  category === "sports" ? "stadium" : category === "concerts" ? "arena" : "theater";

const pickImage = (images = [], ratio) => {
  const ranked = images
    .filter((i) => !ratio || i.ratio === ratio)
    .sort((a, b) => (b.width || 0) - (a.width || 0));
  return ranked[0]?.url || images[0]?.url || "";
};

const normalizeTmEvent = (ev) => {
  const cls = ev.classifications?.[0];
  const category = categoryFromClassification(cls);
  const venue = ev._embedded?.venues?.[0];
  return {
    id: ev.id,
    title: ev.name,
    subtitle: [cls?.genre?.name, cls?.subGenre?.name].filter((g) => g && g !== "Undefined").join(" · "),
    overview: ev.info || ev.pleaseNote || "",
    category,
    genres: [cls?.genre?.name, cls?.subGenre?.name].filter((g) => g && g !== "Undefined"),
    poster_path: pickImage(ev.images, "3_2") || FALLBACK_IMAGE,
    backdrop_path: pickImage(ev.images, "16_9") || FALLBACK_IMAGE,
    venue: venue?.name || "TBA",
    city: venue?.city?.name || "",
    date: ev.dates?.start?.dateTime || null, // needs a real time, not just a date, to book a Show
    priceFrom: ev.priceRanges?.[0]?.min ?? null,
    venueType: suggestedVenueType(category),
  };
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Ticketmaster's free tier rate-limits to 5 req/sec — fetch categories one at
// a time with a stagger, and retry once on a rate-limit response.
const fetchCategory = async (category, apiKey, now, until, retrying = false) => {
  try {
    const { data } = await axios.get(`${TM_BASE}/events.json`, {
      params: {
        apikey: apiKey,
        classificationName: SEGMENT_FOR[category],
        countryCode: "US",
        startDateTime: now,
        endDateTime: until,
        size: PER_CATEGORY,
      },
    });
    return (data._embedded?.events || []).map(normalizeTmEvent);
  } catch (e) {
    const isRateLimit = /spike arrest/i.test(e.response?.data?.fault?.faultstring || "");
    if (isRateLimit && !retrying) {
      await sleep(1200);
      return fetchCategory(category, apiKey, now, until, true);
    }
    throw e;
  }
};

const run = async () => {
  const apiKey = process.env.TICKETMASTER_API_KEY;
  if (!apiKey) {
    console.error("TICKETMASTER_API_KEY is not set — nothing to seed (sample feed is admin-UI only).");
    process.exit(1);
  }

  await connectDB();
  await new Promise((r) => setTimeout(r, 1500));

  const now = new Date().toISOString().split(".")[0] + "Z";
  const until = new Date(Date.now() + DAYS_AHEAD * 864e5).toISOString().split(".")[0] + "Z";

  console.log(`Fetching upcoming events (${now} → ${until}) from Ticketmaster...`);
  const results = [];
  for (const cat of Object.keys(SEGMENT_FOR)) {
    try {
      results.push(await fetchCategory(cat, apiKey, now, until));
    } catch (e) {
      console.error(`  ! ${cat} fetch failed:`, e.response?.data?.fault?.faultstring || e.message);
      results.push([]);
    }
    await sleep(300); // stay well under the 5 req/sec spike-arrest limit
  }

  const nowMs = Date.now();
  const seen = new Set();
  const events = results
    .flat()
    .filter((e) => e.date && new Date(e.date).getTime() > nowMs) // TM sometimes returns stale/long-running listings (e.g. exhibitions) with a start date already in the past
    .filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)))
    .slice(0, MAX_EVENTS);
  console.log(`Seeding ${events.length} events.`);

  let created = 0;
  for (const e of events) {
    await Event.findByIdAndUpdate(
      e.id,
      {
        _id: e.id,
        title: e.title,
        subtitle: e.subtitle,
        overview: e.overview,
        category: e.category,
        genres: e.genres,
        poster_path: e.poster_path,
        backdrop_path: e.backdrop_path,
        venue: e.venue,
        city: e.city,
        venueType: e.venueType,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const showDateTime = new Date(e.date);
    const exists = await Show.findOne({ event: e.id, showDateTime });
    if (exists) {
      console.log(`  = [${e.category}] ${e.title} already has this showtime, skipping`);
      continue;
    }

    await Show.create({
      event: e.id,
      showDateTime,
      showPrice: e.priceFrom || DEFAULT_PRICE[e.category],
      occupiedSeats: {},
    });

    created += 1;
    console.log(`  + [${e.category}] ${e.title} — ${e.venue}, ${e.city} @ ${e.date}`);
  }

  console.log(`\nDone. Seeded ${created} events with 1 show each.`);
  process.exit(0);
};

run().catch((e) => {
  console.error("SEED FAILED:", e.response?.data || e.message);
  process.exit(1);
});

import axios from "axios";
import Event from "../models/Event.js";
import Show from "../models/Show.js";
import { inngest } from "../Inngest/index.js";

// Live events pipeline — the events analog of the TMDB movie flow:
//   1. admin browses upcoming events from the Ticketmaster Discovery API
//   2. admin picks one, sets venueType + base price + showtimes
//   3. Event is upserted, Shows are created → bookable like any movie show
//
// Get a free API key at https://developer.ticketmaster.com and set
// TICKETMASTER_API_KEY. Without a key, a bundled sample feed keeps the whole
// admin flow usable.

const TM_BASE = "https://app.ticketmaster.com/discovery/v2";

// Our category ←→ Ticketmaster segment
const SEGMENT_FOR = {
  sports: "Sports",
  concerts: "Music",
  theater: "Arts & Theatre",
  comedy: "Comedy",
};

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

// Pick the largest image of a given ratio from Ticketmaster's images array.
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
    subtitle: [cls?.genre?.name, cls?.subGenre?.name]
      .filter((g) => g && g !== "Undefined")
      .join(" · "),
    overview: ev.info || ev.pleaseNote || "",
    category,
    genres: [cls?.genre?.name, cls?.subGenre?.name].filter((g) => g && g !== "Undefined"),
    poster_path: pickImage(ev.images, "3_2"),
    backdrop_path: pickImage(ev.images, "16_9"),
    venue: venue?.name || "TBA",
    city: venue?.city?.name || "",
    date: ev.dates?.start?.dateTime || ev.dates?.start?.localDate || null,
    priceFrom: ev.priceRanges?.[0]?.min ?? null,
    venueType: suggestedVenueType(category),
    source: "ticketmaster",
  };
};

// Bundled feed so the admin flow works without an API key. Dates are always in
// the future relative to "now".
const sampleFeed = () => {
  const inDays = (n) => new Date(Date.now() + n * 864e5).toISOString();
  const img = (id) => `https://images.unsplash.com/${id}?w=1200&q=80`;
  return [
    { id: "smp-warriors-lakers", title: "Warriors vs. Lakers", category: "sports", subtitle: "NBA Regular Season", venue: "Chase Center", city: "San Francisco", date: inDays(9), poster_path: img("photo-1504450758481-7338eba7524a"), backdrop_path: img("photo-1546519638-68e109498ffc"), genres: ["Basketball", "NBA"], venueType: "arena" },
    { id: "smp-yankees-sox", title: "Yankees vs. Red Sox", category: "sports", subtitle: "MLB", venue: "Yankee Stadium", city: "New York", date: inDays(12), poster_path: img("photo-1471295253337-3ceaaedca402"), backdrop_path: img("photo-1508344928928-7165b67de128"), genres: ["Baseball", "MLB"], venueType: "stadium" },
    { id: "smp-weeknd-tour", title: "The Weeknd — After Hours Tour", category: "concerts", subtitle: "R&B · Pop", venue: "SoFi Stadium", city: "Los Angeles", date: inDays(15), poster_path: img("photo-1501386761578-eac5c94b800a"), backdrop_path: img("photo-1470229722913-7c0e2dbbafd3"), genres: ["R&B", "Pop"], venueType: "stadium" },
    { id: "smp-dua-lipa", title: "Dua Lipa — Radical Optimism", category: "concerts", subtitle: "Pop", venue: "Madison Square Garden", city: "New York", date: inDays(18), poster_path: img("photo-1516450360452-9312f5e86fc7"), backdrop_path: img("photo-1459749411175-04bf5292ceea"), genres: ["Pop"], venueType: "arena" },
    { id: "smp-wicked", title: "Wicked", category: "theater", subtitle: "Broadway Musical", venue: "Gershwin Theatre", city: "New York", date: inDays(8), poster_path: img("photo-1503095396549-807759245b35"), backdrop_path: img("photo-1507924538820-ede94a04019d"), genres: ["Musical", "Broadway"], venueType: "theater" },
    { id: "smp-chappelle", title: "Dave Chappelle Live", category: "comedy", subtitle: "Stand-up", venue: "The Chicago Theatre", city: "Chicago", date: inDays(11), poster_path: img("photo-1527224857830-43a7acc85260"), backdrop_path: img("photo-1585699324551-f6c309eedeca"), genres: ["Stand-up"], venueType: "theater" },
  ].map((e) => ({ ...e, overview: "", priceFrom: null, source: "sample" }));
};

// ── ADMIN: browse the upstream feed ────────────────────────────────────────
// GET /api/event/upstream?category=concerts&city=New%20York
export const getUpstreamEvents = async (req, res) => {
  try {
    const { category, city, keyword } = req.query;
    const apiKey = process.env.TICKETMASTER_API_KEY;

    if (!apiKey) {
      const all = sampleFeed();
      return res.json({
        success: true,
        source: "sample",
        events: category ? all.filter((e) => e.category === category) : all,
      });
    }

    const params = {
      apikey: apiKey,
      size: 40,
      sort: "date,asc",
      ...(category && SEGMENT_FOR[category]
        ? { classificationName: SEGMENT_FOR[category] }
        : {}),
      ...(city ? { city } : {}),
      ...(keyword ? { keyword } : {}),
    };
    const { data } = await axios.get(`${TM_BASE}/events.json`, { params });
    const events = (data._embedded?.events || []).map(normalizeTmEvent);
    res.json({ success: true, source: "ticketmaster", events });
  } catch (error) {
    console.error(error.message);
    res.json({ success: false, message: error.message });
  }
};

// ── ADMIN: add an event + its shows ────────────────────────────────────────
// POST /api/event/add  { event: <normalized upstream event>, venueType,
//                        basePrice, showsInput: [{date, time: [..]}] }
export const addEventShow = async (req, res) => {
  try {
    const { event: eventInput, venueType, basePrice, showsInput } = req.body;

    if (!eventInput?.id || !eventInput?.title) {
      return res.json({ success: false, message: "Event data is required." });
    }
    if (!["cinema", "theater", "arena", "stadium"].includes(venueType)) {
      return res.json({ success: false, message: "Invalid venue type." });
    }
    if (!basePrice || basePrice <= 0) {
      return res.json({ success: false, message: "Base price must be positive." });
    }
    if (!Array.isArray(showsInput) || !showsInput.length) {
      return res.json({ success: false, message: "At least one showtime is required." });
    }

    const eventDoc = await Event.findByIdAndUpdate(
      eventInput.id,
      {
        _id: eventInput.id,
        title: eventInput.title,
        subtitle: eventInput.subtitle || "",
        overview: eventInput.overview || "",
        category: eventInput.category,
        genres: eventInput.genres || [],
        poster_path: eventInput.poster_path || eventInput.backdrop_path,
        backdrop_path: eventInput.backdrop_path || eventInput.poster_path,
        venue: eventInput.venue,
        city: eventInput.city || "",
        venueType,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const showsToCreate = [];
    showsInput.forEach((show) => {
      show.time.forEach((time) => {
        showsToCreate.push({
          event: eventDoc._id,
          showDateTime: new Date(`${show.date}T${time}`),
          showPrice: Number(basePrice),
          occupiedSeats: {},
        });
      });
    });
    await Show.insertMany(showsToCreate);

    await inngest.send({
      name: "app/show.added",
      data: {
        movieTitle: eventDoc.title,
        movieId: eventDoc._id,
        link: `/event/${eventDoc._id}`,
      },
    });

    res.json({ success: true, message: "Event shows added successfully." });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

// ── PUBLIC: all upcoming events, each with its schedule ────────────────────
// The schedule shape matches the client's local events ({date: [{time, showId}]})
// so the same cards, date-time modal and seat layout consume it unchanged.
export const getEvents = async (req, res) => {
  try {
    const shows = await Show.find({
      event: { $ne: null },
      showDateTime: { $gte: new Date() },
    })
      .populate("event")
      .sort({ showDateTime: 1 });

    const byEvent = new Map();
    for (const show of shows) {
      if (!show.event) continue;
      const id = show.event._id.toString();
      if (!byEvent.has(id)) {
        // basePrice drives client-side section pricing; it lives on the Show
        byEvent.set(id, { ...show.event.toObject(), basePrice: show.showPrice, schedule: {} });
      }
      const date = show.showDateTime.toISOString().split("T")[0];
      const entry = byEvent.get(id);
      if (!entry.schedule[date]) entry.schedule[date] = [];
      entry.schedule[date].push({ time: show.showDateTime, showId: show._id });
    }

    res.json({ success: true, events: [...byEvent.values()] });
  } catch (error) {
    console.error(error.message);
    res.json({ success: false, message: error.message });
  }
};

// ── PUBLIC: one event + its dateTime map (mirrors getShow for movies) ──────
export const getEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId);
    if (!event) return res.json({ success: false, message: "Event not found" });

    const shows = await Show.find({
      event: eventId,
      showDateTime: { $gte: new Date() },
    }).sort({ showDateTime: 1 });

    const dateTime = {};
    shows.forEach((show) => {
      const date = show.showDateTime.toISOString().split("T")[0];
      if (!dateTime[date]) dateTime[date] = [];
      dateTime[date].push({ time: show.showDateTime, showId: show._id });
    });

    res.json({
      success: true,
      event,
      dateTime,
      basePrice: shows[0]?.showPrice ?? 0,
    });
  } catch (error) {
    console.error(error.message);
    res.json({ success: false, message: error.message });
  }
};

// One-off seed script: mirrors the addShow controller logic to populate
// the DB with real TMDB movies + future shows, without needing admin auth.
// Run from the server folder:  node seed.mjs
import "dotenv/config";
import axios from "axios";
import connectDB from "./configs/db.js";
import Movie from "./models/Movie.js";
import Show from "./models/Show.js";

const HOW_MANY_MOVIES = 5;
const PRICE = 12; // in whatever VITE_CURRENCY the client displays

const tmdb = (url) =>
  axios.get(url, {
    headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` },
  });

// Build a few future dates (today + next 3 days), two showtimes each.
const buildShowsInput = () => {
  const input = [];
  const times = ["13:00", "16:30", "20:00"];
  for (let d = 1; d <= 3; d++) {
    const day = new Date();
    day.setDate(day.getDate() + d);
    const date = day.toISOString().split("T")[0]; // YYYY-MM-DD
    input.push({ date, time: times });
  }
  return input;
};

const upsertMovieFromTMDB = async (movieId) => {
  let movie = await Movie.findById(movieId);
  if (movie) return movie;

  const [details, credits] = await Promise.all([
    tmdb(`https://api.themoviedb.org/3/movie/${movieId}`),
    tmdb(`https://api.themoviedb.org/3/movie/${movieId}/credits`),
  ]);
  const d = details.data;
  const c = credits.data;

  return Movie.create({
    _id: String(movieId),
    title: d.title,
    overview: d.overview,
    poster_path: d.poster_path,
    backdrop_path: d.backdrop_path,
    genres: d.genres,
    casts: c.cast,
    release_date: d.release_date,
    original_language: d.original_language,
    tagline: d.tagline || "",
    vote_average: d.vote_average,
    runtime: d.runtime,
  });
};

const run = async () => {
  await connectDB();
  // give the connection a moment to establish (connectDB doesn't await 'connected')
  await new Promise((r) => setTimeout(r, 1500));

  console.log("Fetching now-playing movies from TMDB...");
  const { data } = await tmdb(
    "https://api.themoviedb.org/3/movie/now_playing"
  );
  const picks = data.results.slice(0, HOW_MANY_MOVIES);
  console.log(`Seeding ${picks.length} movies.`);

  const showsInput = buildShowsInput();
  let totalShows = 0;

  for (const m of picks) {
    const movie = await upsertMovieFromTMDB(m.id);

    const showsToCreate = [];
    showsInput.forEach((s) => {
      s.time.forEach((t) => {
        showsToCreate.push({
          movie: String(m.id),
          showDateTime: new Date(`${s.date}T${t}`),
          showPrice: PRICE,
          occupiedSeats: {},
        });
      });
    });

    if (showsToCreate.length > 0) {
      await Show.insertMany(showsToCreate);
      totalShows += showsToCreate.length;
    }
    console.log(`  + ${movie.title} (${showsToCreate.length} shows)`);
  }

  console.log(`\nDone. Seeded ${picks.length} movies, ${totalShows} shows.`);
  process.exit(0);
};

run().catch((e) => {
  console.error("SEED FAILED:", e.response?.data || e.message);
  process.exit(1);
});

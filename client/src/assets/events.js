// Local "events" catalog for non-movie categories (sports, concerts, theater,
// comedy). Movies come from the real backend (`shows`); everything here is dummy
// content so the discovery flow, date/time picker and seat map can be exercised
// end-to-end without a server. Prices/venues/dates are invented.
//
// Shape is intentionally close enough to a movie `show` that the same cards,
// date-time picker and seat layout can consume it via `normalizeEvent`.

const daysFromNow = (n) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().split('T')[0]
}

// Build a { 'YYYY-MM-DD': [{ time, showId }] } map spread over the next `spanDays`.
const buildSchedule = (idBase, spanDays, timesPerDay) => {
  const schedule = {}
  for (let day = 1; day <= spanDays; day++) {
    const date = daysFromNow(day)
    schedule[date] = timesPerDay.map((hour, i) => {
      const t = new Date(`${date}T00:00:00.000Z`)
      t.setUTCHours(hour)
      return { time: t.toISOString(), showId: `${idBase}-${day}-${i}` }
    })
  }
  return schedule
}

export const EVENTS = [
  // ─────────────── SPORTS ───────────────
  {
    _id: 'evt-nba-01',
    category: 'sports',
    title: 'Lakers vs. Celtics',
    subtitle: 'NBA Regular Season',
    venue: 'Crypto.com Arena',
    city: 'Los Angeles',
    backdrop_path: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200&q=80',
    poster_path: 'https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=600&q=80',
    genres: ['Basketball', 'NBA'],
    vote_average: 8.9,
    runtimeLabel: '~2h 30m',
    venueType: 'arena',
    basePrice: 65,
    schedule: buildSchedule('nba01', 6, [19, 22]),
  },
  {
    _id: 'evt-mlb-01',
    category: 'sports',
    title: 'Dodgers at Phillies',
    subtitle: 'MLB · Citizens Bank Park',
    venue: 'Citizens Bank Park',
    city: 'Philadelphia',
    backdrop_path: 'https://images.unsplash.com/photo-1508344928928-7165b67de128?w=1200&q=80',
    poster_path: 'https://images.unsplash.com/photo-1471295253337-3ceaaedca402?w=600&q=80',
    genres: ['Baseball', 'MLB'],
    vote_average: 8.4,
    runtimeLabel: '~3h',
    venueType: 'stadium',
    basePrice: 33,
    schedule: buildSchedule('mlb01', 5, [13, 19]),
  },
  {
    _id: 'evt-nfl-01',
    category: 'sports',
    title: 'Giants vs. Eagles',
    subtitle: 'NFL Sunday Night',
    venue: 'MetLife Stadium',
    city: 'New York',
    backdrop_path: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=1200&q=80',
    poster_path: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&q=80',
    genres: ['Football', 'NFL'],
    vote_average: 9.1,
    runtimeLabel: '~3h 15m',
    venueType: 'stadium',
    basePrice: 120,
    schedule: buildSchedule('nfl01', 4, [20]),
  },

  // ─────────────── CONCERTS ───────────────
  {
    _id: 'evt-con-01',
    category: 'concerts',
    title: 'BTS — World Tour',
    subtitle: 'Live at MetLife Stadium',
    venue: 'MetLife Stadium',
    city: 'East Rutherford',
    backdrop_path: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&q=80',
    poster_path: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&q=80',
    genres: ['K-Pop', 'Live'],
    vote_average: 9.6,
    runtimeLabel: '~2h 45m',
    venueType: 'stadium',
    basePrice: 250,
    schedule: buildSchedule('con01', 3, [20]),
  },
  {
    _id: 'evt-con-02',
    category: 'concerts',
    title: 'Coldplay — Music of the Spheres',
    subtitle: 'Stadium Tour',
    venue: 'SoFi Stadium',
    city: 'Los Angeles',
    backdrop_path: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1200&q=80',
    poster_path: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&q=80',
    genres: ['Rock', 'Pop'],
    vote_average: 9.3,
    runtimeLabel: '~2h 30m',
    venueType: 'stadium',
    basePrice: 95,
    schedule: buildSchedule('con02', 5, [19, 21]),
  },
  {
    _id: 'evt-con-03',
    category: 'concerts',
    title: 'Billie Eilish — Hit Me Hard',
    subtitle: 'Arena Tour',
    venue: 'Madison Square Garden',
    city: 'New York',
    backdrop_path: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&q=80',
    poster_path: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=600&q=80',
    genres: ['Pop', 'Alt'],
    vote_average: 9.0,
    runtimeLabel: '~2h',
    venueType: 'arena',
    basePrice: 110,
    schedule: buildSchedule('con03', 4, [20]),
  },

  // ─────────────── THEATER ───────────────
  {
    _id: 'evt-the-01',
    category: 'theater',
    title: 'Hamilton',
    subtitle: 'Broadway Musical',
    venue: 'Richard Rodgers Theatre',
    city: 'New York',
    backdrop_path: 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=1200&q=80',
    poster_path: 'https://images.unsplash.com/photo-1507924538820-ede94a04019d?w=600&q=80',
    genres: ['Musical', 'Drama'],
    vote_average: 9.4,
    runtimeLabel: '~2h 45m',
    venueType: 'theater',
    basePrice: 140,
    schedule: buildSchedule('the01', 6, [14, 19]),
  },
  {
    _id: 'evt-the-02',
    category: 'theater',
    title: 'The Lion King',
    subtitle: 'Broadway Musical',
    venue: 'Minskoff Theatre',
    city: 'New York',
    backdrop_path: 'https://images.unsplash.com/photo-1519683109079-d5f539e1542f?w=1200&q=80',
    poster_path: 'https://images.unsplash.com/photo-1533158326339-7f3cf2404354?w=600&q=80',
    genres: ['Musical', 'Family'],
    vote_average: 9.1,
    runtimeLabel: '~2h 30m',
    venueType: 'theater',
    basePrice: 99,
    schedule: buildSchedule('the02', 6, [13, 19]),
  },

  // ─────────────── COMEDY ───────────────
  {
    _id: 'evt-com-01',
    category: 'comedy',
    title: 'Dave Chappelle — Live',
    subtitle: 'Stand-Up Special',
    venue: 'The Comedy Store',
    city: 'Los Angeles',
    backdrop_path: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=1200&q=80',
    poster_path: 'https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=600&q=80',
    genres: ['Stand-Up'],
    vote_average: 9.2,
    runtimeLabel: '~1h 30m',
    venueType: 'theater',
    basePrice: 75,
    schedule: buildSchedule('com01', 4, [20, 22]),
  },
  {
    _id: 'evt-com-02',
    category: 'comedy',
    title: 'John Mulaney — Baby J',
    subtitle: 'Stand-Up Tour',
    venue: 'Beacon Theatre',
    city: 'New York',
    backdrop_path: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=1200&q=80',
    poster_path: 'https://images.unsplash.com/photo-1543584756-8f40a802e14f?w=600&q=80',
    genres: ['Stand-Up'],
    vote_average: 8.8,
    runtimeLabel: '~1h 20m',
    venueType: 'theater',
    basePrice: 60,
    schedule: buildSchedule('com02', 5, [19, 21]),
  },
]

// Normalize a movie `show` OR a local `event` into one shape the shared
// components (cards, date-time picker, seat layout) can consume.
export const normalizeEvent = (item, image_base_url = '') => {
  if (!item) return null
  // Movie shape from backend: has `.title` + `.poster_path` + `.genres[].name`
  const isMovie = !item.category
  if (isMovie) {
    return {
      _id: item._id,
      category: 'movies',
      title: item.title,
      subtitle: item.genres?.map((g) => g.name).slice(0, 2).join(' · ') || 'Movie',
      venue: 'QuickShow Cinemas',
      city: null,
      backdrop_path: image_base_url + (item.backdrop_path || ''),
      poster_path: image_base_url + (item.poster_path || ''),
      genres: item.genres?.map((g) => g.name) || [],
      vote_average: item.vote_average,
      runtimeLabel: item.runtime ? `${Math.floor(item.runtime / 60)}h ${item.runtime % 60}m` : '',
      venueType: 'cinema',
      basePrice: item.showPrice ?? 12,
      release_date: item.release_date,
      raw: item,
    }
  }
  return { ...item, release_date: item.release_date || null, raw: item }
}

export const getEventById = (id) => EVENTS.find((e) => e._id === id) || null

export const CURRENCY = import.meta.env.VITE_CURRENCY || '$'

// Per-category visual identity — each category owns a gradient + accent so the
// UI reads as a system, not a wall of identical cards. `from`/`to` are used in
// inline linear-gradients; `accent` for pills/prices; `glow` for soft halos.
export const CATEGORY_THEME = {
  movies: { label: 'Movie', from: '#F43F5E', to: '#8B5CF6', accent: '#F43F5E', glow: 'rgba(244,63,94,0.35)' },
  sports: { label: 'Sports', from: '#22D3EE', to: '#2563EB', accent: '#22D3EE', glow: 'rgba(34,211,238,0.35)' },
  concerts: { label: 'Concert', from: '#A855F7', to: '#EC4899', accent: '#D946EF', glow: 'rgba(217,70,239,0.35)' },
  theater: { label: 'Show', from: '#F59E0B', to: '#EF4444', accent: '#F59E0B', glow: 'rgba(245,158,11,0.35)' },
  comedy: { label: 'Comedy', from: '#34D399', to: '#10B981', accent: '#34D399', glow: 'rgba(52,211,153,0.35)' },
}

export const themeFor = (category) => CATEGORY_THEME[category] || CATEGORY_THEME.movies

// Fallback movies so the Movies rail/hero are never empty when the backend
// (localhost:3000) isn't running. These use TMDB image URLs that are already
// absolute, so we pass image_base_url='' when normalizing them.
import { dummyShowsData } from './assets'
export const FALLBACK_MOVIES = dummyShowsData

// Build a backend-shaped show ({ success, movie, dateTime }) for a bundled movie
// so MovieDetails / SeatLayout work without the server. Times are generated for
// the next few days like the event schedules.
export const fallbackShowById = (id) => {
  const movie = dummyShowsData.find((m) => String(m._id) === String(id))
  if (!movie) return null
  return { success: true, movie, dateTime: buildSchedule(`mov-${id}`, 6, [12, 15, 18, 21]) }
}

import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Film, Trophy, Music, Drama, Mic2, Sparkles } from 'lucide-react'
import { useAppContext } from '../context/AppContext'
import { EVENTS, FALLBACK_MOVIES, normalizeEvent, themeFor } from '../assets/events'
import EventCard from '../components/EventCard'
import Rail from '../components/Rail'
import HeroCarousel from '../components/HeroCarousel'
import DateTimeModal from '../components/DateTimeModal'
import BlurCircle from '../components/BlurCircle'

const FILTERS = [
  { id: 'all', label: 'All', icon: Sparkles },
  { id: 'movies', label: 'Movies', icon: Film },
  { id: 'sports', label: 'Sports', icon: Trophy },
  { id: 'concerts', label: 'Concerts', icon: Music },
  { id: 'theater', label: 'Shows', icon: Drama },
  { id: 'comedy', label: 'Comedy', icon: Mic2 },
]

const Home = () => {
  const navigate = useNavigate()
  const { shows, liveEvents, image_base_url } = useAppContext()
  const [filter, setFilter] = useState('all')
  const [modalEvent, setModalEvent] = useState(null)

  // Movies come from the backend when available; otherwise fall back to bundled
  // data so the movie rail/hero are never empty.
  const movies = useMemo(() => {
    const source = shows.length ? shows : FALLBACK_MOVIES
    const imgBase = shows.length ? image_base_url : ''
    return source.map((s) => normalizeEvent(s, imgBase))
  }, [shows, image_base_url])

  // Real events published by the admin come first; bundled demo events fill
  // the rails so discovery never looks empty. Demo ones are flagged so the
  // booking flow can tell them apart.
  const events = useMemo(() => {
    const backend = liveEvents.map((e) => normalizeEvent(e))
    const local = EVENTS.map((e) => normalizeEvent({ ...e, isLocal: true }))
    return [...backend, ...local]
  }, [liveEvents])
  const all = useMemo(() => [...movies, ...events], [movies, events])

  const byCategory = (cat) => all.filter((e) => e.category === cat)

  const mostRecent = useMemo(() => {
    const dated = [...movies].sort((a, b) => new Date(b.release_date) - new Date(a.release_date))
    return [...dated, ...events].slice(0, 12)
  }, [movies, events])

  // Curated hero: alternate movie / concert / sport / show for a vibrant mix.
  const heroSlides = useMemo(() => {
    const pick = (cat, n) => all.filter((e) => e.category === cat).slice(0, n)
    const mix = [
      ...pick('movies', 2),
      ...pick('concerts', 1),
      ...pick('sports', 1),
      ...pick('theater', 1),
    ]
    // interleave a bit so it doesn't front-load all movies
    return mix.filter(Boolean).slice(0, 5)
  }, [all])

  const openBooking = (event) => {
    if (event.category === 'movies') {
      navigate(`/movies/${event._id}`)
      scrollTo(0, 0)
    } else {
      setModalEvent(event)
    }
  }

  const confirmDateTime = ({ date, slot }) => {
    navigate(`/event/${modalEvent._id}/${date}`, { state: { showId: slot.showId } })
    setModalEvent(null)
    scrollTo(0, 0)
  }

  const shownRails =
    filter === 'all'
      ? [
          { cat: 'movies', title: 'Now Showing', subtitle: 'Movies in theaters' },
          { cat: 'concerts', title: 'Live Concerts', subtitle: 'Tours & one-night shows' },
          { cat: 'sports', title: 'Live Sports', subtitle: 'Games near you' },
          { cat: 'theater', title: 'Broadway & Shows', subtitle: 'Musicals and theater' },
          { cat: 'comedy', title: 'Comedy Nights', subtitle: 'Stand-up specials' },
        ]
      : [{ cat: filter, title: FILTERS.find((f) => f.id === filter)?.label }]

  return (
    <div className='min-h-screen'>
      {/* ───────── Movable hero carousel ───────── */}
      <HeroCarousel slides={heroSlides} onBook={openBooking} />

      {/* ───────── Filter tabs ───────── */}
      <div className='sticky top-[56px] z-30 bg-[#09090B]/85 backdrop-blur-md border-b border-white/10'>
        <div className='px-6 md:px-16 lg:px-28 py-3 flex items-center gap-2 overflow-x-auto no-scrollbar'>
          {FILTERS.map((f) => {
            const active = f.id === filter
            const t = f.id === 'all' ? null : themeFor(f.id)
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition border ${
                  active ? 'text-white border-transparent' : 'text-gray-300 border-white/15 hover:border-white/40 hover:text-white'
                }`}
                style={
                  active
                    ? { background: t ? `linear-gradient(135deg, ${t.from}, ${t.to})` : '#F84565' }
                    : undefined
                }
              >
                {React.createElement(f.icon, { className: 'w-4 h-4' })}
                {f.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ───────── Rails ───────── */}
      <div className='relative px-6 md:px-16 lg:px-28 py-10 space-y-12'>
        <BlurCircle top='100px' right='-60px' />

        {filter === 'all' && (
          <Rail title='Most Recent' subtitle='Freshly added and just announced' onViewAll={() => navigate('/movies')}>
            {mostRecent.map((e) => (
              <EventCard key={e._id} event={e} onBook={openBooking} />
            ))}
          </Rail>
        )}

        {shownRails.map(({ cat, title, subtitle }) => {
          const items = byCategory(cat)
          if (!items.length) return null
          return (
            <Rail key={cat} title={title} subtitle={subtitle} onViewAll={() => navigate(`/movies?cat=${cat}`)}>
              {items.map((e) => (
                <EventCard key={e._id} event={e} onBook={openBooking} />
              ))}
            </Rail>
          )
        })}
      </div>

      <DateTimeModal
        open={!!modalEvent}
        onClose={() => setModalEvent(null)}
        title={modalEvent?.title}
        venue={modalEvent ? `${modalEvent.venue} · ${modalEvent.city}` : ''}
        schedule={modalEvent?.schedule || {}}
        onConfirm={confirmDateTime}
      />
    </div>
  )
}

export default Home

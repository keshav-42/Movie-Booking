import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { SearchIcon, Film, Trophy, Music, Drama, Mic2, Sparkles, SlidersHorizontal } from 'lucide-react'
import BlurCircle from '../components/BlurCircle'
import EventCard from '../components/EventCard'
import DateTimeModal from '../components/DateTimeModal'
import { useAppContext } from '../context/AppContext'
import { EVENTS, FALLBACK_MOVIES, normalizeEvent } from '../assets/events'

const CATEGORIES = [
  { id: 'all', label: 'All', icon: Sparkles },
  { id: 'movies', label: 'Movies', icon: Film },
  { id: 'sports', label: 'Sports', icon: Trophy },
  { id: 'concerts', label: 'Concerts', icon: Music },
  { id: 'theater', label: 'Shows', icon: Drama },
  { id: 'comedy', label: 'Comedy', icon: Mic2 },
]

const SORTS = [
  { id: 'recent', label: 'Most recent' },
  { id: 'price-low', label: 'Price: low to high' },
  { id: 'price-high', label: 'Price: high to low' },
  { id: 'rating', label: 'Top rated' },
]

const Movies = () => {
  const { shows, image_base_url } = useAppContext()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()

  const category = params.get('cat') || 'all'
  const query = params.get('q') || ''
  const [sort, setSort] = useState('recent')
  const [modalEvent, setModalEvent] = useState(null)
  const [localQuery, setLocalQuery] = useState(query)

  useEffect(() => setLocalQuery(query), [query])

  const setCategory = (cat) => {
    const next = new URLSearchParams(params)
    if (cat === 'all') next.delete('cat')
    else next.set('cat', cat)
    setParams(next, { replace: true })
  }

  const submitSearch = (e) => {
    e.preventDefault()
    const next = new URLSearchParams(params)
    if (localQuery.trim()) next.set('q', localQuery.trim())
    else next.delete('q')
    setParams(next, { replace: true })
  }

  const movies = useMemo(() => {
    const source = shows.length ? shows : FALLBACK_MOVIES
    const imgBase = shows.length ? image_base_url : ''
    return source.map((s) => normalizeEvent(s, imgBase))
  }, [shows, image_base_url])
  const events = useMemo(() => EVENTS.map((e) => normalizeEvent(e)), [])
  const pool = useMemo(() => [...movies, ...events], [movies, events])

  const results = useMemo(() => {
    let list = category === 'all' ? pool : pool.filter((e) => e.category === category)
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (e) =>
          e.title?.toLowerCase().includes(q) ||
          e.subtitle?.toLowerCase().includes(q) ||
          e.venue?.toLowerCase().includes(q) ||
          e.city?.toLowerCase().includes(q)
      )
    }
    const sorted = [...list]
    if (sort === 'price-low') sorted.sort((a, b) => a.basePrice - b.basePrice)
    else if (sort === 'price-high') sorted.sort((a, b) => b.basePrice - a.basePrice)
    else if (sort === 'rating') sorted.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))
    else sorted.sort((a, b) => new Date(b.release_date || 0) - new Date(a.release_date || 0))
    return sorted
  }, [pool, category, query, sort])

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

  return (
    <div className='relative min-h-screen overflow-hidden'>
      <BlurCircle top='120px' left='0px' />
      <BlurCircle bottom='50px' right='50px' />

      {/* search + filters bar */}
      <div className='pt-24 px-6 md:px-16 lg:px-28 pb-4'>
        <form onSubmit={submitSearch} className='relative max-w-2xl'>
          <SearchIcon className='absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
          <input
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            placeholder='Search movies, teams, artists, venues…'
            className='w-full h-12 pl-12 pr-4 rounded-xl bg-white/10 border border-white/15 outline-none focus:border-primary/60 transition text-sm placeholder:text-gray-500'
          />
        </form>

        <div className='flex items-center gap-2 mt-4 overflow-x-auto no-scrollbar'>
          {CATEGORIES.map((c) => {
            const active = c.id === category
            return (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition border ${
                  active
                    ? 'bg-primary text-white border-primary'
                    : 'bg-transparent text-gray-300 border-white/15 hover:border-white/40 hover:text-white'
                }`}
              >
                {React.createElement(c.icon, { className: 'w-4 h-4' })}
                {c.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* results */}
      <div className='px-6 md:px-16 lg:px-28 py-6'>
        <div className='flex items-center justify-between mb-6 gap-4 flex-wrap'>
          <h1 className='text-lg font-medium'>
            {results.length} result{results.length === 1 ? '' : 's'}
            {query && <span className='text-gray-400'> · “{query}”</span>}
          </h1>
          <div className='flex items-center gap-2 text-sm'>
            <SlidersHorizontal className='w-4 h-4 text-gray-400' />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className='bg-white/10 border border-white/15 rounded-lg px-3 py-1.5 outline-none focus:border-primary/60 transition'
            >
              {SORTS.map((s) => (
                <option key={s.id} value={s.id} className='bg-[#141418]'>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {results.length > 0 ? (
          <div className='flex flex-wrap gap-5 max-sm:justify-center'>
            {results.map((e) => (
              <EventCard key={e._id} event={e} onBook={openBooking} />
            ))}
          </div>
        ) : (
          <div className='flex flex-col items-center justify-center py-32 text-center'>
            <div className='text-5xl mb-4'>🔍</div>
            <h2 className='text-2xl font-bold'>{query ? `No results for “${query}”` : 'Nothing here yet'}</h2>
            <p className='text-gray-400 mt-2'>Try a different search or category.</p>
          </div>
        )}
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

export default Movies

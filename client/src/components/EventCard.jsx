import React, { useState } from 'react'
import { useNavigate } from 'react-router'
import { StarIcon } from 'lucide-react'
import { CURRENCY, themeFor } from '../assets/events'

// Poster image that survives a dead URL: tries the backdrop next, then paints a
// category-tinted placeholder with the title so a rail never shows a broken img.
const Poster = ({ event, t }) => {
  const sources = [event.poster_path, event.backdrop_path].filter(Boolean)
  const [i, setI] = useState(0)
  if (i >= sources.length) {
    return (
      <div
        className='w-full h-full flex items-end p-3'
        style={{ background: `linear-gradient(150deg, ${t.from}, ${t.to})` }}
      >
        <span className='text-sm font-semibold leading-tight line-clamp-3 text-white/95'>{event.title}</span>
      </div>
    )
  }
  return (
    <img
      src={sources[i]}
      alt={event.title}
      loading='lazy'
      onError={() => setI((n) => n + 1)}
      className='w-full h-full object-cover transition duration-500 group-hover:scale-[1.05]'
    />
  )
}

// Poster-forward card. The artwork carries the card — no chrome painted over it.
// Identity is a single category-colored dot in the meta line; the rest of the
// information (title, rating, price) lives in a tight text block below the
// poster, the way a film shelf reads, so a rail scans clean instead of busy.
const EventCard = ({ event, onBook }) => {
  const navigate = useNavigate()
  const isMovie = event.category === 'movies'
  const t = themeFor(event.category)
  const year = event.release_date ? new Date(event.release_date).getFullYear() : null

  const go = () => {
    if (isMovie) {
      navigate(`/movies/${event._id}`)
      scrollTo(0, 0)
    } else {
      onBook?.(event)
    }
  }

  return (
    <button
      onClick={go}
      aria-label={`${event.title} — view details`}
      className='group w-40 sm:w-[11.5rem] shrink-0 text-left focus:outline-none'
    >
      {/* poster — clean, sharp, depth from a real drop shadow */}
      <div className='relative aspect-[2/3] rounded-xl overflow-hidden ring-1 ring-white/10 shadow-lg shadow-black/40 transition duration-300 group-hover:-translate-y-1 group-hover:ring-white/25 group-focus-visible:ring-2 group-focus-visible:ring-white/80'>
        <Poster event={event} t={t} />
        {/* faint bottom fade only on hover, so the title area lifts without chrome at rest */}
        <div className='absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition duration-300' />
      </div>

      {/* meta below the poster — two tight lines, no overlay tags */}
      <div className='mt-2.5'>
        <p className='text-sm font-medium leading-snug truncate text-gray-100 group-hover:text-white transition'>
          {event.title}
        </p>
        <div className='flex items-center justify-between mt-1 text-xs text-gray-400'>
          <span className='inline-flex items-center gap-1.5 truncate'>
            <span className='w-1.5 h-1.5 rounded-full shrink-0' style={{ background: t.accent }} />
            {event.vote_average != null ? (
              <span className='inline-flex items-center gap-0.5'>
                <StarIcon className='w-3 h-3 text-starColor fill-starColor' />
                {Number(event.vote_average).toFixed(1)}
              </span>
            ) : (
              <span className='truncate'>{event.city || event.venue || t.label}</span>
            )}
            {year && <span className='text-gray-600'>· {year}</span>}
          </span>
          <span className='whitespace-nowrap font-medium text-gray-300'>
            {CURRENCY}{event.basePrice}
          </span>
        </div>
      </div>
    </button>
  )
}

export default EventCard

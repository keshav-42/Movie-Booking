import React from 'react'
import { useNavigate } from 'react-router'
import { StarIcon, MapPin } from 'lucide-react'
import { CURRENCY, themeFor } from '../assets/events'

// A minimalist, poster-forward card. Category identity comes through a soft
// gradient wash + accent (see CATEGORY_THEME) rather than heavy chrome, so a
// shelf of them reads as one cohesive system.
const EventCard = ({ event, onBook }) => {
  const navigate = useNavigate()
  const isMovie = event.category === 'movies'
  const t = themeFor(event.category)
  const img = event.poster_path || event.backdrop_path

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
      className='group relative w-44 sm:w-48 shrink-0 text-left rounded-2xl transition-transform duration-300 hover:-translate-y-1.5 focus:outline-none'
    >
      {/* gradient glow that only appears on hover */}
      <div
        className='absolute -inset-1 rounded-[20px] opacity-0 group-hover:opacity-100 blur-lg transition duration-300 -z-10'
        style={{ background: `linear-gradient(135deg, ${t.from}, ${t.to})` }}
      />

      {/* poster */}
      <div className='relative aspect-[2/3] rounded-2xl overflow-hidden ring-1 ring-white/10'>
        <img
          src={img}
          alt={event.title}
          loading='lazy'
          className='w-full h-full object-cover transition duration-500 group-hover:scale-105'
        />
        {/* bottom scrim + gradient tint keyed to category */}
        <div className='absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent' />
        <div
          className='absolute inset-0 opacity-30 mix-blend-soft-light'
          style={{ background: `linear-gradient(160deg, ${t.from}22, ${t.to}55)` }}
        />

        {/* category chip */}
        <span
          className='absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white/95 backdrop-blur-sm'
          style={{ background: `linear-gradient(135deg, ${t.from}cc, ${t.to}cc)` }}
        >
          {t.label}
        </span>

        {/* rating */}
        {event.vote_average != null && (
          <span className='absolute top-2.5 right-2.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-black/55 backdrop-blur-sm'>
            <StarIcon className='w-2.5 h-2.5 text-starColor fill-starColor' />
            {Number(event.vote_average).toFixed(1)}
          </span>
        )}

        {/* title + meta over the scrim */}
        <div className='absolute bottom-0 left-0 right-0 p-3'>
          <p className='font-semibold text-sm leading-tight line-clamp-2'>{event.title}</p>
          <div className='flex items-center justify-between mt-1.5'>
            {(event.city || event.venue) && (
              <span className='flex items-center gap-1 text-[10px] text-gray-300 truncate max-w-[60%]'>
                <MapPin className='w-2.5 h-2.5 shrink-0' /> {event.city || event.venue}
              </span>
            )}
            <span className='text-[11px] font-semibold whitespace-nowrap' style={{ color: t.accent }}>
              <span className='text-[9px] font-normal text-gray-400'>from </span>
              {CURRENCY}{event.basePrice}
            </span>
          </div>
        </div>
      </div>
    </button>
  )
}

export default EventCard

import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Heart, PlayCircle, Star, Ticket, Clock, CalendarDays, Globe, X } from 'lucide-react'
import ReactPlayer from 'react-player'
import toast from 'react-hot-toast'
import timeFormat from '../lib/timeFormat'
import Kconverter from '../lib/Kconverter'
import DateTimeModal from '../components/DateTimeModal'
import EventCard from '../components/EventCard'
import Rail from '../components/Rail'
import Loading from '../components/Loading'
import { useAppContext } from '../context/AppContext'
import { fallbackShowById, normalizeEvent, FALLBACK_MOVIES, themeFor } from '../assets/events'
import { dummyTrailers } from '../assets/assets'

// Movies own the rose → violet identity from CATEGORY_THEME; the whole page is
// keyed to it so the detail view reads as the same world as the home rails.
const T = themeFor('movies')

const MovieDetails = () => {
  const { id } = useParams()
  const [show, setShow] = useState(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [trailerOpen, setTrailerOpen] = useState(false)
  const navigate = useNavigate()

  const { shows, axios, getToken, user, favouriteMovies, fetchFavouriteMovies, image_base_url } = useAppContext()

  // Fallback data ships absolute TMDB URLs; backend rows ship bare paths. Only
  // prepend the image base when the path isn't already a full URL, otherwise the
  // poster/backdrop 404s the moment the server is unreachable.
  const imgUrl = (path) => (!path ? '' : /^https?:\/\//.test(path) ? path : image_base_url + path)

  const getShow = async () => {
    try {
      const { data } = await axios.get(`/api/show/${id}`)
      // The deployed API can answer { success:true, movie:null } for ids it
      // doesn't know — treat a missing movie as unavailable, not as a hit.
      if (data.success && data.movie) {
        setShow(data)
        return
      }
    } catch (error) {
      console.error(error)
    }
    // Backend unavailable → use bundled fallback so the page still works.
    const fb = fallbackShowById(id)
    if (fb) setShow(fb)
  }

  const handleFavourite = async () => {
    try {
      if (!user) {
        return toast.error('Please log in to save favourites')
      }
      const { data } = await axios.post(
        '/api/user/update-favourite',
        { movieId: id },
        { headers: { Authorization: `Bearer ${await getToken()}` } }
      )
      if (data.success) {
        await fetchFavouriteMovies()
        toast.success(data.message)
      }
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    getShow()
    scrollTo(0, 0)
  }, [id])

  // Related titles — reuse the home card + normalizer so this shelf matches the
  // rails exactly instead of a second, plainer card style.
  const related = useMemo(() => {
    const source = shows.length ? shows : FALLBACK_MOVIES
    const base = shows.length ? image_base_url : ''
    return source
      .filter((s) => String(s._id) !== String(id))
      .slice(0, 10)
      .map((s) => normalizeEvent(s, base))
  }, [shows, image_base_url, id])

  if (!show) return <Loading />

  const m = show.movie
  const isFav = favouriteMovies.some((movie) => movie._id === id)
  const year = m.release_date?.split('-')[0]
  const language = (m.original_language || 'en').toUpperCase()

  return (
    <div className='min-h-screen'>
      {/* ───────── Cinematic backdrop hero ───────── */}
      {/* overflow-hidden clips the absolute backdrop to the hero; without it the
          backdrop layer paints over the Top-cast section below and hides it. */}
      <section className='relative overflow-hidden min-h-[600px] md:min-h-[660px]'>
        {/* backdrop layer sits under the transparent navbar */}
        <div className='absolute inset-0 overflow-hidden'>
          <img
            src={imgUrl(m.backdrop_path)}
            alt=''
            aria-hidden='true'
            className='w-full h-full object-cover object-top scale-105 animate-[kb_18s_ease-out_forwards]'
          />
          {/* readability scrims — vertical fade to page bg, horizontal on desktop */}
          <div className='absolute inset-0 bg-gradient-to-t from-[#09090B] via-[#09090B]/70 to-[#09090B]/30' />
          <div className='absolute inset-0 md:bg-gradient-to-r md:from-[#09090B] md:via-[#09090B]/50 md:to-transparent' />
          {/* category wash + glow blob */}
          <div
            className='absolute inset-0 opacity-40 mix-blend-soft-light'
            style={{ background: `radial-gradient(1100px 600px at 12% 100%, ${T.from}, transparent 60%)` }}
          />
          <div
            className='absolute -bottom-48 -left-24 w-[40rem] h-[40rem] rounded-full blur-[130px] opacity-30'
            style={{ background: T.glow }}
          />
        </div>

        {/* content */}
        <div className='relative px-6 md:px-16 lg:px-28 pt-28 md:pt-44 pb-14'>
          <div className='flex flex-col md:flex-row gap-8 md:gap-12 max-w-6xl animate-[riseIn_.6s_ease-out]'>
            {/* poster */}
            <div className='shrink-0 mx-auto md:mx-0'>
              <img
                src={imgUrl(m.poster_path)}
                alt={`${m.title} poster`}
                className='w-52 sm:w-60 aspect-[2/3] object-cover rounded-2xl ring-1 ring-white/15 shadow-2xl shadow-black/60'
              />
            </div>

            {/* info */}
            <div className='flex-1 min-w-0'>
              <div className='flex flex-wrap items-center gap-2.5 mb-4'>
                <span
                  className='px-3 py-1 rounded-full text-xs font-semibold text-white'
                  style={{ background: `linear-gradient(135deg, ${T.from}, ${T.to})` }}
                >
                  In theatres
                </span>
                <span className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-white/10 border border-white/15 backdrop-blur'>
                  <Globe className='w-3.5 h-3.5' /> {language}
                </span>
              </div>

              <h1 className='text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.03] tracking-tight text-balance'>
                {m.title}
              </h1>

              {m.tagline && (
                <p className='mt-3 text-lg italic' style={{ color: T.accent }}>
                  “{m.tagline}”
                </p>
              )}

              {/* meta chips */}
              <div className='flex flex-wrap items-center gap-x-3 gap-y-2 mt-5 text-sm'>
                <span className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/10'>
                  <Star className='w-4 h-4 text-starColor fill-starColor' />
                  <b className='font-semibold'>{m.vote_average?.toFixed(1)}</b>
                  <span className='text-gray-400'>({Kconverter(m.vote_count || 0)})</span>
                </span>
                <span className='inline-flex items-center gap-1.5 text-gray-300'>
                  <Clock className='w-4 h-4 text-gray-400' /> {timeFormat(m.runtime)}
                </span>
                <span className='inline-flex items-center gap-1.5 text-gray-300'>
                  <CalendarDays className='w-4 h-4 text-gray-400' /> {year}
                </span>
                <span className='text-gray-600'>•</span>
                <div className='flex flex-wrap gap-1.5'>
                  {m.genres.map((g) => (
                    <span key={g.id ?? g.name} className='px-2.5 py-1 rounded-full text-xs bg-white/5 border border-white/10 text-gray-300'>
                      {g.name}
                    </span>
                  ))}
                </div>
              </div>

              <p className='text-gray-300/90 mt-6 max-w-[68ch] leading-relaxed'>{m.overview}</p>

              {/* actions */}
              <div className='flex flex-wrap items-center gap-3 mt-8'>
                <button
                  onClick={() => setPickerOpen(true)}
                  className='inline-flex items-center gap-2 px-7 py-3 rounded-full text-sm font-semibold text-white transition hover:brightness-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090B]'
                  style={{ background: `linear-gradient(135deg, ${T.from}, ${T.to})`, boxShadow: `0 12px 34px -10px ${T.glow}` }}
                >
                  <Ticket className='w-5 h-5' /> Buy tickets
                </button>
                <button
                  onClick={() => setTrailerOpen(true)}
                  className='inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium bg-white/10 hover:bg-white/15 border border-white/15 backdrop-blur transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60'
                >
                  <PlayCircle className='w-5 h-5' /> Watch trailer
                </button>
                <button
                  onClick={handleFavourite}
                  aria-pressed={isFav}
                  aria-label={isFav ? 'Remove from favourites' : 'Add to favourites'}
                  className='p-3 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 backdrop-blur transition active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60'
                >
                  <Heart className={`w-5 h-5 transition ${isFav ? 'fill-primary text-primary' : 'text-white'}`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── Top cast ───────── */}
      {m.casts?.length > 0 && (
        <section className='px-6 md:px-16 lg:px-28 mt-4'>
          <h2 className='text-xl font-semibold mb-5'>Top cast</h2>
          <div className='flex gap-5 overflow-x-auto no-scrollbar pb-2'>
            {m.casts.slice(0, 12).map((cast, i) => (
              <CastAvatar key={i} name={cast.name} src={imgUrl(cast.profile_path)} />
            ))}
          </div>
        </section>
      )}

      {/* ───────── More like this ───────── */}
      {related.length > 0 && (
        <div className='px-6 md:px-16 lg:px-28 mt-14 pb-16'>
          <Rail title='More like this' subtitle='Because you’re viewing this title' onViewAll={() => { navigate('/movies?cat=movies'); scrollTo(0, 0) }}>
            {related.map((e) => (
              <EventCard key={e._id} event={e} onBook={() => { navigate(`/movies/${e._id}`); scrollTo(0, 0) }} />
            ))}
          </Rail>
        </div>
      )}

      {/* ───────── Booking + trailer overlays ───────── */}
      <DateTimeModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title={m.title}
        venue='QuickShow Cinemas'
        schedule={show.dateTime}
        onConfirm={({ date, slot }) => {
          setPickerOpen(false)
          navigate(`/movies/${id}/${date}`, { state: { showId: slot.showId } })
          scrollTo(0, 0)
        }}
      />

      <TrailerModal open={trailerOpen} onClose={() => setTrailerOpen(false)} title={m.title} />

      <style>{`
        @keyframes riseIn { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes kb { from { transform: scale(1.12) } to { transform: scale(1.02) } }
      `}</style>
    </div>
  )
}

// Circular cast avatar that degrades to the actor's initials if the photo is
// missing or 404s, so the row never shows an empty hole.
const CastAvatar = ({ name, src }) => {
  const [ok, setOk] = useState(!!src)
  const initials = (name || '?')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
  return (
    <div className='shrink-0 w-20 text-center'>
      <div className='w-20 h-20 rounded-full overflow-hidden ring-1 ring-white/15 bg-white/5'>
        {ok ? (
          <img src={src} alt={name} loading='lazy' onError={() => setOk(false)} className='w-full h-full object-cover' />
        ) : (
          <div className='w-full h-full flex items-center justify-center text-base font-semibold text-gray-400'>
            {initials}
          </div>
        )}
      </div>
      <p className='text-xs font-medium mt-2.5 leading-tight line-clamp-2'>{name}</p>
    </div>
  )
}

// Lightweight trailer lightbox. The bundled trailers aren't per-movie, so it
// plays the demo reel — enough to make the button a real, satisfying action.
const TrailerModal = ({ open, onClose, title }) => {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      role='dialog'
      aria-modal='true'
      aria-label={`${title} trailer`}
      className='fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4 animate-[fadeIn_.2s_ease]'
      onClick={onClose}
    >
      <div className='w-full max-w-4xl' onClick={(e) => e.stopPropagation()}>
        <div className='flex items-center justify-between mb-3'>
          <p className='text-sm font-medium text-gray-300 truncate'>{title} — Official trailer</p>
          <button onClick={onClose} aria-label='Close trailer' className='p-2 rounded-full bg-white/10 hover:bg-white/20 transition'>
            <X className='w-5 h-5' />
          </button>
        </div>
        <div className='relative aspect-video rounded-2xl overflow-hidden ring-1 ring-white/15 shadow-2xl shadow-black/60 bg-black'>
          <ReactPlayer src={dummyTrailers[0].videoUrl} playing controls width='100%' height='100%' style={{ position: 'absolute', inset: 0 }} />
        </div>
      </div>
      <style>{`@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }`}</style>
    </div>
  )
}

export default MovieDetails

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Ticket, Star, MapPin } from 'lucide-react'
import { themeFor, CURRENCY } from '../assets/events'

// A full-bleed cinematic hero. The artwork covers the whole stage; depth comes
// from layered effects (slow ken-burns drift, a radial vignette, a category
// glow, and a fine film grain) rather than a flat black wash — so the image
// keeps its richness instead of being shadowed out. Mechanics: auto-advance,
// arrows, dots, keyboard, drag/swipe. Motion is disabled under prefers-reduced.
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"

const HeroCarousel = ({ slides = [], onBook }) => {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const drag = useRef({ active: false, startX: 0, dx: 0 })
  const [dragX, setDragX] = useState(0)

  const count = slides.length
  const go = useCallback((i) => setIndex(((i % count) + count) % count), [count])
  const next = useCallback(() => go(index + 1), [go, index])
  const prev = useCallback(() => go(index - 1), [go, index])

  useEffect(() => {
    if (paused || count <= 1) return
    const id = setInterval(() => setIndex((i) => (i + 1) % count), 6000)
    return () => clearInterval(id)
  }, [paused, count])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, prev])

  const onDown = (x) => { drag.current = { active: true, startX: x, dx: 0 }; setPaused(true) }
  const onMove = (x) => {
    if (!drag.current.active) return
    drag.current.dx = x - drag.current.startX
    setDragX(drag.current.dx)
  }
  const onUp = () => {
    if (!drag.current.active) return
    const dx = drag.current.dx
    drag.current.active = false
    setDragX(0)
    setPaused(false)
    if (dx < -60) next()
    else if (dx > 60) prev()
  }

  if (!count) return null

  return (
    <div
      className='relative h-[86vh] min-h-[580px] max-h-[900px] w-full overflow-hidden select-none bg-[#09090B]'
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => { setPaused(false); onUp() }}
      onMouseDown={(e) => onDown(e.clientX)}
      onMouseMove={(e) => onMove(e.clientX)}
      onMouseUp={onUp}
      onTouchStart={(e) => onDown(e.touches[0].clientX)}
      onTouchMove={(e) => onMove(e.touches[0].clientX)}
      onTouchEnd={onUp}
    >
      {slides.map((s, i) => {
        const t = themeFor(s.category)
        const active = i === index
        return (
          <div
            key={s._id}
            className='absolute inset-0 transition-opacity duration-[900ms] ease-out'
            style={{ opacity: active ? 1 : 0, pointerEvents: active ? 'auto' : 'none' }}
            aria-hidden={!active}
          >
            {/* full-bleed artwork with a slow ken-burns drift, nudged by drag */}
            <div className='absolute inset-0 overflow-hidden'>
              <img
                src={s.backdrop_path}
                alt={s.title}
                draggable={false}
                className={`absolute inset-0 w-full h-full object-cover object-center will-change-transform ${active ? 'animate-[kenburns_16s_ease-out_forwards] motion-reduce:animate-none' : ''}`}
                style={{ transform: `translateX(${active ? dragX * 0.04 : 0}px)`, transition: drag.current.active ? 'none' : 'transform .5s ease-out' }}
              />
            </div>

            {/* category glow — a soft pool of the slide's color, lit from bottom-left */}
            <div
              className='absolute inset-0 mix-blend-soft-light opacity-60 motion-safe:animate-[glowpulse_7s_ease-in-out_infinite]'
              style={{ background: `radial-gradient(1000px 620px at 16% 96%, ${t.from}, transparent 62%)` }}
            />

            {/* depth: legibility scrims kept low so the upper-right image stays bright */}
            <div className='absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-[#09090B] via-[#09090B]/70 to-transparent' />
            <div className='absolute inset-y-0 left-0 w-[55%] bg-gradient-to-r from-[#09090B]/85 via-[#09090B]/30 to-transparent' />

            {/* vignette — darkens the edges to push the center forward (depth, not a flat wash) */}
            <div className='absolute inset-0' style={{ background: 'radial-gradient(120% 120% at 50% 42%, transparent 55%, rgba(0,0,0,0.55) 100%)' }} />

            {/* fine film grain for cinematic texture */}
            <div className='absolute inset-0 opacity-[0.12] mix-blend-overlay pointer-events-none' style={{ backgroundImage: GRAIN, backgroundSize: '160px 160px' }} />
          </div>
        )
      })}

      {/* Content — anchored bottom-left, editorial */}
      <div className='relative h-full flex flex-col justify-end px-6 md:px-16 lg:px-28 pb-24 md:pb-28'>
        <SlideContent slide={slides[index]} onBook={onBook} />
      </div>

      {/* Arrows */}
      {count > 1 && (
        <>
          <button
            onClick={prev}
            className='absolute left-3 md:left-6 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/8 hover:bg-white/16 border border-white/10 backdrop-blur transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60'
            aria-label='Previous'
          >
            <ChevronLeft className='w-5 h-5' />
          </button>
          <button
            onClick={next}
            className='absolute right-3 md:right-6 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/8 hover:bg-white/16 border border-white/10 backdrop-blur transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60'
            aria-label='Next'
          >
            <ChevronRight className='w-5 h-5' />
          </button>
        </>
      )}

      {/* Dots — aligned to the content column */}
      {count > 1 && (
        <div className='absolute bottom-9 left-6 md:left-16 lg:left-28 flex items-center gap-2'>
          {slides.map((s, i) => {
            const t = themeFor(s.category)
            const active = i === index
            return (
              <button
                key={s._id}
                onClick={() => go(i)}
                className='h-1.5 rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60'
                style={{ width: active ? 30 : 8, background: active ? t.accent : 'rgba(255,255,255,0.32)' }}
                aria-label={`Go to slide ${i + 1}`}
              />
            )
          })}
        </div>
      )}

      <style>{`
        @keyframes kenburns { from { transform: scale(1.06) } to { transform: scale(1.16) translateY(-1.5%) } }
        @keyframes glowpulse { 0%,100% { opacity: .5 } 50% { opacity: .72 } }
        @keyframes heroRise { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </div>
  )
}

const SlideContent = ({ slide, onBook }) => {
  const t = themeFor(slide.category)
  return (
    <div key={slide._id} className='max-w-2xl motion-safe:animate-[heroRise_.6s_cubic-bezier(0.16,1,0.3,1)]'>
      <div className='flex items-center gap-3 mb-4'>
        <span className='text-[11px] font-semibold uppercase tracking-[0.2em]' style={{ color: t.accent }}>
          {t.label}
        </span>
        {slide.vote_average != null && (
          <span className='inline-flex items-center gap-1 text-xs text-gray-200'>
            <Star className='w-3.5 h-3.5 text-starColor fill-starColor' />
            {Number(slide.vote_average).toFixed(1)}
          </span>
        )}
      </div>

      <h1
        className='text-5xl md:text-6xl lg:text-7xl font-bold leading-[0.95] tracking-[-0.04em] text-balance'
        style={{ textShadow: '0 2px 30px rgba(0,0,0,0.5)' }}
      >
        {slide.title}
      </h1>

      <div className='flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-4 text-sm text-gray-200'>
        {slide.subtitle && <span>{slide.subtitle}</span>}
        {(slide.venue || slide.city) && (
          <>
            <span className='text-gray-500'>·</span>
            <span className='inline-flex items-center gap-1 text-gray-300'>
              <MapPin className='w-3.5 h-3.5' /> {slide.city ? `${slide.venue}, ${slide.city}` : slide.venue}
            </span>
          </>
        )}
        {slide.runtimeLabel && (
          <>
            <span className='text-gray-500'>·</span>
            <span className='text-gray-300'>{slide.runtimeLabel}</span>
          </>
        )}
      </div>

      {slide.raw?.overview && (
        <p className='text-gray-200/85 mt-4 line-clamp-2 max-w-xl leading-relaxed' style={{ textShadow: '0 1px 12px rgba(0,0,0,0.6)' }}>
          {slide.raw.overview}
        </p>
      )}

      <div className='flex items-center gap-4 mt-7'>
        <button
          onClick={() => onBook(slide)}
          className='inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-semibold text-white transition hover:brightness-110 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090B]'
          style={{ background: `linear-gradient(135deg, ${t.from}, ${t.to})`, boxShadow: `0 16px 40px -12px ${t.glow}` }}
        >
          <Ticket className='w-5 h-5' /> Book tickets
        </button>
        <span className='text-sm text-gray-300'>
          from <span className='text-white font-semibold'>{CURRENCY}{slide.basePrice}</span>
        </span>
      </div>
    </div>
  )
}

export default HeroCarousel

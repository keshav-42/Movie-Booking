import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight, Ticket, Star, MapPin } from 'lucide-react'
import { themeFor, CURRENCY } from '../assets/events'

// A movable, auto-rotating hero. Slides = a curated mix of movies / concerts /
// sports. Supports: auto-advance, prev/next arrows, dot nav, keyboard arrows,
// and drag/swipe. Each slide's gradients are keyed to its category so the
// opening reads vibrant and ticket-app-like rather than a flat banner.
const HeroCarousel = ({ slides = [], onBook }) => {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const drag = useRef({ active: false, startX: 0, dx: 0 })
  const [dragX, setDragX] = useState(0)

  const count = slides.length
  const go = useCallback((i) => setIndex(((i % count) + count) % count), [count])
  const next = useCallback(() => go(index + 1), [go, index])
  const prev = useCallback(() => go(index - 1), [go, index])

  // auto-advance
  useEffect(() => {
    if (paused || count <= 1) return
    const id = setInterval(() => setIndex((i) => (i + 1) % count), 5500)
    return () => clearInterval(id)
  }, [paused, count])

  // keyboard
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, prev])

  // drag / swipe
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
      className='relative h-[82vh] min-h-[540px] w-full overflow-hidden select-none'
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => { setPaused(false); onUp() }}
      onMouseDown={(e) => onDown(e.clientX)}
      onMouseMove={(e) => onMove(e.clientX)}
      onMouseUp={onUp}
      onTouchStart={(e) => onDown(e.touches[0].clientX)}
      onTouchMove={(e) => onMove(e.touches[0].clientX)}
      onTouchEnd={onUp}
    >
      {/* Slides stacked; only active is visible (crossfade). */}
      {slides.map((s, i) => {
        const t = themeFor(s.category)
        const active = i === index
        return (
          <div
            key={s._id}
            className='absolute inset-0 transition-opacity duration-700 ease-out'
            style={{ opacity: active ? 1 : 0, pointerEvents: active ? 'auto' : 'none' }}
            aria-hidden={!active}
          >
            {/* backdrop with a slow ken-burns drift, nudged by drag */}
            <img
              src={s.backdrop_path}
              alt={s.title}
              draggable={false}
              className='absolute inset-0 w-full h-full object-cover'
              style={{
                transform: `scale(1.08) translateX(${active ? dragX * 0.03 : 0}px)`,
                transition: drag.current.active ? 'none' : 'transform 0.4s ease-out',
              }}
            />
            {/* readability + vibrant category wash */}
            <div className='absolute inset-0 bg-gradient-to-t from-[#09090B] via-[#09090B]/55 to-transparent' />
            <div className='absolute inset-0 bg-gradient-to-r from-[#09090B] via-[#09090B]/70 to-transparent' />
            <div
              className='absolute inset-0 opacity-40 mix-blend-soft-light'
              style={{ background: `radial-gradient(1200px 600px at 15% 90%, ${t.from}, transparent 60%)` }}
            />
            {/* accent glow blob */}
            <div
              className='absolute -bottom-40 -left-20 w-[36rem] h-[36rem] rounded-full blur-[120px] opacity-40'
              style={{ background: t.glow }}
            />
          </div>
        )
      })}

      {/* Active slide content */}
      <div className='relative h-full flex flex-col justify-end px-6 md:px-16 lg:px-28 pb-20 md:pb-24'>
        <SlideContent slide={slides[index]} onBook={onBook} />
      </div>

      {/* Arrows */}
      {count > 1 && (
        <>
          <button
            onClick={prev}
            className='absolute left-3 md:left-6 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/40 hover:bg-black/70 border border-white/15 backdrop-blur transition'
            aria-label='Previous'
          >
            <ChevronLeft className='w-5 h-5' />
          </button>
          <button
            onClick={next}
            className='absolute right-3 md:right-6 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/40 hover:bg-black/70 border border-white/15 backdrop-blur transition'
            aria-label='Next'
          >
            <ChevronRight className='w-5 h-5' />
          </button>
        </>
      )}

      {/* Dots */}
      {count > 1 && (
        <div className='absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2'>
          {slides.map((s, i) => {
            const t = themeFor(s.category)
            const active = i === index
            return (
              <button
                key={s._id}
                onClick={() => go(i)}
                className='h-1.5 rounded-full transition-all duration-300'
                style={{
                  width: active ? 28 : 8,
                  background: active ? `linear-gradient(90deg, ${t.from}, ${t.to})` : 'rgba(255,255,255,0.35)',
                }}
                aria-label={`Go to slide ${i + 1}`}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

const SlideContent = ({ slide, onBook }) => {
  const t = themeFor(slide.category)
  return (
    <div className='max-w-xl animate-[heroIn_.6s_ease]'>
      <div className='flex items-center gap-2 mb-4'>
        <span
          className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-white'
          style={{ background: `linear-gradient(135deg, ${t.from}, ${t.to})` }}
        >
          {t.label}
        </span>
        {slide.vote_average != null && (
          <span className='inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-white/10 backdrop-blur border border-white/15'>
            <Star className='w-3 h-3 text-starColor fill-starColor' />
            {Number(slide.vote_average).toFixed(1)}
          </span>
        )}
      </div>

      <h1 className='text-4xl md:text-6xl font-bold leading-[1.05] tracking-tight'>{slide.title}</h1>

      <div className='flex flex-wrap items-center gap-3 mt-3 text-sm text-gray-300'>
        <span>{slide.subtitle}</span>
        {(slide.venue || slide.city) && (
          <span className='flex items-center gap-1'>
            <MapPin className='w-4 h-4' /> {slide.city ? `${slide.venue}, ${slide.city}` : slide.venue}
          </span>
        )}
        {slide.runtimeLabel && <span>{slide.runtimeLabel}</span>}
      </div>

      {slide.raw?.overview && (
        <p className='text-gray-300/90 mt-4 line-clamp-2 max-w-lg'>{slide.raw.overview}</p>
      )}

      <div className='flex items-center gap-3 mt-7'>
        <button
          onClick={() => onBook(slide)}
          className='flex items-center gap-2 px-6 py-3 rounded-full font-medium text-white shadow-lg transition active:scale-95 hover:brightness-110'
          style={{ background: `linear-gradient(135deg, ${t.from}, ${t.to})`, boxShadow: `0 10px 30px -8px ${t.glow}` }}
        >
          <Ticket className='w-5 h-5' /> Book tickets
        </button>
        <span className='text-sm text-gray-400'>
          from <span className='text-white font-semibold'>{CURRENCY}{slide.basePrice}</span>
        </span>
      </div>

      <style>{`@keyframes heroIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  )
}

export default HeroCarousel

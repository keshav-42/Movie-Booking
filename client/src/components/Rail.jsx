import React, { useRef } from 'react'
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'

// A horizontally scrolling shelf of cards with arrow controls and a heading.
const Rail = ({ title, subtitle, onViewAll, children }) => {
  const ref = useRef(null)
  const scrollBy = (dir) => {
    ref.current?.scrollBy({ left: dir * 520, behavior: 'smooth' })
  }

  return (
    <section className='relative'>
      <div className='flex items-end justify-between mb-4'>
        <div>
          <h2 className='text-xl font-semibold'>{title}</h2>
          {subtitle && <p className='text-sm text-gray-400 mt-0.5'>{subtitle}</p>}
        </div>
        <div className='flex items-center gap-2'>
          {onViewAll && (
            <button
              onClick={onViewAll}
              className='hidden sm:flex items-center gap-1 text-sm text-gray-300 hover:text-white transition mr-2'
            >
              View all <ArrowRight className='w-4 h-4' />
            </button>
          )}
          <button
            onClick={() => scrollBy(-1)}
            className='p-2 rounded-full bg-white/10 hover:bg-white/20 transition'
            aria-label='Scroll left'
          >
            <ChevronLeft className='w-4 h-4' />
          </button>
          <button
            onClick={() => scrollBy(1)}
            className='p-2 rounded-full bg-white/10 hover:bg-white/20 transition'
            aria-label='Scroll right'
          >
            <ChevronRight className='w-4 h-4' />
          </button>
        </div>
      </div>
      <div ref={ref} className='flex gap-3 overflow-x-auto no-scrollbar pb-2 scroll-smooth'>
        {children}
      </div>
    </section>
  )
}

export default Rail

import React, { useState, useRef, useEffect } from 'react'
import { SearchIcon, MapPinIcon, ChevronDownIcon, Film, Trophy, Music, Drama, Mic2 } from 'lucide-react'

// Category definitions — movies are real (TMDB/DB); others are seedable dummy events.
export const CATEGORIES = [
  { id: 'movies', label: 'Movies', icon: Film },
  { id: 'sports', label: 'Sports', icon: Trophy },
  { id: 'concerts', label: 'Concerts', icon: Music },
  { id: 'theater', label: 'Theater', icon: Drama },
  { id: 'comedy', label: 'Comedy', icon: Mic2 },
]

const CITIES = [
  'New York', 'Los Angeles', 'Chicago', 'Philadelphia', 'San Francisco',
  'Boston', 'Seattle', 'Austin', 'Miami', 'Mumbai', 'Bengaluru', 'Delhi',
]

const DiscoveryBar = ({
  activeCategory = 'movies',
  onCategoryChange = () => {},
  city = 'New York',
  onCityChange = () => {},
  query = '',
  onQueryChange = () => {},
}) => {
  const [cityOpen, setCityOpen] = useState(false)
  const cityRef = useRef(null)

  useEffect(() => {
    const onClick = (e) => {
      if (cityRef.current && !cityRef.current.contains(e.target)) setCityOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div className='w-full bg-black/40 backdrop-blur border-b border-white/10'>
      <div className='px-6 md:px-16 lg:px-36 pt-24 pb-4'>
        {/* Search + city row */}
        <div className='flex flex-col sm:flex-row items-stretch gap-3'>
          {/* City selector */}
          <div className='relative' ref={cityRef}>
            <button
              onClick={() => setCityOpen((o) => !o)}
              className='flex items-center gap-2 h-12 px-4 rounded-xl bg-white/10 border border-white/15 hover:bg-white/15 transition w-full sm:w-52'
            >
              <MapPinIcon className='w-4 h-4 text-primary shrink-0' />
              <span className='truncate text-sm font-medium flex-1 text-left'>{city}</span>
              <ChevronDownIcon className={`w-4 h-4 transition ${cityOpen ? 'rotate-180' : ''}`} />
            </button>
            {cityOpen && (
              <div className='absolute z-40 mt-2 w-full max-h-72 overflow-y-auto rounded-xl bg-[#141417] border border-white/15 shadow-2xl py-1'>
                {CITIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => { onCityChange(c); setCityOpen(false) }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-white/10 transition ${c === city ? 'text-primary font-medium' : ''}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search */}
          <div className='relative flex-1'>
            <SearchIcon className='absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
            <input
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder='Search movies, teams, artists, venues…'
              className='w-full h-12 pl-12 pr-4 rounded-xl bg-white/10 border border-white/15 outline-none focus:border-primary/60 transition text-sm placeholder:text-gray-500'
            />
          </div>
        </div>

        {/* Category tabs */}
        <div className='flex items-center gap-2 mt-4 overflow-x-auto no-scrollbar'>
          {CATEGORIES.map(({ id, label, icon: Icon }) => {
            const active = id === activeCategory
            return (
              <button
                key={id}
                onClick={() => onCategoryChange(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition border ${
                  active
                    ? 'bg-primary text-white border-primary'
                    : 'bg-transparent text-gray-300 border-white/15 hover:border-white/40 hover:text-white'
                }`}
              >
                <Icon className='w-4 h-4' />
                {label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default DiscoveryBar

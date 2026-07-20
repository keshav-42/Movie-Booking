import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router'
import { assets } from '../assets/assets.js'
import { MenuIcon, SearchIcon, TicketPlus, XIcon } from 'lucide-react'
import { useClerk, UserButton, useUser } from '@clerk/clerk-react'
import { useAppContext } from '../context/AppContext.jsx'

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Movies', to: '/movies?cat=movies' },
  { label: 'Shows', to: '/movies?cat=theater' },
  { label: 'Sports', to: '/movies?cat=sports' },
  { label: 'Concerts', to: '/movies?cat=concerts' },
  { label: 'Comedy', to: '/movies?cat=comedy' },
]

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [scrolled, setScrolled] = useState(false)
  const { user } = useUser()
  const { openSignIn } = useClerk()
  const navigate = useNavigate()
  const location = useLocation()
  const { favouriteMovies } = useAppContext()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const submitSearch = (e) => {
    e.preventDefault()
    navigate(`/movies?q=${encodeURIComponent(query.trim())}`)
    setIsOpen(false)
  }

  const close = () => setIsOpen(false)

  return (
    <div
      className={`fixed top-0 left-0 z-50 w-full flex items-center gap-4 px-6 md:px-16 lg:px-28 py-3 transition-colors duration-300 ${
        scrolled ? 'bg-[#0b0b0e]/90 backdrop-blur border-b border-white/10' : 'bg-gradient-to-b from-black/70 to-transparent'
      }`}
    >
      <Link to='/' className='shrink-0'>
        <img src={assets.logo} alt='logo' className='w-32 h-auto' />
      </Link>

      {/* Search bar — the anchor of the navbar */}
      <form onSubmit={submitSearch} className='hidden md:flex flex-1 max-w-xl relative'>
        <SearchIcon className='absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400' />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Search movies, teams, artists, venues…'
          className='w-full h-10 pl-11 pr-4 rounded-full bg-white/10 border border-white/15 outline-none focus:border-primary/60 focus:bg-white/[0.14] transition text-sm placeholder:text-gray-500'
        />
      </form>

      {/* Desktop nav links */}
      <nav className='hidden lg:flex items-center gap-6 text-sm font-medium shrink-0'>
        {NAV_LINKS.map((l) => {
          const active =
            l.to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith('/movies') && location.search.includes(l.to.split('=')[1] || '###')
          return (
            <Link
              key={l.label}
              to={l.to}
              onClick={() => scrollTo(0, 0)}
              className={`transition hover:text-white ${active ? 'text-white' : 'text-gray-300'}`}
            >
              {l.label}
            </Link>
          )
        })}
        {favouriteMovies.length > 0 && (
          <Link to='/favourite' onClick={() => scrollTo(0, 0)} className='text-gray-300 hover:text-white transition'>
            Favourites
          </Link>
        )}
      </nav>

      {/* Auth */}
      <div className='flex items-center gap-3 shrink-0'>
        {!user ? (
          <button
            onClick={openSignIn}
            className='px-4 py-1.5 sm:px-6 sm:py-2 bg-primary hover:bg-primary-dull transition rounded-full text-sm font-medium'
          >
            Login
          </button>
        ) : (
          <UserButton>
            <UserButton.MenuItems>
              <UserButton.Action label='My Bookings' labelIcon={<TicketPlus width={15} />} onClick={() => navigate('/my-bookings')} />
            </UserButton.MenuItems>
          </UserButton>
        )}
        <MenuIcon className='lg:hidden w-7 h-7 cursor-pointer' onClick={() => setIsOpen(true)} />
      </div>

      {/* Mobile drawer */}
      <div
        className={`lg:hidden fixed inset-0 z-50 bg-[#0b0b0e]/95 backdrop-blur flex flex-col items-center justify-center gap-7 text-lg font-medium transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <XIcon className='absolute top-6 right-6 w-7 h-7 cursor-pointer' onClick={close} />
        <form onSubmit={submitSearch} className='relative w-4/5 max-w-sm'>
          <SearchIcon className='absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400' />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Search…'
            className='w-full h-11 pl-11 pr-4 rounded-full bg-white/10 border border-white/15 outline-none focus:border-primary/60 text-sm'
          />
        </form>
        {NAV_LINKS.map((l) => (
          <Link key={l.label} to={l.to} onClick={() => { scrollTo(0, 0); close() }}>
            {l.label}
          </Link>
        ))}
        {favouriteMovies.length > 0 && (
          <Link to='/favourite' onClick={() => { scrollTo(0, 0); close() }}>Favourites</Link>
        )}
      </div>
    </div>
  )
}

export default Navbar

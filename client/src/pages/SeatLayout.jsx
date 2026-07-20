import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useParams } from 'react-router'
import Loading from '../components/Loading'
import { ArrowRightIcon, ClockIcon, MapPinIcon, RadioIcon, Ticket } from 'lucide-react'
import isoTimeFormat from '../lib/isoTimeFormat'
import BlurCircle from '../components/BlurCircle'
import toast from 'react-hot-toast'
import { useAppContext } from '../context/AppContext'
import VenueSeatMap from '../components/VenueSeatMap'
import SeatPreview from '../components/SeatPreview'
import { getVenue, sectionPrice } from '../lib/venueModel'
import { getEventById, normalizeEvent, fallbackShowById, CURRENCY } from '../assets/events'

const SeatLayout = () => {
  const { id, date } = useParams()
  const location = useLocation()
  const { axios, getToken, user, image_base_url } = useAppContext()

  // Kind is derived from the route: /event/... vs /movies/...
  const isEvent = location.pathname.startsWith('/event')

  const [subject, setSubject] = useState(null) // normalized movie or event
  const [schedule, setSchedule] = useState({}) // { date: [{time, showId}] }
  const [selectedTime, setSelectedTime] = useState(null)
  const [selectedSection, setSelectedSection] = useState(null)
  const [selectedSeats, setSelectedSeats] = useState([])
  const [occupiedSeats, setOccupiedSeats] = useState([])
  const [liveTick, setLiveTick] = useState(0)
  const pollRef = useRef(null)

  const venue = subject ? getVenue(subject.venueType) : null
  const section = venue?.sections.find((s) => s.id === selectedSection) || null

  // ── Load subject (event = local; movie = backend show) ──
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (isEvent) {
        const ev = getEventById(id)
        if (ev) {
          setSubject(normalizeEvent(ev))
          setSchedule(ev.schedule)
          // showId came via router state from the date/time modal
          const showId = location.state?.showId
          const slot = ev.schedule[date]?.find((t) => t.showId === showId) || ev.schedule[date]?.[0]
          setSelectedTime(slot || null)
        }
      } else {
        let data = null
        let usedFallback = false
        try {
          const res = await axios.get(`/api/show/${id}`)
          if (res.data.success) data = res.data
        } catch (e) {
          console.error(e)
        }
        // Backend unavailable → bundled fallback so seat selection still works.
        if (!data) {
          data = fallbackShowById(id)
          usedFallback = true
        }
        if (data && !cancelled) {
          // Fallback movies already carry absolute TMDB image URLs.
          setSubject(normalizeEvent(data.movie, usedFallback ? '' : image_base_url))
          setSchedule(data.dateTime || {})
        }
      }
    }
    load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEvent, date])

  // ── Occupied seats: real for movies, simulated for events ──
  const getOccupiedSeats = async () => {
    if (!selectedTime) return
    if (isEvent) {
      // Deterministic pseudo-random "taken" seats per show so it feels alive.
      const seed = [...selectedTime.showId].reduce((a, c) => a + c.charCodeAt(0), 0)
      const taken = []
      venue?.sections.forEach((s, si) => {
        for (let r = 0; r < s.rows; r++) {
          for (let c = 0; c < s.cols; c++) {
            if ((seed + si * 7 + r * 13 + c * 5) % 9 === 0) {
              taken.push(`${s.id}-${String.fromCharCode(65 + r)}${c + 1}`)
            }
          }
        }
      })
      setOccupiedSeats(taken)
      setLiveTick((t) => t + 1)
      return
    }
    try {
      const { data } = await axios.get(`/api/booking/seats/${selectedTime.showId}`)
      if (data.success) {
        setOccupiedSeats(data.occupiedSeats)
        setLiveTick((t) => t + 1)
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    setSelectedSeats([])
    getOccupiedSeats()
    if (pollRef.current) clearInterval(pollRef.current)
    if (selectedTime && !isEvent) pollRef.current = setInterval(getOccupiedSeats, 5000)
    return () => pollRef.current && clearInterval(pollRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTime])

  const handleSeatClick = (seatId) => {
    if (!selectedTime) return toast('Please select a time first')
    if (occupiedSeats.includes(seatId)) return toast('This seat is not available')
    if (!selectedSeats.includes(seatId) && selectedSeats.length === 8) {
      return toast('Maximum 8 seats can be selected')
    }
    setSelectedSeats((prev) =>
      prev.includes(seatId) ? prev.filter((s) => s !== seatId) : [...prev, seatId]
    )
  }

  const priceEach = section ? sectionPrice(section, subject?.basePrice || 0) : subject?.basePrice || 0
  const total = priceEach * selectedSeats.length

  const bookTickets = async () => {
    if (!selectedTime) return toast.error('Please select a time slot.')
    if (!selectedSeats.length) return toast.error('Please select a seat.')

    if (isEvent) {
      toast.success(`Booked ${selectedSeats.length} seat(s) in ${section?.label} — ${CURRENCY}${total.toFixed(2)} (demo)`)
      setSelectedSeats([])
      getOccupiedSeats()
      return
    }
    try {
      if (!user) return toast.error('Please login to proceed')
      const { data } = await axios.post(
        '/api/booking/create',
        { showId: selectedTime.showId, selectedSeats },
        { headers: { Authorization: `Bearer ${await getToken()}` } }
      )
      if (data.success) window.location.href = data.url
      else toast.error(data.message)
    } catch (e) {
      console.error(e)
      toast.error('Booking failed. Please try again.')
    }
  }

  // Section list (for the left rail) with prices, sorted premium→value.
  const sectionList = useMemo(() => {
    if (!venue || !subject) return []
    return [...venue.sections]
      .map((s) => ({ ...s, price: sectionPrice(s, subject.basePrice) }))
      .sort((a, b) => b.price - a.price)
  }, [venue, subject])

  if (!subject) return <Loading />

  return (
    <div className='px-4 md:px-8 lg:px-16 pt-24 pb-16 min-h-screen'>
      <div className='relative flex flex-col lg:flex-row gap-6'>
        <BlurCircle top='-80px' left='-80px' />

        {/* ═══════════ LEFT: info, sections+prices, preview, summary ═══════════ */}
        <aside className='lg:w-80 shrink-0 space-y-4 lg:sticky lg:top-24 h-max'>
          {/* header */}
          <div className='rounded-2xl bg-white/5 border border-white/10 p-4'>
            <h2 className='font-semibold text-lg leading-tight'>{subject.title}</h2>
            <p className='text-xs text-gray-400 mt-1 flex items-center gap-1'>
              <MapPinIcon className='w-3.5 h-3.5' /> {subject.venue}
              {subject.city ? ` · ${subject.city}` : ''}
            </p>
            <p className='text-xs text-gray-500 mt-1'>{new Date(date).toDateString()}</p>
          </div>

          {/* showtimes */}
          <div className='rounded-2xl bg-primary/10 border border-primary/20 p-4'>
            <p className='text-sm font-semibold mb-3'>Showtimes</p>
            <div className='flex flex-wrap gap-2'>
              {(schedule[date] || []).map((item) => (
                <button
                  key={item.showId}
                  onClick={() => setSelectedTime(item)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition ${
                    selectedTime?.showId === item.showId ? 'bg-primary text-white' : 'bg-white/5 hover:bg-primary/20'
                  }`}
                >
                  <ClockIcon className='w-4 h-4' />
                  {isoTimeFormat(item.time)}
                </button>
              ))}
            </div>
          </div>

          {/* section price list */}
          <div className='rounded-2xl bg-white/5 border border-white/10 p-4'>
            <p className='text-sm font-semibold mb-3'>Sections & prices</p>
            <div className='space-y-1.5 max-h-56 overflow-y-auto no-scrollbar pr-1'>
              {sectionList.map((s) => {
                const active = s.id === selectedSection
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSection(active ? null : s.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition border ${
                      active ? 'border-white/40 bg-white/10' : 'border-transparent hover:bg-white/5'
                    }`}
                  >
                    <span className='flex items-center gap-2 truncate'>
                      <span className='w-3 h-3 rounded-sm shrink-0' style={{ background: s.color }} />
                      <span className='truncate'>{s.label}</span>
                    </span>
                    <span className='font-semibold shrink-0'>{CURRENCY}{s.price}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* view-from-seat preview */}
          <SeatPreview venueType={subject.venueType} section={section} basePrice={subject.basePrice} />

          {/* summary + checkout */}
          <div className='rounded-2xl bg-white/5 border border-white/10 p-4'>
            <p className='text-sm font-semibold mb-2'>Your selection</p>
            <div className='text-xs text-gray-400 space-y-1'>
              <div className='flex justify-between'><span>Section</span><span className='text-white'>{section?.label || '—'}</span></div>
              <div className='flex justify-between'><span>Seats</span><span className='text-white text-right max-w-[60%] truncate'>{selectedSeats.length ? selectedSeats.map((s) => s.split('-').slice(1).join('')).join(', ') : '—'}</span></div>
              <div className='flex justify-between'><span>Price/seat</span><span className='text-white'>{CURRENCY}{priceEach}</span></div>
              <div className='flex justify-between border-t border-white/10 pt-2 mt-2 text-sm'>
                <span className='text-gray-300'>Total</span>
                <span className='text-primary font-bold'>{CURRENCY}{total.toFixed(2)}</span>
              </div>
            </div>
            <button
              onClick={bookTickets}
              disabled={!selectedSeats.length}
              className='mt-4 w-full flex items-center justify-center gap-1.5 py-2.5 text-sm bg-primary hover:bg-primary-dull disabled:opacity-40 disabled:cursor-not-allowed transition rounded-full font-medium active:scale-95'
            >
              <Ticket className='w-4 h-4' /> Checkout <ArrowRightIcon className='w-4 h-4' strokeWidth={3} />
            </button>
          </div>
        </aside>

        {/* ═══════════ RIGHT: the venue figure with in-figure seat matrix ═══════════ */}
        <main className='flex-1 min-w-0'>
          <div className='flex items-center justify-between mb-3'>
            <div>
              <h1 className='text-2xl font-semibold'>Choose your seats</h1>
              <p className='text-sm text-gray-400 mt-0.5'>
                {selectedSection
                  ? `Tap seats in ${section?.label} to select`
                  : 'Tap a section on the map to zoom in and pick seats'}
              </p>
            </div>
            {selectedTime && (
              <span className='flex items-center gap-1.5 text-xs text-emerald-400'>
                <RadioIcon className={`w-4 h-4 ${liveTick % 2 ? 'opacity-100' : 'opacity-50'} transition-opacity`} />
                Live availability
              </span>
            )}
          </div>

          <div className='rounded-2xl overflow-hidden border border-white/10 h-[520px] md:h-[600px]'>
            <VenueSeatMap
              venueType={subject.venueType}
              basePrice={subject.basePrice}
              selectedSection={selectedSection}
              onSelectSection={setSelectedSection}
              selectedSeats={selectedSeats}
              occupiedSeats={occupiedSeats}
              onSeatClick={handleSeatClick}
              seatsLoaded={!!selectedTime}
            />
          </div>

          {/* legend */}
          <div className='flex flex-wrap items-center justify-center gap-5 mt-4 text-[11px] text-gray-400'>
            <span className='flex items-center gap-1.5'><span className='w-3 h-3 rounded' style={{ background: section?.color || '#8B5CF6', opacity: 0.9 }} />Available</span>
            <span className='flex items-center gap-1.5'><span className='w-3 h-3 rounded bg-white border-2' style={{ borderColor: section?.color || '#8B5CF6' }} />Selected</span>
            <span className='flex items-center gap-1.5'><span className='w-3 h-3 rounded bg-[#3f3f46]' />Taken</span>
          </div>

          {!selectedTime && (
            <p className='text-center text-sm text-amber-400 mt-4'>
              Select a showtime on the left to load live seat availability.
            </p>
          )}
        </main>
      </div>
    </div>
  )
}

export default SeatLayout

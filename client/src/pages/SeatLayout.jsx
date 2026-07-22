import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useParams } from 'react-router'
import Loading from '../components/Loading'
import {
  ArrowRightIcon,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  MapPinIcon,
  RadioIcon,
  Shrink,
  Expand,
  Ticket,
  X,
  Check,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAppContext } from '../context/AppContext'
import VenueSeatMap from '../components/VenueSeatMap'
import SeatView3D from '../components/SeatView3D'
import {
  getVenue,
  generateSeats,
  sectionPrice,
  seatVantage,
  buildListings,
  TIERS,
} from '../lib/venueModel'
import { getEventById, normalizeEvent, fallbackShowById, CURRENCY } from '../assets/events'
import isoTimeFormat from '../lib/isoTimeFormat'

// Booking screen, SeatGeek-style:
//  LEFT  — marketplace rail: event capsule, qty/sort/tier chips, sorted listings
//  RIGHT — one living canvas: the full venue with every seat visible, free
//          pan/zoom, price pills, and a 3D "view from your seat" inset whose
//          camera flies to whatever you select
//  BOTTOM — sticky checkout bar that slides up once seats are picked

const sectionOf = (seatId) => seatId.slice(0, seatId.lastIndexOf('-'))
const seatShort = (seatId) => seatId.slice(seatId.lastIndexOf('-') + 1)

const SCORE_STYLE = (score) =>
  score >= 9
    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    : score >= 7
    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    : 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30'

const SeatLayout = () => {
  const { id, date } = useParams()
  const location = useLocation()
  const { axios, getToken, user, image_base_url } = useAppContext()

  const isEvent = location.pathname.startsWith('/event')

  const [subject, setSubject] = useState(null)
  // True when the shows exist in the backend DB → seats + booking are real.
  // False only for bundled demo data (backend down or demo event).
  const [isBackendShow, setIsBackendShow] = useState(false)
  const [selectedTime, setSelectedTime] = useState(null)
  const [selectedSection, setSelectedSection] = useState(null)
  const [selectedSeats, setSelectedSeats] = useState([])
  const [occupiedSeats, setOccupiedSeats] = useState([])
  const [liveTick, setLiveTick] = useState(0)
  const [qty, setQty] = useState(2)
  const [sortDesc, setSortDesc] = useState(false)
  const [tierFilter, setTierFilter] = useState('all')
  const [hoverListing, setHoverListing] = useState(null)
  const [show3D, setShow3D] = useState(false)
  const [expand3D, setExpand3D] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const pollRef = useRef(null)

  const venue = subject ? getVenue(subject.venueType) : null
  const section = venue?.sections.find((s) => s.id === selectedSection) || null

  // ── Load subject (event = local; movie = backend show) ──
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (isEvent) {
        // Backend-published events first (real reservations); bundled demo
        // events only as a fallback.
        let loaded = false
        try {
          const res = await axios.get(`/api/event/${id}`)
          if (res.data.success && res.data.event && !cancelled) {
            setSubject(normalizeEvent({ ...res.data.event, basePrice: res.data.basePrice }))
            setIsBackendShow(true)
            const dateTime = res.data.dateTime || {}
            const showId = location.state?.showId
            const slot = dateTime[date]?.find((t) => t.showId === showId) || dateTime[date]?.[0]
            setSelectedTime(slot || null)
            loaded = true
          }
        } catch (e) {
          console.error(e)
        }
        if (loaded || cancelled) return
        const ev = getEventById(id)
        if (ev) {
          setSubject(normalizeEvent(ev))
          setIsBackendShow(false)
          const showId = location.state?.showId
          const slot = ev.schedule[date]?.find((t) => t.showId === showId) || ev.schedule[date]?.[0]
          setSelectedTime(slot || null)
        }
      } else {
        let data = null
        let usedFallback = false
        try {
          const res = await axios.get(`/api/show/${id}`)
          // Backend may answer success with no movie (id not in its DB) —
          // treat that the same as unavailable so the bundled fallback kicks in.
          if (res.data.success && res.data.movie) data = res.data
        } catch (e) {
          console.error(e)
        }
        if (!data) {
          data = fallbackShowById(id)
          usedFallback = true
        }
        if (data && !cancelled) {
          setSubject(normalizeEvent(data.movie, usedFallback ? '' : image_base_url))
          setIsBackendShow(!usedFallback)
          const dateTime = data.dateTime || {}
          const showId = location.state?.showId
          const slot = dateTime[date]?.find((t) => t.showId === showId) || dateTime[date]?.[0]
          setSelectedTime(slot || null)
        }
      }
    }
    load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEvent, date])

  // ── Occupied seats: real from the DB for backend shows, simulated only for
  //    bundled demo data ──
  const getOccupiedSeats = async () => {
    if (!selectedTime) return
    if (!isBackendShow) {
      // Deterministic pseudo-random "taken" seats per show so it feels alive.
      const seed = [...selectedTime.showId].reduce((a, c) => a + c.charCodeAt(0), 0)
      const taken = []
      venue?.sections.forEach((s, si) => {
        generateSeats(s).forEach((seat, i) => {
          if ((seed + si * 7 + i * 13) % 5 === 0) taken.push(seat.id)
        })
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
    if (selectedTime && isBackendShow) pollRef.current = setInterval(getOccupiedSeats, 5000)
    return () => pollRef.current && clearInterval(pollRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTime, isBackendShow])

  // Open the 3D inset whenever a section gets chosen.
  useEffect(() => {
    if (selectedSection) setShow3D(true)
    else setExpand3D(false)
  }, [selectedSection])

  const handleSeatClick = (seatId) => {
    if (!selectedTime) return toast('Please select a time first')
    if (occupiedSeats.includes(seatId)) return toast('This seat is not available')
    if (!selectedSeats.includes(seatId) && selectedSeats.length === 8) {
      return toast('Maximum 8 seats can be selected')
    }
    setSelectedSeats((prev) =>
      prev.includes(seatId) ? prev.filter((s) => s !== seatId) : [...prev, seatId]
    )
    const sec = sectionOf(seatId)
    if (sec !== selectedSection) setSelectedSection(sec)
  }

  // ── Marketplace listings from live availability ──
  const listings = useMemo(() => {
    if (!subject || !selectedTime) return []
    const all = buildListings({
      venueType: subject.venueType,
      basePrice: subject.basePrice,
      occupiedSeats,
      qty,
    })
    const filtered = tierFilter === 'all' ? all : all.filter((l) => l.section.tier === tierFilter)
    return sortDesc ? [...filtered].reverse() : filtered
  }, [subject, selectedTime, occupiedSeats, qty, tierFilter, sortDesc])

  const pickListing = (l) => {
    setSelectedSection(l.section.id)
    setSelectedSeats(l.seats)
    setShow3D(true)
  }

  // ── Pricing (per-seat by its own section, mixed sections allowed) ──
  const priceOf = (seatId) => {
    const sec = venue?.sections.find((s) => s.id === sectionOf(seatId))
    return sec ? sectionPrice(sec, subject?.basePrice || 0) : subject?.basePrice || 0
  }
  const total = selectedSeats.reduce((n, s) => n + priceOf(s), 0)

  // Grouped chips for the checkout bar: "L104 · A5, A6"
  const seatGroups = useMemo(() => {
    const g = new Map()
    for (const s of selectedSeats) {
      const sec = sectionOf(s)
      if (!g.has(sec)) g.set(sec, [])
      g.get(sec).push(seatShort(s))
    }
    return [...g.entries()]
  }, [selectedSeats])

  // ── 3D vantage: last-picked seat, else the section centroid ──
  const vantage = useMemo(() => {
    if (!venue || !section) return null
    const last = selectedSeats[selectedSeats.length - 1]
    if (last) {
      const sec = venue.sections.find((s) => s.id === sectionOf(last))
      const seat = sec && generateSeats(sec).find((s) => s.id === last)
      if (seat) return seatVantage(venue, seat)
    }
    return seatVantage(venue, section)
  }, [venue, section, selectedSeats])

  const viewLabel = useMemo(() => {
    const last = selectedSeats[selectedSeats.length - 1]
    if (last && section) {
      const short = seatShort(last)
      return `${venue.sections.find((s) => s.id === sectionOf(last))?.label} · Row ${short[0]}`
    }
    return section?.label || ''
  }, [selectedSeats, section, venue])

  // One real reservation path for movies AND events: seats are locked in the
  // DB, Stripe checkout opens, unpaid seats auto-release after 10 minutes.
  const bookTickets = async () => {
    if (!selectedTime) return toast.error('Please select a time slot.')
    if (!selectedSeats.length) return toast.error('Please select a seat.')
    if (!isBackendShow) {
      return toast.error('This is a demo listing — tickets can only be reserved for published shows.')
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

  if (!subject) return <Loading />

  const tiersInVenue = venue ? [...new Set(venue.sections.map((s) => s.tier))] : []

  return (
    <div className='px-4 md:px-8 lg:px-12 pt-24 pb-36 min-h-screen'>
      <div className='flex flex-col lg:flex-row gap-5'>
        {/* ═══════════ LEFT: marketplace rail ═══════════ */}
        <aside className='order-2 lg:order-1 lg:w-[370px] shrink-0 flex flex-col gap-3 lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)]'>
          {/* event capsule */}
          <div className='flex items-center gap-3 rounded-2xl bg-white/5 border border-white/10 p-3'>
            {subject.poster_path && (
              <img src={subject.poster_path} alt='' className='w-11 h-14 rounded-lg object-cover shrink-0' />
            )}
            <div className='min-w-0'>
              <h2 className='font-semibold text-[15px] leading-tight truncate'>{subject.title}</h2>
              <p className='text-[11px] text-gray-400 mt-0.5 flex items-center gap-1 truncate'>
                <MapPinIcon className='w-3 h-3 shrink-0' />
                <span className='truncate'>
                  {subject.venue}
                  {subject.city ? ` · ${subject.city}` : ''}
                </span>
              </p>
              <p className='text-[11px] text-gray-500'>
                {new Date(date).toDateString()}
                {selectedTime ? ` · ${isoTimeFormat(selectedTime.time)}` : ''}
              </p>
            </div>
          </div>

          {/* filter chips */}
          <div className='flex items-center gap-2 overflow-x-auto no-scrollbar'>
            <div className='flex items-center rounded-full border border-white/15 overflow-hidden shrink-0'>
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => setQty(n)}
                  className={`px-3 py-1.5 text-xs font-medium transition ${
                    qty === n ? 'bg-primary text-white' : 'text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {n}
                </button>
              ))}
              <span className='pl-1 pr-3 text-[10px] text-gray-500'>tickets</span>
            </div>
            <button
              onClick={() => setSortDesc((v) => !v)}
              className='flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/15 text-xs text-gray-300 hover:border-white/40 transition shrink-0'
            >
              <ArrowUpDown className='w-3 h-3' /> Price {sortDesc ? '↓' : '↑'}
            </button>
            <button
              onClick={() => setTierFilter('all')}
              className={`px-3 py-1.5 rounded-full border text-xs transition shrink-0 ${
                tierFilter === 'all' ? 'border-white/60 text-white' : 'border-white/15 text-gray-400 hover:border-white/40'
              }`}
            >
              All
            </button>
            {tiersInVenue.map((t) => (
              <button
                key={t}
                onClick={() => setTierFilter(tierFilter === t ? 'all' : t)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition shrink-0 ${
                  tierFilter === t ? 'border-white/60 text-white' : 'border-white/15 text-gray-400 hover:border-white/40'
                }`}
              >
                <span className='w-2 h-2 rounded-full' style={{ background: TIERS[t].color }} />
                {TIERS[t].name}
              </button>
            ))}
          </div>

          {/* listings */}
          <div className='flex-1 min-h-0 rounded-2xl bg-white/5 border border-white/10 flex flex-col overflow-hidden'>
            <div className='px-4 py-2.5 flex items-center justify-between border-b border-white/10'>
              <p className='text-sm font-semibold'>{listings.length} listings</p>
              {selectedTime && (isBackendShow ? (
                <span className='flex items-center gap-1.5 text-[11px] text-emerald-400'>
                  <RadioIcon className={`w-3.5 h-3.5 transition-opacity ${liveTick % 2 ? 'opacity-100' : 'opacity-50'}`} />
                  Live
                </span>
              ) : (
                <span className='text-[11px] text-amber-400/90'>Demo data</span>
              ))}
            </div>
            <div className='flex-1 overflow-y-auto no-scrollbar max-h-[420px] lg:max-h-none'>
              {listings.map((l) => {
                const active = selectedSection === l.section.id && l.seats.every((s) => selectedSeats.includes(s))
                return (
                  <button
                    key={l.key}
                    onClick={() => pickListing(l)}
                    onMouseEnter={() => setHoverListing(l)}
                    onMouseLeave={() => setHoverListing(null)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left border-b border-white/5 transition ${
                      active ? 'bg-white/10' : 'hover:bg-white/5'
                    }`}
                  >
                    {/* thumbnail: tier-tinted mini bowl */}
                    <div
                      className='w-14 h-11 rounded-lg shrink-0 relative overflow-hidden'
                      style={{ background: `linear-gradient(145deg, ${l.section.color}33, #101014 70%)` }}
                    >
                      <div
                        className='absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-3.5 rounded-t-full opacity-90'
                        style={{ background: l.section.color }}
                      />
                      <div className='absolute top-1.5 left-1/2 -translate-x-1/2 w-6 h-1 rounded bg-white/50' />
                    </div>

                    <div className='min-w-0 flex-1'>
                      <p className='text-[13px] font-medium truncate'>
                        {l.section.label} · Row {l.row}
                      </p>
                      <p className='text-[11px] text-gray-500'>
                        {l.maxQty > qty ? `1–${l.maxQty} tickets` : `${qty} ticket${qty > 1 ? 's' : ''}`}
                      </p>
                      <div className='flex items-center gap-1.5 mt-1'>
                        <span className={`text-[10px] px-1.5 py-px rounded border font-semibold ${SCORE_STYLE(l.score)}`}>
                          {l.score} {l.scoreLabel}
                        </span>
                        {l.badge && (
                          <span className='text-[10px] px-1.5 py-px rounded border border-sky-500/30 bg-sky-500/15 text-sky-400 font-medium truncate'>
                            {l.badge}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className='text-right shrink-0'>
                      <p className='text-[15px] font-bold tabular-nums'>
                        {CURRENCY}
                        {l.price}
                      </p>
                      <p className='text-[10px] text-gray-500'>incl. fees</p>
                    </div>
                  </button>
                )
              })}
              {!listings.length && (
                <p className='text-center text-xs text-gray-500 py-10 px-6'>
                  {selectedTime
                    ? `No listings with ${qty} seats together${tierFilter !== 'all' ? ' in this tier' : ''}. Try fewer tickets.`
                    : 'Pick another date — no showtime is available for this one.'}
                </p>
              )}
            </div>
          </div>
        </aside>

        {/* ═══════════ RIGHT: the living canvas ═══════════ */}
        <main className='order-1 lg:order-2 flex-1 min-w-0'>
          <div className='relative rounded-2xl overflow-hidden border border-white/10 h-[480px] md:h-[600px] lg:h-[calc(100vh-6rem)]'>
            <VenueSeatMap
              venueType={subject.venueType}
              basePrice={subject.basePrice}
              selectedSection={selectedSection}
              onSelectSection={setSelectedSection}
              selectedSeats={selectedSeats}
              occupiedSeats={occupiedSeats}
              hoverSeats={hoverListing?.seats || []}
              hoverSection={hoverListing?.section.id || null}
              onSeatClick={handleSeatClick}
              seatsLoaded={!!selectedTime}
              currency={CURRENCY}
            />

            {/* 3D view-from-seat inset — expands to fill the canvas */}
            {section && show3D && (
              <div
                className={`absolute z-10 rounded-xl overflow-hidden border border-white/20 shadow-2xl shadow-black/60 transition-all duration-300 ${
                  expand3D ? 'inset-3' : 'right-3 bottom-3 w-56 h-36 md:w-72 md:h-44'
                }`}
              >
                <SeatView3D venueType={subject.venueType} tint={section.color} vantage={vantage} />
                <div className='absolute top-0 inset-x-0 flex items-center justify-between px-2.5 py-1.5 bg-gradient-to-b from-black/70 to-transparent'>
                  <span className='text-[10px] md:text-[11px] font-medium text-white/90 truncate'>
                    View from {viewLabel}
                  </span>
                  <span className='flex items-center gap-1 shrink-0'>
                    <button
                      aria-label={expand3D ? 'Shrink view' : 'Expand view'}
                      onClick={() => setExpand3D((v) => !v)}
                      className='p-1 rounded hover:bg-white/15 transition'
                    >
                      {expand3D ? <Shrink className='w-3.5 h-3.5' /> : <Expand className='w-3.5 h-3.5' />}
                    </button>
                    <button
                      aria-label='Close view'
                      onClick={() => { setShow3D(false); setExpand3D(false) }}
                      className='p-1 rounded hover:bg-white/15 transition'
                    >
                      <X className='w-3.5 h-3.5' />
                    </button>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* legend */}
          <div className='flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 mt-3 text-[11px] text-gray-400'>
            {tiersInVenue.map((t) => (
              <span key={t} className='flex items-center gap-1.5'>
                <span className='w-2.5 h-2.5 rounded-full' style={{ background: TIERS[t].color }} />
                {TIERS[t].name}
              </span>
            ))}
            <span className='flex items-center gap-1.5'>
              <span className='w-2.5 h-2.5 rounded-full bg-white' />
              Selected
            </span>
            <span className='flex items-center gap-1.5'>
              <span className='w-2.5 h-2.5 rounded-full bg-[#3a3a42]' />
              Taken
            </span>
          </div>

          {!selectedTime && (
            <p className='text-center text-sm text-amber-400 mt-3'>
              No showtime is available for this date. Please pick another date.
            </p>
          )}
        </main>
      </div>

      {/* ═══════════ Sticky checkout bar ═══════════ */}
      <div
        className={`fixed bottom-0 inset-x-0 z-40 transition-transform duration-300 ${
          selectedSeats.length ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* expandable summary */}
        {showSummary && (
          <div className='mx-auto max-w-3xl px-4'>
            <div className='rounded-t-2xl border border-b-0 border-white/10 bg-[#101014]/95 backdrop-blur-xl px-5 py-4'>
              <div className='space-y-1.5 text-xs text-gray-400'>
                {seatGroups.map(([secId, seats]) => {
                  const sec = venue?.sections.find((s) => s.id === secId)
                  return (
                    <div key={secId} className='flex justify-between items-center'>
                      <span className='flex items-center gap-2'>
                        <span className='w-2 h-2 rounded-full' style={{ background: sec?.color }} />
                        {sec?.label} · {seats.join(', ')}
                      </span>
                      <span className='text-white tabular-nums'>
                        {seats.length} × {CURRENCY}
                        {sec ? sectionPrice(sec, subject.basePrice) : '—'}
                      </span>
                    </div>
                  )
                })}
                <div className='flex justify-between pt-2 border-t border-white/10 text-gray-500'>
                  <span>Fees</span>
                  <span>Included</span>
                </div>
              </div>
              {section?.perks?.length > 0 && (
                <div className='flex flex-wrap gap-x-4 gap-y-1 mt-3 pt-2 border-t border-white/10'>
                  {section.perks.map((p) => (
                    <span key={p} className='flex items-center gap-1 text-[10px] text-gray-400'>
                      <Check className='w-3 h-3' style={{ color: section.color }} />
                      {p}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* the bar */}
        <div className='border-t border-white/10 bg-[#0b0b0f]/95 backdrop-blur-xl'>
          <div className='mx-auto max-w-3xl px-4 py-3 flex items-center gap-3'>
            <button
              onClick={() => setShowSummary((v) => !v)}
              className='flex items-center gap-2 min-w-0 flex-1 text-left group'
            >
              <span className='p-1.5 rounded-lg bg-white/5 border border-white/10 group-hover:border-white/25 transition shrink-0'>
                {showSummary ? <ChevronDown className='w-4 h-4' /> : <ChevronUp className='w-4 h-4' />}
              </span>
              <span className='min-w-0'>
                <span className='block text-[11px] text-gray-400'>
                  {selectedSeats.length} seat{selectedSeats.length > 1 ? 's' : ''}
                </span>
                <span className='block text-xs text-white truncate'>
                  {seatGroups.map(([secId, seats]) => `${venue?.sections.find((s) => s.id === secId)?.label} ${seats.join(' ')}`).join(' · ')}
                </span>
              </span>
            </button>

            <div className='text-right shrink-0'>
              <p className='text-[10px] text-gray-500 leading-none'>Total · incl. fees</p>
              <p className='text-lg font-bold text-white tabular-nums'>
                {CURRENCY}
                {total.toFixed(2)}
              </p>
            </div>

            <button
              onClick={bookTickets}
              className='shrink-0 flex items-center gap-1.5 px-6 py-2.5 text-sm bg-gradient-to-r from-primary to-primary-dull hover:opacity-90 transition rounded-full font-semibold active:scale-95'
            >
              <Ticket className='w-4 h-4' /> Checkout <ArrowRightIcon className='w-4 h-4' strokeWidth={3} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SeatLayout

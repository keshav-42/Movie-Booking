import React, { useEffect, useState } from 'react'
import Loading from '../../components/Loading'
import Title from '../../components/admin/Title'
import { CheckIcon, DeleteIcon, MapPin, CalendarDays } from 'lucide-react'
import { useAppContext } from '../../context/AppContext'
import toast from 'react-hot-toast'

// Admin: browse upcoming live events from the upstream feed (Ticketmaster
// Discovery API when TICKETMASTER_API_KEY is set on the server, a bundled
// sample feed otherwise), pick one, choose the venue map + base price +
// showtimes, and publish it as bookable shows.

const CATEGORIES = [
  { id: '', label: 'All' },
  { id: 'concerts', label: 'Concerts' },
  { id: 'sports', label: 'Sports' },
  { id: 'theater', label: 'Theater' },
  { id: 'comedy', label: 'Comedy' },
]

const VENUE_TYPES = [
  { id: 'arena', label: 'Arena (360° bowl)' },
  { id: 'stadium', label: 'Stadium (large bowl)' },
  { id: 'theater', label: 'Theater (proscenium)' },
]

const AddEvents = () => {
  const { axios, getToken, user } = useAppContext()
  const currency = import.meta.env.VITE_CURRENCY || '$'

  const [events, setEvents] = useState(null)
  const [source, setSource] = useState('')
  const [category, setCategory] = useState('')
  const [selected, setSelected] = useState(null)
  const [venueType, setVenueType] = useState('arena')
  const [basePrice, setBasePrice] = useState('')
  const [dateTimeSelection, setDateTimeSelection] = useState({})
  const [dateTimeInput, setDateTimeInput] = useState('')
  const [adding, setAdding] = useState(false)

  const fetchUpstream = async (cat) => {
    setEvents(null)
    try {
      const { data } = await axios.get(`/api/event/upstream${cat ? `?category=${cat}` : ''}`, {
        headers: { Authorization: `Bearer ${await getToken()}` },
      })
      if (data.success) {
        setEvents(data.events)
        setSource(data.source)
      } else {
        toast.error(data.message)
        setEvents([])
      }
    } catch (e) {
      console.error(e)
      setEvents([])
    }
  }

  useEffect(() => {
    if (user) fetchUpstream(category)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, category])

  const pick = (ev) => {
    setSelected(selected?.id === ev.id ? null : ev)
    setVenueType(ev.venueType || 'arena')
    // Pre-fill the event's own date as a convenient first slot
    if (ev.date) {
      const d = new Date(ev.date)
      if (!isNaN(d) && d > new Date()) {
        const date = d.toISOString().split('T')[0]
        const time = d.toISOString().slice(11, 16)
        setDateTimeSelection({ [date]: [time] })
      }
    }
  }

  const handleDateTimeAdd = () => {
    if (!dateTimeInput) return
    const [date, time] = dateTimeInput.split('T')
    if (!date || !time) return
    setDateTimeSelection((prev) => {
      const times = prev[date] || []
      return times.includes(time) ? prev : { ...prev, [date]: [...times, time] }
    })
  }

  const handleRemoveTime = (date, time) => {
    setDateTimeSelection((prev) => {
      const filtered = prev[date].filter((t) => t !== time)
      if (!filtered.length) {
        const { [date]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [date]: filtered }
    })
  }

  const handleSubmit = async () => {
    if (!selected) return toast('Please select an event.')
    if (!basePrice || Number(basePrice) <= 0) return toast('Please enter a base price.')
    if (!Object.keys(dateTimeSelection).length) return toast('Add at least one date & time.')
    try {
      setAdding(true)
      const showsInput = Object.entries(dateTimeSelection).map(([date, time]) => ({ date, time }))
      const { data } = await axios.post(
        '/api/event/add',
        { event: selected, venueType, basePrice: Number(basePrice), showsInput },
        { headers: { Authorization: `Bearer ${await getToken()}` } }
      )
      if (data.success) {
        toast.success(data.message)
        setSelected(null)
        setDateTimeSelection({})
        setBasePrice('')
      } else {
        toast.error(data.message)
      }
    } catch (e) {
      console.error(e)
      toast.error('An error occurred. Please try again.')
    }
    setAdding(false)
  }

  if (events === null) return <Loading />

  return (
    <>
      <Title text1={'Add'} text2={'Events'} />

      {/* feed source + category tabs */}
      <div className='flex flex-wrap items-center gap-2 mt-8'>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => { setCategory(c.id); setSelected(null) }}
            className={`px-4 py-1.5 rounded-full text-sm border transition ${
              category === c.id ? 'bg-primary border-primary text-white' : 'border-gray-600 text-gray-300 hover:border-gray-400'
            }`}
          >
            {c.label}
          </button>
        ))}
        <span className='ml-auto text-xs text-gray-500'>
          Feed: {source === 'ticketmaster' ? 'Ticketmaster Discovery' : 'sample data (set TICKETMASTER_API_KEY for live feed)'}
        </span>
      </div>

      {/* upstream event cards */}
      <div className='grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 mt-6 max-w-6xl'>
        {events.map((ev) => (
          <div
            key={ev.id}
            onClick={() => pick(ev)}
            className={`relative cursor-pointer rounded-xl overflow-hidden border transition hover:-translate-y-1 ${
              selected?.id === ev.id ? 'border-primary' : 'border-white/10'
            }`}
          >
            <img src={ev.backdrop_path || ev.poster_path} alt='' className='h-32 w-full object-cover brightness-90' />
            <div className='p-2.5 bg-primary/5'>
              <p className='font-medium text-sm truncate'>{ev.title}</p>
              <p className='text-[11px] text-gray-400 truncate flex items-center gap-1 mt-0.5'>
                <MapPin className='w-3 h-3 shrink-0' /> {ev.venue}{ev.city ? ` · ${ev.city}` : ''}
              </p>
              <p className='text-[11px] text-gray-500 flex items-center gap-1 mt-0.5'>
                <CalendarDays className='w-3 h-3 shrink-0' />
                {ev.date ? new Date(ev.date).toDateString() : 'TBA'}
                {ev.priceFrom ? ` · from ${currency}${ev.priceFrom}` : ''}
              </p>
            </div>
            <span className='absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/60 backdrop-blur-sm capitalize'>
              {ev.category}
            </span>
            {selected?.id === ev.id && (
              <div className='absolute top-2 right-2 flex items-center justify-center bg-primary h-6 w-6 rounded'>
                <CheckIcon className='w-4 h-4 text-white' strokeWidth={2.5} />
              </div>
            )}
          </div>
        ))}
        {!events.length && <p className='text-gray-500 text-sm col-span-full py-10 text-center'>No events in the feed for this category.</p>}
      </div>

      {/* publish controls */}
      {selected && (
        <div className='mt-8 rounded-xl border border-white/10 bg-white/5 p-5 max-w-3xl'>
          <p className='font-medium'>{selected.title}</p>
          <p className='text-xs text-gray-400 mt-0.5'>{selected.venue}{selected.city ? ` · ${selected.city}` : ''}</p>

          <div className='flex flex-wrap gap-6 mt-5'>
            <div>
              <label className='block text-sm font-medium mb-2'>Seat map</label>
              <select
                value={venueType}
                onChange={(e) => setVenueType(e.target.value)}
                className='bg-transparent border border-gray-600 px-3 py-2 rounded-md outline-none text-sm [&>option]:bg-[#111]'
              >
                {VENUE_TYPES.map((v) => (
                  <option key={v.id} value={v.id}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor='basePriceId' className='block text-sm font-medium mb-2'>Base price</label>
              <div className='inline-flex items-center gap-2 border border-gray-600 px-3 py-2 rounded-md'>
                <p className='text-gray-400 text-sm'>{currency}</p>
                <input id='basePriceId' type='number' min={1} value={basePrice} onChange={(e) => setBasePrice(e.target.value)} placeholder='Base price' className='outline-none w-24 bg-transparent' />
              </div>
              <p className='text-[11px] text-gray-500 mt-1'>Section prices scale from this (premium ≈ 1.9×, value ≈ 0.65×)</p>
            </div>
            <div>
              <label htmlFor='evDateTime' className='block text-sm font-medium mb-2'>Date & time</label>
              <div className='inline-flex gap-3 border border-gray-600 p-1 pl-3 rounded-lg'>
                <input id='evDateTime' type='datetime-local' value={dateTimeInput} onChange={(e) => setDateTimeInput(e.target.value)} className='outline-none rounded-md bg-transparent text-sm' />
                <button onClick={handleDateTimeAdd} className='bg-primary/80 text-white px-3 py-2 text-sm rounded-lg hover:bg-primary'>
                  Add
                </button>
              </div>
            </div>
          </div>

          {Object.keys(dateTimeSelection).length > 0 && (
            <ul className='space-y-3 mt-5'>
              {Object.entries(dateTimeSelection).map(([date, times]) => (
                <li key={date}>
                  <div className='font-medium text-sm'>{date}</div>
                  <div className='flex flex-wrap gap-2 mt-1 text-sm'>
                    {times.map((time) => (
                      <div key={time} className='border border-primary px-2 py-1 flex items-center rounded'>
                        <span>{time}</span>
                        <DeleteIcon onClick={() => handleRemoveTime(date, time)} width={15} className='ml-2 text-red-500 hover:text-red-700 cursor-pointer' />
                      </div>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <button onClick={handleSubmit} disabled={adding} className='bg-primary text-white px-8 py-2 mt-6 rounded hover:bg-primary/90 transition-all cursor-pointer disabled:opacity-50'>
            {adding ? 'Publishing…' : 'Publish event shows'}
          </button>
        </div>
      )}
    </>
  )
}

export default AddEvents

import React, { useEffect, useMemo, useState } from 'react'
import Loading from '../components/Loading'
import BlurCircle from '../components/BlurCircle'
import timeFormat from '../lib/timeFormat'
import dateFormat from '../lib/dateFormat'
import { useAppContext } from '../context/AppContext'
import { Link } from 'react-router'

const BookingRow = ({ item, image_base_url, currency, past = false }) => {
  const subject = item.show.movie || item.show.event
  if (!subject) return null
  // Event posters are absolute URLs; movie posters are TMDB paths
  const poster = item.show.movie ? image_base_url + subject.poster_path : subject.poster_path
  const duration = item.show.movie ? timeFormat(subject.runtime) : subject.runtimeLabel || subject.venue

  return (
    <div className={`flex flex-col md:flex-row md:items-stretch gap-4 justify-between border rounded-lg mt-4 p-4 max-w-3xl ${
      past ? 'bg-white/[0.03] border-white/10 opacity-75' : 'bg-primary/8 border-primary/20'
    }`}>
      <div className='flex flex-col sm:flex-row gap-4 min-w-0'>
        <img src={poster} alt="show poster" className='w-full sm:w-45 sm:max-w-45 aspect-video object-cover object-bottom rounded shrink-0' />
        <div className='flex flex-col min-w-0'>
          <p className='text-lg font-semibold break-words'>{subject.title}</p>
          <p className='text-gray-400 text-sm'>{duration}</p>
          <p className='text-gray-400 text-sm mt-auto'>{dateFormat(item.show.showDateTime)}</p>
        </div>
      </div>

      <div className='flex flex-col md:items-end md:text-right justify-between shrink-0 md:w-52'>
        <div className='flex items-center gap-4'>
          <p className='text-2xl font-semibold mb-3'>{currency}{item.amount}</p>
          {!item.isPaid && !past &&
            <Link to={item.paymentLink} className='bg-primary px-4 py-1.5 mb-3 text-sm rounded-full font-medium cursor-pointer shrink-0'>Pay Now</Link>
          }
        </div>
        <div className='text-sm'>
          <p><span className='text-gray-400'>Total Tickets:</span> {item.bookedSeats.length}</p>
          <p className='break-words'><span className='text-gray-400'>Seat Number:</span> {item.bookedSeats.join(', ')}</p>
        </div>
      </div>
    </div>
  )
}

const Section = ({ title, subtitle, items, image_base_url, currency, past }) => {
  if (!items.length) return null
  return (
    <div className='mt-8 first:mt-0'>
      <h2 className='text-lg font-semibold'>{title}</h2>
      {subtitle && <p className='text-gray-400 text-sm mt-0.5'>{subtitle}</p>}
      {items.map((item) => (
        <BookingRow key={item._id} item={item} image_base_url={image_base_url} currency={currency} past={past} />
      ))}
    </div>
  )
}

const MyBookings = () => {
  const currency = import.meta.env.VITE_CURRENCY

  const {axios, getToken, user, image_base_url} = useAppContext()

  const [bookings, setBookings] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  const getMyBookings = async () => {
    setIsLoading(true)
    try {
      const {data} = await axios.get('/api/user/bookings', {
        headers: { Authorization: `Bearer ${await getToken()}` }
      })
      if(data.success){
        setBookings(data.bookings)
      }
    } catch (error) {
      console.error(error)
    }
    setIsLoading(false)
  }

  useEffect((() => {
    if(user){
      getMyBookings()
    }
  }), [user])

  // Grouped so a paid ticket for tonight's show doesn't get lost in the same
  // flat list as an abandoned checkout from weeks ago. A booking that's both
  // unpaid AND for a show that's already happened is a dead checkout link
  // (the Stripe session and the show are both long expired) -- it's not
  // shown at all rather than offering a Pay Now that can't work.
  const { upcoming, pending, past } = useMemo(() => {
    const now = new Date()
    const upcoming = [], pending = [], past = []
    for (const item of bookings) {
      if (!item.show) continue
      const isFuture = new Date(item.show.showDateTime) >= now
      if (item.isPaid) (isFuture ? upcoming : past).push(item)
      else if (isFuture) pending.push(item)
      // unpaid + past show: dead entry, intentionally omitted
    }
    return { upcoming, pending, past }
  }, [bookings])

  return !isLoading ? (
    <div className='relative px-6 md:px-16 lg:px-40 pt-30 md:pt-40 min-h-[80vh]'>
      <BlurCircle top='100px' left='100px' />
      <div>
        <BlurCircle bottom='0px' left='600px' />
      </div>
      <h1 className='text-lg font-semibold mb-4'>My Bookings</h1>

      {!upcoming.length && !pending.length && !past.length && (
        <p className='text-gray-400 text-sm'>You haven't booked any tickets yet.</p>
      )}

      <Section title='Upcoming' items={upcoming} image_base_url={image_base_url} currency={currency} />
      <Section title='Pending payment' subtitle="Checkout wasn't finished — complete payment to confirm your seats." items={pending} image_base_url={image_base_url} currency={currency} />
      <Section title='Past' items={past} image_base_url={image_base_url} currency={currency} past />

    </div>
  ) : (
    <Loading />
  )
}

export default MyBookings

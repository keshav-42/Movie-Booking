import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { CheckCircle2, MapPinIcon, Ticket, X } from 'lucide-react'
import BlurCircle from '../components/BlurCircle'
import Loading from '../components/Loading'
import dateFormat from '../lib/dateFormat'
import { useAppContext } from '../context/AppContext'

// Shown right after Stripe redirects back from a successful payment. The
// webhook that flips isPaid can lag a couple seconds behind the redirect, so
// this polls the booking briefly instead of assuming it's already paid.
const POLL_EVERY_MS = 2000
const MAX_POLLS = 8

const BookingSuccess = () => {
  const [searchParams] = useSearchParams()
  const bookingId = searchParams.get('bookingId')
  const navigate = useNavigate()
  const { axios, getToken, image_base_url } = useAppContext()

  const [booking, setBooking] = useState(null)
  const [confirming, setConfirming] = useState(true)
  const pollCount = useRef(0)
  const currency = import.meta.env.VITE_CURRENCY

  useEffect(() => {
    if (!bookingId) { setConfirming(false); return }
    let cancelled = false
    let timer

    const poll = async () => {
      try {
        const { data } = await axios.get(`/api/booking/${bookingId}`, {
          headers: { Authorization: `Bearer ${await getToken()}` },
        })
        if (cancelled) return
        if (data.success) {
          setBooking(data.booking)
          if (data.booking.isPaid) { setConfirming(false); return }
        }
      } catch (e) {
        console.error(e)
      }
      pollCount.current += 1
      if (!cancelled && pollCount.current < MAX_POLLS) {
        timer = setTimeout(poll, POLL_EVERY_MS)
      } else {
        setConfirming(false)
      }
    }
    poll()

    return () => { cancelled = true; clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId])

  const goToMyBookings = () => navigate('/my-bookings')

  if (confirming) {
    return (
      <div className='flex flex-col gap-4 justify-center items-center h-[80vh]'>
        <Loading />
        <p className='text-sm text-gray-400 -mt-16'>Confirming your payment…</p>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className='flex flex-col gap-4 justify-center items-center h-[80vh] text-center px-6'>
        <p className='text-gray-400'>We couldn't load your booking right away.</p>
        <button
          onClick={goToMyBookings}
          className='px-6 py-2.5 bg-primary hover:bg-primary-dull transition rounded-full text-sm font-medium'
        >
          Go to My Bookings
        </button>
      </div>
    )
  }

  const subject = booking.show.movie || booking.show.event
  const isEvent = !!booking.show.event
  const poster = isEvent ? subject.poster_path : image_base_url + subject.poster_path

  return (
    <div className='relative flex justify-center items-center min-h-[85vh] px-4 pt-24 pb-10'>
      <BlurCircle top='80px' left='0px' />
      <BlurCircle bottom='0px' right='0px' />

      <div className='relative w-full max-w-md bg-[#0f0f13] border border-primary/25 rounded-2xl shadow-2xl shadow-primary/10 overflow-hidden'>
        <button
          onClick={goToMyBookings}
          aria-label='Close'
          className='absolute top-3 right-3 z-10 p-1.5 rounded-full bg-black/40 hover:bg-black/60 transition'
        >
          <X className='w-4 h-4 text-white' />
        </button>

        <div className='flex flex-col items-center text-center pt-8 pb-5 px-6 bg-gradient-to-b from-primary/15 to-transparent'>
          <CheckCircle2 className='w-14 h-14 text-emerald-400' strokeWidth={1.5} />
          <h1 className='text-xl font-semibold mt-3'>
            {booking.isPaid ? 'Booking Confirmed!' : 'Payment received'}
          </h1>
          <p className='text-sm text-gray-400 mt-1'>
            {booking.isPaid
              ? "You're all set — here's your ticket."
              : "We're finalizing your ticket, it'll be ready in My Bookings shortly."}
          </p>
        </div>

        {/* ticket stub */}
        <div className='relative mx-6 rounded-xl overflow-hidden border border-white/10 bg-white/5'>
          <div className='flex gap-4 p-4'>
            <img src={poster} alt={subject.title} className='w-20 h-28 object-cover rounded-lg shrink-0' />
            <div className='min-w-0 flex flex-col'>
              <p className='font-semibold leading-tight truncate'>{subject.title}</p>
              {isEvent && subject.venue && (
                <p className='text-xs text-gray-400 mt-1 flex items-center gap-1 truncate'>
                  <MapPinIcon className='w-3 h-3 shrink-0' />
                  <span className='truncate'>{subject.venue}{subject.city ? ` · ${subject.city}` : ''}</span>
                </p>
              )}
              <p className='text-xs text-gray-400 mt-1'>{dateFormat(booking.show.showDateTime)}</p>
              <p className='text-xs text-gray-500 mt-auto pt-2'>
                {booking.bookedSeats.length} seat{booking.bookedSeats.length > 1 ? 's' : ''} · {booking.bookedSeats.join(', ')}
              </p>
            </div>
          </div>

          {/* perforated divider */}
          <div className='relative h-0 border-t border-dashed border-white/20'>
            <span className='absolute -left-2 -top-2.5 w-5 h-5 rounded-full bg-[#0b0b0e]' />
            <span className='absolute -right-2 -top-2.5 w-5 h-5 rounded-full bg-[#0b0b0e]' />
          </div>

          <div className='flex items-center justify-between px-4 py-3'>
            <span className='flex items-center gap-1.5 text-xs text-gray-400'>
              <Ticket className='w-3.5 h-3.5' /> Total paid
            </span>
            <span className='text-lg font-bold tabular-nums'>{currency}{booking.amount}</span>
          </div>
        </div>

        <div className='p-6 pt-5'>
          <button
            onClick={goToMyBookings}
            className='w-full py-2.5 bg-primary hover:bg-primary-dull transition rounded-full text-sm font-semibold'
          >
            View My Bookings
          </button>
        </div>
      </div>
    </div>
  )
}

export default BookingSuccess

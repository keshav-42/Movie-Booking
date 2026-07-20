import React, { useEffect, useMemo, useState } from 'react'
import { XIcon, CalendarDays, Clock, ArrowRight, MapPin } from 'lucide-react'
import isoTimeFormat from '../lib/isoTimeFormat'

// A single step that asks for date AND time together (per the flow: pick both,
// then jump straight to seat selection). `schedule` is a
// { 'YYYY-MM-DD': [{ time, showId }] } map. Calls onConfirm({ date, slot }).

const DateTimeModal = ({ open, onClose, title, venue, schedule = {}, onConfirm }) => {
  const dates = useMemo(() => Object.keys(schedule).sort(), [schedule])
  const [date, setDate] = useState(dates[0] || null)
  const [slot, setSlot] = useState(null)

  useEffect(() => {
    if (open) {
      setDate(dates[0] || null)
      setSlot(null)
    }
  }, [open, dates])

  useEffect(() => {
    setSlot(null)
  }, [date])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const times = date ? schedule[date] || [] : []

  const fmtDay = (d) => {
    const dt = new Date(d)
    return {
      dow: dt.toLocaleDateString('en-US', { weekday: 'short' }),
      day: dt.getDate(),
      mon: dt.toLocaleDateString('en-US', { month: 'short' }),
    }
  }

  return (
    <div
      className='fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-4 py-6'
      onClick={onClose}
    >
      <div
        className='w-full max-w-lg rounded-2xl bg-[#141418] border border-white/10 shadow-2xl overflow-hidden animate-[slideUp_.25s_ease]'
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className='flex items-start justify-between p-5 border-b border-white/10'>
          <div>
            <p className='text-xs text-primary font-medium uppercase tracking-wide'>Select date & time</p>
            <h3 className='text-lg font-semibold mt-0.5 leading-tight'>{title}</h3>
            {venue && (
              <p className='text-xs text-gray-400 mt-1 flex items-center gap-1'>
                <MapPin className='w-3.5 h-3.5' /> {venue}
              </p>
            )}
          </div>
          <button onClick={onClose} className='p-1.5 rounded-lg hover:bg-white/10 transition'>
            <XIcon className='w-5 h-5' />
          </button>
        </div>

        {/* date row */}
        <div className='p-5'>
          <p className='text-sm font-medium mb-3 flex items-center gap-2'>
            <CalendarDays className='w-4 h-4 text-primary' /> Choose a date
          </p>
          <div className='flex gap-2.5 overflow-x-auto no-scrollbar pb-1'>
            {dates.map((d) => {
              const { dow, day, mon } = fmtDay(d)
              const active = d === date
              return (
                <button
                  key={d}
                  onClick={() => setDate(d)}
                  className={`shrink-0 w-16 py-3 rounded-xl border flex flex-col items-center gap-0.5 transition ${
                    active
                      ? 'bg-primary border-primary text-white'
                      : 'border-white/15 hover:border-white/40 text-gray-300'
                  }`}
                >
                  <span className='text-[11px] uppercase'>{dow}</span>
                  <span className='text-lg font-bold leading-none'>{day}</span>
                  <span className='text-[11px] uppercase'>{mon}</span>
                </button>
              )
            })}
          </div>

          {/* time row */}
          <p className='text-sm font-medium mt-6 mb-3 flex items-center gap-2'>
            <Clock className='w-4 h-4 text-primary' /> Choose a showtime
          </p>
          <div className='flex flex-wrap gap-2.5'>
            {times.map((t) => {
              const active = slot?.showId === t.showId
              return (
                <button
                  key={t.showId}
                  onClick={() => setSlot(t)}
                  className={`px-4 py-2.5 rounded-xl text-sm border transition ${
                    active
                      ? 'bg-primary border-primary text-white'
                      : 'border-white/15 hover:border-white/40 text-gray-200'
                  }`}
                >
                  {isoTimeFormat(t.time)}
                </button>
              )
            })}
            {times.length === 0 && (
              <p className='text-sm text-gray-500 py-2'>No showtimes for this date.</p>
            )}
          </div>
        </div>

        {/* footer */}
        <div className='p-5 border-t border-white/10 flex items-center justify-between gap-4'>
          <p className='text-xs text-gray-400'>
            {date && slot ? (
              <>
                {fmtDay(date).dow}, {fmtDay(date).mon} {fmtDay(date).day} · {isoTimeFormat(slot.time)}
              </>
            ) : (
              'Select a date and a time to continue'
            )}
          </p>
          <button
            disabled={!date || !slot}
            onClick={() => onConfirm({ date, slot })}
            className='flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-medium bg-primary hover:bg-primary-dull disabled:opacity-40 disabled:cursor-not-allowed transition active:scale-95'
          >
            Choose seats <ArrowRight className='w-4 h-4' strokeWidth={2.5} />
          </button>
        </div>
      </div>
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  )
}

export default DateTimeModal

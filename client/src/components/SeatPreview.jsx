import React from 'react'
import { getVenue, sectionPrice } from '../lib/venueModel'

// A generated "view from your seat" preview (not a photo): a perspective SVG of
// tiered rows receding toward the focus, with the vantage point derived from the
// section's position — sections nearer the focus render closer/lower, farther
// sections render higher and more distant. Gives a plausible sense of the view.

const focusColorFor = (venueType) =>
  venueType === 'stadium' ? '#2f7d4a' : venueType === 'arena' ? '#3b82f6' : '#e5e7eb'

const SeatPreview = ({ venueType, section, basePrice }) => {
  const venue = getVenue(venueType)

  if (!section) {
    return (
      <div className='w-full rounded-2xl border border-white/10 bg-[#101014] flex flex-col items-center justify-center text-center px-6 py-12 min-h-[200px]'>
        <div className='text-3xl mb-3'>🎟️</div>
        <p className='text-sm text-gray-400 max-w-xs'>
          Pick a section to preview the <span className='text-white font-medium'>view from your seat</span>.
        </p>
      </div>
    )
  }

  // Vantage: how far the section sits from the focus (0 near … 1 far) drives
  // depth + camera height. Compare block center to focus center.
  const fx = venue.focus.x + venue.focus.w / 2
  const fy = venue.focus.y + venue.focus.h / 2
  const dist = Math.hypot(section.cx - fx, section.cy - fy)
  const maxDist = 520
  const far = Math.min(1, dist / maxDist)

  const W = 480
  const H = 260
  const horizon = 60 + far * 70
  const focusW = 300 - far * 190
  const focusX = (W - focusW) / 2
  const rowsN = 4 + Math.round(far * 7)
  const tint = section.color
  const fColor = focusColorFor(venueType)

  const rows = []
  for (let i = 0; i < rowsN; i++) {
    const t = i / (rowsN - 1)
    const y = H - 18 - t * (H - horizon - 34)
    const inset = 24 + t * (W * 0.26)
    const seatCount = Math.max(5, Math.round(11 - t * 5))
    rows.push({ y, x1: inset, x2: W - inset, seatCount, t })
  }

  const price = sectionPrice(section, basePrice)

  return (
    <div className='w-full rounded-2xl border border-white/10 overflow-hidden bg-gradient-to-b from-[#0c0c12] to-[#141419]'>
      <div className='px-4 pt-3 pb-1 flex items-center justify-between'>
        <p className='text-xs uppercase tracking-wider text-gray-400'>View from your seat</p>
        <span className='text-[10px] text-gray-500'>preview</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className='w-full h-auto block'>
        <defs>
          <linearGradient id='pvSky' x1='0' y1='0' x2='0' y2='1'>
            <stop offset='0' stopColor='#182234' />
            <stop offset='1' stopColor='#0c0f16' />
          </linearGradient>
        </defs>

        <rect x='0' y='0' width={W} height={horizon + 34} fill='url(#pvSky)' />

        {/* focus (stage/screen/field) sized by distance */}
        <g>
          {venueType === 'stadium' || venueType === 'arena' ? (
            <ellipse cx={W / 2} cy={horizon} rx={focusW / 2} ry={14 + far * 6} fill={fColor} opacity='0.9' />
          ) : (
            <rect x={focusX} y={horizon - 14} width={focusW} height='20' rx='3' fill={fColor} opacity='0.92' />
          )}
          <text x={W / 2} y={horizon + 3} textAnchor='middle' fontSize='9' fill='#0b0b0e' fontWeight='700'>
            {venue.focus.label}
          </text>
        </g>

        {/* venue lights */}
        {[0.18, 0.5, 0.82].map((fxp, i) => (
          <circle key={i} cx={W * fxp} cy={horizon - 40} r='2.6' fill='#fde68a' opacity='0.8' />
        ))}

        {/* receding rows toward focus */}
        {rows.map((r, ri) => {
          const seatW = (r.x2 - r.x1) / r.seatCount
          const shade = 0.4 + r.t * 0.45
          return (
            <g key={ri}>
              {Array.from({ length: r.seatCount }).map((_, si) => (
                <rect
                  key={si}
                  x={r.x1 + si * seatW + 2}
                  y={r.y}
                  width={seatW - 4}
                  height={6 + (1 - r.t) * 5}
                  rx='2'
                  fill={tint}
                  fillOpacity={shade}
                />
              ))}
            </g>
          )
        })}

        {/* "YOU" marker on the front row */}
        <g>
          <circle cx={W / 2} cy={H - 10} r='7' fill={tint} stroke='#fff' strokeWidth='2' />
          <text x={W / 2} y={H - 7} textAnchor='middle' fontSize='8' fill='#fff' fontWeight='700'>YOU</text>
        </g>
      </svg>

      <div className='px-4 py-3 flex items-center justify-between border-t border-white/10'>
        <div>
          <p className='text-sm font-semibold'>{section.label}</p>
          <p className='text-xs text-gray-400'>
            {far < 0.33 ? 'Close to the action' : far < 0.66 ? 'Great mid-level view' : 'Elevated panoramic view'}
          </p>
        </div>
        <div className='text-right'>
          <p className='text-lg font-bold' style={{ color: section.color }}>${price}</p>
          <p className='text-[10px] text-gray-500'>per seat</p>
        </div>
      </div>
    </div>
  )
}

export default SeatPreview

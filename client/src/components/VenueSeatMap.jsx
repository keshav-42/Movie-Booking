import React, { useEffect, useRef, useState } from 'react'
import { getVenue, generateSeats, sectionPrice, sectionViewBox, FULL_VIEWBOX } from '../lib/venueModel'
import { ZoomOut } from 'lucide-react'

// The whole venue drawn as ONE figure inside a single SVG:
//  - the focus (screen / stage / court / field)
//  - every section as a colored block with a live price pill
//  - the actual individual seats drawn INSIDE each block (not a separate grid)
// Selecting a section smoothly animates the viewBox toward that block (rAF
// interpolation with easing → no abrupt jump). When zoomed in, seats grow and
// become individually clickable.

const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

const parseVB = (s) => s.split(' ').map(Number)

const VenueSeatMap = ({
  venueType,
  basePrice,
  selectedSection,
  onSelectSection,
  selectedSeats = [],
  occupiedSeats = [],
  onSeatClick,
  seatsLoaded = true,
}) => {
  const venue = getVenue(venueType)
  const [hover, setHover] = useState(null)
  const svgRef = useRef(null)

  const selected = venue.sections.find((s) => s.id === selectedSection)
  const targetVB = selected ? sectionViewBox(selected) : FULL_VIEWBOX

  // Animate viewBox smoothly from current → target on every change.
  const currentVB = useRef(FULL_VIEWBOX)
  const rafRef = useRef(null)
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const from = parseVB(currentVB.current)
    const to = parseVB(targetVB)
    const start = performance.now()
    const dur = 550
    const step = (now) => {
      const t = Math.min(1, (now - start) / dur)
      const e = easeInOut(t)
      const vb = from.map((f, i) => f + (to[i] - f) * e)
      const vbStr = vb.join(' ')
      svg.setAttribute('viewBox', vbStr)
      currentVB.current = vbStr
      if (t < 1) rafRef.current = requestAnimationFrame(step)
    }
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
  }, [targetVB])

  const focus = venue.focus

  return (
    <div className={`relative w-full h-full rounded-2xl bg-gradient-to-b ${venue.ambient} border border-white/10 overflow-hidden`}>
      <svg
        ref={svgRef}
        viewBox={FULL_VIEWBOX}
        className='w-full h-full block select-none'
        style={{ minHeight: 420 }}
      >
        <defs>
          <radialGradient id='focusGlow' cx='50%' cy='50%' r='60%'>
            <stop offset='0%' stopColor='#ffffff' stopOpacity='0.18' />
            <stop offset='100%' stopColor='#ffffff' stopOpacity='0' />
          </radialGradient>
        </defs>

        {/* Focus: screen / stage / court / field */}
        <FocusShape focus={focus} />

        {/* Sections */}
        {venue.sections.map((s) => {
          const isSel = s.id === selectedSection
          const isDim = selectedSection && !isSel
          const isHover = s.id === hover
          const price = sectionPrice(s, basePrice)
          const seats = isSel ? generateSeats(s) : null

          return (
            <g
              key={s.id}
              style={{
                cursor: 'pointer',
                opacity: isDim ? 0.28 : 1,
                transition: 'opacity 0.45s ease',
              }}
            >
              {/* Section block */}
              <rect
                x={s.x}
                y={s.y}
                width={s.w}
                height={s.h}
                rx='8'
                fill={s.color}
                fillOpacity={isSel ? 0.14 : isHover ? 0.55 : 0.4}
                stroke={isSel ? '#fff' : s.color}
                strokeWidth={isSel ? 2 : 1}
                onClick={() => onSelectSection(isSel ? null : s.id)}
                onMouseEnter={() => setHover(s.id)}
                onMouseLeave={() => setHover(null)}
                style={{ transition: 'fill-opacity 0.25s' }}
              />

              {/* Label + price pill (hidden once zoomed into this section) */}
              {!isSel && (
                <g transform={`translate(${s.cx}, ${s.cy})`} pointerEvents='none'>
                  <rect x='-30' y='-16' width='60' height='32' rx='7' fill='#0b0b0e' fillOpacity='0.82' />
                  <text textAnchor='middle' y='-2' fontSize='11' fill='#fff' fontWeight='700'>
                    ${price}
                  </text>
                  <text textAnchor='middle' y='11' fontSize='8' fill='#cbd5e1'>
                    {s.label}
                  </text>
                </g>
              )}

              {/* Individual seats — drawn inside the block when this section is selected */}
              {isSel &&
                seats.map((seat) => {
                  const taken = occupiedSeats.includes(seat.id)
                  const picked = selectedSeats.includes(seat.id)
                  const fill = picked
                    ? '#fff'
                    : taken
                    ? '#3f3f46'
                    : s.color
                  return (
                    <rect
                      key={seat.id}
                      x={seat.x - seat.w / 2}
                      y={seat.y - seat.h / 2}
                      width={seat.w}
                      height={seat.h}
                      rx='3'
                      fill={fill}
                      fillOpacity={taken ? 0.5 : picked ? 1 : 0.9}
                      stroke={picked ? s.color : 'rgba(255,255,255,0.25)'}
                      strokeWidth={picked ? 2 : 0.6}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!taken && seatsLoaded) onSeatClick?.(seat.id)
                      }}
                      style={{
                        cursor: taken || !seatsLoaded ? 'not-allowed' : 'pointer',
                        transition: 'fill 0.15s, fill-opacity 0.15s',
                      }}
                    >
                      <title>{taken ? `${seat.id} · taken` : `${seat.id} · $${price}`}</title>
                    </rect>
                  )
                })}
            </g>
          )
        })}

        {/* Row labels when zoomed in */}
        {selected &&
          Array.from({ length: selected.rows }).map((_, r) => {
            const seats = generateSeats(selected)
            const first = seats.find((sd) => sd.row === String.fromCharCode(65 + r))
            if (!first) return null
            return (
              <text
                key={r}
                x={selected.x - 6}
                y={first.y + 3}
                textAnchor='end'
                fontSize='9'
                fill='#94a3b8'
                pointerEvents='none'
              >
                {String.fromCharCode(65 + r)}
              </text>
            )
          })}
      </svg>

      {/* Zoom-out control */}
      {selected && (
        <button
          onClick={() => onSelectSection(null)}
          className='absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-black/70 border border-white/20 hover:bg-black/90 transition'
        >
          <ZoomOut className='w-3.5 h-3.5' /> Full venue
        </button>
      )}

      {/* Selected-section heading */}
      {selected && (
        <div className='absolute top-3 left-3 px-3 py-1.5 rounded-lg bg-black/70 border border-white/15'>
          <span className='text-xs font-semibold' style={{ color: selected.color }}>
            {selected.label}
          </span>
          <span className='text-[11px] text-gray-400 ml-2'>${sectionPrice(selected, basePrice)}/seat</span>
        </div>
      )}
    </div>
  )
}

// The focus element differs per venue: a flat screen bar, a stage, or a
// center court/field ellipse.
const FocusShape = ({ focus }) => {
  if (focus.type === 'court' || focus.type === 'field') {
    return (
      <g pointerEvents='none'>
        <ellipse
          cx={focus.x + focus.w / 2}
          cy={focus.y + focus.h / 2}
          rx={focus.w / 2}
          ry={focus.h / 2}
          fill={focus.type === 'field' ? '#1f5130' : '#1c2430'}
          stroke={focus.type === 'field' ? '#2f7d4a' : '#3b4658'}
          strokeWidth='2'
        />
        <text
          x={focus.x + focus.w / 2}
          y={focus.y + focus.h / 2 + 5}
          textAnchor='middle'
          fontSize='16'
          fontWeight='700'
          fill={focus.type === 'field' ? '#7dd3a0' : '#93c5fd'}
        >
          {focus.label}
        </text>
      </g>
    )
  }
  // screen / stage: a curved bar near the top
  return (
    <g pointerEvents='none'>
      <ellipse cx={focus.x + focus.w / 2} cy={focus.y + focus.h + 90} rx={focus.w * 0.75} ry='120' fill='url(#focusGlow)' />
      <path
        d={`M ${focus.x} ${focus.y + focus.h}
            Q ${focus.x + focus.w / 2} ${focus.y - focus.h * 0.5} ${focus.x + focus.w} ${focus.y + focus.h}
            L ${focus.x + focus.w} ${focus.y + focus.h + 8}
            Q ${focus.x + focus.w / 2} ${focus.y - focus.h * 0.5 + 8} ${focus.x} ${focus.y + focus.h + 8} Z`}
        fill={focus.type === 'stage' ? '#2a1a2e' : '#e5e7eb'}
        stroke={focus.type === 'stage' ? '#7c3aed' : '#94a3b8'}
        strokeWidth='2'
      />
      <text
        x={focus.x + focus.w / 2}
        y={focus.y - 4}
        textAnchor='middle'
        fontSize='13'
        letterSpacing='4'
        fontWeight='700'
        fill={focus.type === 'stage' ? '#c4b5fd' : '#64748b'}
      >
        {focus.label}
      </text>
    </g>
  )
}

export default VenueSeatMap

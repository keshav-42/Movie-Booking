import React, { memo, useEffect, useMemo, useRef, useState } from 'react'
import { Minus, Plus, Maximize2 } from 'lucide-react'
import {
  getVenue,
  generateSeats,
  sectionPrice,
  sectionSeatsLeft,
  sectionViewBox,
  FULL_VIEWBOX,
} from '../lib/venueModel'

// The venue drawn as ONE living figure inside a single SVG:
//  - the focus (screen / stage / court / field)
//  - every section as a curved wedge with a SeatGeek-style price pill
//  - every individual seat, visible from the very first view (tinted dots far
//    out, clickable chairs once zoomed past the venue's interactScale)
// The camera is free: wheel/pinch zoom to the cursor, drag to pan, and
// programmatic "flights" (eased viewBox animation) when a section or listing
// is chosen. Pills counter-scale so they stay a constant screen size.

const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)
const parseVB = (s) => {
  const [x, y, w, h] = s.split(' ').map(Number)
  return { x, y, w, h }
}
const vbToStr = (v) => `${v.x} ${v.y} ${v.w} ${v.h}`

const FULL = parseVB(FULL_VIEWBOX)
const MIN_W = FULL.w / 9 // max zoom-in
const MAX_W = FULL.w * 1.15 // slight overview
const TAKEN = '#3a3a42'

// ── memoized seat dots: heavy layer, skipped during pan/zoom re-renders ──
const SeatsLayer = memo(function SeatsLayer({
  sections, occupiedSeats, selectedSeats, hoverSeats, interactive, seatsLoaded, onSeatClick, basePrice, currency,
}) {
  const occupied = useMemo(() => new Set(occupiedSeats), [occupiedSeats])
  const picked = useMemo(() => new Set(selectedSeats), [selectedSeats])
  const hover = useMemo(() => new Set(hoverSeats || []), [hoverSeats])

  return sections.map((s) => {
    const price = sectionPrice(s, basePrice)
    return (
      <g key={s.id}>
        {generateSeats(s).map((seat) => {
          const taken = occupied.has(seat.id)
          const isPicked = picked.has(seat.id)
          const isHover = hover.has(seat.id)
          return (
            <circle
              key={seat.id}
              cx={seat.x}
              cy={seat.y}
              r={isHover ? seat.r * 1.35 : seat.r}
              fill={isPicked ? '#ffffff' : taken ? TAKEN : s.color}
              fillOpacity={taken ? 0.5 : isPicked ? 1 : 0.9}
              stroke={isPicked ? s.color : isHover ? '#ffffff' : 'none'}
              strokeWidth={isPicked ? 2.2 : isHover ? 1.6 : 0}
              style={{
                pointerEvents: interactive ? 'auto' : 'none',
                cursor: taken || !seatsLoaded ? 'not-allowed' : 'pointer',
                transition: 'fill 0.15s, fill-opacity 0.15s',
              }}
              onClick={
                interactive
                  ? (e) => {
                      e.stopPropagation()
                      if (!taken && seatsLoaded) onSeatClick?.(seat.id)
                    }
                  : undefined
              }
            >
              <title>
                {`${s.label} · Row ${seat.row} Seat ${seat.col}${taken ? ' · taken' : ` · ${currency}${price}`}`}
              </title>
            </circle>
          )
        })}
      </g>
    )
  })
})

const VenueSeatMap = ({
  venueType,
  basePrice,
  selectedSection,
  onSelectSection,
  selectedSeats = [],
  occupiedSeats = [],
  hoverSeats = [],
  hoverSection = null,
  onSeatClick,
  seatsLoaded = true,
  currency = '$',
  onScaleChange,
}) => {
  const venue = getVenue(venueType)
  const svgRef = useRef(null)
  const [vb, setVb] = useState(FULL)
  const vbRef = useRef(FULL)
  const rafRef = useRef(null)
  const pointers = useRef(new Map())
  const drag = useRef(null)
  const scaleBucket = useRef(1)

  const scale = FULL.w / vb.w
  const interactive = scale >= venue.interactScale

  const applyVb = (next) => {
    const w = Math.min(MAX_W, Math.max(MIN_W, next.w))
    const k = w / next.w
    const v = {
      w,
      h: next.h * k,
      x: Math.min(FULL.x + FULL.w - 60, Math.max(FULL.x - w + 60, next.x)),
      y: Math.min(FULL.y + FULL.h - 60, Math.max(FULL.y - next.h * k + 60, next.y)),
    }
    vbRef.current = v
    setVb(v)
    const bucket = Math.round((FULL.w / v.w) * 10) / 10
    if (bucket !== scaleBucket.current) {
      scaleBucket.current = bucket
      onScaleChange?.(bucket)
    }
  }

  // ── programmatic flight (eased) ──
  const flyTo = (targetStr) => {
    cancelAnimationFrame(rafRef.current)
    const from = vbRef.current
    const to = parseVB(targetStr)
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return applyVb(to)
    const start = performance.now()
    const dur = 600
    const step = (now) => {
      const t = Math.min(1, (now - start) / dur)
      const e = easeInOut(t)
      applyVb({
        x: from.x + (to.x - from.x) * e,
        y: from.y + (to.y - from.y) * e,
        w: from.w + (to.w - from.w) * e,
        h: from.h + (to.h - from.h) * e,
      })
      if (t < 1) rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
  }

  // Fly when the chosen section changes (from map tap or a listing card).
  useEffect(() => {
    const section = venue.sections.find((s) => s.id === selectedSection)
    flyTo(section ? sectionViewBox(section, Math.max(30, section.bounds.w * 0.15)) : FULL_VIEWBOX)
    return () => cancelAnimationFrame(rafRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSection, venueType])

  // ── client px → svg coords ──
  const svgPoint = (cx, cy) => {
    const svg = svgRef.current
    const p = svg.createSVGPoint()
    p.x = cx
    p.y = cy
    return p.matrixTransform(svg.getScreenCTM().inverse())
  }

  const zoomAt = (cx, cy, factor) => {
    cancelAnimationFrame(rafRef.current)
    const v = vbRef.current
    const p = svgPoint(cx, cy)
    const w = Math.min(MAX_W, Math.max(MIN_W, v.w / factor))
    const k = w / v.w
    applyVb({ x: p.x - (p.x - v.x) * k, y: p.y - (p.y - v.y) * k, w, h: v.h * k })
  }

  // Wheel zoom needs a non-passive listener to preventDefault page scroll.
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onWheel = (e) => {
      e.preventDefault()
      zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0016))
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── drag pan + two-finger pinch ──
  const onPointerDown = (e) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 1) {
      drag.current = { x: e.clientX, y: e.clientY, moved: false }
    }
  }
  const onPointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return
    const prev = pointers.current.get(e.pointerId)

    if (pointers.current.size === 2) {
      const other = [...pointers.current.entries()].find(([id]) => id !== e.pointerId)[1]
      const dPrev = Math.hypot(prev.x - other.x, prev.y - other.y)
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      const dNow = Math.hypot(e.clientX - other.x, e.clientY - other.y)
      if (dPrev > 0) zoomAt((e.clientX + other.x) / 2, (e.clientY + other.y) / 2, dNow / dPrev)
      drag.current = null
      return
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (!drag.current) return
    const dx = e.clientX - drag.current.x
    const dy = e.clientY - drag.current.y
    if (!drag.current.moved && Math.hypot(dx, dy) < 6) return
    if (!drag.current.moved) {
      drag.current.moved = true
      e.currentTarget.setPointerCapture(e.pointerId)
      cancelAnimationFrame(rafRef.current)
    }
    const p1 = svgPoint(drag.current.x, drag.current.y)
    const p2 = svgPoint(e.clientX, e.clientY)
    const v = vbRef.current
    applyVb({ ...v, x: v.x - (p2.x - p1.x), y: v.y - (p2.y - p1.y) })
    drag.current.x = e.clientX
    drag.current.y = e.clientY
  }
  const onPointerUp = (e) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size === 0) drag.current = null
  }

  // ── per-section live meta (price, seats left) ──
  const meta = useMemo(() => {
    const m = {}
    for (const s of venue.sections) {
      m[s.id] = {
        price: sectionPrice(s, basePrice),
        left: seatsLoaded ? sectionSeatsLeft(s, occupiedSeats) : null,
      }
    }
    return m
  }, [venue, basePrice, occupiedSeats, seatsLoaded])

  const cheapest = useMemo(
    () => Math.min(...venue.sections.map((s) => meta[s.id].price)),
    [venue, meta]
  )

  const selected = venue.sections.find((s) => s.id === selectedSection)
  const showPills = !interactive

  return (
    <div className={`relative w-full h-full bg-gradient-to-b ${venue.ambient} overflow-hidden touch-none`}>
      <svg
        ref={svgRef}
        viewBox={vbToStr(vb)}
        className='w-full h-full block select-none'
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ cursor: drag.current?.moved ? 'grabbing' : 'grab' }}
      >
        <defs>
          <radialGradient id='focusGlow' cx='50%' cy='50%' r='60%'>
            <stop offset='0%' stopColor='#ffffff' stopOpacity='0.16' />
            <stop offset='100%' stopColor='#ffffff' stopOpacity='0' />
          </radialGradient>
        </defs>

        <FocusShape focus={venue.focus} />

        {/* section wedges */}
        {venue.sections.map((s) => {
          const { left } = meta[s.id]
          const soldOut = left === 0
          const isSel = s.id === selectedSection
          const isGlow = s.id === hoverSection
          return (
            <path
              key={s.id}
              d={s.path}
              fill={soldOut ? '#26262c' : s.color}
              fillOpacity={interactive ? 0.07 : isGlow ? 0.5 : soldOut ? 0.5 : isSel ? 0.42 : 0.26}
              stroke={isGlow || isSel ? '#ffffff' : soldOut ? '#3f3f46' : s.color}
              strokeWidth={isGlow || isSel ? 2 : 0.8}
              strokeOpacity={interactive ? 0.35 : 0.9}
              style={{
                cursor: soldOut ? 'not-allowed' : 'pointer',
                pointerEvents: interactive ? 'none' : 'auto',
                transition: 'fill-opacity 0.3s, stroke 0.3s',
              }}
              onClick={() => {
                if (!drag.current?.moved && !soldOut) onSelectSection?.(isSel ? null : s.id)
              }}
            >
              <title>{`${s.label} · from ${currency}${meta[s.id].price}`}</title>
            </path>
          )
        })}

        {/* every seat, always drawn */}
        <SeatsLayer
          sections={venue.sections}
          occupiedSeats={occupiedSeats}
          selectedSeats={selectedSeats}
          hoverSeats={hoverSeats}
          interactive={interactive}
          seatsLoaded={seatsLoaded}
          onSeatClick={onSeatClick}
          basePrice={basePrice}
          currency={currency}
        />

        {/* price pills (constant screen size via counter-scale) */}
        {showPills &&
          venue.sections.map((s) => {
            const { price, left } = meta[s.id]
            const soldOut = left === 0
            const isDeal = price === cheapest && !soldOut
            const label = soldOut ? 'Sold out' : `${currency}${price}`
            const w = 22 + label.length * 7.5
            return (
              <g
                key={`pill-${s.id}`}
                transform={`translate(${s.cx} ${s.cy}) scale(${1 / scale})`}
                style={{ cursor: soldOut ? 'not-allowed' : 'pointer', transition: 'opacity 0.25s' }}
                opacity={hoverSection && hoverSection !== s.id ? 0.45 : 1}
                onClick={() => {
                  if (!drag.current?.moved && !soldOut) onSelectSection?.(s.id === selectedSection ? null : s.id)
                }}
              >
                <rect x={-w / 2} y='-13' width={w} height='26' rx='13' fill='#0b0b0e' fillOpacity='0.92' stroke={isDeal ? '#34d399' : 'rgba(255,255,255,0.14)'} strokeWidth='1' />
                <circle cx={-w / 2 + 13} cy='0' r='4' fill={soldOut ? '#52525b' : s.color} />
                <text x={7} y='4' textAnchor='middle' fontSize='12' fontWeight='700' fill={soldOut ? '#71717a' : '#ffffff'}>
                  {label}
                </text>
              </g>
            )
          })}
      </svg>

      {/* zoom controls */}
      <div className='absolute top-3 right-3 flex flex-col rounded-xl overflow-hidden border border-white/15 bg-black/60 backdrop-blur-sm'>
        <button
          aria-label='Zoom in'
          className='p-2.5 hover:bg-white/10 transition'
          onClick={() => {
            const r = svgRef.current.getBoundingClientRect()
            zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1.5)
          }}
        >
          <Plus className='w-4 h-4' />
        </button>
        <div className='h-px bg-white/10' />
        <button
          aria-label='Zoom out'
          className='p-2.5 hover:bg-white/10 transition'
          onClick={() => {
            const r = svgRef.current.getBoundingClientRect()
            zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1 / 1.5)
          }}
        >
          <Minus className='w-4 h-4' />
        </button>
        <div className='h-px bg-white/10' />
        <button
          aria-label='Reset view'
          className='p-2.5 hover:bg-white/10 transition'
          onClick={() => {
            onSelectSection?.(null)
            flyTo(FULL_VIEWBOX)
          }}
        >
          <Maximize2 className='w-4 h-4' />
        </button>
      </div>

      {/* current-section chip */}
      {selected && (
        <div className='absolute top-3 left-3 px-3 py-1.5 rounded-xl bg-black/70 border border-white/15 backdrop-blur-sm'>
          <span className='text-xs font-semibold' style={{ color: selected.color }}>
            {selected.label}
          </span>
          <span className='text-[11px] text-gray-300 ml-2'>{currency}{meta[selected.id].price}/seat</span>
          {meta[selected.id].left != null && (
            <span className='text-[11px] text-emerald-400 ml-2'>{meta[selected.id].left} left</span>
          )}
        </div>
      )}

      {/* interaction hint */}
      {!interactive && (
        <div className='absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/60 border border-white/10 text-[11px] text-gray-300 backdrop-blur-sm pointer-events-none whitespace-nowrap'>
          Scroll or pinch to zoom · tap a section to pick seats
        </div>
      )}
    </div>
  )
}

// The focus element differs per venue: a glowing screen arc, a proscenium
// stage, a court or a field with simple markings.
const FocusShape = ({ focus }) => {
  const { type, label, cx, cy } = focus
  if (type === 'court' || type === 'field') {
    const { rx, ry } = focus
    const isField = type === 'field'
    return (
      <g pointerEvents='none'>
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={isField ? '#17422a' : '#1c2430'} stroke={isField ? '#2f7d4a' : '#3b4658'} strokeWidth='2.5' />
        {isField ? (
          <>
            <ellipse cx={cx} cy={cy} rx={rx * 0.55} ry={ry * 0.55} fill='none' stroke='#2f7d4a' strokeWidth='1.5' />
            <line x1={cx - rx * 0.9} y1={cy} x2={cx + rx * 0.9} y2={cy} stroke='#2f7d4a' strokeWidth='1.5' />
          </>
        ) : (
          <>
            <line x1={cx} y1={cy - ry} x2={cx} y2={cy + ry} stroke='#3b4658' strokeWidth='1.5' />
            <circle cx={cx} cy={cy} r={ry * 0.35} fill='none' stroke='#3b4658' strokeWidth='1.5' />
          </>
        )}
        <text x={cx} y={cy + 5} textAnchor='middle' fontSize='15' fontWeight='700' letterSpacing='3' fill={isField ? '#7dd3a0' : '#93c5fd'}>
          {label}
        </text>
      </g>
    )
  }
  // screen / stage: a curved band near the top with a soft glow falling below
  const { w } = focus
  const isStage = type === 'stage'
  return (
    <g pointerEvents='none'>
      <ellipse cx={cx} cy={cy + 120} rx={w * 0.7} ry='130' fill='url(#focusGlow)' />
      <path
        d={`M ${cx - w / 2} ${cy} Q ${cx} ${cy - 46} ${cx + w / 2} ${cy} L ${cx + w / 2} ${cy + 12} Q ${cx} ${cy - 34} ${cx - w / 2} ${cy + 12} Z`}
        fill={isStage ? '#2a1a2e' : '#e5e7eb'}
        stroke={isStage ? '#7c3aed' : '#94a3b8'}
        strokeWidth='2'
      />
      <text x={cx} y={cy - 32} textAnchor='middle' fontSize='13' letterSpacing='5' fontWeight='700' fill={isStage ? '#c4b5fd' : '#64748b'}>
        {label}
      </text>
    </g>
  )
}

export default VenueSeatMap

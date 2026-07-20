import React, { useState } from 'react'

// A stylized, interactive venue map (SVG). Clicking a section selects it and
// zooms the SVG viewBox toward that section — SeatGeek-style. Purely visual /
// data-driven; no real venue photos involved.

// Sections arranged in three concentric tiers around a central stage/field.
// Each has a polygon path and a centroid for the price label + zoom target.
const SECTIONS = [
  // tier, id, label, price, points (x y ...), cx, cy, color
  { id: 'A1', tier: 'Premium',  price: 120, cx: 300, cy: 150, color: '#F84565', points: '230,120 370,120 350,180 250,180' },
  { id: 'A2', tier: 'Premium',  price: 110, cx: 430, cy: 210, color: '#F84565', points: '380,175 445,140 480,240 400,250' },
  { id: 'A3', tier: 'Premium',  price: 110, cx: 170, cy: 210, color: '#F84565', points: '120,140 220,175 200,250 120,240' },
  { id: 'B1', tier: 'Lower',    price: 78,  cx: 300, cy: 90,  color: '#8B5CF6', points: '200,60 400,60 375,115 225,115' },
  { id: 'B2', tier: 'Lower',    price: 72,  cx: 480, cy: 160, color: '#8B5CF6', points: '410,95 500,120 505,215 455,150' },
  { id: 'B3', tier: 'Lower',    price: 72,  cx: 120, cy: 160, color: '#8B5CF6', points: '190,95 100,120 95,215 145,150' },
  { id: 'B4', tier: 'Lower',    price: 68,  cx: 300, cy: 330, color: '#8B5CF6', points: '235,300 365,300 400,350 200,350' },
  { id: 'C1', tier: 'Upper',    price: 45,  cx: 300, cy: 40,  color: '#10B981', points: '160,20 440,20 405,58 195,58' },
  { id: 'C2', tier: 'Upper',    price: 39,  cx: 540, cy: 150, color: '#10B981', points: '515,70 560,90 560,220 515,210' },
  { id: 'C3', tier: 'Upper',    price: 39,  cx: 60,  cy: 150, color: '#10B981', points: '85,70 40,90 40,220 85,210' },
  { id: 'C4', tier: 'Upper',    price: 33,  cx: 300, cy: 390, color: '#10B981', points: '190,365 410,365 455,405 145,405' },
]

const TIER_LEGEND = [
  { tier: 'Premium', color: '#F84565' },
  { tier: 'Lower', color: '#8B5CF6' },
  { tier: 'Upper', color: '#10B981' },
]

const VenueMap = ({ selectedSection, onSelectSection, occupancy = {} }) => {
  const [hover, setHover] = useState(null)

  // Compute a zoom viewBox targeting the selected section's centroid.
  const sel = SECTIONS.find((s) => s.id === selectedSection)
  const viewBox = sel
    ? `${sel.cx - 130} ${sel.cy - 90} 260 180`
    : '0 0 600 430'

  return (
    <div className='relative w-full rounded-2xl bg-gradient-to-b from-[#101014] to-[#17171c] border border-white/10 overflow-hidden'>
      <svg
        viewBox={viewBox}
        className='w-full h-[340px] md:h-[440px] transition-[viewBox] duration-500 ease-out'
        style={{ transition: 'all 0.5s ease-out' }}
      >
        {/* Field / stage */}
        <ellipse cx='300' cy='215' rx='95' ry='70' fill='#1f5130' stroke='#2c6b40' strokeWidth='2' />
        <text x='300' y='220' textAnchor='middle' fontSize='13' fill='#7dd3a0' fontWeight='600'>
          {sel ? 'STAGE / FIELD' : 'FIELD'}
        </text>

        {SECTIONS.map((s) => {
          const isSel = s.id === selectedSection
          const isHover = s.id === hover
          const occ = occupancy[s.id] // optional 0..1 fullness
          return (
            <g
              key={s.id}
              onClick={() => onSelectSection(isSel ? null : s.id)}
              onMouseEnter={() => setHover(s.id)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: 'pointer' }}
            >
              <polygon
                points={s.points}
                fill={s.color}
                fillOpacity={isSel ? 0.95 : isHover ? 0.7 : 0.4}
                stroke={isSel ? '#fff' : s.color}
                strokeWidth={isSel ? 2.5 : 1}
                style={{ transition: 'fill-opacity 0.2s' }}
              />
              {/* Price pill */}
              <g transform={`translate(${s.cx}, ${s.cy})`}>
                <rect x='-20' y='-11' width='40' height='22' rx='11' fill='#0b0b0e' fillOpacity='0.85' stroke={isSel ? '#fff' : 'transparent'} />
                <text textAnchor='middle' y='4' fontSize='11' fill='#fff' fontWeight='600'>${s.price}</text>
              </g>
              {occ != null && occ > 0.85 && (
                <text x={s.cx} y={s.cy + 20} textAnchor='middle' fontSize='8' fill='#fca5a5'>almost full</text>
              )}
            </g>
          )
        })}
      </svg>

      {/* Reset zoom */}
      {sel && (
        <button
          onClick={() => onSelectSection(null)}
          className='absolute top-3 right-3 px-3 py-1.5 text-xs rounded-lg bg-black/70 border border-white/20 hover:bg-black/90 transition'
        >
          ↩ Zoom out
        </button>
      )}

      {/* Legend */}
      <div className='absolute bottom-3 left-3 flex flex-col gap-1 bg-black/60 rounded-lg px-3 py-2 border border-white/10'>
        {TIER_LEGEND.map((t) => (
          <div key={t.tier} className='flex items-center gap-2 text-[11px] text-gray-300'>
            <span className='w-3 h-3 rounded-sm' style={{ background: t.color }} />
            {t.tier}
          </div>
        ))}
      </div>
    </div>
  )
}

export { SECTIONS }
export default VenueMap

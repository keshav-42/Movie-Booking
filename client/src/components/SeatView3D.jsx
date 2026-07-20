import React from 'react'
import { SECTIONS } from './VenueMap'

// A stylized "view from your seat" render. Not a real photo — it's a generated
// perspective SVG: tiered seat rows receding toward a stage/field, with the
// vantage point (distance / angle / height) derived from the chosen section's
// tier so different sections visibly feel closer/farther and higher/lower.

const TIER_PARAMS = {
  Premium: { rows: 5, depth: 0.35, height: 0.15, label: 'Close to the action', tint: '#F84565' },
  Lower:   { rows: 8, depth: 0.55, height: 0.30, label: 'Great mid-level view', tint: '#8B5CF6' },
  Upper:   { rows: 11, depth: 0.8, height: 0.55, label: 'Elevated panoramic view', tint: '#10B981' },
}

const SeatView3D = ({ selectedSection }) => {
  const sec = SECTIONS.find((s) => s.id === selectedSection)

  if (!sec) {
    return (
      <div className='w-full h-full min-h-[220px] rounded-2xl border border-white/10 bg-[#101014] flex flex-col items-center justify-center text-center px-6'>
        <div className='text-4xl mb-3'>🎟️</div>
        <p className='text-sm text-gray-400 max-w-xs'>
          Pick a section on the map to preview the <span className='text-white font-medium'>view from your seat</span>.
        </p>
      </div>
    )
  }

  const p = TIER_PARAMS[sec.tier]
  const W = 480
  const H = 300
  // Stage sits near top; its width/position shrinks the higher/farther the tier.
  const horizon = 70 + p.height * 60
  const stageW = 260 - p.depth * 120
  const stageX = (W - stageW) / 2

  // Build receding seat rows from bottom (near viewer) up toward horizon.
  const rows = []
  for (let i = 0; i < p.rows; i++) {
    const t = i / (p.rows - 1) // 0 near → 1 far
    const y = H - 20 - t * (H - horizon - 40)
    const inset = 20 + t * (W * 0.28)
    const seatCount = Math.max(4, Math.round(10 - t * 5))
    rows.push({ y, x1: inset, x2: W - inset, seatCount, t })
  }

  return (
    <div className='w-full rounded-2xl border border-white/10 overflow-hidden bg-gradient-to-b from-[#0c0c10] to-[#141419]'>
      <svg viewBox={`0 0 ${W} ${H}`} className='w-full h-auto block'>
        <defs>
          <linearGradient id='sky' x1='0' y1='0' x2='0' y2='1'>
            <stop offset='0' stopColor='#1a2436' />
            <stop offset='1' stopColor='#0d1018' />
          </linearGradient>
          <linearGradient id='fieldGrad' x1='0' y1='0' x2='0' y2='1'>
            <stop offset='0' stopColor='#2c6b40' />
            <stop offset='1' stopColor='#1f5130' />
          </linearGradient>
        </defs>

        {/* Sky / arena backdrop */}
        <rect x='0' y='0' width={W} height={horizon + 40} fill='url(#sky)' />

        {/* Stage / field, sized by vantage */}
        <g>
          <ellipse cx={W / 2} cy={horizon} rx={stageW / 2} ry={16 + p.depth * 8} fill='url(#fieldGrad)' stroke='#3a7d52' strokeWidth='1.5' />
          <rect x={stageX + stageW * 0.3} y={horizon - 20} width={stageW * 0.4} height='16' rx='3' fill={sec.tier === 'Premium' ? '#3a2030' : '#22252e'} />
          <text x={W / 2} y={horizon + 4} textAnchor='middle' fontSize='10' fill='#9ff0bd' fontWeight='600'>STAGE</text>
        </g>

        {/* Stadium lights */}
        {[0.2, 0.5, 0.8].map((fx, i) => (
          <circle key={i} cx={W * fx} cy={horizon - 45} r='3' fill='#fde68a' opacity='0.8' />
        ))}

        {/* Receding seat rows */}
        {rows.map((r, ri) => {
          const seatW = (r.x2 - r.x1) / r.seatCount
          const shade = 0.35 + r.t * 0.4
          return (
            <g key={ri}>
              {Array.from({ length: r.seatCount }).map((_, si) => (
                <rect
                  key={si}
                  x={r.x1 + si * seatW + 2}
                  y={r.y}
                  width={seatW - 4}
                  height={7 + (1 - r.t) * 5}
                  rx='2'
                  fill={p.tint}
                  fillOpacity={shade}
                />
              ))}
            </g>
          )
        })}

        {/* "You are here" marker on the front row */}
        <g>
          <circle cx={W / 2} cy={H - 12} r='7' fill={p.tint} stroke='#fff' strokeWidth='2' />
          <text x={W / 2} y={H - 9} textAnchor='middle' fontSize='8' fill='#fff' fontWeight='700'>YOU</text>
        </g>
      </svg>

      <div className='px-4 py-3 flex items-center justify-between'>
        <div>
          <p className='text-sm font-semibold'>Section {sec.id} · {sec.tier}</p>
          <p className='text-xs text-gray-400'>{p.label}</p>
        </div>
        <div className='text-right'>
          <p className='text-lg font-bold' style={{ color: sec.color }}>${sec.price}</p>
          <p className='text-[10px] text-gray-500'>per seat</p>
        </div>
      </div>
    </div>
  )
}

export default SeatView3D

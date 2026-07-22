// Venue geometry engine, shared by the seat map, the listings rail and the 3D
// seat view. Every venue is built from annular WEDGES (ring segments) laid out
// in polar coordinates around the venue focus (screen / stage / court / field),
// so bowls actually curve like real venues instead of floating rectangles.
//
// Every seat of every section is generated up-front and drawn on the figure at
// all zoom levels (tinted dots far away, clickable chairs up close) — no
// "tap a section to reveal seats" step.
//
// Coordinate space for all venues: viewBox "0 0 1000 720", y grows downward.

// Each tier carries a color, a short blurb, and the perks you get in that price
// band — surfaced in the checkout summary and listings.
const TIERS = {
  premium: {
    name: 'Premium',
    color: '#F84565',
    blurb: 'Closest to the action',
    perks: ['Prime centre view', 'Extra-wide padded seats', 'In-seat food & drink service'],
  },
  club: {
    name: 'Club',
    color: '#F59E0B',
    blurb: 'Premium comfort, side angle',
    perks: ['Padded club seats', 'Lounge access', 'Priority entry'],
  },
  lower: {
    name: 'Lower',
    color: '#8B5CF6',
    blurb: 'Close, level with the action',
    perks: ['Lower-bowl proximity', 'Fast concourse access'],
  },
  mid: {
    name: 'Mid',
    color: '#3B82F6',
    blurb: 'Balanced view and value',
    perks: ['Full-venue sightline', 'Central concourse'],
  },
  upper: {
    name: 'Upper',
    color: '#10B981',
    blurb: 'Elevated panoramic view',
    perks: ['Panoramic overview', 'Great value'],
  },
  value: {
    name: 'Value',
    color: '#64748B',
    blurb: 'Best price in the house',
    perks: ['Lowest price', 'General admission feel'],
  },
}

const TAU = Math.PI * 2
const DOWN = Math.PI / 2 // angle pointing down-screen (toward the viewer's "front")

// Point on an (optionally y-squashed) circle around origin (ox, oy).
const pt = (ox, oy, sy, r, a) => ({ x: ox + r * Math.cos(a), y: oy + r * Math.sin(a) * sy })

// Deterministic per-section price jitter (±6%) so the marketplace doesn't look
// like a spreadsheet of identical numbers.
const jitter = (id) => {
  const h = [...id].reduce((n, c) => n + c.charCodeAt(0) * 31, 7)
  return 1 + ((h % 7) - 3) * 0.02
}

// Shortest angular distance from `a` to the bottom of the bowl (used to assign
// tiers: sections nearest the "front" of a ring are pricier).
const distFromBottom = (a) => Math.abs(Math.atan2(Math.sin(a - DOWN), Math.cos(a - DOWN)))

const fx = (n) => Number(n.toFixed(1))

// ── Wedge factory ──────────────────────────────────────────────────────────
// Geometry: origin (ox, oy), y-scale sy, radii r0..r1, angles a0..a1, `rows`
// concentric seat rows. Path + bounds + centroid are precomputed.
const mkWedge = (id, tier, priceMult, geo, opts = {}) => {
  const { ox, oy, sy, r0, r1, a0, a1, rows } = geo
  const large = a1 - a0 > Math.PI ? 1 : 0
  const p1 = pt(ox, oy, sy, r1, a0)
  const p2 = pt(ox, oy, sy, r1, a1)
  const p3 = pt(ox, oy, sy, r0, a1)
  const p4 = pt(ox, oy, sy, r0, a0)
  const path =
    `M ${fx(p1.x)} ${fx(p1.y)} ` +
    `A ${fx(r1)} ${fx(r1 * sy)} 0 ${large} 1 ${fx(p2.x)} ${fx(p2.y)} ` +
    `L ${fx(p3.x)} ${fx(p3.y)} ` +
    `A ${fx(r0)} ${fx(r0 * sy)} 0 ${large} 0 ${fx(p4.x)} ${fx(p4.y)} Z`

  // Bounds via boundary sampling (cheap, done once at module load).
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (let i = 0; i <= 20; i++) {
    const a = a0 + ((a1 - a0) * i) / 20
    for (const r of [r0, r1]) {
      const p = pt(ox, oy, sy, r, a)
      if (p.x < minX) minX = p.x
      if (p.x > maxX) maxX = p.x
      if (p.y < minY) minY = p.y
      if (p.y > maxY) maxY = p.y
    }
  }
  const mid = pt(ox, oy, sy, (r0 + r1) / 2, (a0 + a1) / 2)

  return {
    id,
    tier,
    ...TIERS[tier],
    priceMult: priceMult * jitter(id),
    shape: 'wedge',
    ox, oy, sy, r0, r1, a0, a1, rows,
    path,
    bounds: { x: minX, y: minY, w: maxX - minX, h: maxY - minY },
    cx: mid.x,
    cy: mid.y,
    label: opts.label || id,
    seatSpacing: opts.seatSpacing || 14,
    seatR: opts.seatR || 3.6,
  }
}

// A ring of `count` wedges spanning [from, to] with aisle gaps between them.
// `tierAt(midAngle, i)` decides tier + price multiplier per wedge.
const ring = ({ prefix, ox, oy, sy, r0, r1, rows, count, from = 0, to = TAU, gapFrac = 0.12, numberFrom = 101, tierAt, seatSpacing, seatR, labelPrefix = 'Sec' }) => {
  const step = (to - from) / count
  const gap = step * gapFrac
  const out = []
  for (let i = 0; i < count; i++) {
    const a0 = from + i * step + gap / 2
    const a1 = from + (i + 1) * step - gap / 2
    const [tier, mult] = tierAt((a0 + a1) / 2, i)
    const n = numberFrom + i
    out.push(
      mkWedge(`${prefix}${n}`, tier, mult, { ox, oy, sy, r0, r1, a0, a1, rows }, {
        label: `${labelPrefix} ${n}`,
        seatSpacing,
        seatR,
      })
    )
  }
  return out
}

// ─────────────────────── CINEMA ───────────────────────
// Fan of gently curved rows facing a screen at the top. Small venue: every seat
// is clickable from the first view (interactScale 1), so no price pills needed.
const C = { ox: 500, oy: -160 }
const CINEMA = {
  focus: { type: 'screen', label: 'SCREEN', cx: 500, cy: 92, w: 480 },
  ambient: 'from-[#0b0b12] to-[#141422]',
  interactScale: 1,
  maxR: 800,
  sections: [
    mkWedge('PRIME', 'premium', 1.6, { ...C, sy: 1, r0: 300, r1: 420, a0: DOWN - 0.36, a1: DOWN + 0.36, rows: 4 }, { label: 'Prime', seatSpacing: 17, seatR: 6 }),
    mkWedge('REC-L', 'value', 0.8, { ...C, sy: 1, r0: 300, r1: 420, a0: DOWN + 0.4, a1: DOWN + 0.64, rows: 4 }, { label: 'Recliner L', seatSpacing: 19, seatR: 6.5 }),
    mkWedge('REC-R', 'value', 0.8, { ...C, sy: 1, r0: 300, r1: 420, a0: DOWN - 0.64, a1: DOWN - 0.4, rows: 4 }, { label: 'Recliner R', seatSpacing: 19, seatR: 6.5 }),
    mkWedge('MID-C', 'lower', 1.3, { ...C, sy: 1, r0: 450, r1: 610, a0: DOWN - 0.34, a1: DOWN + 0.34, rows: 5 }, { label: 'Middle C', seatSpacing: 17, seatR: 6 }),
    mkWedge('MID-L', 'mid', 1.1, { ...C, sy: 1, r0: 450, r1: 610, a0: DOWN + 0.37, a1: DOWN + 0.6, rows: 5 }, { label: 'Middle L', seatSpacing: 17, seatR: 6 }),
    mkWedge('MID-R', 'mid', 1.1, { ...C, sy: 1, r0: 450, r1: 610, a0: DOWN - 0.6, a1: DOWN - 0.37, rows: 5 }, { label: 'Middle R', seatSpacing: 17, seatR: 6 }),
    mkWedge('BAL-C', 'upper', 0.95, { ...C, sy: 1, r0: 640, r1: 775, a0: DOWN - 0.31, a1: DOWN + 0.31, rows: 4 }, { label: 'Balcony C', seatSpacing: 17, seatR: 6 }),
    mkWedge('BAL-L', 'upper', 0.9, { ...C, sy: 1, r0: 640, r1: 775, a0: DOWN + 0.34, a1: DOWN + 0.56, rows: 4 }, { label: 'Balcony L', seatSpacing: 17, seatR: 6 }),
    mkWedge('BAL-R', 'upper', 0.9, { ...C, sy: 1, r0: 640, r1: 775, a0: DOWN - 0.56, a1: DOWN - 0.34, rows: 4 }, { label: 'Balcony R', seatSpacing: 17, seatR: 6 }),
  ],
}

// ─────────────────────── THEATER ───────────────────────
// Proscenium stage at top; orchestra fan, mezzanine and balcony arcs behind.
const T = { ox: 500, oy: -80, sy: 1 }
const THEATER = {
  focus: { type: 'stage', label: 'STAGE', cx: 500, cy: 96, w: 400 },
  ambient: 'from-[#120b10] to-[#1e1420]',
  interactScale: 1.25,
  maxR: 800,
  sections: [
    mkWedge('ORCH-C', 'premium', 1.7, { ...T, r0: 240, r1: 460, a0: DOWN - 0.32, a1: DOWN + 0.32, rows: 7 }, { label: 'Orchestra C', seatSpacing: 15, seatR: 4.6 }),
    mkWedge('ORCH-L', 'club', 1.3, { ...T, r0: 240, r1: 460, a0: DOWN + 0.35, a1: DOWN + 0.62, rows: 7 }, { label: 'Orchestra L', seatSpacing: 15, seatR: 4.6 }),
    mkWedge('ORCH-R', 'club', 1.3, { ...T, r0: 240, r1: 460, a0: DOWN - 0.62, a1: DOWN - 0.35, rows: 7 }, { label: 'Orchestra R', seatSpacing: 15, seatR: 4.6 }),
    mkWedge('MEZ-C', 'lower', 1.1, { ...T, r0: 500, r1: 620, a0: DOWN - 0.38, a1: DOWN + 0.38, rows: 4 }, { label: 'Mezzanine C', seatSpacing: 15, seatR: 4.6 }),
    mkWedge('MEZ-L', 'mid', 0.95, { ...T, r0: 500, r1: 620, a0: DOWN + 0.41, a1: DOWN + 0.63, rows: 4 }, { label: 'Mezzanine L', seatSpacing: 15, seatR: 4.6 }),
    mkWedge('MEZ-R', 'mid', 0.95, { ...T, r0: 500, r1: 620, a0: DOWN - 0.63, a1: DOWN - 0.41, rows: 4 }, { label: 'Mezzanine R', seatSpacing: 15, seatR: 4.6 }),
    mkWedge('BAL', 'upper', 0.8, { ...T, r0: 660, r1: 790, a0: DOWN - 0.42, a1: DOWN + 0.42, rows: 4 }, { label: 'Balcony', seatSpacing: 15, seatR: 4.6 }),
  ],
}

// ─────────────────────── ARENA ───────────────────────
// Court/stage in the round: courtside boxes, then a full 360° lower and upper
// bowl (elliptically squashed so it reads like a broadcast camera view).
const A = { ox: 500, oy: 380, sy: 0.84 }
const ARENA = {
  focus: { type: 'court', label: 'COURT', cx: 500, cy: 380, rx: 118, ry: 72 },
  ambient: 'from-[#0a0f16] to-[#12161f]',
  interactScale: 2.0,
  maxR: 405,
  sections: [
    ...ring({
      prefix: 'CS', ...A, r0: 148, r1: 194, rows: 2, count: 4, from: -Math.PI / 4,
      gapFrac: 0.1, numberFrom: 1, labelPrefix: 'Courtside', seatSpacing: 15, seatR: 3.8,
      tierAt: () => ['premium', 1.9],
    }),
    ...ring({
      prefix: 'L', ...A, r0: 214, r1: 300, rows: 5, count: 8, from: -Math.PI / 8,
      numberFrom: 101, seatSpacing: 13.5, seatR: 3.4,
      tierAt: (a) => {
        const d = distFromBottom(a)
        if (d < 0.8) return ['club', 1.45]
        if (d > Math.PI - 0.8) return ['lower', 1.15]
        return ['lower', 1.3]
      },
    }),
    ...ring({
      prefix: 'U', ...A, r0: 322, r1: 402, rows: 4, count: 10, from: -Math.PI / 10,
      numberFrom: 201, seatSpacing: 13.5, seatR: 3.2,
      tierAt: (a) => {
        const d = distFromBottom(a)
        if (d < 1.0) return ['mid', 1.0]
        if (d > Math.PI - 1.0) return ['value', 0.7]
        return ['upper', 0.85]
      },
    }),
  ],
}

// ─────────────────────── STADIUM ───────────────────────
// Field in the middle, two full seating decks wrapping around. Premium behind
// the near sideline / home plate (bottom of the map), value in the top deck.
const S = { ox: 500, oy: 375, sy: 0.8 }
const STADIUM = {
  focus: { type: 'field', label: 'FIELD', cx: 500, cy: 375, rx: 188, ry: 112 },
  ambient: 'from-[#08120c] to-[#0e1a12]',
  interactScale: 2.2,
  maxR: 425,
  sections: [
    ...ring({
      prefix: 'L', ...S, r0: 228, r1: 318, rows: 5, count: 12, from: -Math.PI / 12,
      numberFrom: 101, seatSpacing: 13, seatR: 3.2,
      tierAt: (a) => {
        const d = distFromBottom(a)
        if (d < 0.55) return ['premium', 1.9]
        if (d < 1.25) return ['club', 1.4]
        if (d > Math.PI - 1.1) return ['lower', 0.95]
        return ['mid', 1.1]
      },
    }),
    ...ring({
      prefix: 'U', ...S, r0: 342, r1: 422, rows: 4, count: 14, from: -Math.PI / 14,
      numberFrom: 201, seatSpacing: 13, seatR: 3.0,
      tierAt: (a) => (distFromBottom(a) < 1.2 ? ['upper', 0.85] : ['value', 0.65]),
    }),
  ],
}

const VENUES = { cinema: CINEMA, theater: THEATER, arena: ARENA, stadium: STADIUM }

export const getVenue = (type) => VENUES[type] || CINEMA

// Price for a section given the event's base price.
export const sectionPrice = (section, basePrice) =>
  Math.max(1, Math.round(basePrice * section.priceMult))

// ── Seat generation ────────────────────────────────────────────────────────
// Seats sit on concentric arcs inside their wedge; per-row counts derive from
// arc length so density stays uniform (outer rows hold more seats — like a
// real bowl). Cached per section since geometry is static.
const seatCache = new WeakMap()

export const generateSeats = (section) => {
  const hit = seatCache.get(section)
  if (hit) return hit

  const { ox, oy, sy, r0, r1, a0, a1, rows, seatSpacing, seatR } = section
  const seats = []
  const radialPad = (r1 - r0) * 0.14
  const rowGap = (r1 - r0 - radialPad * 2) / rows
  const span = a1 - a0
  for (let r = 0; r < rows; r++) {
    const rowLabel = String.fromCharCode(65 + r)
    const rr = r0 + radialPad + rowGap * (r + 0.5)
    const usable = span * 0.92
    const n = Math.max(2, Math.round((usable * rr) / seatSpacing))
    const step = usable / n
    for (let c = 0; c < n; c++) {
      const a = a0 + span * 0.04 + step * (c + 0.5)
      const p = pt(ox, oy, sy, rr, a)
      seats.push({
        id: `${section.id}-${rowLabel}${c + 1}`,
        row: rowLabel,
        col: c + 1,
        x: fx(p.x),
        y: fx(p.y),
        r: seatR,
      })
    }
  }
  seatCache.set(section, seats)
  return seats
}

// Total seat capacity of a section.
export const sectionCapacity = (section) => generateSeats(section).length

// How many seats remain in a section given the occupied-seat ids (ids are
// namespaced `${section.id}-<row><col>`).
export const sectionSeatsLeft = (section, occupiedSeats = []) => {
  const prefix = `${section.id}-`
  const taken = occupiedSeats.reduce((n, id) => (id.startsWith(prefix) ? n + 1 : n), 0)
  return Math.max(0, sectionCapacity(section) - taken)
}

// A viewBox string that frames a section with padding, for smooth zoom.
export const sectionViewBox = (section, pad = 50) => {
  const b = section.bounds
  return `${fx(b.x - pad)} ${fx(b.y - pad)} ${fx(b.w + pad * 2)} ${fx(b.h + pad * 2)}`
}

export const FULL_VIEWBOX = '0 0 1000 720'

// ── Vantage: where a seat/section sits relative to the focus ───────────────
// Feeds the 3D camera: `angle` is the polar angle around the focus (0 = right,
// π/2 = front/bottom of the map), `dist` 0..1 near→far, `height` 0..1 low→high.
export const seatVantage = (venue, ptOrSection) => {
  const f = venue.focus
  const dx = (ptOrSection.cx ?? ptOrSection.x) - f.cx
  const dy = (ptOrSection.cy ?? ptOrSection.y) - f.cy
  const angle = Math.atan2(dy, dx)
  const dist = Math.min(1, Math.hypot(dx, dy) / venue.maxR)
  return { angle, dist, height: 0.12 + dist * 0.88 }
}

// ── Listings builder ───────────────────────────────────────────────────────
// Turns live availability into a SeatGeek-style marketplace list: for each
// section, the best contiguous runs of `qty` open seats (closest rows first),
// priced, deal-scored against the whole board and sorted cheapest-first.
export const buildListings = ({ venueType, basePrice, occupiedSeats = [], qty = 2 }) => {
  const venue = getVenue(venueType)
  const occupied = new Set(occupiedSeats)
  const raw = []

  for (const section of venue.sections) {
    const seats = generateSeats(section)
    const byRow = new Map()
    for (const seat of seats) {
      if (!byRow.has(seat.row)) byRow.set(seat.row, [])
      byRow.get(seat.row).push(seat)
    }

    const rowListings = []
    for (const [row, rowSeats] of byRow) {
      // longest contiguous run of open seats in this row
      let best = null
      let run = []
      const flush = () => {
        if (run.length >= qty && (!best || run.length > best.length)) best = run
        run = []
      }
      for (const seat of rowSeats) {
        if (occupied.has(seat.id)) flush()
        else run.push(seat)
      }
      flush()
      if (best) rowListings.push({ row, run: best })
      if (rowListings.length >= 2) break // ≤2 listings per section: best rows
    }

    for (const { row, run } of rowListings) {
      const start = Math.floor((run.length - qty) / 2)
      raw.push({
        key: `${section.id}-${row}`,
        section,
        row,
        price: sectionPrice(section, basePrice),
        maxQty: Math.min(8, run.length),
        seats: run.slice(start, start + qty).map((s) => s.id),
      })
    }
  }

  // Deal score: price percentile across the board → 10 (steal) … 6 (fair).
  const sorted = [...raw].sort((a, b) => a.price - b.price)
  const n = Math.max(1, sorted.length - 1)
  sorted.forEach((l, i) => {
    l.score = 10 - Math.round((i / n) * 4)
    l.scoreLabel = l.score >= 9 ? 'Amazing' : l.score >= 7 ? 'Great' : 'Good'
  })
  // Badges: global cheapest + cheapest within each section.
  if (sorted.length) sorted[0].badge = 'Cheapest'
  const seenSection = new Set()
  for (const l of sorted) {
    if (!seenSection.has(l.section.id)) {
      seenSection.add(l.section.id)
      if (!l.badge && raw.filter((x) => x.section.id === l.section.id).length > 1) {
        l.badge = 'Cheapest in section'
      }
    }
  }
  return sorted
}

export { TIERS }

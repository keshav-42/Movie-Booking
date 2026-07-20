// Venue geometry + seat-matrix generation, shared by the seat map and the seat
// list. Each venue "type" (cinema / arena / stadium / theater) has a set of
// SECTIONS, each with: a price tier + color, a polygon block placed in a fixed
// SVG coordinate space (0 0 1000 720), and enough info to generate an actual
// grid of seats that is drawn *inside* that block on the figure — no separate
// grid. Sections zoom by animating the SVG viewBox toward the block's bounds.
//
// Coordinate space for all venues: viewBox "0 0 1000 720".

const TIERS = {
  premium: { name: 'Premium', color: '#F84565' },
  club: { name: 'Club', color: '#F59E0B' },
  lower: { name: 'Lower', color: '#8B5CF6' },
  mid: { name: 'Mid', color: '#3B82F6' },
  upper: { name: 'Upper', color: '#10B981' },
  value: { name: 'Value', color: '#64748B' },
}

// A section block is a rectangle (x, y, w, h) with a row/col seat grid.
// `curve` (0..1) bows the block around the stage for arena/stadium realism.
const mk = (id, tier, priceMult, x, y, w, h, rows, cols, opts = {}) => ({
  id,
  tier,
  ...TIERS[tier],
  priceMult,
  x, y, w, h,
  rows,
  cols,
  cx: x + w / 2,
  cy: y + h / 2,
  label: opts.label || id,
  curve: opts.curve || 0,
  ...opts,
})

// ─────────────────────── CINEMA ───────────────────────
// Classic auditorium: screen at top, blocks fanning back. Fewer, wider tiers.
const CINEMA = {
  focus: { type: 'screen', label: 'SCREEN', x: 250, y: 60, w: 500, h: 34 },
  ambient: 'from-[#0b0b12] to-[#141422]',
  sections: [
    mk('REC-L', 'value', 0.8, 120, 150, 200, 120, 4, 8, { label: 'Recliner L' }),
    mk('REC-R', 'value', 0.8, 680, 150, 200, 120, 4, 8, { label: 'Recliner R' }),
    mk('PRIME', 'premium', 1.6, 340, 150, 320, 120, 4, 12, { label: 'Prime' }),
    mk('MID-L', 'mid', 1.1, 120, 300, 200, 150, 5, 8, { label: 'Middle L' }),
    mk('MID-C', 'lower', 1.3, 340, 300, 320, 150, 5, 12, { label: 'Middle C' }),
    mk('MID-R', 'mid', 1.1, 680, 300, 200, 150, 5, 8, { label: 'Middle R' }),
    mk('BAL-L', 'upper', 0.9, 120, 490, 260, 150, 5, 10, { label: 'Balcony L' }),
    mk('BAL-R', 'upper', 0.9, 620, 490, 260, 150, 5, 10, { label: 'Balcony R' }),
  ],
}

// ─────────────────────── THEATER ───────────────────────
// Proscenium stage at top; orchestra, mezzanine, balcony.
const THEATER = {
  focus: { type: 'stage', label: 'STAGE', x: 300, y: 60, w: 400, h: 60 },
  ambient: 'from-[#120b10] to-[#1e1420]',
  sections: [
    mk('ORCH-C', 'premium', 1.7, 350, 170, 300, 150, 6, 12, { label: 'Orchestra Center' }),
    mk('ORCH-L', 'club', 1.3, 150, 190, 170, 150, 6, 7, { label: 'Orchestra L', curve: 0.4 }),
    mk('ORCH-R', 'club', 1.3, 680, 190, 170, 150, 6, 7, { label: 'Orchestra R', curve: -0.4 }),
    mk('MEZ-C', 'lower', 1.1, 320, 360, 360, 130, 5, 14, { label: 'Mezzanine' }),
    mk('BAL-C', 'upper', 0.8, 260, 520, 480, 140, 6, 18, { label: 'Balcony' }),
  ],
}

// ─────────────────────── ARENA ───────────────────────
// Center stage/court, seating bowls all around (approximated as N/E/S/W + corners).
const ARENA = {
  focus: { type: 'court', label: 'STAGE', x: 400, y: 300, w: 200, h: 120 },
  ambient: 'from-[#0a0f16] to-[#12161f]',
  sections: [
    mk('FLR', 'premium', 1.8, 410, 320, 180, 80, 4, 12, { label: 'Floor', curve: 0 }),
    mk('LWR-N', 'lower', 1.3, 340, 150, 320, 90, 4, 16, { label: 'Lower North', curve: 0.5 }),
    mk('LWR-S', 'lower', 1.3, 340, 480, 320, 90, 4, 16, { label: 'Lower South', curve: -0.5 }),
    mk('LWR-E', 'lower', 1.2, 700, 250, 90, 220, 10, 4, { label: 'Lower East', curve: 0.5, vertical: true }),
    mk('LWR-W', 'lower', 1.2, 210, 250, 90, 220, 10, 4, { label: 'Lower West', curve: -0.5, vertical: true }),
    mk('UPR-N', 'upper', 0.85, 300, 60, 400, 70, 3, 20, { label: 'Upper North', curve: 0.6 }),
    mk('UPR-S', 'upper', 0.85, 300, 590, 400, 70, 3, 20, { label: 'Upper South', curve: -0.6 }),
    mk('UPR-E', 'upper', 0.8, 810, 220, 70, 280, 14, 3, { label: 'Upper East', curve: 0.6, vertical: true }),
    mk('UPR-W', 'upper', 0.8, 120, 220, 70, 280, 14, 3, { label: 'Upper West', curve: -0.6, vertical: true }),
  ],
}

// ─────────────────────── STADIUM ───────────────────────
// Field in center, big tiered bowls. Priciest behind-the-plate / midfield.
const STADIUM = {
  focus: { type: 'field', label: 'FIELD', x: 360, y: 280, w: 280, h: 160 },
  ambient: 'from-[#08120c] to-[#0e1a12]',
  sections: [
    mk('HOME', 'premium', 1.9, 400, 470, 200, 70, 3, 16, { label: 'Home Plate', curve: -0.5 }),
    mk('INF-L', 'club', 1.4, 220, 440, 160, 90, 5, 8, { label: 'Infield L', curve: -0.4 }),
    mk('INF-R', 'club', 1.4, 620, 440, 160, 90, 5, 8, { label: 'Infield R', curve: 0.4 }),
    mk('BASE-L', 'mid', 1.1, 150, 250, 110, 180, 12, 5, { label: 'Baseline L', vertical: true, curve: -0.3 }),
    mk('BASE-R', 'mid', 1.1, 740, 250, 110, 180, 12, 5, { label: 'Baseline R', vertical: true, curve: 0.3 }),
    mk('OUT-C', 'lower', 0.95, 360, 120, 280, 90, 4, 18, { label: 'Outfield', curve: 0.5 }),
    mk('UD-L', 'upper', 0.7, 150, 90, 190, 130, 6, 10, { label: 'Upper Deck L' }),
    mk('UD-R', 'upper', 0.7, 660, 90, 190, 130, 6, 10, { label: 'Upper Deck R' }),
    mk('UD-C', 'value', 0.6, 360, 560, 280, 90, 4, 18, { label: 'Bleachers', curve: -0.6 }),
  ],
}

const VENUES = { cinema: CINEMA, theater: THEATER, arena: ARENA, stadium: STADIUM }

export const getVenue = (type) => VENUES[type] || CINEMA

// Price for a section given the event's base price.
export const sectionPrice = (section, basePrice) =>
  Math.round(basePrice * section.priceMult)

// Generate the seat objects for a section, laid out to fill its block. Each seat
// has an absolute (x,y) in the venue coordinate space so it can be drawn on the
// figure, plus a stable id namespaced by section.
export const generateSeats = (section) => {
  const seats = []
  const rows = section.rows
  const cols = section.cols
  const padX = section.w * 0.06
  const padY = section.h * 0.12
  const usableW = section.w - padX * 2
  const usableH = section.h - padY * 2
  const gx = usableW / cols
  const gy = usableH / rows
  for (let r = 0; r < rows; r++) {
    const rowLabel = String.fromCharCode(65 + r)
    for (let c = 0; c < cols; c++) {
      // curve: bow the row so ends lift/drop relative to center (arena/stadium)
      const centerOffset = (c - (cols - 1) / 2) / Math.max(1, (cols - 1) / 2)
      const bow = section.curve ? section.curve * Math.abs(centerOffset) ** 2 * (section.h * 0.5) : 0
      const x = section.x + padX + gx * c + gx / 2
      const y = section.y + padY + gy * r + gy / 2 + (section.curve ? -bow : 0)
      seats.push({
        id: `${section.id}-${rowLabel}${c + 1}`,
        row: rowLabel,
        col: c + 1,
        x,
        y,
        w: Math.min(gx * 0.7, 16),
        h: Math.min(gy * 0.7, 16),
      })
    }
  }
  return seats
}

// A viewBox string that frames a section with padding, for smooth zoom.
export const sectionViewBox = (section, pad = 60) => {
  const x = section.x - pad
  const y = section.y - pad
  const w = section.w + pad * 2
  const h = section.h + pad * 2
  return `${x} ${y} ${w} ${h}`
}

export const FULL_VIEWBOX = '0 0 1000 720'

export { TIERS }

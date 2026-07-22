// Regenerates configs/venuePricing.json from the client's venue model — the
// single source of truth for section geometry and price multipliers. Run after
// changing client/src/lib/venueModel.js:
//
//   node scripts/generateVenuePricing.mjs
//
// The server prices bookings from this JSON so what the client displays and
// what Stripe charges can never drift apart.
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const here = dirname(fileURLToPath(import.meta.url))
const model = await import('../../client/src/lib/venueModel.js')

const out = {}
for (const venueType of ['cinema', 'theater', 'arena', 'stadium']) {
  const venue = model.getVenue(venueType)
  out[venueType] = {}
  for (const section of venue.sections) {
    out[venueType][section.id] = {
      mult: Number(section.priceMult.toFixed(4)),
      capacity: model.sectionCapacity(section),
    }
  }
}

const target = join(here, '../configs/venuePricing.json')
writeFileSync(target, JSON.stringify(out, null, 2))
console.log('wrote', target)

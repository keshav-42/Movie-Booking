import { readFileSync } from "fs";

// Section price multipliers + capacities, generated from the client's venue
// model (scripts/generateVenuePricing.mjs). Server-side source of truth for
// booking amounts so the displayed price and the charged price never drift.
const pricing = JSON.parse(
  readFileSync(new URL("../configs/venuePricing.json", import.meta.url))
);

const SEAT_RE = /^(.+)-([A-Z])(\d{1,3})$/;

export const sectionOfSeat = (seatId) => {
  const m = SEAT_RE.exec(seatId);
  return m ? m[1] : null;
};

// Every seat must be well-formed and belong to a section of this venue type.
export const validateSeats = (venueType, seats) => {
  const sections = pricing[venueType];
  if (!sections) return { ok: false, message: `Unknown venue type: ${venueType}` };
  if (!Array.isArray(seats) || seats.length === 0)
    return { ok: false, message: "No seats selected" };
  if (seats.length > 8) return { ok: false, message: "Maximum 8 seats per booking" };
  if (new Set(seats).size !== seats.length)
    return { ok: false, message: "Duplicate seats in selection" };
  for (const seat of seats) {
    const section = sectionOfSeat(seat);
    if (!section || !sections[section])
      return { ok: false, message: `Invalid seat: ${seat}` };
  }
  return { ok: true };
};

export const seatPrice = (venueType, basePrice, seatId) => {
  const section = sectionOfSeat(seatId);
  const mult = pricing[venueType]?.[section]?.mult ?? 1;
  return Math.max(1, Math.round(basePrice * mult));
};

// Total for a set of seats, priced per seat by its section tier.
export const computeAmount = (venueType, basePrice, seats) =>
  seats.reduce((sum, seat) => sum + seatPrice(venueType, basePrice, seat), 0);

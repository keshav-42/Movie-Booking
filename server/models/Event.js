import mongoose from "mongoose";

// A live event (concert / sports / theater / comedy). Mirrors the Movie model
// so Shows, bookings and emails can treat either interchangeably. `_id` is a
// string: the Ticketmaster event id when ingested from the Discovery API, or
// any unique slug for manually-added events.
const eventSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    title: { type: String, required: true },
    subtitle: { type: String, default: "" },
    overview: { type: String, default: "" },
    category: {
      type: String,
      required: true,
      enum: ["sports", "concerts", "theater", "comedy"],
    },
    genres: { type: Array, default: [] },
    // Absolute image URLs (Ticketmaster serves full URLs, unlike TMDB paths)
    poster_path: { type: String, required: true },
    backdrop_path: { type: String, required: true },
    venue: { type: String, required: true },
    city: { type: String, default: "" },
    // Which seat-map geometry the client renders: arena | stadium | theater
    venueType: {
      type: String,
      required: true,
      enum: ["cinema", "theater", "arena", "stadium"],
    },
    vote_average: { type: Number, default: 0 },
    runtimeLabel: { type: String, default: "" },
  },
  { timestamps: true }
);

const Event = mongoose.model("Event", eventSchema);

export default Event;

// Temporary verification fixture: inserts one event + one show, prints the
// show id, or cleans them up with `--cleanup`. Used to exercise the public
// event/booking endpoints without going through Clerk-protected admin routes.
import "dotenv/config";
import mongoose from "mongoose";
import Event from "../models/Event.js";
import Show from "../models/Show.js";

const TEST_ID = "verify-test-event-DELETE-ME";

await mongoose.connect(`${process.env.MONGODB_URI}/quickshow`);

if (process.argv.includes("--cleanup")) {
  await Show.deleteMany({ event: TEST_ID });
  await Event.findByIdAndDelete(TEST_ID);
  console.log("cleaned up");
} else {
  await Event.findByIdAndUpdate(
    TEST_ID,
    {
      _id: TEST_ID,
      title: "VERIFY Test Concert",
      category: "concerts",
      poster_path: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&q=80",
      backdrop_path: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&q=80",
      venue: "Test Arena",
      city: "Testville",
      venueType: "arena",
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const show = await Show.create({
    event: TEST_ID,
    showDateTime: new Date(Date.now() + 2 * 864e5),
    showPrice: 50,
    occupiedSeats: { "L101-A1": "someuser" },
  });
  console.log("showId", show._id.toString());
}

await mongoose.disconnect();

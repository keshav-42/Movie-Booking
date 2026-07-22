import mongoose from "mongoose";

// A Show is one bookable occurrence (date+time) of either a movie screening or
// a live event — exactly one of `movie` / `event` is set. Seat reservation,
// Stripe checkout, the Inngest seat-release timer and emails all operate on
// Shows, so events get the full booking pipeline for free.
const showSchema = new mongoose.Schema(
    {
        movie: {type: String, ref: 'Movie'},
        event: {type: String, ref: 'Event'},
        showDateTime: {type: Date, required: true},
        showPrice: {type: Number, required: true},
        occupiedSeats: {type: Object, default:{}},
    }, {minimize: false}
    //minimize: false ensures an empty occupiedSeats object is stored instead of
    //being stripped, so show.occupiedSeats is always an object in code.
)

showSchema.pre('validate', function (next) {
    if (!this.movie && !this.event) {
        return next(new Error('Show requires either a movie or an event reference'))
    }
    next()
})

const Show = mongoose.model("Show", showSchema)

export default Show

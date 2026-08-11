import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
    user: {type: String, required: true, ref: 'User'},
    show: {type: String, required: true, ref: 'Show'},
    amount: {type: Number, required: true, ref: 'Show'},
    bookedSeats: {type: Array, required: true},
    isPaid: {type: Boolean, default: false},
    paymentLink: {type: String},
    //Kept so the seat-release job can expire the Checkout Session itself.
    //Stripe's minimum session lifetime is 30 minutes, which outlives the
    //10-minute seat hold, so the session has to be killed explicitly or a
    //user could still pay for seats that were already handed to someone else.
    stripeSessionId: {type: String},
}, {timestamps: true})

const Booking = mongoose.model('Booking', bookingSchema)

export default Booking
import { inngest } from "../Inngest/index.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js"
import stripe from 'stripe'
import { validateSeats, computeAmount } from "../utils/venuePricing.js";

//Atomically reserve the selected seats. The filter asserts every requested
//seat is still free and the same operation marks them taken, so checking and
//claiming can't be interleaved: two simultaneous requests for the same seat
//can never both match, and the loser gets null back.
//Seat ids are safe as dotted paths here — validateSeats has already confirmed
//each one is a well-formed id belonging to a real section of this venue.
const reserveSeats = async(showId, selectedSeats, userId) => {
    const filter = {_id: showId}
    const update = {}

    for(const seat of selectedSeats){
        filter[`occupiedSeats.${seat}`] = {$exists: false}
        update[`occupiedSeats.${seat}`] = userId
    }

    return Show.findOneAndUpdate(filter, {$set: update}, {new: true})
}

//Undo a reservation when checkout can't be completed (e.g. Stripe fails), so
//the seats aren't left held by a booking that never made it to the payment
//timer that would otherwise release them.
const releaseSeats = async(showId, selectedSeats) => {
    const update = {}

    for(const seat of selectedSeats){
        update[`occupiedSeats.${seat}`] = ""
    }

    await Show.updateOne({_id: showId}, {$unset: update})
}

export const createBooking = async(req, res) => {
    try {
        const {userId} = req.auth()
        const {showId, selectedSeats} = req.body
        const {origin} = req.headers    //front end url

        //Get the show details — a show hosts either a movie or a live event
        const showData = await Show.findById(showId).populate('movie').populate('event')
        if(!showData){
            return res.json({success: false, message: "Show not found"})
        }

        const subject = showData.movie || showData.event
        const venueType = showData.event?.venueType || 'cinema'

        //Validate the seat ids against the venue's real sections (no trusting
        //the client for what exists)
        const valid = validateSeats(venueType, selectedSeats)
        if(!valid.ok){
            return res.json({success: false, message: valid.message})
        }

        //Amount is computed server-side per seat from the section's price tier,
        //matching exactly what the seat map displays.
        const amount = computeAmount(venueType, showData.showPrice, selectedSeats)

        //Claim the seats. Reserving before creating the booking means a losing
        //request never gets a booking or a Stripe session at all.
        const reserved = await reserveSeats(showId, selectedSeats, userId)
        if(!reserved){
            return res.json({success: false, message: "Selected seats are not available"})
        }

        //From here the seats are held, so any failure has to hand them back.
        let booking = null
        try {
            //create a new booking
            booking = await Booking.create({
                user: userId,
                show: showId,
                amount,
                bookedSeats: selectedSeats
            })

            //Stripe Gateway Initialize
            const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY)

            //creating line items for stripe
            const line_items = [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: subject?.title || 'Ticket booking'
                    },
                    unit_amount: Math.floor(booking.amount) * 100
                },
                quantity: 1
            }]

            //creating payment session
            const session = await stripeInstance.checkout.sessions.create({
                success_url: `${origin}/booking-success?bookingId=${booking._id.toString()}`,
                cancel_url: `${origin}/my-bookings`,
                line_items: line_items,
                mode: 'payment',
                metadata: {
                    bookingId: booking._id.toString()
                },
                expires_at: Math.floor(Date.now() / 1000) + 30 * 60 //expires in 30 minutes
            })

            booking.paymentLink = session.url

            await booking.save()

            //Run Inngest scheduler function to check payment status after 10 minutes.
            //Best-effort: the booking + Stripe session already exist, so a background
            //job dispatch failure (e.g. Inngest not configured in local dev) must not
            //block the checkout redirect.
            try {
                await inngest.send({
                    name: 'app/checkpayment',
                    data:{
                        bookingId: booking._id.toString()
                    }
                })
            } catch (error) {
                console.error('Inngest dispatch failed (checkpayment):', error.message)
            }

            res.json({success: true, url: session.url})
        } catch (error) {
            //No payment timer is running for this booking yet, so nothing else
            //would ever free these seats — release them here.
            await releaseSeats(showId, selectedSeats)
            if(booking){
                await Booking.findByIdAndDelete(booking._id)
            }
            throw error
        }
    } catch (error) {
        console.error(error.message)
        res.json({success: false, message: error.message})
    }
}

// Single booking, scoped to the requesting user — powers the post-checkout
// success screen (fetched by the bookingId in the Stripe success_url).
export const getBookingById = async(req, res) => {
    try {
        const {userId} = req.auth()
        const {bookingId} = req.params

        const booking = await Booking.findOne({_id: bookingId, user: userId}).populate({
            path: 'show',
            populate: [{path: 'movie'}, {path: 'event'}]
        })
        if(!booking){
            return res.json({success: false, message: "Booking not found"})
        }

        res.json({success: true, booking})
    } catch (error) {
        console.error(error.message)
        res.json({success: false, message: error.message})
    }
}

export const getOccupiedSeats = async(req, res) => {
    try {
        const {showId} = req.params;
        const showData = await Show.findById(showId)
        if(!showData){
            return res.json({success: false, message: "Show not found"})
        }

        const occupiedSeats = Object.keys(showData.occupiedSeats)

        res.json({success: true, occupiedSeats})
    } catch (error) {
        console.error(error.message)
        res.json({success: false, message: error.message})
    }
}

import { clerkClient } from "@clerk/express";
import Booking from "../models/Booking.js";
import Movie from "../models/Movie.js";


//API controller function to Get user Bookings
export const getUserBookings = async(req, res) => {
    try {
        const user = req.auth().userId;

        const bookings = await Booking.find({user}).populate({
            path: 'show',
            populate: [{path: 'movie'}, {path: 'event'}]
        }).sort({createdAt: -1})

        res.json({success: true, bookings})
    } catch (error) {
        console.error(error.message)
        res.json({success: false, message: error.message})
    }
}

//API Controller function to Update favourite Movie in Clerk User Metadata

export const updateFavourite = async(req, res) => {
    try {
        const {movieId} = req.body

        const userId = req.auth().userId

        const user = await clerkClient.users.getUser(userId)

        if(!user.privateMetadata.favourites){
         user.privateMetadata.favourites = []
        }

        let message = ''
        if(!user.privateMetadata.favourites.includes(movieId)){
            user.privateMetadata.favourites.push(movieId)
            message = 'Added to favourites'
        }else{
            user.privateMetadata.favourites = user.privateMetadata.favourites.filter((item) => item !== movieId)
            message = 'Removed from favourites'
        }

        await clerkClient.users.updateUserMetadata(userId, {privateMetadata: user.privateMetadata})

        res.json({success: true, message})
    } catch (error) {
        console.error(error.message);
        res.json({success: false, message: error.message})
    }
}

// Mint a one-time Clerk sign-in token for the shared demo account so first-time
// visitors can try the booking flow without creating an account. The frontend
// redeems it with signIn.create({ strategy: 'ticket' }). Public route on purpose.
export const demoLogin = async (req, res) => {
    try {
        const demoUserId = process.env.DEMO_USER_ID || 'user_3Gts7jyIZNOSjCSFWTbEy2uEHKI'

        const response = await fetch('https://api.clerk.com/v1/sign_in_tokens', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ user_id: demoUserId, expire_in_seconds: 600 }),
        })

        const data = await response.json()
        if (!response.ok) {
            const message = data?.errors?.[0]?.long_message || 'Could not start demo session'
            return res.json({ success: false, message })
        }

        res.json({ success: true, token: data.token })
    } catch (error) {
        console.error(error.message)
        res.json({ success: false, message: error.message })
    }
}

//API to get Favourite movies
export const getFavourites = async (req, res) => {
    try {
        const user = await clerkClient.users.getUser(req.auth().userId)
        const favourites = user.privateMetadata.favourites

        //Getting movies from database
        const movies = await Movie.find({_id: {$in: favourites}})

        res.json({success: true, movies})
    } catch (error) {
        console.error(error.message);
        res.json({success: false, message: error.message})
    }
}
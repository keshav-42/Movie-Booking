import express from "express";
import { createBooking, getOccupiedSeats, getBookingById } from "../controllers/bookingController.js";

const bookingRouter = express.Router()

bookingRouter.post('/create', createBooking)
bookingRouter.get('/seats/:showId', getOccupiedSeats)
bookingRouter.get('/:bookingId', getBookingById)

export default bookingRouter
import express from "express";
import { demoLogin, getFavourites, getUserBookings, updateFavourite } from "../controllers/userController.js";

const userRouter = express.Router()

userRouter.post('/demo-login', demoLogin)
userRouter.get('/bookings',getUserBookings)
userRouter.post('/update-favourite', updateFavourite)
userRouter.get('/favourites', getFavourites)

export default userRouter
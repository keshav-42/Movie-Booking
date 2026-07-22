import express from "express";
import {
  getUpstreamEvents,
  addEventShow,
  getEvents,
  getEvent,
} from "../controllers/eventController.js";
import { protectAdmin } from "../middleware/auth.js";

const eventRouter = express.Router();

eventRouter.get("/upstream", protectAdmin, getUpstreamEvents);
eventRouter.post("/add", protectAdmin, addEventShow);
eventRouter.get("/all", getEvents);
eventRouter.get("/:eventId", getEvent);

export default eventRouter;

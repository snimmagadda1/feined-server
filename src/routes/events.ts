import { Router } from "express";
import { type Event, type EventRequest } from "../models";
import logger from "../utils/logger";
import { eventService } from "../services";
import { isAuth } from "../middleware/session";

const router = Router();

router.get("/user/:userId", isAuth, (req, res) => {
  let userId = null;
  try {
    userId = req.params.userId;
    const collection = eventService.getUserEvents(userId);
    if (!collection) {
      res.status(200).json([]);
      return;
    }

    // iterate the keys and return an array of events
    const eventsArray: Event[] = [];
    for (const [date, events] of collection.entries()) {
      events.forEach((event) => {
        eventsArray.push(event);
      });
    }

    res.status(200).json(eventsArray);
  } catch (error) {
    logger.error(`Error during get user events for userId ${userId}`, error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/user/:userId", isAuth, (req, res) => {
  let userId = null;
  try {
    userId = req.params.userId;
    const toAdd: EventRequest[] = req.body;

    if (!_hasUser(userId)) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // todo: validate events (order, types, etc)

    // prep for insert
    const addedEvents: Event[] = [];
    toAdd.forEach((event) => {
      const added = eventService.createEvent(event);
      addedEvents.push(added);
    });

    res.status(200).json(addedEvents);
  } catch (error) {
    logger.error(`Error during add user events for userId ${userId}`, error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// TODO: check if user exists in datastore (service)
const _hasUser = (userId: string) => {
  return eventService.getUserEvents(userId) !== null;
};

export default router;

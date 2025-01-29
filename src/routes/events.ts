import { parseISO, startOfDay } from "date-fns";
import { Router } from "express";
import { nanoid } from "nanoid";
import { EVENTS_COLLECTION } from "../loaders/datastore";
import { type Event, type EventRequest } from "../models";
import logger from "../utils/logger";

const router = Router();

router.get("/user/:userId", (req, res) => {
  let userId = null;
  try {
    userId = req.params.userId;
    const collection = EVENTS_COLLECTION.get(userId);
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

router.post("/user/:userId", (req, res) => {
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
    const toInsert: Event[] = toAdd.map((event) => ({
      ...event,
      id: nanoid(10),
      date: startOfDay(parseISO(event.date)),
    }));

    let userData = EVENTS_COLLECTION.get(userId);
    if (!userData) {
      EVENTS_COLLECTION.set(userId, new Map());
      userData = EVENTS_COLLECTION.get(userId);
    }

    toInsert.forEach((event) => {
      const events = userData?.get(event.date!.getTime());
      if (events) {
        events.push(event);
        userData!.set(event.date!.getTime(), events);
      } else {
        userData?.set(event.date!.getTime(), [event]);
      }
    });

    res.status(200).json(toAdd);
  } catch (error) {
    logger.error(`Error during add user events for userId ${userId}`, error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// TODO: check if user exists in datastore (service)
const _hasUser = (userId: string) => {
  return EVENTS_COLLECTION.has(userId);
};

export default router;

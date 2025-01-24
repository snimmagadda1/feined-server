import { parseISO, startOfDay } from "date-fns";
import { Router } from "express";
import { nanoid } from "nanoid";

export type Event = {
  id: string;
  title: string;
  date: Date;
  completed: boolean;
  notes: string;
  color: string;
  timestamp: number;
  index: number;
  userId: string;
  _deleted: boolean;
};

type EventRequest = Omit<Event, "date"> & {
  date: string;
};

const router = Router();

// Map<userId -> Map<UNIX-timestamp, Event[]>>
const EVENTS_COLLECTION = new Map<string, Map<number, Event[]>>();

EVENTS_COLLECTION.set(
  "1",
  new Map([
    [
      startOfDay(new Date("2025-01-01T00:00:00.000Z")).getTime(),
      [
        {
          id: nanoid(10),
          userId: "1",
          title: "Event 1",
          completed: false,
          notes: "Notes 1",
          color: "red",
          date: startOfDay(new Date("2025-01-01T00:00:00.000Z")),
          timestamp: 1716537600000,
          index: 0,
          _deleted: false,
        },
      ],
    ],
  ])
);

router.get("/", (req, res) => {
  res.json({ message: "Hello World" });
});

router.get("/user/:userId", (req, res) => {
  const { userId } = req.params;
  const collection = EVENTS_COLLECTION.get(userId);
  if (!collection) {
    res.status(200).json([]);
    return;
  }

  // iterate the keys and return an array of events
  const eventsArray: Event[] = [];
  for (const [date, events] of collection.entries()) {
    events.forEach((event) => {
      event.date = new Date(date);
      eventsArray.push(event);
    });
  }

  res.status(200).json(eventsArray);
});

router.post("/user/:userId", (req, res) => {
  const { userId } = req.params;
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

  const userData = EVENTS_COLLECTION.get(userId);
  toInsert.forEach((event) => {
    const events = userData?.get(event.date!.getTime());
    if (events) {
      events.push(event);
    } else {
      userData?.set(event.date!.getTime(), [event]);
    }
  });

  res.status(200).json(toAdd);
});

// TODO: check if user exists in datastore (service)
const _hasUser = (userId: string) => {
  return EVENTS_COLLECTION.has(userId);
};

export default router;

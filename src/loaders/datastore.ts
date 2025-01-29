import { join } from "path";
import { parseISO } from "date-fns";
import type { Event, EventRequest, User } from "../models";
import logger from "../utils/logger";
import userService from "../services/user-service";

// Map<userId -> Map<UNIX-timestamp, Event[]>>
export let EVENTS_COLLECTION = new Map<string, Map<number, Event[]>>();

export function dangerouslySetEventsCollection(
  eventsCollection: Map<string, Map<number, Event[]>>
) {
  EVENTS_COLLECTION = eventsCollection;
}

export default async function () {
  await loadUsers();
  await loadEvents();
  // FIXME: params
  // const interval = 1000 * 60 * 60 * 24;
  const interval = 10000;
  setInterval(() => {
    backupUsers();
  }, interval);
  setInterval(() => {
    backupEvents();
  }, interval);
}

// FIXME: do this more efficiently
const backupUsers = async () => {
  const users = userService.getAllUsers();
  await Bun.write(
    join(import.meta.dir, "../data/users.json"),
    JSON.stringify(users)
  );
  logger.info("____ background job: Users backed up ____");
};

const backupEvents = async () => {
  const allEvents = [...EVENTS_COLLECTION.values()] // Get array of timestamp Maps
    .flatMap((timeMap) => [...timeMap.values()]) // Get arrays of events
    .flat(); // Flatten the event arrays

  await Bun.write(
    join(import.meta.dir, "../data/events.json"),
    JSON.stringify(allEvents)
  );
  logger.info("____ background job: Events backed up ____");
};

const loadUsers = async () => {
  // FIXME: stream this in chunks for large files
  const stored = Bun.file(join(import.meta.dir, "../data/users.json"));

  const users = (await stored.json()) as User[];
  logger.info(`Retrieved ${users.length} users from file`);
  users.forEach((user) => {
    userService.createUser(user);
  });
  logger.info(`Loaded ${userService.getAllUsers().length} users`);
};

const loadEvents = async () => {
  const stored = Bun.file(join(import.meta.dir, "../data/events.json"));
  const events = (await stored.json()) as EventRequest[];
  const eventsData: Event[] = [];
  events.forEach((event) => {
    eventsData.push({
      ...event,
      date: parseISO(event.date),
    });
  });

  eventsData.forEach((event) => {
    let userData = EVENTS_COLLECTION.get(event.userId);
    if (!userData) {
      EVENTS_COLLECTION.set(event.userId, new Map());
      userData = EVENTS_COLLECTION.get(event.userId);
    }
    const events = userData!.get(event.date!.getTime()) || [];
    events.push(event);
    userData!.set(event.date!.getTime(), events);
  });
  logger.info(`Loaded documents for ${EVENTS_COLLECTION.size} distinct users`);
  for (const [userId, events] of EVENTS_COLLECTION.entries()) {
    logger.info(`User ${userId} has ${events.size} documents`);
  }
};

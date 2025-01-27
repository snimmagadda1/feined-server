import { join } from "path";
import type { User } from "../routes/users";
import type { Event, EventRequest } from "../routes/events";
import { parseISO } from "date-fns";

// Map<oauthProfileId -> User>
// FIXME: service
export const USERS_COLLECTION = new Map<string, User>();

// Map<userId -> Map<UNIX-timestamp, Event[]>>
export const EVENTS_COLLECTION = new Map<string, Map<number, Event[]>>();

export default async function () {
  await loadUsers();
  await loadEvents();
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
  const users = Array.from(USERS_COLLECTION.values());
  await Bun.write(
    join(import.meta.dir, "../data/users.json"),
    JSON.stringify(users)
  );
  console.log("**** background job: Users backed up ****");
};

const backupEvents = async () => {
  const allEvents = [...EVENTS_COLLECTION.values()] // Get array of timestamp Maps
    .flatMap((timeMap) => [...timeMap.values()]) // Get arrays of events
    .flat(); // Flatten the event arrays  console.log(allEvents);

  await Bun.write(
    join(import.meta.dir, "../data/events.json"),
    JSON.stringify(allEvents)
  );
  console.log("**** background job: Events backed up ****");
};

const loadUsers = async () => {
  // FIXME: stream this in chunks for large files
  const stored = Bun.file(join(import.meta.dir, "../data/users.json"));

  const users = (await stored.json()) as User[];
  users.forEach((user) => {
    USERS_COLLECTION.set(user.id, user);
  });
  console.log(`Loaded ${USERS_COLLECTION.size} users`);
};

const loadEvents = async () => {
  const stored = Bun.file(join(import.meta.dir, "../data/events.json"));
  console.log(stored);
  console.log(await stored.json());

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
  console.log(`Loaded documents for ${EVENTS_COLLECTION.size} distinct users`);
  for (const [userId, events] of EVENTS_COLLECTION.entries()) {
    console.log(`User ${userId} has ${events.size} documents`);
  }
};

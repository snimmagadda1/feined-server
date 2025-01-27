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
}

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

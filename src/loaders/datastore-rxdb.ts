import { DB } from "./rxdb";

import { EVENTS_COLLECTION, USERS_COLLECTION } from "./datastore";
import type { RxEventDocumentType } from "../rxdb-server/schema";

export default async function () {
  if (!DB) {
    throw new Error("DB required for datastore-rxdb loader");
  }

  const userCollection = DB.users;
  const eventsCollection = DB.events;

  if (!userCollection || !eventsCollection) {
    throw new Error(
      "user or events collection required for datastore-rxdb loader"
    );
  }

  console.log("Attempting to insert users...");
  const result1 = await userCollection.bulkInsert([
    ...USERS_COLLECTION.values(),
  ]);

  console.log("Attempting to insert events...");

  const allEvents = [...EVENTS_COLLECTION.values()] // Get array of timestamp Maps
    .flatMap((timeMap) => [...timeMap.values()]) // Get arrays of events
    .flat(); // Flatten the event arrays  console.log(allEvents);

  const allEventDocs = allEvents.map((event) => ({
    ...event,
    date: event.date.toISOString(),
  })) as RxEventDocumentType[];

  const result2 = await eventsCollection.bulkInsert(allEventDocs);
}

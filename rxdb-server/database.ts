import {
  addRxPlugin,
  createRxDatabase,
  removeRxDatabase,
  type RxCollectionCreator,
} from "rxdb";
import { getRxStorageMemory } from "rxdb/plugins/storage-memory";
import { formatISO, isToday, startOfDay } from "date-fns";
import {
  EVENTS_SCHEMA,
  type RxEventsDatabase,
  type RxEventDocumentType,
  USER_SCHEMA_LITERAL,
  type RxUserDocumentType,
} from "./schema";

const collectionSettings = {
  ["events"]: {
    schema: EVENTS_SCHEMA,
  } as RxCollectionCreator<any>,
  ["users"]: {
    schema: USER_SCHEMA_LITERAL,
  } as RxCollectionCreator<any>,
};

const initWeek = () => {
  const currentDate = new Date();
  const currentDayOfWeek = currentDate.getDay();
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDayOfWeek);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  const week = [];

  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(startOfWeek);
    dayDate.setDate(startOfWeek.getDate() + i);
    week.push({
      date: startOfDay(dayDate),
      isCurrent: isToday(dayDate),
    });
  }

  return week;
};

export async function createDb(): Promise<RxEventsDatabase> {
  // TODO: check dev mode
  await import("rxdb/plugins/dev-mode").then((module) =>
    addRxPlugin(module.RxDBDevModePlugin)
  );

  const storage = getRxStorageMemory();

  await removeRxDatabase("feineddb", storage);

  const db = await createRxDatabase<any>({
    name: "feineddb",
    storage: storage,
  });

  console.log("DatabaseService: created database");

  await db.addCollections(collectionSettings);

  console.log("DatabaseService: create collections");

  const week = initWeek();
  await db.events.bulkInsert(
    [
      "A demo event",
      "Hover me to mark as complete",
      "This one has a color",
    ].map(
      (title, idx) =>
        ({
          id: "event-" + idx,
          title,
          date: formatISO(startOfDay(week[idx].date), {
            representation: "complete",
          }),
          index: 0,
          completed: false,
          notes: "",
          timestamp: new Date().getTime(),
        } as RxEventDocumentType)
    )
  );
  console.log("DatabaseService: bulk insert events");

  const testUser = {
    id: "test-user",
    email: "test@test.com",
    name: "Test User",
    githubId: "test-githubId-id",
  } as RxUserDocumentType;

  await db.users.bulkInsert([testUser]);
  console.log("DatabaseService: bulk insert users");

  return db;
}

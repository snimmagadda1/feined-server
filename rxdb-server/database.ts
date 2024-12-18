import {
  addRxPlugin,
  createRxDatabase,
  removeRxDatabase,
  type RxCollectionCreator,
} from "rxdb";
import { getRxStorageMemory } from "rxdb/plugins/storage-memory";
import {
  EVENTS_SCHEMA,
  type RxEventsDatabase,
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

export async function createDb(): Promise<RxEventsDatabase> {
  // TODO: check dev mode
  if (process.env.NODE_ENV !== "production") {
    await import("rxdb/plugins/dev-mode").then((module) =>
      addRxPlugin(module.RxDBDevModePlugin)
    );
  }

  const storage = getRxStorageMemory();

  await removeRxDatabase("feineddb", storage);

  const db = await createRxDatabase<any>({
    name: "feineddb",
    storage: storage,
  });

  console.log("DatabaseService: created database");

  await db.addCollections(collectionSettings);

  console.log("DatabaseService: create collections");

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

import {
  type RxDatabase,
  type RxCollection,
  type RxJsonSchema,
  toTypedRxJsonSchema,
  type ExtractDocumentTypeFromTypedRxJsonSchema,
  type RxCollectionCreator,
  addRxPlugin,
  createRxDatabase,
  removeRxDatabase,
} from "rxdb";
import { getRxStorageMemory } from "rxdb/plugins/storage-memory";
import { formatISO, isToday, startOfDay } from "date-fns";
import { createRxServer } from "rxdb-server/plugins/server";

const EVENT_SCHEMA_LITERAL = {
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: {
      type: "string",
      maxLength: 100,
    },
    title: {
      type: "string",
    },
    date: {
      type: "string",
      format: "date-time",
      maxLength: 30,
    },
    completed: {
      type: "boolean",
    },
    notes: {
      type: "string",
    },
    color: {
      type: "string",
    },
    timestamp: {
      type: "number",
    },
    _deleted: {
      type: "boolean",
    },
  },
  required: ["id", "title", "date"],
  indexes: ["date"],
} as const;

const schemaTyped = toTypedRxJsonSchema(EVENT_SCHEMA_LITERAL);

export type RxEventDocumentType = ExtractDocumentTypeFromTypedRxJsonSchema<
  typeof schemaTyped
>;

export const EVENTS_SCHEMA: RxJsonSchema<RxEventDocumentType> =
  EVENT_SCHEMA_LITERAL;

const collectionSettings = {
  ["events"]: {
    schema: EVENTS_SCHEMA,
  } as RxCollectionCreator<any>,
};

let DB_INSTANCE: RxEventsDatabase;

type RxEventMethods = {};

export type RxEventsCollection = RxCollection<
  RxEventDocumentType,
  RxEventMethods,
  {},
  {},
  unknown
>;

export type RxEventsCollections = {
  events: RxEventsCollection;
};

export type RxEventsDatabase = RxDatabase<
  RxEventsCollections,
  any,
  any,
  unknown
>;

const initWeek = () => {
  const currentDate = new Date();
  const currentDayOfWeek = currentDate.getDay(); // 0 (Sunday) to 6 (Saturday)
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDayOfWeek); // Set to Sunday
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // Set to Saturday

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

import { type Server } from "bun";
import { RxServerAdapterExpress } from "rxdb-server/plugins/adapter-express";

export const HTTP_SERVER_BY_BUN = new WeakMap<Server, Server>();

export async function _createDb(): Promise<RxEventsDatabase> {
  // TODO: check dev mode
  await import("rxdb/plugins/dev-mode").then((module) =>
    addRxPlugin(module.RxDBDevModePlugin)
  );

  // Data will only exist as long as server does :P
  const storage = getRxStorageMemory();

  await removeRxDatabase("feineddb", storage);

  const db = await createRxDatabase<RxEventsCollections>({
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
          completed: false,
          notes: "",
          timestamp: new Date().getTime(),
        } as RxEventDocumentType)
    )
  );
  console.log("DatabaseService: bulk insert");
  return db;
}

DB_INSTANCE = await _createDb();

const rxServer = await createRxServer({
  database: DB_INSTANCE as unknown as RxDatabase,
  port: 3000,
  adapter: RxServerAdapterExpress,
  cors: "*",
});

// events endpoint
const endpoint = await rxServer.addRestEndpoint({
  name: "events",
  collection: DB_INSTANCE.events,
  cors: "*",
});

console.log("RxServer: endpoint created ", endpoint.urlPath);

// replication endpoint
const replicationEndpoint = await rxServer.addReplicationEndpoint({
  name: "events-rpl",
  collection: DB_INSTANCE.events,
  cors: "*",
});
console.log("RxServer: rpl endpoint created ", replicationEndpoint.urlPath);

await rxServer.start();

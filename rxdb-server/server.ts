import { type RxDatabase } from "rxdb";
import { createRxServer } from "rxdb-server/plugins/server";
import { RxServerAdapterExpress } from "rxdb-server/plugins/adapter-express";
import type { RxEventsDatabase } from "./schema";

export async function setupServer(db: RxEventsDatabase) {
  const hostname =
    process.env.NODE_ENV === "production" ? "0.0.0.0" : "localhost";
  console.log("Starting server with hostname: ", hostname);

  const rxServer = await createRxServer({
    database: db as unknown as RxDatabase,
    port: 8080,
    hostname: hostname,
    adapter: RxServerAdapterExpress,
    cors: Bun.env.CORS,
  });

  // events endpoint
  const events = await rxServer.addRestEndpoint({
    name: "events",
    collection: db.events,
    cors: Bun.env.CORS,
  });
  console.log("RxServer: endpoint created ", events.urlPath);

  // users endpoint (test only)
  const users = await rxServer.addRestEndpoint({
    name: "users",
    collection: db.users,
    cors: Bun.env.CORS,
  });
  console.log("RxServer: endpoint created ", users.urlPath);

  // replication endpoint
  const replicationEndpoint = await rxServer.addReplicationEndpoint({
    name: "events-rpl",
    collection: db.events,
    cors: Bun.env.CORS,
  });
  console.log("RxServer: rpl endpoint created ", replicationEndpoint.urlPath);

  return rxServer;
}

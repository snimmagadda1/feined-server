import { type RxDatabase } from "rxdb";
import { createRxServer } from "rxdb-server/plugins/server";
import { RxServerAdapterExpress } from "rxdb-server/plugins/adapter-express";
import type { Express } from "express";
import type { Server } from "bun";
import type { RxEventsDatabase } from "./schema";

export const HTTP_SERVER_BY_BUN = new WeakMap<Server, Server>();

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
  const endpoint = await rxServer.addRestEndpoint({
    name: "events",
    collection: db.events,
    cors: Bun.env.CORS,
  });

  console.log("RxServer: endpoint created ", endpoint.urlPath);

  // replication endpoint
  const replicationEndpoint = await rxServer.addReplicationEndpoint({
    name: "events-rpl",
    collection: db.events,
    cors: Bun.env.CORS,
  });
  console.log("RxServer: rpl endpoint created ", replicationEndpoint.urlPath);

  // Access the underlying Express app
  const expressApp = rxServer.serverApp as Express;

  // Add your custom Express endpoints
  expressApp.get("/hello", (req, res) => {
    res.json({ message: "Hello World!" });
  });

  await rxServer.start();
  return rxServer;
}

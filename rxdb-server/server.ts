import { type MangoQuery, type RxDatabase, type RxDocumentData } from "rxdb";
import {
  createRxServer,
  type RxServerAuthData,
  type RxServerAuthHandler,
} from "rxdb-server/plugins/server";
import { RxServerAdapterExpress } from "rxdb-server/plugins/adapter-express";
import type { RxEventsDatabase, RxUserDocumentType } from "./schema";
import { type IncomingHttpHeaders } from "http";
type GithubAuthData = {
  githubId: string;
};

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
    authHandler: ((
      headers: IncomingHttpHeaders
    ): RxServerAuthData<GithubAuthData> => {
      console.warn("Auth handler called", headers);
      return {
        data: {
          githubId: headers["x-github-id"] as string,
        },
        validUntil: Date.now() + 1000 * 60 * 60 * 24, // 1 day // TODO:align with session
      };
    }) satisfies RxServerAuthHandler<GithubAuthData>,
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
    queryModifier: userQueryModifier, // TODO: testing
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

function userQueryModifier(authData: any, query: any) {
  query.selector.githubId = { $eq: authData.data.githubId };
  return query;
}

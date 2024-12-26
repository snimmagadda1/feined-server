import { type RxDatabase } from "rxdb";
import {
  createRxServer,
  type RxServerAuthData,
} from "rxdb-server/plugins/server";
import { RxServerAdapterExpress } from "rxdb-server/plugins/adapter-express";
import type { RxEventsDatabase, RxUserDocumentType } from "./schema";
import { getCookies, getSessionId, getUserId } from "../utils";
import { type IncomingHttpHeaders } from "http";
import type { Store } from "express-session";

type GithubAuthData = {
  id: string | null;
};

// TODO: type
export async function setupServer(db: RxEventsDatabase, store: Store) {
  const hostname =
    process.env.NODE_ENV === "production" ? "0.0.0.0" : "localhost";
  console.log("Initializing rx-server with hostname: ", hostname);
  const rxServer = await createRxServer({
    database: db as unknown as RxDatabase,
    port: 8080,
    hostname: hostname,
    adapter: RxServerAdapterExpress,
    cors: Bun.env.CORS,
    authHandler: async (
      headers: IncomingHttpHeaders
    ): Promise<RxServerAuthData<GithubAuthData>> => {
      let id = null;
      try {
        const cookies = getCookies(headers);
        let sessionId = getSessionId(cookies);

        // Fetch userId from store
        id = await getUserId(sessionId || "", store);
        if (!id) {
          throw new Error('No user found in session');
        }
      } catch (error) {
        // Explicitly log b/c rx-server doesn't seem to...
        console.error('Error in rxDb authHandler', error);
        throw (error);
      }
      console.log('Returning userId', id);
      return {
        data: {
          id
        },
        validUntil: Date.now() + 1000 * 60 * 60 * 24, // 1 day // TODO:align with session
      };
    },
  });

  // events endpoint
  const events = await rxServer.addRestEndpoint({
    name: "events",
    collection: db.events,
    cors: Bun.env.CORS,
    queryModifier: userQueryModifier, // authz
  });
  console.log("RxServer: endpoint created ", events.urlPath);

  // users endpoint (test only)
  const users = await rxServer.addRestEndpoint({
    name: "users",
    collection: db.users,
    cors: Bun.env.CORS,
    queryModifier: userQueryModifier, // authz
  });
  console.log("RxServer: endpoint created ", users.urlPath);

  // replication endpoint
  const replicationEndpoint = await rxServer.addReplicationEndpoint({
    name: "events-rpl",
    collection: db.events,
    cors: Bun.env.CORS,
    queryModifier: userQueryModifier, // authz
  });
  console.log("RxServer: rpl endpoint created ", replicationEndpoint.urlPath);

  return rxServer;
}

function userQueryModifier(authData: RxServerAuthData<GithubAuthData>, query: any) {
  if (!authData?.data?.id) {
    // If no valid session, return no results
    query.selector = {
      id: {
        $eq: "no-access", // Will match nothing
      },
    };
    return query;
  }
  query.selector.id = {
    $eq: (authData.data as GithubAuthData).id,
  };
  return query;
}

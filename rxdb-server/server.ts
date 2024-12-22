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
  id: string | null;
};

// Create a helper function to get user from session
async function getUserFromSessionId(
  sessionId: string,
  middleware: any
): Promise<any> {
  return new Promise((resolve) => {
    if (!middleware.store) {
      console.error("No session store found in middleware");
      resolve(null);
      return;
    }

    middleware.store!.get(sessionId, (err: any, session: any) => {
      console.log("Passport lookup", session.passport);
      if (err || !session || !session.passport?.user) {
        resolve(null);
        return;
      }
      resolve(session.passport.user);
    });
  });
}

// TODO: type
export async function setupServer(
  db: RxEventsDatabase,
  sessionMiddleware: any
) {
  const hostname =
    process.env.NODE_ENV === "production" ? "0.0.0.0" : "localhost";
  console.log("Starting server with hostname: ", hostname);

  const rxServer = await createRxServer({
    database: db as unknown as RxDatabase,
    port: 8080,
    hostname: hostname,
    adapter: RxServerAdapterExpress,
    cors: Bun.env.CORS,
    authHandler: async (
      headers: IncomingHttpHeaders
    ): Promise<RxServerAuthData<GithubAuthData>> => {
      console.warn("Auth handler called", headers);
      // TODO: use parser
      const cookieString = decodeURI(headers["cookie"] as string);
      const cookies = cookieString.split(/[;,]/).filter(Boolean);
      console.log("Cookies", cookies);
      let sessionId = null;
      for (const cookie of cookies) {
        const [key, value] = cookie.split("=").map((part) => part.trim());

        // Only add to Map if both key and value exist
        if (key === "connect.sid" && value) {
          console.log("Encoded Session id", sessionId);
          // First decode the URL-encoded session ID
          const decodedSessionId = decodeURIComponent(value);
          // Remove 's:' prefix and get everything before the dot
          const cleanSessionId = decodedSessionId.slice(2).split(".")[0];
          sessionId = cleanSessionId;
          console.log("Decoded session ID:", decodedSessionId);
          console.log("Clean session ID:", cleanSessionId);
        }
      }

      const mappedUser = await getUserFromSessionId(
        sessionId || "",
        sessionMiddleware
      );

      console.log("Mapped user", mappedUser);

      return {
        data: {
          id: mappedUser.id, // Use the user's ID from session
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
  if (!authData?.data?.sessionId) {
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

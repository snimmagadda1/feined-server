import type { Express } from "express";
import { requestLogger } from "./logger";
import { sessionMiddleware } from "./session";
import { corsMiddleware } from "./cors";
import passport from "passport";
import type { RxEventsDatabase } from "../rxdb-server";
import { setupAuth } from "./passport";

export function setupMiddleware(app: Express, db: RxEventsDatabase) {
    // Passport callback settings
    setupAuth(db);

    // Server sits behind a proxy
    app.set("trust proxy", 1);

    // Add logger middleware
    app.use(requestLogger);

    // Add the session middleware
    app.use(sessionMiddleware);

    // Add the CORS middleware
    app.use(corsMiddleware);

    // Init passport with session-based auth
    passport.serializeUser((user: any, done) => {
        // console.log("Serializing user:", user);
        done(null, user.id);
    });
    passport.deserializeUser(async (id: string, done) => {
        try {
            // console.log("Deserializing user id:", id);
            const user = await db.users
                .findOne({
                    selector: { id },
                })
                .exec();

            if (!user) {
                // console.log("User not found during deserialization");
                return done(null, null);
            }

            // console.log("Deserialized user:", user.toJSON());
            done(null, user.toJSON());
        } catch (error) {
            console.error("Error during deserialization:", error);
            done(error);
        }
    });
    app.use(passport.initialize());
    app.use(passport.session());
}
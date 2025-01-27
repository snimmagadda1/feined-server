import type { Express } from "express";
import passport from "passport";
import type { RxEventsDatabase } from "../rxdb-server";

export default async function (app: Express, db: RxEventsDatabase) {
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

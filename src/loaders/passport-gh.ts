import { nanoid } from "nanoid";
import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";
import { type Profile as GitHubProfile } from "passport-github2";
import { type VerifyCallback } from "passport-oauth2";
import { type RxEventsDatabase } from "../models";
import logger from "../utils/logger";
import { config } from "../config";

// FIXME: Has a dependency on rxdb for now...
export default async function (db: RxEventsDatabase) {
  passport.use(
    new GitHubStrategy(
      config.auth.github,
      async (
        accessToken: string,
        refreshToken: string,
        profile: GitHubProfile,
        done: VerifyCallback
      ) => {
        try {
          logger.info(
            `\n Successfully authenticated for profileId: ${profile.id}`
          );
          // Check if user exists
          const existingUser = await db.users
            .findOne({
              selector: {
                githubId: profile.id,
              },
            })
            .exec();

          if (existingUser) {
            logger.info("User already exists");
            return done(null, existingUser.toJSON());
          }
          logger.info("User does not exist, creating...");

          // Create new user
          const newUser = await db.users.insert({
            id: nanoid(10),
            email: profile.emails?.[0]?.value || "", // TODO: check if this is correct
            name: profile.displayName || profile.username,
            githubId: profile.id,
          });

          logger.info(`New user created: ${newUser.githubId}`);

          return done(null, newUser.toJSON());
        } catch (error) {
          logger.error("Error during authentication", error);
          return done(error as Error);
        }
      }
    )
  );
}

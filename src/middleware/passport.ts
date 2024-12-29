import { nanoid } from "nanoid";
import passport from "passport";
import { authConfig } from "../config";
import type { RxEventsDatabase } from "../rxdb-server";
import { Strategy as GitHubStrategy } from "passport-github2";
import { type Profile as GitHubProfile } from "passport-github2";
import { type VerifyCallback } from "passport-oauth2";

export function setupAuth(db: RxEventsDatabase) {
    passport.use(
        new GitHubStrategy(
            authConfig.github,
            async (
                accessToken: string,
                refreshToken: string,
                profile: GitHubProfile,
                done: VerifyCallback
            ) => {
                try {
                    console.log(
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
                        console.log("User already exists");
                        return done(null, existingUser.toJSON());
                    }
                    console.log("User does not exist, creating...");

                    // Create new user
                    const newUser = await db.users.insert({
                        id: nanoid(10),
                        email: profile.emails?.[0]?.value || "", // TODO: check if this is correct
                        name: profile.displayName || profile.username,
                        githubId: profile.id,
                    });

                    console.log(`New user created: ${newUser.githubId}`);

                    return done(null, newUser.toJSON());
                } catch (error) {
                    console.error("Error during authentication", error);
                    return done(error as Error);
                }
            }
        )
    );
}
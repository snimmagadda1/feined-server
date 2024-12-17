import { Router } from "express";
import type { RxEventsDatabase } from "../rxdb-server";
import { Strategy as GitHubStrategy } from "passport-github2";
import passport from "passport";
import { nanoid } from "nanoid";

export const authConfig = {
  github: {
    clientID: process.env.GITHUB_CLIENT_ID || "",
    clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    callbackURL:
      process.env.GITHUB_CALLBACK_URL ||
      "http://localhost:8080/auth/github/callback",
  },
  session: {
    secret: process.env.SESSION_SECRET || "dummy-super-secret",
    resave: false,
    saveUninitialized: false,
  },
};

export function setupAuth(db: RxEventsDatabase) {
  const router = Router();

  // Passport session setup.
  // TODO: understand this
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from the session
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await db.users
        .findOne({
          selector: { id },
        })
        .exec();
      done(null, user?.toJSON());
    } catch (error) {
      done(error);
    }
  });

  // TODO: understand this
  passport.use(
    new GitHubStrategy(
      authConfig.github,
      async (
        accessToken: string,
        refreshToken: string,
        profile: any,
        done: any
      ) => {
        try {
          console.log("in passport handler", profile);
          // Check if user exists
          const existingUser = await db.users
            .findOne({
              selector: {
                githubId: profile.id,
              },
            })
            .exec();

          if (existingUser) {
            return done(null, existingUser.toJSON());
          }

          // Create new user
          const newUser = await db.users.insert({
            id: nanoid(100),
            email: profile.emails?.[0]?.value,
            name: profile.displayName || profile.username,
            githubId: profile.id,
          });

          return done(null, newUser.toJSON());
        } catch (error) {
          return done(error as Error);
        }
      }
    )
  );

  // protected route using passport middleware
  router.get(
    "/github",
    passport.authenticate("github", { scope: ["user:email"] })
  );

  router.get(
    "/github/callback",
    passport.authenticate("github", {
      successRedirect: "/dashboard",
      failureRedirect: "/error",
    })
  );

  // router.get("/logout", (req, res) => {
  //   req.logout(() => {
  //     res.redirect("/"); // TODO: logout page of client
  //   });
  // });

  return router;
}

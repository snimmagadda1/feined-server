import { Router } from "express";
import type { RxEventsDatabase, RxUserDocumentType } from "../rxdb-server";
import { Strategy as GitHubStrategy } from "passport-github2";
import { type Profile as GitHubProfile } from "passport-github2";
import { type VerifyCallback } from "passport-oauth2";
import passport from "passport";
import { nanoid } from "nanoid";
import { generateToken } from "./jwt";

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
    cookie: {
      httpOnly: true,
    },
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

  // TODO: understand return types of this
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
            `Successfully authenticated for profileId: ${profile.id}`
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
            id: nanoid(100),
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

  // protected route using passport middleware
  router.get(
    "/github",
    passport.authenticate("github", { scope: ["user:email"] })
  );

  router.get(
    "/github/callback",
    passport.authenticate("github", {
      failureRedirect:
        `${Bun.env.FRONTEND_URL}/error` || "http://localhost:4200/error",
    }),
    (req, res) => {
      console.log("Authenticating .. req.user", req.user);
      const token = generateToken(req.user as RxUserDocumentType);
      res.cookie("jwt", token, { httpOnly: true });
      res.redirect(
        `${Bun.env.FRONTEND_URL}/home` || "http://localhost:4200/home"
      );
    }
  );

  // router.get("/logout", (req, res) => {
  //   req.logout(() => {
  //     res.redirect("/"); // TODO: logout page of client
  //   });
  // });

  return router;
}

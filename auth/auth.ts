import { Router } from "express";
import type { RxEventsDatabase } from "../rxdb-server";
import { Strategy as GitHubStrategy } from "passport-github2";
import { type Profile as GitHubProfile } from "passport-github2";
import { type VerifyCallback } from "passport-oauth2";
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
    cookie: {
      domain: process.env.NODE_ENV === "production" ? ".s11a.com" : "localhost",
      secure: process.env.NODE_ENV === "production",
      sameSite: (process.env.NODE_ENV === "production" ? "strict" : "lax") as
        | "strict"
        | "lax",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  },
};

export function setupAuth(db: RxEventsDatabase) {
  const router = Router();

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
    (req, res, next) => {
      console.log("\n Authenticating with github route...");
      next();
    },
    passport.authenticate("github", { scope: ["user:email"] })
  );

  router.get(
    "/github/callback",
    passport.authenticate("github", {
      failureRedirect:
        `${Bun.env.FRONTEND_URL}/error` || "http://localhost:4200/error",
      successRedirect:
        `${Bun.env.FRONTEND_URL}/home` || "http://localhost:4200/home",
    })
  );

  router.get("/isLoggedIn", (req, res) => {
    if (req.isAuthenticated()) {
      console.log("\n User is authenticated");
      res.json({
        authenticated: true,
        user: { ...req.user, email: undefined },
      });
    } else {
      console.log("\n User is not authenticated");
      res.json({ authenticated: false });
    }
  });

  router.post("/logout", (req, res, next) => {
    // First clear the login session
    console.log("\n Checking authentication status...");
    console.log("sessionID", req.sessionID);
    console.log("USER", req.user);
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return next(err);
      }

      // Then destroy the session to prevent auto-regeneration
      req.session.destroy((err) => {
        if (err) {
          console.error("Session destruction error:", err);
          return next(err);
        }

        res.clearCookie("connect.sid", {
          path: "/",
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        });

        res.status(200).json({ success: true });
      });
    });
  });

  return router;
}

// Add to all routes -> throws 401 if req.isAuthenticated() is false
export function isAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  return next();
}

// Add to client routes -> simple middleware to ensure user is authenticated
export function ensureAuthenticated(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/auth/github"); // TODO: login page of client
}

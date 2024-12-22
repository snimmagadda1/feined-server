import session from "express-session";
import { authConfig, ensureAuthenticated, setupAuth } from "./auth/auth";
import userRoutes from "./routes/user";
import { createDb, setupServer } from "./rxdb-server";
import type { Express } from "express";
import passport from "passport";
import cors from "cors"; // Add this import
import { requestLogger } from "./middleware/logger";

const db = await createDb();
const rxServer = await setupServer(db);

// Access the underlying Express app
const app = rxServer.serverApp as Express;

// Server sits behind a proxy
app.set("trust proxy", 1);

// Add logger middleware
app.use(requestLogger);

// Add CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:4200", // Allow your frontend origin
    credentials: true, // Required for cookies, authorization headers with HTTPS
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
    exposedHeaders: ["Set-Cookie"],
  })
);

app.use(session(authConfig.session));
// Initialize Passport and restore authentication state from session
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

// auth handler routes
app.use("/auth", setupAuth(db));

// Protected route example
// app.use("/user", userRoutes);

await rxServer.start();

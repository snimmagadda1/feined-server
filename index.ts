import session from "express-session";
import { authConfig, ensureAuthenticated, setupAuth } from "./auth/auth";
import { createDb, setupServer } from "./rxdb-server";
import type { Express } from "express";
import passport from "passport";
import cors from "cors"; // Add this import

const db = await createDb();
const rxServer = await setupServer(db);

// Access the underlying Express app
const app = rxServer.serverApp as Express;

// Add CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:4200", // Allow your frontend origin
    credentials: true, // Required for cookies, authorization headers with HTTPS
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(session(authConfig.session));
// Initialize Passport and restore authentication state from session
app.use(passport.initialize());

// auth handler routes
app.use("/auth", setupAuth(db));

// Protected route example
app.get("/dashboard", ensureAuthenticated, (req, res) => {
  res.json({ user: req.user });
});

await rxServer.start();

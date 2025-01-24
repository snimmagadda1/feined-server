import { createDb, setupServer } from "./rxdb-server";
import type { Express } from "express";
import { MEMORY_STORE } from "./middleware";
import authRoutes from "./routes/auth";
import eventsRoutes from "./routes/events";
import userRoutes from "./routes/user";
import { setupMiddleware } from "./middleware";

// Create RxDB instance
const db = await createDb();

// Setup rx-server instance, w/ session middleware config
const rxServer = await setupServer(db, MEMORY_STORE);

// Access the underlying Express app
const app = rxServer.serverApp as Express;

// Init middleware (auth, session, CORS, passport, logging)
setupMiddleware(app, db);

// Use configured auth handler routes
app.use("/auth", authRoutes);

// Use events routes
app.use("/events", eventsRoutes);

// Use user routes
app.use("/user", userRoutes);

await rxServer.start();

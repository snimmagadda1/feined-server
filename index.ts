import { createDb, setupServer } from "./rxdb-server";
import type { Express } from "express";
import userRoutes from "./routes/user";
const db = await createDb();
const rxServer = await setupServer(db);

// Access the underlying Express app
const app = rxServer.serverApp as Express;

// app.get("/hello", (req, res) => {
//   res.json({ message: "Hello World!" });
// });

// app.use("/user", userRoutes);

await rxServer.start();

import { createDb, setupServer } from "./rxdb-server";

const db = await createDb();
await setupServer(db);

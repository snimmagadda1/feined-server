import Router from "express";
import path from "path";
import { fileURLToPath } from "node:url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootPath = path.join(__dirname, "../");
const router = Router();

router.get("/", async (req, res) => {
  try {
    const file = Bun.file(`${path.join(rootPath, "data", "users.json")}`);
    const exists = await file.exists();

    console.log("Got the data in userController", await file.text());
  } catch (err) {
    console.error("An error occurred in userController", err);
  }

  res.send("Welcome to Express & TypeScript Server");
});

export default router;

import { Router } from "express";
import { nanoid } from "nanoid";
import { join } from "path";

export type User = {
  id: string;
  email: string;
  name: string;
  githubId: string;
  _deleted: boolean;
};

type UserRequest = Omit<User, "id">;

const router = Router();

// Map<oauthProfileId -> User>
// FIXME: service
export const USERS_COLLECTION = new Map<string, User>();

// FIXME: stream this in chunks for large files
const stored = Bun.file(join(import.meta.dir, "../data/users.json"));

const users = (await stored.json()) as User[];
users.forEach((user) => {
  USERS_COLLECTION.set(user.id, user);
});

console.log(`Loaded ${USERS_COLLECTION.size} users`);

router.post("/", (req, res) => {
  try {
    /*
    const isValid = validators.user(req.body);
    if (!isValud) {
    return res.status(400).json({ error: "bad request" });
    
    const user = doINSERT HERE

    */
  } catch (error) {}
  const user: UserRequest = req.body;

  // todo: validate user

  // prep for insert
  const toInsert: User = {
    ...user,
    id: nanoid(10),
    _deleted: false,
  };

  USERS_COLLECTION.set(toInsert.id, toInsert);

  res.status(200).json(toInsert);
});

router.get("/:userId", (req, res) => {
  const { userId } = req.params;
  const user = USERS_COLLECTION.get(userId);
  res.status(200).json(user);
});

export default router;

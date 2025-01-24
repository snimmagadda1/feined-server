import { Router } from "express";
import { nanoid } from "nanoid";

export type User = {
  id: string;
  email: string;
  name: string;
  githubId: string;
  _deleted: boolean;
};

type UserRequest = Omit<User, "id">;

const router = Router();

// Map<userId -> User>
const USERS_COLLECTION = new Map<string, User>();

USERS_COLLECTION.set("1", {
  id: "1",
  email: "test@test.com",
  name: "test",
  githubId: "test",
  _deleted: false,
});

router.post("/", (req, res) => {
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

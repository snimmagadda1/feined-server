import { Router } from "express";
import { nanoid } from "nanoid";
import { USERS_COLLECTION } from "../loaders/datastore";

export type User = {
  id: string;
  email: string;
  name: string;
  githubId: string;
  _deleted: boolean;
};

type UserRequest = Omit<User, "id">;

const router = Router();

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

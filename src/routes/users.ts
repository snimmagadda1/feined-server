import { Router } from "express";
import { nanoid } from "nanoid";
import { USERS_COLLECTION } from "../loaders/datastore";
import { type User, type UserRequest } from "../models";
import logger from "../utils/logger";
import userService from "../services/user-service";

const router = Router();

router.post("/", (req, res) => {
  try {
    /*
    const isValid = validators.user(req.body);
    if (!isValud) {
    return res.status(400).json({ error: "bad request" });
    
    const user = doINSERT HERE

    */
    const userRequest: UserRequest = req.body;

    // todo: validate user
    const user = userService.createUser(userRequest);

    res.status(200).json(user);
  } catch (error) {
    logger.error("Error during create user", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:userId", (req, res) => {
  try {
    const { userId } = req.params;
    const user = userService.getUser(userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.status(200).json(user);
  } catch (error) {
    logger.error("Error during get user", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

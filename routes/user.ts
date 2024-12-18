import { Router } from "express";
import { ensureAuthenticated, isAuth } from "../auth/auth";

const router = Router();

router.get("/", isAuth, ensureAuthenticated, (req, res) => {
  res.json({ user: req.user });
});

export default router;

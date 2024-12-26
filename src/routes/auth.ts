import { Router } from "express";
import passport from "passport";

const router = Router();

// protected route using passport middleware
router.get(
  "/github",
  (req, res, next) => {
    console.log("\n Authenticating with github route...");
    next();
  },
  passport.authenticate("github", { scope: ["user:email"] })
);

router.get(
  "/github/callback",
  passport.authenticate("github", {
    failureRedirect:
      `${Bun.env.FRONTEND_URL}/error` || "http://localhost:4200/error",
    successRedirect:
      `${Bun.env.FRONTEND_URL}/home` || "http://localhost:4200/home",
  })
);

router.get("/isLoggedIn", (req, res) => {
  if (req.isAuthenticated()) {
    console.log("\n User is authenticated");
    res.json({
      authenticated: true,
      user: { ...req.user, email: undefined },
    });
  } else {
    console.log("\n User is not authenticated");
    res.json({ authenticated: false });
  }
});

router.post("/logout", (req, res, next) => {
  // First clear the login session
  console.log("\n Checking authentication status...");
  console.log("sessionID", req.sessionID);
  console.log("USER", req.user);
  req.logout((err) => {
    if (err) {
      console.error("Logout error:", err);
      return next(err);
    }

    // Then destroy the session to prevent auto-regeneration
    req.session.destroy((err) => {
      if (err) {
        console.error("Session destruction error:", err);
        return next(err);
      }

      res.clearCookie("connect.sid", {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      });

      res.status(200).json({ success: true });
    });
  });
});

export default router;
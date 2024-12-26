
import { authConfig } from "../config";
import session, { MemoryStore } from "express-session";

export const MEMORY_STORE = new MemoryStore();

export const sessionMiddleware = session({
    ...authConfig.session,
    store: MEMORY_STORE,
});

// Add to all routes -> throws 401 if req.isAuthenticated() is false
export function isAuth(req: any, res: any, next: any) {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    return next();
}

// Add to client routes -> simple middleware to ensure user is authenticated
export function ensureAuthenticated(req: any, res: any, next: any) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect("/auth/github"); // TODO: login page of client
}

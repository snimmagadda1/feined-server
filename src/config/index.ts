export const authConfig = {
    github: {
        clientID: process.env.GITHUB_CLIENT_ID || "",
        clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
        callbackURL:
            process.env.GITHUB_CALLBACK_URL ||
            "http://localhost:8080/auth/github/callback",
    },
    session: {
        secret: process.env.SESSION_SECRET || "dummy-super-secret",
        resave: false,
        saveUninitialized: false,
        cookie: {
            domain: process.env.NODE_ENV === "production" ? ".s11a.com" : "localhost",
            secure: process.env.NODE_ENV === "production",
            sameSite: (process.env.NODE_ENV === "production" ? "strict" : "lax") as
                | "strict"
                | "lax",
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
        },
    },
};
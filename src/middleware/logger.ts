import morgan from "morgan";
import type { Request, Response } from "express";
import colors from "colors/safe";

// Custom tokens
morgan.token("session-id", (req: Request) => req.sessionID || "-");
morgan.token("user-id", (req: Request) =>
  req.user ? (req.user as any).id : "-"
);

// Color status based on response code
morgan.token("colored-status", (req: Request, res: Response) => {
  const status = res.statusCode;
  let color = colors.green; // 2xx
  if (status >= 500) color = colors.red; // 5xx
  if (status >= 400) color = colors.yellow; // 4xx
  if (status >= 300) color = colors.cyan; // 3xx
  return color(status.toString());
});

// Color method
morgan.token("colored-method", (req: Request) => {
  const method = req.method;
  switch (method) {
    case "GET":
      return colors.green(method);
    case "POST":
      return colors.yellow(method);
    case "PUT":
      return colors.blue(method);
    case "DELETE":
      return colors.red(method);
    default:
      return colors.white(method);
  }
});

const format = [
  colors.gray("→"),
  ":colored-method",
  ":url",
  ":colored-status",
  colors.blue(":response-time ms"),
  colors.gray("from"),
  ":remote-addr",
  colors.gray("|"),
  "sess::session-id",
  colors.gray("|"),
  "user::user-id",
  colors.gray("|"),
  ":user-agent",
].join(" ");

export const requestLogger = morgan(format);

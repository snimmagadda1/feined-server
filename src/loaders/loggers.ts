import type { Express } from "express";
import logger from "../utils/logger";
import morgan from "morgan";

// const morganFormat =
//   ":method :url :status :res[content-length] - :response-time ms";

const morganFormat = ":method :url :status :response-time ms";

export default async function (app: Express) {
  // Add morgan middleware
  app.use(
    morgan(morganFormat, {
      stream: {
        write: (message) => {
          const logObject = {
            method: message.split(" ")[0],
            url: message.split(" ")[1],
            status: message.split(" ")[2],
            responseTime: message.split(" ")[3],
          };
          logger.info(JSON.stringify(logObject));
        },
      },
    })
  );
}

import rxdbLoader, { DB, _RX_SERVER } from "./rxdb";
import passportGHLoader from "./passport-gh";
import expressLoader from "./express";
import passportLoader from "./passport";
import datastoreLoader from "./datastore";
import datastoreRxdbLoader from "./datastore-rxdb";
import loggersLoader from "./loggers";
import healthLoader from "./health";
import logger from "../utils/logger";
import { config } from "../config";

export default async function () {
  // TODO: await internal backend maps load
  logger.info("config loaded...", config.server.nodeEnv);

  await datastoreLoader();
  logger.info("datastore loaded...");

  // TODO: await rxdb backend load (to deprecate)
  const app = await rxdbLoader();
  await datastoreRxdbLoader();
  logger.info("rxdb schema initialized& datastore synced...");

  await loggersLoader(app);
  logger.info("loggers loaded...");

  await healthLoader(app);
  logger.info("health loaded...");

  // Auth methods
  if (!DB) {
    throw new Error("DB required for passport loader");
  }
  await passportGHLoader(DB);
  logger.info("GH passport loaded...");

  await passportLoader(app, DB);
  logger.info("passport & session loaded...");

  await expressLoader(app);
  logger.info("express loaded...");

  // FIXME: remove rxserver
  await _RX_SERVER!.start();
}

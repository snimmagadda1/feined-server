import rxdbLoader, { DB, _RX_SERVER } from "./rxdb";
import passportGHLoader from "./passport-gh";
import expressLoader from "./express";
import passportLoader from "./passport";
import datastoreLoader from "./datastore";
import datastoreRxdbLoader from "./datastore-rxdb";
import loggersLoader from "./loggers";
import logger from "../utils/logger";

export default async function () {
  // TODO: await internal backend maps load

  await datastoreLoader();
  logger.info("TODO: backend loaded...");

  // TODO: await rxdb backend load (to deprecate)
  const app = await rxdbLoader();
  await datastoreRxdbLoader();
  logger.info("rxdb schema & backend loaded...");

  await loggersLoader(app);
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

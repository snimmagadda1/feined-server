import rxdbLoader, { DB, RX_SERVER } from "./rxdb";
import passportGHLoader from "./passport-gh";
import expressLoader from "./express";
import passportLoader from "./passport";
import datastoreLoader from "./datastore";

export default async function () {
  // TODO: await internal backend maps load

  await datastoreLoader();
  console.log("TODO: backend loaded...");

  // TODO: await rxdb backend load (to deprecate)
  const app = await rxdbLoader();
  console.log("rxdb schema & backend loaded...");

  // Auth methods
  if (!DB) {
    throw new Error("DB required for passport loader");
  }
  await passportGHLoader(DB);
  console.log("GH passport loaded...");

  await expressLoader(app);
  console.log("express loaded...");

  await passportLoader(app, DB);
  console.log("passport & session loaded...");

  // FIXME: remove rxserver
  await RX_SERVER!.start();
}

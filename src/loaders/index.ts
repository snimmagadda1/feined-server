import rxdbLoader, { DB, _RX_SERVER } from "./rxdb";
import passportGHLoader from "./passport-gh";
import expressLoader from "./express";
import passportLoader from "./passport";
import datastoreLoader from "./datastore";
import datastoreRxdbLoader from "./datastore-rxdb";

export default async function () {
  // TODO: await internal backend maps load

  await datastoreLoader();
  console.log("TODO: backend loaded...");

  // TODO: await rxdb backend load (to deprecate)
  const app = await rxdbLoader();
  await datastoreRxdbLoader();
  console.log("rxdb schema & backend loaded...");

  // Auth methods
  if (!DB) {
    throw new Error("DB required for passport loader");
  }
  await passportGHLoader(DB);
  console.log("GH passport loaded...");

  await passportLoader(app, DB);
  console.log("passport & session loaded...");

  await expressLoader(app);
  console.log("express loaded...");

  // FIXME: remove rxserver
  await _RX_SERVER!.start();
}

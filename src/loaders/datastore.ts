import { join } from "path";
import type { EventRequest, User } from "../models";
import logger from "../utils/logger";
import { userService, eventService } from "../services";

export default async function () {
  await loadUsers();
  await loadEvents();
  // FIXME: params
  const interval = 1000 * 60 * 60 * 24;
  // const interval = 10000;
  setInterval(() => {
    backupUsers();
  }, interval);
  setInterval(() => {
    backupEvents();
  }, interval);
}

// FIXME: do this more efficiently
const backupUsers = async () => {
  const users = userService.getAllUsers();
  await Bun.write(
    join(import.meta.dir, "../data/users.json"),
    JSON.stringify(users)
  );
  logger.info("____ background job: Users backed up ____");
};

const backupEvents = async () => {
  await Bun.write(
    join(import.meta.dir, "../data/events.json"),
    JSON.stringify(eventService.getAllEvents())
  );
  logger.info("____ background job: Events backed up ____");
};

const loadUsers = async () => {
  // FIXME: stream this in chunks for large files
  const stored = Bun.file(join(import.meta.dir, "../data/users.json"));

  const users = (await stored.json()) as User[];
  logger.info(`Retrieved ${users.length} users from file`);
  userService.init(users);
  logger.info(`Loaded ${userService.getAllUsers().length} users`);
};

const loadEvents = async () => {
  const stored = Bun.file(join(import.meta.dir, "../data/events.json"));
  const events = (await stored.json()) as EventRequest[];
  logger.info(`Retrieved ${events.length} events from file`);
  eventService.init(events);
  logger.info(`Loaded ${eventService.getAllEvents().length} events`);
};

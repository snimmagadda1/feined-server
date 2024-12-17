import {
  type RxCollection,
  type RxDatabase,
  type RxJsonSchema,
  toTypedRxJsonSchema,
  type ExtractDocumentTypeFromTypedRxJsonSchema,
} from "rxdb";

const EVENT_SCHEMA_LITERAL = {
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: {
      type: "string",
      maxLength: 100,
    },
    title: {
      type: "string",
    },
    date: {
      type: "string",
      format: "date-time",
      maxLength: 30,
    },
    completed: {
      type: "boolean",
    },
    notes: {
      type: "string",
    },
    color: {
      type: "string",
    },
    timestamp: {
      type: "number",
    },
    index: {
      type: "number",
    },
    _deleted: {
      type: "boolean",
    },
  },
  required: ["id", "title", "date"],
  indexes: ["date"],
} as const;

const schemaTyped = toTypedRxJsonSchema(EVENT_SCHEMA_LITERAL);

export type RxEventDocumentType = ExtractDocumentTypeFromTypedRxJsonSchema<
  typeof schemaTyped
>;

export const EVENTS_SCHEMA: RxJsonSchema<RxEventDocumentType> =
  EVENT_SCHEMA_LITERAL;

type RxEventMethods = {};

export type RxEventsCollection = RxCollection<
  RxEventDocumentType,
  RxEventMethods,
  {},
  {},
  unknown
>;

export type RxEventsCollections = {
  events: RxEventsCollection;
};

export type RxEventsDatabase = RxDatabase<
  RxEventsCollections,
  any,
  any,
  unknown
>;

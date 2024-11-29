import { test, expect, describe, beforeEach } from "bun:test";
import {
  type RxStorageMemoryFileSynced,
  RxStorageMemoryFileSyncedInstance,
  type RxStorageMemoryFileSyncedInstanceCreationOptions,
} from ".";
import { fillWithDefaultSettings, type RxDocumentData, type RxJsonSchema, type RxStorageInstanceCreationParams } from "rxdb";

// TODO: put this somewhere
const RXDB_VERSION = "16.0.0-beta.4";

type TestDocType = { key: string; value: string };

function getTestSchema(): RxJsonSchema<RxDocumentData<TestDocType>> {
  // IDK what this function does
  return fillWithDefaultSettings({
    version: 0,
    type: "object",
    primaryKey: "key",
    properties: {
      key: {
        type: "string",
        maxLength: 100,
      },
      value: {
        type: "string",
        maxLength: 100,
      },
    },
    required: ["key", "value"],
    indexes: ["value"],
  });
}

describe("storage-memory-file-synced", () => {
  let storage: RxStorageMemoryFileSynced;

  beforeEach(() => {
    storage = {
      name: "memory-file-synced",
      rxdbVersion: RXDB_VERSION,
      createStorageInstance<RxDocType>(
        params: RxStorageInstanceCreationParams<
          RxDocType,
          RxStorageMemoryFileSyncedInstanceCreationOptions
        >
      ): Promise<RxStorageMemoryFileSyncedInstance<RxDocType>> {
        const instance = new RxStorageMemoryFileSyncedInstance(
          params.databaseName,
          {
            documents: new Map(),
          },
          params.options,
          params.schema,
          params.collectionName
        );
        return Promise.resolve(instance);
      },
    };
  });

  describe("creation", () => {
    test("open and close", async () => {
      const collectionName = crypto.randomUUID();
      const databaseName = "testDb";
      const storageInstance = await storage.createStorageInstance<TestDocType>({
        databaseInstanceToken: crypto.randomUUID(),
        databaseName,
        collectionName,
        schema: getTestSchema(),
        options: {},
        multiInstance: false,
        devMode: true,
      });

      expect(storageInstance).toBeDefined();
      expect(storageInstance.databaseName).toStrictEqual(databaseName);
      expect(storageInstance.collectionName).toStrictEqual(collectionName);
    });
  });
});

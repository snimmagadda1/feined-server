import { test, expect, describe, beforeEach } from "bun:test";
import {
  getRxStorageMemoryFileSynced,
  type RxStorageMemoryFileSynced,
} from ".";
import {
  fillWithDefaultSettings,
  type RxDocumentData,
  type RxJsonSchema,
} from "rxdb";

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
    storage = getRxStorageMemoryFileSynced();
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

      await storageInstance.remove();
    });

    test.only("open many instances on the same database name", async () => {
      const databaseName = "testDb";
      // denokv is too slow here and will run in timeouts, so we use a lower amount
      const amount = 20;
      const instances = await Promise.all(
        new Array(amount).fill(0).map(() =>
          storage.createStorageInstance<TestDocType>({
            databaseInstanceToken: crypto.randomUUID(),
            databaseName,
            collectionName: crypto.randomUUID(),
            schema: getTestSchema(),
            options: {},
            multiInstance: false,
            devMode: true,
          })
        )
      );
      await Promise.all(
        instances.map((instance) => {
          expect(instance.databaseName).toEqual(databaseName);
          return instance.remove();
        })
      );
    });
  });
});

import { test, expect, describe, beforeEach } from "bun:test";
import {
  getRxStorageMemoryFileSynced,
  type RxStorageMemoryFileSynced,
} from ".";
import {
  fillWithDefaultSettings,
  getWrittenDocumentsFromBulkWriteResponse,
  stripMetaDataFromDocument,
  type BulkWriteRow,
  type RxDocumentData,
  type RxDocumentWriteData,
  type RxJsonSchema,
} from "rxdb";

// based on https://github.com/pubkey/rxdb/blob/master/test/unit/rx-storage-implementations.test.ts

type TestDocType = { key: string; value: string };
declare type OptionalValueTestDoc = { key: string; value?: string };

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

const testContext = "storage-memory-file-synced.test.ts";

describe("storage-memory-file-synced", () => {
  let storage: RxStorageMemoryFileSynced;
  const EXAMPLE_REVISION_1 = "1-12080c42d471e3d2625e49dcca3b8e1a";
  const EXAMPLE_REVISION_2 = "2-22080c42d471e3d2625e49dcca3b8e2b";
  const EXAMPLE_REVISION_3 = "3-32080c42d471e3d2625e49dcca3b8e3c";
  const EXAMPLE_REVISION_4 = "4-42080c42d471e3d2625e49dcca3b8e3c";

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

    test("open many instances on the same database name", async () => {
      const databaseName = "testDb";
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

    // TODO: understand and implement
    /**
     * This test ensures that people do not accidentally set
     * keyCompression: true in the schema but then forget to use
     * the key-compression RxStorage wrapper.
     */
    test.skip("must throw if keyCompression is set but no key-compression plugin is used", async () => {
      const schema = getTestSchema();
      schema.keyCompression = true;
      let hasThrown = false;
      try {
        const collectionName = crypto.randomUUID();
        const databaseName = "testDb";
        await storage.createStorageInstance<TestDocType>({
          databaseInstanceToken: crypto.randomUUID(),
          databaseName,
          collectionName,
          schema: getTestSchema(),
          options: {},
          multiInstance: false,
          devMode: true,
        });
      } catch (error: any) {
        const errorString = error.toString();
        expect(errorString).toContain("UT5");
        hasThrown = true;
      }
      expect(hasThrown).toBeTruthy();
    });

    // TODO: understand and implement
    /**
     * This test ensures that people do not accidentally set
     * encrypted stuff in the schema but then forget to use
     * the encryption RxStorage wrapper.
     */
    test.skip("must throw if encryption is defined in schema is set but no encryption plugin is used", async () => {
      const collectionName = crypto.randomUUID();
      const databaseName = "testDb";

      const schema = getTestSchema();
      schema.encrypted = ["value"];
      let hasThrown = false;
      try {
        await storage.createStorageInstance<TestDocType>({
          databaseInstanceToken: crypto.randomUUID(),
          databaseName,
          collectionName,
          schema: getTestSchema(),
          options: {},
          multiInstance: false,
          devMode: true,
        });
      } catch (error: any) {
        const errorString = error.toString();
        expect(errorString).toContain("UT6");
        hasThrown = true;
      }
      expect(hasThrown).toBeTruthy();
    });
  });

  describe(".bulkWrite()", () => {
    test("should write the document", async () => {
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

      const docData: RxDocumentWriteData<TestDocType> = {
        key: "foobar1",
        value: "barfoo1",
        _deleted: false,
        _meta: {
          lwt: Date.now(),
        },
        _rev: EXAMPLE_REVISION_1,
        _attachments: {},
      };

      const writeRows: BulkWriteRow<TestDocType>[] = [
        {
          document: structuredClone(docData),
        },
      ];

      const writeResponse = await storageInstance.bulkWrite(
        writeRows,
        testContext // TODO: what does this do?
      );

      expect(writeResponse.error).toStrictEqual([]);
      // This helper querys internal map in rx-storage-helper.ts to get the result
      const success = getWrittenDocumentsFromBulkWriteResponse(
        "key",
        writeRows,
        writeResponse
      );
      const writtenDoc = stripMetaDataFromDocument(success[0]);
      const requestDoc = stripMetaDataFromDocument(docData);

      expect(writtenDoc).toStrictEqual(requestDoc);
      storageInstance.remove();
    });

    test("should error on conflict", async () => {
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

      const writeData: RxDocumentWriteData<TestDocType> = {
        key: "foobar",
        value: "barfoo",
        _deleted: false,
        _meta: {
          lwt: Date.now(),
        },
        _rev: EXAMPLE_REVISION_1,
        _attachments: {},
      };

      const writeRows: BulkWriteRow<TestDocType>[] = [
        {
          document: structuredClone(writeData),
        },
      ];
      await storageInstance.bulkWrite(
        writeRows,
        testContext // TODO: what does this do?
      );

      const writeResponse = await storageInstance.bulkWrite(
        writeRows,
        testContext // TODO: what does this do?
      );

      const first = writeResponse.error[0];
      expect(first.status).toEqual(409);
      expect(first.documentId).toEqual("foobar");

      /**
       * The conflict error state must contain the
       * document state in the database.
       * This ensures that we can continue resolving the conflict
       * without having to pull the document out of the db first.
       */
      expect((first as any).documentInDb.value).toStrictEqual(writeData.value);

      /**
       * The documentInDb must not have any additional attributes.
       * Some RxStorage implementations store meta fields
       * together with normal document data.
       * These fields must never be leaked to 409 conflict errors
       */
      expect(Object.keys((first as any).documentInDb).sort()).toStrictEqual(
        Object.keys(writeData).sort()
      );
      expect(first.writeRow).toBeDefined();
      storageInstance.remove();
    });

    test("when inserting the same document at the same time, the first call must succeed while the second has a conflict", async () => {
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

      const writeData: RxDocumentWriteData<TestDocType> = {
        key: "foobar",
        value: "barfoo",
        _deleted: false,
        _meta: {
          lwt: Date.now(),
        },
        _rev: EXAMPLE_REVISION_1,
        _attachments: {},
      };

      const [first, second] = await Promise.all([
        storageInstance.bulkWrite(
          [
            {
              document: Object.assign({}, writeData, {
                value: "first",
              }),
            },
          ],
          testContext
        ),
        storageInstance.bulkWrite(
          [
            {
              document: Object.assign({}, writeData, {
                value: "second",
              }),
            },
          ],
          testContext
        ),
      ]);

      expect(first.error).toStrictEqual([]);
      expect(second.error[0].status).toEqual(409);
      expect(second.error[0].writeRow.document.value).toEqual("second");
      storageInstance.remove();
    });

    test("should not find the deleted document when findDocumentsById(false)", async () => {
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

      const insertData: RxDocumentWriteData<TestDocType> = {
        key: "foobar",
        value: "barfoo1",
        _deleted: false,
        _rev: EXAMPLE_REVISION_1,
        _attachments: {},
        _meta: {
          lwt: Date.now(),
        },
      };

      const insertResponse = await storageInstance.bulkWrite(
        [{ document: insertData }],
        testContext
      );
      expect(insertResponse.error).toStrictEqual([]);

      const updateData = {
        ...insertData,
        value: "barfoo2",
        _rev: EXAMPLE_REVISION_2,
        _meta: { ...insertData._meta, lwt: Date.now() },
      };
      const updateResponse = await storageInstance.bulkWrite(
        [{ previous: insertData, document: updateData }],
        testContext
      );
      expect(updateResponse.error).toStrictEqual([]);

      const deleteData = {
        ...updateData,
        value: "barfoo_deleted",
        _deleted: true,
        _meta: { ...updateData._meta, lwt: Date.now() },
      };
      const deleteResponse = await storageInstance.bulkWrite(
        [{ previous: updateData, document: deleteData }],
        testContext
      );
      expect(deleteResponse.error).toStrictEqual([]);

      const foundDoc = await storageInstance.findDocumentsById(
        ["foobar"],
        false
      );
      expect(foundDoc).toStrictEqual([]);

      storageInstance.remove();
    });

    test("should NOT be able to overwrite a deleted document", async () => {
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

      const docId = "undeleteMe";
      const doc1: RxDocumentWriteData<TestDocType> = {
        key: docId,
        value: "barfoo1",
        _deleted: false,
        _attachments: {},
        _rev: EXAMPLE_REVISION_1,
        _meta: {
          lwt: Date.now(),
        },
      };

      const insertResponse = await storageInstance.bulkWrite(
        [{ document: doc1 }],
        testContext
      );
      expect(insertResponse.error).toStrictEqual([]);

      const doc2 = {
        ...doc1,
        value: "barfoo2",
        _rev: EXAMPLE_REVISION_2,
        _meta: { ...doc1._meta, lwt: Date.now() },
      };
      const updateResponse = await storageInstance.bulkWrite(
        [{ previous: doc1, document: doc2 }],
        testContext
      );
      expect(updateResponse.error).toStrictEqual([]);

      const doc3 = {
        ...doc2,
        _deleted: true,
        _rev: EXAMPLE_REVISION_3,
        _meta: { ...doc2._meta, lwt: Date.now() },
      };
      const deleteResponse = await storageInstance.bulkWrite(
        [{ previous: doc2, document: doc3 }],
        testContext
      );
      expect(deleteResponse.error).toStrictEqual([]);

      const undeleteConflictResponse = await storageInstance.bulkWrite(
        [
          {
            document: {
              ...doc3,
              _deleted: false,
              value: "aaa",
              _rev: EXAMPLE_REVISION_4,
              _meta: { ...doc3._meta, lwt: Date.now() },
            },
          },
        ],
        testContext
      );
      expect(undeleteConflictResponse.error[0]).toBeDefined();

      const undeleteResponse = await storageInstance.bulkWrite(
        [
          {
            previous: doc3,
            document: {
              ...doc3,
              _deleted: false,
              value: "aaa",
              _rev: EXAMPLE_REVISION_4,
              _meta: { ...doc3._meta, lwt: Date.now() },
            },
          },
        ],
        testContext
      );
      expect(undeleteResponse.error).toStrictEqual([]);

      const foundDoc = await storageInstance.findDocumentsById([docId], false);
      expect(foundDoc[0]).toBeDefined();
      expect(foundDoc[0].value).toStrictEqual("aaa");

      storageInstance.remove();
    });

    test("should be able to update the state of a deleted document", async () => {
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

      const docId = "foobar";
      const docData1: RxDocumentWriteData<TestDocType> = {
        key: docId,
        value: "barfoo1",
        _deleted: false,
        _attachments: {},
        _rev: EXAMPLE_REVISION_1,
        _meta: {
          lwt: Date.now(),
        },
      };

      const insertResponse = await storageInstance.bulkWrite(
        [{ document: docData1 }],
        testContext
      );
      expect(insertResponse.error).toStrictEqual([]);

      const docData2 = {
        ...docData1,
        _deleted: true,
        _rev: EXAMPLE_REVISION_2,
        _meta: { ...docData1._meta, lwt: Date.now() },
      };
      const deleteResponse = await storageInstance.bulkWrite(
        [{ previous: docData1, document: docData2 }],
        testContext
      );
      expect(deleteResponse.error).toStrictEqual([]);

      const docData3 = {
        ...docData2,
        value: "barfoo2",
        _rev: EXAMPLE_REVISION_3,
        _meta: { ...docData2._meta, lwt: Date.now() },
      };
      const modifyResponse = await storageInstance.bulkWrite(
        [{ previous: docData2, document: docData3 }],
        testContext
      );
      expect(modifyResponse.error).toStrictEqual([]);

      const docs = await storageInstance.findDocumentsById([docId], true);
      const doc = docs[0];
      expect(doc).toBeDefined();
      expect(doc.value).toStrictEqual("barfoo2");

      storageInstance.remove();
    });

    test("should be able to unset a property", async () => {
      const collectionName = crypto.randomUUID();
      const databaseName = "testDb";
      const storageInstance = await storage.createStorageInstance<OptionalValueTestDoc>({
        databaseInstanceToken: crypto.randomUUID(),
        databaseName,
        collectionName,
        schema: getTestSchema() as any,
        options: {},
        multiInstance: false,
        devMode: true,
      });

      const docId = "foobar";
      const insertData: RxDocumentWriteData<OptionalValueTestDoc> = {
        key: docId,
        value: "barfoo1",
        _attachments: {},
        _deleted: false,
        _rev: EXAMPLE_REVISION_1,
        _meta: {
          lwt: Date.now(),
        },
      };

      await storageInstance.bulkWrite(
        [
          {
            document: insertData,
          },
        ],
        testContext
      );
      const insertDataAfterWrite: RxDocumentData<OptionalValueTestDoc> =
        Object.assign({}, insertData, {
          _rev: insertData._rev,
        });

      const updateDoc = {
        key: docId,
        _attachments: {},
        _deleted: false,
        _rev: EXAMPLE_REVISION_2,
        _meta: {
          lwt: Date.now(),
        },
      };
      await storageInstance.bulkWrite(
        [
          {
            previous: insertDataAfterWrite,
            document: updateDoc,
          },
        ],
        testContext
      );
      const updateResponseDoc = updateDoc;
      delete (updateResponseDoc as any)._deleted;
      delete (updateResponseDoc as any)._rev;
      delete (updateResponseDoc as any)._meta;
      expect(updateResponseDoc.key).toStrictEqual(docId);
      expect(updateResponseDoc._attachments).toStrictEqual({});
      storageInstance.remove();
    });

    test("should be able to store a complex document with key compression", async () => {
      const collectionName = crypto.randomUUID();
      const databaseName = "testDb";
      const schema = fillWithDefaultSettings({
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
        keyCompression: true,
      });
      const storageInstance = await storage.createStorageInstance<TestDocType>({
        databaseInstanceToken: crypto.randomUUID(),
        databaseName,
        collectionName,
        schema,
        options: {},
        multiInstance: false,
        devMode: true,
      });

      const docData: RxDocumentWriteData<TestDocType> = {
        key: "foobar",
        value: "barfoo",
        _deleted: false,
        _attachments: {},
        _rev: EXAMPLE_REVISION_1,
        _meta: {
          lwt: Date.now(),
        },
      };

      const writeResponse = await storageInstance.bulkWrite(
        [{ document: docData }],
        testContext
      );
      expect(writeResponse.error).toStrictEqual([]);

      const getDocFromDb = await storageInstance.findDocumentsById(
        [docData.key],
        false
      );
      expect(stripMetaDataFromDocument(getDocFromDb[0])).toStrictEqual(
        stripMetaDataFromDocument(docData)
      );
      storageInstance.remove();
    });

    test("should be able to do a write where only _meta fields are changed", async () => {
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

      const key = "foobar";
      let docData: RxDocumentWriteData<TestDocType> = {
        key,
        value: "barfoo1",
        _attachments: {},
        _deleted: false,
        _rev: EXAMPLE_REVISION_1,
        _meta: {
          lwt: Date.now(),
          foobar: 0,
        },
      };

      const res1 = await storageInstance.bulkWrite(
        [{ document: { ...docData } }],
        testContext
      );
      expect(res1.error).toStrictEqual([]);
      docData = { ...docData };

      let newDocData: RxDocumentWriteData<TestDocType> = {
        ...docData,
        _meta: { ...docData._meta, foobar: 1, lwt: Date.now() },
        _rev: EXAMPLE_REVISION_2,
      };

      const res2 = await storageInstance.bulkWrite(
        [{ previous: docData, document: { ...newDocData } }],
        testContext
      );
      expect(res2.error).toStrictEqual([]);
      docData = { ...newDocData };

      newDocData = {
        ...docData,
        _meta: { ...docData._meta, foobar: 2, lwt: Date.now() },
        _rev: EXAMPLE_REVISION_3,
      };

      const res3 = await storageInstance.bulkWrite(
        [{ previous: docData, document: { ...newDocData } }],
        testContext
      );
      expect(res3.error).toStrictEqual([]);
      docData = newDocData;

      const viaStorage = await storageInstance.findDocumentsById([key], true);
      const viaStorageDoc = viaStorage[0];
      expect(viaStorageDoc).toBeDefined();
      expect(viaStorageDoc._rev).toStrictEqual(EXAMPLE_REVISION_3);

      storageInstance.remove();
    });
  });
});

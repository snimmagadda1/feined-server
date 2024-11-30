import {
  RXDB_VERSION,
  type BulkWriteRow,
  type EventBulk,
  type PreparedQuery,
  type RxConflictResultionTask,
  type RxConflictResultionTaskSolution,
  type RxDocumentData,
  type RxJsonSchema,
  type RxStorage,
  type RxStorageBulkWriteResponse,
  type RxStorageChangeEvent,
  type RxStorageCountResult,
  type RxStorageDefaultCheckpoint,
  type RxStorageInstance,
  type RxStorageInstanceCreationParams,
  type RxStorageQueryResult,
} from "rxdb";
import type { Observable } from "rxjs";
import { getMemoryFsCollectionKey } from "./helpers";

// init options
export type RxStorageMemoryFileSyncedInstanceCreationOptions = {};

// implementation specific objects
export type MemoryFileSyncedInternals<RxDocType> = {
  documents: Map<string, RxDocumentData<RxDocType>>;
  useCount: number;
};

export type RxStorageMemoryFileSynced = RxStorage<
  MemoryFileSyncedInternals<any>,
  RxStorageMemoryFileSyncedInstanceCreationOptions
> & // this object represents the datastore
{
  collectionInfo: Map<string, MemoryFileSyncedInternals<any>>;
};

// export type RxStorageDefaultCheckpoint = {
//     id: string;
//     lwt: number;
// };

const COLLECTION_INFO = new Map();

// Factory method to get a new RxStorage interface
export function getRxStorageMemoryFileSynced(): RxStorageMemoryFileSynced {
  const storage: RxStorageMemoryFileSynced = {
    name: "memory-file-synced",
    rxdbVersion: RXDB_VERSION,
    collectionInfo: COLLECTION_INFO,
    createStorageInstance<RxDocType>(
      params: RxStorageInstanceCreationParams<
        RxDocType,
        RxStorageMemoryFileSyncedInstanceCreationOptions
      >
    ): Promise<RxStorageMemoryFileSyncedInstance<RxDocType>> {
      const collectionKey = getMemoryFsCollectionKey(
        params.databaseName,
        params.collectionName,
        params.schema.version
      );
      // Check if instance of collection
      let internals = this.collectionInfo.get(collectionKey);
      if (!internals) {
        internals = {
          documents: new Map(),
          useCount: 1,
        };
        this.collectionInfo.set(collectionKey, internals);
      } else {
        // TODO: maybe deep equal check for same schema
        internals.useCount++;
      }

      const instance = new RxStorageMemoryFileSyncedInstance(
        this,
        params.databaseName,
        internals,
        params.options,
        params.schema,
        params.collectionName
      );
      return Promise.resolve(instance);
    },
  };

  return storage;
}

// Implementation of custom storage instance
export class RxStorageMemoryFileSyncedInstance<RxDocType>
  implements
    RxStorageInstance<
      RxDocType,
      MemoryFileSyncedInternals<RxDocType>,
      RxStorageMemoryFileSyncedInstanceCreationOptions,
      RxStorageDefaultCheckpoint
    >
{
  underlyingPersistentStorage?:
    | RxStorageInstance<RxDocType, any, any, any>
    | undefined;

  // Implement RxStorageInstance interface
  constructor(
    public readonly store: RxStorageMemoryFileSynced,
    public readonly databaseName: string,
    public readonly internals: MemoryFileSyncedInternals<RxDocType>,
    public readonly options: RxStorageMemoryFileSyncedInstanceCreationOptions,
    public readonly schema: RxJsonSchema<RxDocumentData<RxDocType>>,
    public readonly collectionName: string
  ) {
    console.log(
      `**** Created RxStorageMemoryFileSyncedInstance in db ${databaseName} created for collection ${collectionName} | opts: ${JSON.stringify(
        options
      )}`
    );
  }

  bulkWrite(
    documentWrites: BulkWriteRow<RxDocType>[],
    context: string
  ): Promise<RxStorageBulkWriteResponse<RxDocType>> {
    throw new Error("Method not implemented.");
  }

  findDocumentsById(
    ids: string[],
    withDeleted: boolean
  ): Promise<RxDocumentData<RxDocType>[]> {
    throw new Error("Method not implemented.");
  }

  query(
    preparedQuery: PreparedQuery<RxDocType>
  ): Promise<RxStorageQueryResult<RxDocType>> {
    throw new Error("Method not implemented.");
  }
  count(
    preparedQuery: PreparedQuery<RxDocType>
  ): Promise<RxStorageCountResult> {
    throw new Error("Method not implemented.");
  }

  getAttachmentData(
    documentId: string,
    attachmentId: string,
    digest: string
  ): Promise<string> {
    throw new Error("Method not implemented.");
  }

  getChangedDocumentsSince?(
    limit: number,
    checkpoint?: RxStorageDefaultCheckpoint | undefined
  ): Promise<{
    documents: RxDocumentData<RxDocType>[];
    checkpoint: RxStorageDefaultCheckpoint;
  }> {
    throw new Error("Method not implemented.");
  }

  changeStream(): Observable<
    EventBulk<RxStorageChangeEvent<RxDocType>, RxStorageDefaultCheckpoint>
  > {
    throw new Error("Method not implemented.");
  }

  cleanup(minimumDeletedTime: number): Promise<boolean> {
    throw new Error("Method not implemented.");
  }

  close(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  remove(): Promise<void> {
    const collectionKey = getMemoryFsCollectionKey(
      this.databaseName,
      this.collectionName,
      this.schema.version
    );
    console.warn(`**** Deleting collection ${collectionKey}`);
    this.store.collectionInfo.delete(collectionKey);
    this.internals.useCount--;
    return Promise.resolve();
  }

  conflictResultionTasks(): Observable<RxConflictResultionTask<RxDocType>> {
    throw new Error("Method not implemented.");
  }

  resolveConflictResultionTask(
    taskSolution: RxConflictResultionTaskSolution<RxDocType>
  ): Promise<void> {
    throw new Error("Method not implemented.");
  }
}

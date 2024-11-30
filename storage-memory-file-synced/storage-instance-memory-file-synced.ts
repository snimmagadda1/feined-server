import type { BulkWriteRow, EventBulk, PreparedQuery, RxConflictResultionTask, RxConflictResultionTaskSolution, RxDocumentData, RxJsonSchema, RxStorageBulkWriteResponse, RxStorageChangeEvent, RxStorageCountResult, RxStorageDefaultCheckpoint, RxStorageInstance, RxStorageQueryResult } from "rxdb";
import type { MemoryFileSyncedInternals, RxStorageMemoryFileSynced, RxStorageMemoryFileSyncedInstanceCreationOptions } from ".";
import type { Observable } from "rxjs";
import { getMemoryFsCollectionKey } from "./helpers";


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

import {
  categorizeBulkWriteRows,
  getPrimaryFieldOfPrimaryKey,
  requestIdlePromiseNoQueue, // nifty helper for low priority tasks (lazy writes)
  type BulkWriteRow,
  type EventBulk,
  type PreparedQuery,
  type RxConflictResultionTask,
  type RxConflictResultionTaskSolution,
  type RxDocumentData,
  type RxJsonSchema,
  type RxStorageBulkWriteResponse,
  type RxStorageChangeEvent,
  type RxStorageCountResult,
  type RxStorageDefaultCheckpoint,
  type RxStorageInstance,
  type RxStorageQueryResult,
} from "rxdb";
import type {
  MemoryFileSyncedInternals,
  RxStorageMemoryFileSynced,
  RxStorageMemoryFileSyncedInstanceCreationOptions,
} from ".";
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
  public readonly primaryPath: Extract<keyof RxDocumentData<RxDocType>, string>;

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
    this.primaryPath = getPrimaryFieldOfPrimaryKey(schema.primaryKey);
  }

  // TODO: support indices
  // TODO: support attachments
  // TODO: lazy writes/performance optimizations
  bulkWrite(
    documentWrites: BulkWriteRow<RxDocType>[],
    context: string
  ): Promise<RxStorageBulkWriteResponse<RxDocType>> {
    const internals = this.internals;
    const documentsById = this.internals.documents;
    const primaryPath = this.primaryPath;
    // Use baked-in validtor
    const categorized = categorizeBulkWriteRows(
      this,
      primaryPath as any,
      documentsById,
      documentWrites,
      context
    );

    const error = categorized.errors;
    const inserts = categorized.bulkInsertDocs;
    const updates = categorized.bulkUpdateDocs;

    for (const insert of inserts) {
      documentsById.set(insert.document[primaryPath] as any, insert.document);
    }

    for (const update of updates) {
      documentsById.set(update.document[primaryPath] as any, update.document);
    }

    return Promise.resolve({ error });
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

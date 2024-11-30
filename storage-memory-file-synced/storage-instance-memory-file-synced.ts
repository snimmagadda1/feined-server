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
import { getMemoryFsCollectionKey, StringKeys } from "./helpers";

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

  bulkWrite(
    documentWrites: BulkWriteRow<RxDocType>[],
    context: string
  ): Promise<RxStorageBulkWriteResponse<RxDocType>> {
    const internals = this.internals;
    const documentsById = this.internals.documents;
    const primaryPath = this.primaryPath;
    const categorized = categorizeBulkWriteRows(
      this,
      primaryPath as any,
      documentsById,
      documentWrites,
      context
    )

    console.warn('Bulk write got categorized', categorized);
    
    // Fail on first row until implemented
    return Promise.resolve({
      error: [
        {
          status: 422,
          /**
           * set this property to make it easy
           * to detect if the object is a RxStorageBulkWriteError
           */
          isError: true,

          // primary key of the document
          documentId: "",

          // the original document data that should have been written.
          writeRow: documentWrites[0],
          validationErrors: [],
        },
      ],
    });
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

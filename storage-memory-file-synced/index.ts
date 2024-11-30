import {
  RXDB_VERSION,
  type RxDocumentData,
  type RxStorage,
  type RxStorageInstanceCreationParams,
} from "rxdb";
import { getMemoryFsCollectionKey } from "./helpers";
import { RxStorageMemoryFileSyncedInstance } from "./storage-instance-memory-file-synced";

// init options
export type RxStorageMemoryFileSyncedInstanceCreationOptions = {};

// implementation specific objects
export type MemoryFileSyncedInternals<RxDocType> = {
  documents: Map<string, RxDocumentData<RxDocType>>;
  useCount: number;
};

// base storage interface
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
      const store = this;
      const collectionKey = getMemoryFsCollectionKey(
        params.databaseName,
        params.collectionName,
        params.schema.version
      );
      // Check if instance of collection
      let internals = store.collectionInfo.get(collectionKey);
      if (!internals) {
        internals = {
          documents: new Map(),
          useCount: 1,
        };
        store.collectionInfo.set(collectionKey, internals);
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


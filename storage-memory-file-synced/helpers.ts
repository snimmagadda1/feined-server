export function getMemoryFsCollectionKey(
  databaseName: string,
  collectionName: string,
  schemaVersion: number
): string {
  return [databaseName, collectionName, schemaVersion].join("--memfs--");
}

import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'pms-drafts';
const DB_VERSION = 1;

interface DraftDB {
  'project-drafts': { key: string; value: Record<string, any> };
  'task-drafts': { key: string; value: Record<string, any> };
}

let db: IDBPDatabase<DraftDB> | null = null;

async function getDB(): Promise<IDBPDatabase<DraftDB>> {
  if (db) return db;
  db = await openDB<DraftDB>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains('project-drafts')) {
        database.createObjectStore('project-drafts');
      }
      if (!database.objectStoreNames.contains('task-drafts')) {
        database.createObjectStore('task-drafts');
      }
    },
  });
  return db;
}

export async function saveDraft(
  store: 'project-drafts' | 'task-drafts',
  key: string,
  data: Record<string, any>,
): Promise<void> {
  const database = await getDB();
  await database.put(store, { ...data, _savedAt: new Date().toISOString() }, key);
}

export async function loadDraft(
  store: 'project-drafts' | 'task-drafts',
  key: string,
): Promise<Record<string, any> | undefined> {
  const database = await getDB();
  return database.get(store, key);
}

export async function deleteDraft(
  store: 'project-drafts' | 'task-drafts',
  key: string,
): Promise<void> {
  const database = await getDB();
  await database.delete(store, key);
}

export async function clearDrafts(store: 'project-drafts' | 'task-drafts'): Promise<void> {
  const database = await getDB();
  await database.clear(store);
}

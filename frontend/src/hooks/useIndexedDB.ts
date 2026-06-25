import { useCallback } from 'react';
import { saveDraft, loadDraft, deleteDraft } from '../utils/indexedDB';

type DraftStore = 'project-drafts' | 'task-drafts';

export function useIndexedDB(store: DraftStore) {
  const save = useCallback(
    async (key: string, data: Record<string, any>) => {
      try { await saveDraft(store, key, data); } catch (e) { console.warn('IndexedDB save failed:', e); }
    },
    [store],
  );

  const load = useCallback(
    async (key: string) => {
      try { return await loadDraft(store, key); } catch { return undefined; }
    },
    [store],
  );

  const remove = useCallback(
    async (key: string) => {
      try { await deleteDraft(store, key); } catch (e) { console.warn('IndexedDB delete failed:', e); }
    },
    [store],
  );

  return { save, load, remove };
}

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listItems, upsertItem, deleteItem, exportJSON, importJSON } from '../../src/lib/storage/indexed';

// Fake chrome.storage
const store: Record<string, any> = {};
// @ts-ignore
global.chrome = {
  storage: {
    local: {
      get: vi.fn(async (key: string) => ({ [key]: store[key] })),
      set: vi.fn(async (obj: Record<string, any>) => {
        Object.assign(store, obj);
      }),
    },
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
};

describe('storage basic', () => {
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
  });

  it('upsert/list/delete works and export/import validates', async () => {
    const item = { id: 'a', title: 't', content: 'c', tags: [], favorite: false, updatedAt: 0 };
    await upsertItem(item as any);
    const afterUpsert = await listItems();
    expect(afterUpsert.length).toBe(1);
    expect(afterUpsert[0].id).toBe('a');

    // export JSON
    const bundle = await exportJSON();
    expect(bundle.version).toBe('v1');
    expect(bundle.items.length).toBe(1);

    // delete
    await deleteItem('a');
    const afterDelete = await listItems();
    expect(afterDelete.length).toBe(0);

    // import JSON
    const res = await importJSON(bundle);
    expect(res.imported).toBe(1);
    const afterImport = await listItems();
    expect(afterImport.length).toBe(1);
    expect(afterImport[0].title).toBe('t');
  });

  it('import should throw on wrong schema', async () => {
    await expect(importJSON({ version: 'bad', exportedAt: Date.now(), items: [] })).rejects.toBeTruthy();
  });
});



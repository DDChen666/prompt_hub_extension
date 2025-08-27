import { z } from 'zod';
import { ExportBundleV1, PromptItem, SitePolicy, Flags, defaultSitePolicy, defaultFlags, AllExport, Group } from '../../contracts/schemas';

const STORAGE_KEYS = {
  items: 'prompt_items_v1',
  groups: 'prompt_groups_v1',
  site: 'site_policy_v1',
  flags: 'feature_flags_v1',
  geminiKey: 'gemini_key',
  geminiKeySavedAt: 'gemini_key_saved_at',
  geminiModel: 'gemini_model',
  preferLlm: 'prefer_llm',
} as const;

const ItemsSchema = z.array(PromptItem);
const GroupsSchema = z.array(Group);

let inMemoryCache: z.infer<typeof ItemsSchema> | null = null;
let groupsCache: z.infer<typeof GroupsSchema> | null = null;
let cacheInitialized = false;
let groupsCacheInitialized = false;

async function chromeGet<T>(key: string): Promise<T | null> {
  const out = await chrome.storage.local.get(key);
  const val = out[key];
  return (val ?? null) as T | null;
}

async function chromeSet<T>(key: string, val: T): Promise<void> {
  await chrome.storage.local.set({ [key]: val });
}

async function readItemsFromStorage(): Promise<z.infer<typeof ItemsSchema>> {
  const raw = await chromeGet<unknown>(STORAGE_KEYS.items);
  if (!raw) return [];
  return ItemsSchema.parse(raw);
}

async function writeItemsToStorage(items: z.infer<typeof ItemsSchema>): Promise<void> {
  const parsed = ItemsSchema.parse(items);
  await chromeSet(STORAGE_KEYS.items, parsed);
}

function ensureCacheInitializedPromise(): Promise<void> {
  if (cacheInitialized && inMemoryCache !== null) return Promise.resolve();
  return (async () => {
    const items = await readItemsFromStorage();
    inMemoryCache = items;
    cacheInitialized = true;
  })();
}

// 新 API —— 以 Promise 方式導出
export async function listItems(): Promise<z.infer<typeof ItemsSchema>> {
  await ensureCacheInitializedPromise();
  return inMemoryCache ? [...inMemoryCache] : [];
}

export async function upsertItem(item: z.infer<typeof PromptItem>): Promise<void> {
  // 嚴格解析並更新 updatedAt
  const parsed = PromptItem.parse({ ...item, updatedAt: Date.now() });
  await ensureCacheInitializedPromise();
  const items = inMemoryCache ? [...inMemoryCache] : [];
  const idx = items.findIndex((x) => x.id === parsed.id);
  if (idx >= 0) {
    items[idx] = parsed;
  } else {
    items.push(parsed);
  }
  inMemoryCache = items;
  await writeItemsToStorage(items);
}

export async function deleteItem(id: string): Promise<void> {
  const idStr = z.string().min(1).parse(id);
  await ensureCacheInitializedPromise();
  const items = inMemoryCache ? inMemoryCache.filter((x) => x.id !== idStr) : [];
  inMemoryCache = items;
  await writeItemsToStorage(items);
}

export async function exportJSON() {
  const items = await listItems();
  const bundle = ExportBundleV1.parse({ version: 'v1', exportedAt: Date.now(), items });
  return bundle;
}

export async function importJSON(bundle: unknown): Promise<{ imported: number }> {
  const parsed = ExportBundleV1.parse(bundle);
  const items = ItemsSchema.parse(parsed.items);
  inMemoryCache = items;
  await writeItemsToStorage(items);
  return { imported: items.length };
}

export function onChanged(cb: (items: z.infer<typeof ItemsSchema>) => void): () => void {
  const listener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
    if (areaName !== 'local') return;
    if (!Object.prototype.hasOwnProperty.call(changes, STORAGE_KEYS.items)) return;
    const next = changes[STORAGE_KEYS.items]?.newValue ?? null;
    try {
      const parsed = ItemsSchema.parse(next ?? []);
      inMemoryCache = parsed;
      cacheInitialized = true;
      cb([...parsed]);
    } catch (err) {
      // 略過解析錯誤，避免污染快取
    }
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}

// 兼容舊 API（供現有代碼繼續使用）
export const storage = {
  getItems: listItems,
  setItems: writeItemsToStorage,
  exportItems: exportJSON,
  importItems: importJSON,
  // Gemini API Key 保留
  async getGeminiKey() {
    const v = await chromeGet<string>(STORAGE_KEYS.geminiKey);
    return v || '';
  },
  async setGeminiKey(v: unknown) {
    const parsed = z.string().parse(v);
    await chromeSet(STORAGE_KEYS.geminiKey, parsed);
  },
  async getGeminiKeySavedAt() {
    const v = await chromeGet<number>(STORAGE_KEYS.geminiKeySavedAt);
    return v ?? null;
  },
  async setGeminiKeySavedAt(ts: unknown) {
    const parsed = z.number().int().positive().parse(ts);
    await chromeSet(STORAGE_KEYS.geminiKeySavedAt, parsed);
  },
  async getGeminiModel() {
    const v = await chromeGet<string>(STORAGE_KEYS.geminiModel);
    return v || 'gemini-2.5-flash';
  },
  async setGeminiModel(v: unknown) {
    const parsed = z.string().min(1).parse(v);
    await chromeSet(STORAGE_KEYS.geminiModel, parsed);
  },
  async getPreferLlm() {
    const v = await chromeGet<boolean>(STORAGE_KEYS.preferLlm);
    return Boolean(v ?? true);
  },
  async setPreferLlm(v: unknown) {
    const parsed = z.boolean().parse(v);
    await chromeSet(STORAGE_KEYS.preferLlm, parsed);
  },
};

// === 站點策略與功能旗標 ===
export async function getSitePolicy(): Promise<SitePolicy> {
  const raw = await chromeGet<unknown>(STORAGE_KEYS.site);
  return SitePolicy.parse(raw ?? defaultSitePolicy);
}

export async function setSitePolicy(p: SitePolicy): Promise<void> {
  const parsed = SitePolicy.parse(p);
  await chromeSet(STORAGE_KEYS.site, parsed);
}

export async function getFlags(): Promise<Flags> {
  const raw = await chromeGet<unknown>(STORAGE_KEYS.flags);
  return Flags.parse(raw ?? defaultFlags);
}

export async function setFlags(f: Flags): Promise<void> {
  const parsed = Flags.parse(f);
  await chromeSet(STORAGE_KEYS.flags, parsed);
}

export async function exportAll(): Promise<AllExport> {
  const items = await listItems();
  const site = await getSitePolicy();
  return AllExport.parse({ version: 'all-v1', exportedAt: Date.now(), items, site });
}

// === 群組管理功能 === - AIDEV-CONTRACT: 群組數據操作
// 注意：群組功能需向後兼容現有 group 字段

async function readGroupsFromStorage(): Promise<z.infer<typeof GroupsSchema>> {
  const raw = await chromeGet<unknown>(STORAGE_KEYS.groups);
  if (!raw) return [];
  return GroupsSchema.parse(raw);
}

async function writeGroupsToStorage(groups: z.infer<typeof GroupsSchema>): Promise<void> {
  const parsed = GroupsSchema.parse(groups);
  await chromeSet(STORAGE_KEYS.groups, parsed);
}

function ensureGroupsCacheInitializedPromise(): Promise<void> {
  if (groupsCacheInitialized && groupsCache !== null) return Promise.resolve();
  return (async () => {
    const groups = await readGroupsFromStorage();
    groupsCache = groups;
    groupsCacheInitialized = true;
  })();
}

export async function listGroups(): Promise<z.infer<typeof GroupsSchema>> {
  await ensureGroupsCacheInitializedPromise();
  return groupsCache ? [...groupsCache] : [];
}

export async function createGroup(groupData: Omit<Group, 'id' | 'createdAt' | 'updatedAt'>): Promise<Group> {
  const group: Group = {
    id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ...groupData,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  const parsed = Group.parse(group);
  await ensureGroupsCacheInitializedPromise();
  const groups = groupsCache ? [...groupsCache] : [];
  groups.push(parsed);
  groupsCache = groups;
  await writeGroupsToStorage(groups);
  return parsed;
}

export async function updateGroup(id: string, updates: Partial<Omit<Group, 'id' | 'createdAt'>>): Promise<Group> {
  const idStr = z.string().min(1).parse(id);
  await ensureGroupsCacheInitializedPromise();
  const groups = groupsCache ? [...groupsCache] : [];
  const index = groups.findIndex(g => g.id === idStr);
  
  if (index === -1) {
    throw new Error(`Group with id ${idStr} not found`);
  }
  
  const updatedGroup = {
    ...groups[index],
    ...updates,
    updatedAt: Date.now(),
  };
  
  const parsed = Group.parse(updatedGroup);
  groups[index] = parsed;
  groupsCache = groups;
  await writeGroupsToStorage(groups);
  return parsed;
}

export async function deleteGroup(id: string): Promise<void> {
  const idStr = z.string().min(1).parse(id);
  await ensureGroupsCacheInitializedPromise();
  const groups = groupsCache ? groupsCache.filter(g => g.id !== idStr) : [];
  groupsCache = groups;
  await writeGroupsToStorage(groups);
  
  // 刪除群組後，將該群組的項目移動到未分組狀態
  const items = await listItems();
  const itemsToUpdate = items.filter(item => item.group === idStr);
  if (itemsToUpdate.length > 0) {
    const updatedItems = items.map(item => 
      item.group === idStr ? { ...item, group: undefined } : item
    );
    inMemoryCache = updatedItems;
    await writeItemsToStorage(updatedItems);
  }
}

export function onGroupsChanged(cb: (groups: z.infer<typeof GroupsSchema>) => void): () => void {
  const listener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
    if (areaName !== 'local') return;
    if (!Object.prototype.hasOwnProperty.call(changes, STORAGE_KEYS.groups)) return;
    const next = changes[STORAGE_KEYS.groups]?.newValue ?? null;
    try {
      const parsed = GroupsSchema.parse(next ?? []);
      groupsCache = parsed;
      groupsCacheInitialized = true;
      cb([...parsed]);
    } catch (err) {
      // 略過解析錯誤，避免污染快取
    }
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}

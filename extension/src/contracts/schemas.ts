import { z } from 'zod';

export const ErrorCode = z.enum(['E_TIMEOUT', 'E_RATE', 'E_UPSTREAM', 'E_SCHEMA', 'E_DENY']);
export type ErrorCode = z.infer<typeof ErrorCode>;

// Group 契約 - AIDEV-CONTRACT: 群組數據結構
// 注意：群組功能需向後兼容現有 group 字段
// 破壞性變更需要 v2 + 遷移 + 回滾
// 預設顏色採用淡雅漸層色主題
const GradientColor = z.enum([
  'blue',      // 淡藍色漸層
  'green',     // 淡綠色漸層  
  'purple',    // 淡紫色漸層
  'orange',    // 淡橙色漸層
  'pink',      // 淡粉色漸層
  'custom'     // 自訂顏色
]);
export type GradientColor = z.infer<typeof GradientColor>;

export const Group = z.object({
  id: z.string(),
  name: z.string().min(1).max(50),
  color: GradientColor.default('blue'),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type Group = z.infer<typeof Group>;

// PromptItem 契約
export const PromptItem = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  tags: z.array(z.string()),
  group: z.string().optional(),
  favorite: z.boolean(),
  updatedAt: z.number(),
});
export type PromptItem = z.infer<typeof PromptItem>;

// 注意：為了維持與既有測試相容，保留寬鬆的 ExportBundle（version 為 string）
export const ExportBundle = z.object({
  version: z.string(),
  exportedAt: z.number(),
  items: z.array(PromptItem),
});
export type ExportBundle = z.infer<typeof ExportBundle>;

// 嚴格版（本步 storage 匯入/匯出一律使用此 schema）
export const ExportBundleV1 = z.object({
  version: z.literal('v1'),
  exportedAt: z.number(),
  items: z.array(PromptItem),
});
export type ExportBundleV1 = z.infer<typeof ExportBundleV1>;

// 站點策略（Allow/Block/Copy-only）
export const SitePolicy = z.object({
  allowlist: z.array(z.string()).default([]),
  blocklist: z.array(z.string()).default([]),
  copyOnly: z.array(z.string()).default([]),
});
export type SitePolicy = z.infer<typeof SitePolicy>;
export const defaultSitePolicy: SitePolicy = { allowlist: [], blocklist: [], copyOnly: [] };

// 功能旗標（保險絲）
export const Flags = z.object({
  disableOverlay: z.boolean().default(false),
  disableLlm: z.boolean().default(false),
  readonly: z.boolean().default(false),
});
export type Flags = z.infer<typeof Flags>;
export const defaultFlags: Flags = { disableOverlay: false, disableLlm: false, readonly: false };

// 匯出全部（items + site policy）
export const AllExport = z.object({
  version: z.literal('all-v1'),
  exportedAt: z.number(),
  items: z.array(PromptItem),
  site: SitePolicy,
});
export type AllExport = z.infer<typeof AllExport>;

// 其餘既有型別保留（未在本步使用）
export const Template = z.object({
  id: z.string(),
  name: z.string(),
  variables: z.array(z.string()),
  body: z.string(),
});
export type Template = z.infer<typeof Template>;

export const SpecializeRequest = z.object({
  sentence: z.string(),
  templateId: z.string().optional(),
  variables: z.record(z.string()).optional(),
});
export type SpecializeRequest = z.infer<typeof SpecializeRequest>;

export const SpecializeResponse = z.object({
  output: z.string(),
  used: z.union([z.literal('rule'), z.literal('llm')]),
  latencyMs: z.number(),
  degraded: z.boolean(),
});
export type SpecializeResponse = z.infer<typeof SpecializeResponse>;

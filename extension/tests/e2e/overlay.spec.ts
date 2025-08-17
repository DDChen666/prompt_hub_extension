import { test, expect, chromium, BrowserContext, Page } from '@playwright/test';

// Guard RUN_E2E without Node types
declare const process: any;
const runE2E = typeof process !== 'undefined' && process && process.env && process.env.RUN_E2E === 'true';
if (!runE2E) test.skip(true, 'E2E disabled by default');

import os from 'node:os';
const fileURLToPath: any = (x: string) => x;
import path from 'node:path';
import fs from 'node:fs';
 
if (!runE2E) test.skip(true, 'E2E disabled by default');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXTENSION_DIST = path.resolve(__dirname, '../../dist');

test.describe('Overlay E2E', () => {
  let context: BrowserContext;
  let page: Page;
  let extensionId: string;
  let userDataDir: string;

  test.beforeAll(async () => {
    // 使用獨立 persistent profile，確保擴充必載入
    userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'po-profile-'));
    context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_DIST}`,
        `--load-extension=${EXTENSION_DIST}`,
      ],
    });
    const pages = context.pages();
    page = pages.length > 0 ? pages[0] : await context.newPage();

    // 從 persistent profile 的 Preferences 解析 extensionId
    const prefPath = path.join(userDataDir, 'Default', 'Preferences');
    // 簡單輪詢等待檔案出現
    for (let i = 0; i < 50; i += 1) {
      if (fs.existsSync(prefPath)) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    const prefsRaw = fs.readFileSync(prefPath, 'utf-8');
    const prefs = JSON.parse(prefsRaw);
    const settings = (prefs.extensions && prefs.extensions.settings) || {};
    let found = '';
    for (const [id, meta] of Object.entries<any>(settings)) {
      if (meta && (meta.path === EXTENSION_DIST || (meta.manifest && meta.manifest.name === 'Prompt Organizer (MVP)'))) {
        found = id;
        break;
      }
    }
    // 若未命中 path/name，退而取第一個擴充 id（測試環境通常只載一個）
    if (!found) {
      const first = Object.keys(settings)[0];
      found = first || '';
    }
    extensionId = found;
  });

  test.afterAll(async () => {
    await context.close();
  });

  async function openViaMessage() {
    // 透過擴充 options.html 發訊息給背景，注入（或切換關閉） overlay
    const extPage = await context.newPage();
    await extPage.goto(`chrome-extension://${extensionId}/options.html`);
    await extPage.evaluate(() => new Promise((resolve) => {
      chrome.runtime.sendMessage('__PO_TEST_INJECT__', () => resolve(null));
    }));
    await extPage.close();
  }

  test('contenteditable 貼入 + 熱鍵二次呼叫 Toggle 關閉 + 不可寫入降級文案', async () => {
    // 確認 dist 與 manifest 存在
    expect(fs.existsSync(EXTENSION_DIST)).toBeTruthy();
    expect(fs.existsSync(path.join(EXTENSION_DIST, 'manifest.json'))).toBeTruthy();

    // 測試頁：以 setContent 建立內容
    await page.setContent('<!doctype html><meta charset="utf-8"><title>e2e</title>');
    await page.evaluate(() => {
      const ed = document.createElement('div');
      ed.id = 'ed';
      ed.setAttribute('contenteditable', 'true');
      ed.style.cssText = 'border:1px solid #ccc;min-height:40px;padding:8px';
      ed.textContent = 'Hello';
      const non = document.createElement('button');
      non.id = 'nonwrite';
      non.textContent = '不可寫元素';
      document.body.appendChild(ed);
      document.body.appendChild(non);
      ed.focus();
    });

    // 先到 options 頁種一筆資料（確保 overlay 有清單）
    const seedPage = await context.newPage();
    await seedPage.goto(`chrome-extension://${extensionId}/options.html`);
    await seedPage.evaluate(() => new Promise<void>((res) => {
      const now = Date.now();
      const item = { id: 'seed1', title: 'Hello', content: 'Hello world', tags: [], favorite: false, updatedAt: now };
      chrome.storage.local.set({ prompt_items_v1: { items: [item] } }, () => res());
    }));
    await seedPage.close();

    // Toggle：開 → 關
    await page.bringToFront();
    await openViaMessage();
    await page.waitForSelector('#__po_root', { state: 'attached', timeout: 3000 });
    await openViaMessage();
    await expect(page.locator('#__po_root')).toHaveCount(0);

    // 再開 overlay 並等待節點建立（透過訊息注入），按 Enter 套用第一筆
    await page.bringToFront();
    await openViaMessage();
    await page.waitForSelector('#__po_root', { state: 'attached', timeout: 3000 });
    await page.waitForTimeout(200);
    await page.keyboard.press('Enter');

    // contenteditable 貼入成功
    await expect(page.locator('#ed')).toContainText('Hello world');

    // 再次 Toggle 關閉
    await openViaMessage();
    await expect(page.locator('#__po_root')).toHaveCount(0);

    // 不可寫情境：聚焦不可寫元素 → 再次注入 + Enter → 顯示降級文案
    await page.click('#nonwrite');
    await openViaMessage();
    await page.keyboard.press('Enter');
    const msgText = await page.evaluate(() => {
      const host = document.getElementById('__po_root');
      // @ts-ignore
      const msg = host?.shadowRoot?.getElementById('po-msg');
      return msg?.textContent || '';
    });
    await expect(msgText).toContain('本頁不可直接寫入');
  });
});



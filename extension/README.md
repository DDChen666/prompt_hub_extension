## 私發安裝

1) 於本專案根目錄執行：`pnpm build && pnpm guard && pnpm zip`
2) Chrome/Edge → 擴充功能 → 開發人員模式 → 載入已解壓縮項目（選擇 `dist/`）或直接拖放 `dist.zip`
3) 在擴充的「快捷鍵」頁面設定 `open-panel` 的快捷鍵（預設：mac `Cmd+Shift+K`、Win/Linux `Ctrl+Shift+K`）

## 站點策略與唯讀

- Options 可設定 Allowlist/Blocklist/Copy-only（每行一條，支援 `*.domain.com`）
- Blocklist：熱鍵按下不注入，擴充圖示 badge 顯示「BLOCK」2 秒
- Allowlist：若清單非空，僅允許清單站注入
- Copy-only：Overlay 仍顯示，但 Enter 只會複製，不嘗試寫入頁面
- Feature Flags：Disable Overlay / Disable LLM / Readonly
  - Disable Overlay：熱鍵直接無效，badge 顯示「OFF」2 秒
  - Readonly：Popup 僅顯示複製，不可新增/更新/刪除

## 匯出/備份

- Options → 一鍵匯出全部：下載 `export_all.json`（格式：`{ version:'all-v1', exportedAt, items:[], site:{...} }`）
- 啟動自檢：onInstalled/onStartup 若 schema 解析失敗，會把當前資料寫到 `backup_YYYYMMDD` key 並在 console 提示

## 最小部署與發版

- 本地：`pnpm build && pnpm guard && pnpm zip`
- 產生附檔：`pnpm run release:notes && pnpm run release:sha`
- 打 tag：`git tag v0.1.0 && git push origin v0.1.0`
- CI 會建立 Release，附上 `dist.zip` 與 `dist.zip.sha256`

## 風險與回滾

- 功能層故障：在 Options 勾選 Disable Overlay 立即熄火；或安裝上一版 dist.zip
- 資料風險：先用「一鍵匯出全部」備份；或於背景 console 查 `backup_YYYYMMDD`
- 策略誤殺：清空 Allow/Block/Copy-only 或暫時停用策略



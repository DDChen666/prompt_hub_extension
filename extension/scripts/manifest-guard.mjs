import { readFile } from 'node:fs/promises';
import { exit } from 'node:process';

async function main() {
  const path = new URL('../dist/manifest.json', import.meta.url);
  let manifest;
  try {
    const raw = await readFile(path, 'utf8');
    manifest = JSON.parse(raw);
  } catch (e) {
    console.error('manifest-guard: 無法讀取 dist/manifest.json', e);
    exit(1);
  }

  const allowed = new Set(['storage', 'scripting', 'activeTab', 'commands']);
  const perms = new Set(manifest.permissions || []);

  for (const p of perms) {
    if (!allowed.has(p)) {
      console.error(`manifest-guard: 檢測到未授權權限: ${p}`);
      exit(1);
    }
  }

  if (manifest.host_permissions && manifest.host_permissions.length > 0) {
    console.error('manifest-guard: 禁止在本步驟使用 host_permissions');
    exit(1);
  }

  if (manifest.manifest_version !== 3) {
    console.error('manifest-guard: manifest_version 必須為 3');
    exit(1);
  }

  console.info('manifest-guard: PASS');
}

main();

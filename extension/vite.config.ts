import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import path from 'node:path';
import manifest from './manifest.json';

const rootDir = path.dirname(new URL(import.meta.url).pathname);

export default defineConfig({
  plugins: [react(), crx({ manifest: manifest as any })],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: path.resolve(rootDir, 'popup.html'),
        options: path.resolve(rootDir, 'options.html'),
      },
    },
  },
});

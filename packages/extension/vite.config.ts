import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';

const root = __dirname;

export default defineConfig({
  build: {
    target: 'es2020',
    minify: 'esbuild',
    sourcemap: false,
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        'service-worker': resolve(root, 'src/service-worker.ts'),
        'content-script': resolve(root, 'src/content-script.ts'),
        'popup':          resolve(root, 'src/popup.ts'),
      },
      output: {
        format: 'es',
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name].js',
        assetFileNames: '[name][extname]',
      },
    },
  },
  plugins: [
    {
      name: 'copy-public',
      closeBundle() {
        const publicDir = resolve(root, 'public');
        const outDir    = resolve(root, 'dist');
        if (!existsSync(publicDir)) return;
        for (const f of readdirSync(publicDir)) {
          copyFileSync(resolve(publicDir, f), resolve(outDir, f));
        }
        // copy icons
        const iconsSrc = resolve(root, 'icons');
        const iconsDst = resolve(outDir, 'icons');
        if (existsSync(iconsSrc)) {
          mkdirSync(iconsDst, { recursive: true });
          cpSync(iconsSrc, iconsDst, { recursive: true });
        }
      },
    },
  ],
});

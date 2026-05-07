import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    target: 'es2020',
    cssCodeSplit: false,
    minify: 'esbuild',
    lib: {
      entry: resolve(__dirname, 'src/loader.ts'),
      name: 'VylthAnnotator',
      formats: ['iife'],
      fileName: () => 'w.js',
    },
    rollupOptions: {
      output: {
        // v0: inline everything into one IIFE so a single <script src="w.js">
        // works without type="module". Switch to ES + lazy split when bundle grows.
        inlineDynamicImports: true,
      },
    },
  },
});

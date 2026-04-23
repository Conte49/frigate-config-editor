import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const projectRoot = dirname(fileURLToPath(import.meta.url));

// Home Assistant custom panels are loaded as a single ES module served
// from /hacsfiles/<repo>/frigate-config-editor.js. We therefore build
// a self-contained bundle that inlines every dependency.
export default defineConfig({
  build: {
    target: 'es2022',
    lib: {
      entry: resolve(projectRoot, 'src/index.ts'),
      formats: ['es'],
      fileName: () => 'frigate-config-editor.js',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
    sourcemap: true,
    minify: 'esbuild',
    emptyOutDir: true,
  },
  esbuild: {
    legalComments: 'none',
  },
});

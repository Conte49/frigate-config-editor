import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const projectRoot = dirname(fileURLToPath(import.meta.url));

// The bundle is served by the Python shim integration at
// custom_components/frigate_config_editor/. We build directly into its
// `www/` subdirectory so the same tree is ready to be zipped for a
// HACS release without extra moves.
export default defineConfig({
  build: {
    target: 'es2022',
    outDir: resolve(projectRoot, 'custom_components/frigate_config_editor/www'),
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

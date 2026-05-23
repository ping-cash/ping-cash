import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  target: 'node20',
  clean: true,
  sourcemap: true,
  bundle: true,
  noExternal: [/.*/], // bundle ALL deps including node_modules for runtime self-containment
  // Skip rare deps that need native bindings or runtime resolution
  external: ['@prisma/client', '.prisma'],
});

import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/react.ts',
    'src/attest.entry.ts',
    'src/projects.entry.ts',
    'src/attest-ui.entry.ts',
    'src/contributions.entry.ts',
    'src/validation.entry.ts',
    'src/chains.entry.ts'
  ],
  format: ['cjs', 'esm'],
  dts: { resolve: true },
  clean: true,
  sourcemap: true,
  splitting: false,
  // Bundle js-yaml for browser compatibility
  noExternal: ['js-yaml'],
  platform: 'browser',
  target: 'es2020',
  minify: false,
  treeshake: true,
});

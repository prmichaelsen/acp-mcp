import esbuild from 'esbuild';

const sharedConfig = {
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  sourcemap: true,
  external: ['@modelcontextprotocol/sdk'],
};

// Build standalone server
await esbuild.build({
  ...sharedConfig,
  entryPoints: ['src/server.ts'],
  outfile: 'dist/server.js',
  banner: {
    js: '#!/usr/bin/env node',
  },
});

// Build server factory
await esbuild.build({
  ...sharedConfig,
  entryPoints: ['src/server-factory.ts'],
  outfile: 'dist/server-factory.js',
});

console.log('✓ Build complete');

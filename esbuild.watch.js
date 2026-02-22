import esbuild from 'esbuild';

const sharedConfig = {
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  sourcemap: true,
  external: ['@modelcontextprotocol/sdk'],
};

// Watch standalone server
const ctx1 = await esbuild.context({
  ...sharedConfig,
  entryPoints: ['src/server.ts'],
  outfile: 'dist/server.js',
  banner: {
    js: '#!/usr/bin/env node',
  },
});

// Watch server factory
const ctx2 = await esbuild.context({
  ...sharedConfig,
  entryPoints: ['src/server-factory.ts'],
  outfile: 'dist/server-factory.js',
});

await Promise.all([ctx1.watch(), ctx2.watch()]);

console.log('👀 Watching for changes...');

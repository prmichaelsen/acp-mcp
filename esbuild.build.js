import esbuild from 'esbuild';
import { execSync } from 'child_process';

const sharedConfig = {
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  sourcemap: true,
  external: ['@modelcontextprotocol/sdk', 'ssh2'],
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

// Generate TypeScript declaration files
console.log('Generating TypeScript declarations...');
execSync('tsc --emitDeclarationOnly', { stdio: 'inherit' });

console.log('✓ Build complete');

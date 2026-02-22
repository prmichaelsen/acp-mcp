# Build Config Pattern

**Pattern**: esbuild Configuration for MCP Servers
**Category**: Build Tooling
**Complexity**: Intermediate
**Last Updated**: 2026-02-22

---

## Overview

The Build Config Pattern provides optimized esbuild configuration for building MCP servers with dual output (standalone + factory), fast builds, and proper TypeScript declaration generation.

**When to use this pattern**:
- Building TypeScript MCP servers
- Need fast build times
- Dual export (standalone + factory)
- Production deployments
- npm package publishing

---

## Core Principles

### 1. Fast Builds
esbuild is 10-100x faster than webpack or tsc alone.

### 2. Dual Output
Build both standalone server and factory for maximum flexibility.

### 3. ESM Format
Output ES modules for modern JavaScript compatibility.

### 4. External Dependencies
Don't bundle large dependencies - keep them external.

### 5. TypeScript Declarations
Generate `.d.ts` files for library usage.

---

## Complete Build Configuration

**esbuild.build.js**:

```javascript
import * as esbuild from 'esbuild';
import { execSync } from 'child_process';

// Build standalone server
await esbuild.build({
  entryPoints: ['src/server.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: 'dist/server.js',
  sourcemap: true,
  external: [
    '@modelcontextprotocol/sdk',
    // Add other external dependencies
  ],
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);"
  },
  alias: {
    '@': './src'
  }
});

console.log('✓ Built server.js');

// Build server factory
await esbuild.build({
  entryPoints: ['src/server-factory.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: 'dist/server-factory.js',
  sourcemap: true,
  external: [
    '@modelcontextprotocol/sdk',
    // Add other external dependencies
  ],
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);"
  },
  alias: {
    '@': './src'
  }
});

console.log('✓ Built server-factory.js');

// Generate TypeScript declarations
console.log('Generating TypeScript declarations...');
try {
  execSync('tsc --emitDeclarationOnly --outDir dist', { stdio: 'inherit' });
  console.log('✓ Generated TypeScript declarations');
} catch (error) {
  console.error('✗ Failed to generate TypeScript declarations');
  process.exit(1);
}

console.log('✓ Build complete');
```

---

## Configuration Options

### Entry Points

```javascript
entryPoints: ['src/server.ts']
```

**Purpose**: Specify which files to build. Can be array or object:

```javascript
// Array format
entryPoints: ['src/server.ts', 'src/server-factory.ts']

// Object format (custom output names)
entryPoints: {
  'server': 'src/server.ts',
  'factory': 'src/server-factory.ts'
}
```

### Bundle

```javascript
bundle: true
```

**Purpose**: Bundle all dependencies into single file. Set to `false` to keep imports.

### Platform

```javascript
platform: 'node'
```

**Options**: `'node'` | `'browser'` | `'neutral'`

**Purpose**: Optimize for target platform. Use `'node'` for MCP servers.

### Target

```javascript
target: 'node20'
```

**Purpose**: Set JavaScript feature level. Options: `'node18'`, `'node20'`, `'es2022'`, etc.

### Format

```javascript
format: 'esm'
```

**Options**: `'esm'` | `'cjs'` | `'iife'`

**Purpose**: Output format. Use `'esm'` for modern Node.js.

### Outfile

```javascript
outfile: 'dist/server.js'
```

**Purpose**: Output file path. Use `outdir` for multiple entry points.

### Sourcemap

```javascript
sourcemap: true
```

**Options**: `true` | `false` | `'inline'` | `'external'` | `'both'`

**Purpose**: Generate source maps for debugging.

### External

```javascript
external: [
  '@modelcontextprotocol/sdk',
  'dotenv',
  // Large dependencies
]
```

**Purpose**: Don't bundle these dependencies - keep as imports.

**When to externalize**:
- Large dependencies (reduces bundle size)
- Native modules (can't be bundled)
- Peer dependencies
- MCP SDK (always external)

### Banner

```javascript
banner: {
  js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);"
}
```

**Purpose**: Add code to top of bundle. This enables `require()` in ESM.

### Alias

```javascript
alias: {
  '@': './src'
}
```

**Purpose**: Path aliases for cleaner imports:

```typescript
// Without alias
import { tool } from '../../../tools/tool.js';

// With alias
import { tool } from '@/tools/tool.js';
```

---

## Watch Mode

**esbuild.watch.js**:

```javascript
import * as esbuild from 'esbuild';

const ctx = await esbuild.context({
  entryPoints: ['src/server.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: 'dist/server.js',
  sourcemap: true,
  external: ['@modelcontextprotocol/sdk'],
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);"
  },
});

await ctx.watch();
console.log('👀 Watching for changes...');
```

**Usage**:

```bash
npm run build:watch
```

---

## npm Scripts

**package.json**:

```json
{
  "scripts": {
    "build": "node esbuild.build.js",
    "build:watch": "node esbuild.watch.js",
    "dev": "tsx watch src/server.ts",
    "start": "node dist/server.js",
    "clean": "rm -rf dist",
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "npm run clean && npm run build"
  }
}
```

**Script Purposes**:
- `build` - Production build
- `build:watch` - Watch mode for development
- `dev` - Run TypeScript directly with hot reload
- `start` - Run built server
- `clean` - Remove build artifacts
- `typecheck` - Check types without building
- `prepublishOnly` - Auto-build before npm publish

---

## TypeScript Declaration Generation

### Using tsc

```javascript
execSync('tsc --emitDeclarationOnly --outDir dist', { stdio: 'inherit' });
```

**Flags**:
- `--emitDeclarationOnly` - Only generate `.d.ts` files
- `--outDir dist` - Output to dist directory

### tsconfig.json Requirements

```json
{
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

---

## Advanced Configuration

### Minification

```javascript
await esbuild.build({
  // ... other options
  minify: true,
  keepNames: true, // Preserve function names for debugging
});
```

**When to use**: Production builds where size matters.

### Tree Shaking

```javascript
await esbuild.build({
  // ... other options
  treeShaking: true,
});
```

**Purpose**: Remove unused code. Enabled by default with `bundle: true`.

### Code Splitting

```javascript
await esbuild.build({
  entryPoints: ['src/server.ts', 'src/server-factory.ts'],
  bundle: true,
  splitting: true, // Enable code splitting
  outdir: 'dist',  // Use outdir instead of outfile
  format: 'esm',   // Required for splitting
});
```

**Purpose**: Share common code between entry points.

### Define

```javascript
await esbuild.build({
  // ... other options
  define: {
    'process.env.NODE_ENV': '"production"',
    '__VERSION__': '"1.0.0"',
  },
});
```

**Purpose**: Replace identifiers with values at build time.

---

## Benefits

### 1. Speed
- 10-100x faster than webpack
- Incremental builds in milliseconds
- Fast watch mode

### 2. Simplicity
- No complex configuration
- JavaScript-based config
- Easy to understand

### 3. Modern Output
- ESM by default
- Tree shaking
- Code splitting

### 4. TypeScript Support
- Native TypeScript support
- Fast compilation
- Source maps

---

## Anti-Patterns

### ❌ Don't: Bundle Everything

```javascript
// ❌ Wrong - Bundle all dependencies
await esbuild.build({
  bundle: true,
  external: [], // Nothing external
});
```

```javascript
// ✅ Correct - Externalize large dependencies
await esbuild.build({
  bundle: true,
  external: [
    '@modelcontextprotocol/sdk',
    'weaviate-client',
    'firebase-admin',
  ],
});
```

**Why**: Large dependencies increase bundle size and build time.

### ❌ Don't: Skip Source Maps

```javascript
// ❌ Wrong
sourcemap: false
```

```javascript
// ✅ Correct
sourcemap: true
```

**Why**: Source maps are essential for debugging production issues.

### ❌ Don't: Use CommonJS for New Projects

```javascript
// ❌ Wrong
format: 'cjs'
```

```javascript
// ✅ Correct
format: 'esm'
```

**Why**: ESM is the modern standard. CJS is legacy.

### ❌ Don't: Forget TypeScript Declarations

```javascript
// ❌ Wrong - No declarations
await esbuild.build({ ... });
// Done
```

```javascript
// ✅ Correct - Generate declarations
await esbuild.build({ ... });
execSync('tsc --emitDeclarationOnly --outDir dist');
```

**Why**: Libraries need `.d.ts` files for TypeScript users.

### ❌ Don't: Use Old Node Targets

```javascript
// ❌ Wrong
target: 'node12'
```

```javascript
// ✅ Correct
target: 'node20'
```

**Why**: Use modern Node.js features. Node 12 is EOL.

---

## Troubleshooting

**Problem**: "Cannot find module" errors at runtime

**Solution**: Add missing dependencies to `external` array:
```javascript
external: ['@modelcontextprotocol/sdk', 'missing-module']
```

**Problem**: Build is slow

**Solution**: 
1. Externalize large dependencies
2. Disable source maps for production
3. Use `treeShaking: false` if not needed

**Problem**: TypeScript declarations not generated

**Solution**: Check tsconfig.json has:
```json
{
  "compilerOptions": {
    "declaration": true,
    "outDir": "./dist"
  }
}
```

**Problem**: "require is not defined" error

**Solution**: Add CommonJS compatibility banner:
```javascript
banner: {
  js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);"
}
```

---

## Related Patterns

- [Bootstrap Pattern](mcp-server-starter.bootstrap.md) - Project setup
- [Server Standalone Pattern](mcp-server-starter.server-standalone.md) - What gets built
- [Server Factory Pattern](mcp-server-starter.server-factory.md) - Dual build target
- [Test Config Pattern](mcp-server-starter.test-config.md) - Testing built code

---

## Checklist

- [ ] Created `esbuild.build.js`
- [ ] Configured standalone server build
- [ ] Configured factory build (if needed)
- [ ] Added external dependencies
- [ ] Enabled source maps
- [ ] Added CommonJS compatibility banner
- [ ] Configured TypeScript declaration generation
- [ ] Created `esbuild.watch.js` for development
- [ ] Added npm scripts (build, build:watch, clean)
- [ ] Tested build output
- [ ] Verified declarations generated

---

**Pattern**: Build Config
**Status**: Production Ready
**Last Updated**: 2026-02-22

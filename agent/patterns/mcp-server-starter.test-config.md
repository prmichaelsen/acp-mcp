# Test Config Pattern

**Pattern**: Jest Configuration for TypeScript + ESM
**Category**: Testing
**Complexity**: Intermediate
**Last Updated**: 2026-02-22

---

## Overview

The Test Config Pattern provides Jest configuration optimized for testing TypeScript MCP servers with ES modules, including proper path mapping, coverage reporting, and test organization strategies.

**When to use this pattern**:
- Testing TypeScript MCP servers
- Using ES modules (not CommonJS)
- Need code coverage reports
- Want fast test execution
- Require path alias support

---

## Core Principles

### 1. ESM Support
Configure Jest for ES modules, not CommonJS.

### 2. TypeScript Integration
Use ts-jest for TypeScript compilation.

### 3. Path Aliases
Map TypeScript path aliases (`@/*`) in tests.

### 4. Colocated Tests
Keep tests close to source code.

### 5. Coverage Tracking
Monitor code coverage metrics.

---

## Complete Jest Configuration

**jest.config.js**:

```javascript
export default {
  // Use ts-jest preset for ESM
  preset: 'ts-jest/presets/default-esm',
  
  // Test environment
  testEnvironment: 'node',
  
  // Treat .ts files as ESM
  extensionsToTreatAsEsm: ['.ts'],
  
  // Where to find tests
  roots: ['<rootDir>/src'],
  
  // Test file patterns
  testMatch: ['**/*.spec.ts'],
  
  // File extensions
  moduleFileExtensions: ['ts', 'js'],
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // What to include in coverage
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.e2e.ts',
    '!src/index.ts',
    '!src/types/**/*.ts',
  ],
  
  // Path alias mapping
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1', // Map .js imports to .ts files
  },
  
  // TypeScript transformation
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
};
```

---

## Configuration Options

### Preset

```javascript
preset: 'ts-jest/presets/default-esm'
```

**Purpose**: Use ts-jest with ESM support. Other options:
- `'ts-jest'` - CommonJS (legacy)
- `'ts-jest/presets/default-esm'` - ESM (modern)

### Test Environment

```javascript
testEnvironment: 'node'
```

**Options**: `'node'` | `'jsdom'`

**Purpose**: Use Node.js environment for MCP servers (not browser).

### Test Match

```javascript
testMatch: ['**/*.spec.ts']
```

**Purpose**: Pattern to find test files. Common patterns:
- `**/*.spec.ts` - Colocated tests
- `**/*.test.ts` - Alternative naming
- `**/tests/**/*.ts` - Separate test directory

### Coverage

```javascript
collectCoverage: true,
coverageDirectory: 'coverage',
coverageReporters: ['text', 'lcov', 'html'],
```

**Reporters**:
- `'text'` - Console output
- `'lcov'` - For CI/CD tools
- `'html'` - Interactive HTML report

### Coverage Thresholds

```javascript
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80,
  },
},
```

**Purpose**: Enforce minimum coverage percentages.

---

## Test Organization

### Colocated Tests

```
src/
├── server.ts
├── server.spec.ts          # Test next to source
├── tools/
│   ├── hello-computer.ts
│   └── hello-computer.spec.ts
└── utils/
    ├── logger.ts
    └── logger.spec.ts
```

**Benefits**:
- Easy to find tests
- Clear what's tested
- Refactoring easier

### Separate Test Directory

```
src/
├── server.ts
├── tools/
│   └── hello-computer.ts
└── utils/
    └── logger.ts

tests/
├── server.test.ts
├── tools/
│   └── hello-computer.test.ts
└── utils/
    └── logger.test.ts
```

**Benefits**:
- Cleaner src directory
- Separate concerns
- Easier to exclude from builds

---

## Example Tests

### Unit Test

**src/tools/hello-computer.spec.ts**:

```typescript
import { describe, it, expect } from '@jest/globals';
import { handleHelloComputer } from './hello-computer.js';

describe('hello_computer tool', () => {
  it('should return greeting with name', async () => {
    const result = await handleHelloComputer(
      { name: 'Alice' },
      'user123'
    );
    
    const parsed = JSON.parse(result);
    expect(parsed.message).toBe('Hello, Alice!');
    expect(parsed.timestamp).toBeDefined();
  });
  
  it('should return default greeting without name', async () => {
    const result = await handleHelloComputer({}, 'user123');
    
    const parsed = JSON.parse(result);
    expect(parsed.message).toBe('Hello, world!');
  });
  
  it('should return valid JSON', async () => {
    const result = await handleHelloComputer({}, 'user123');
    expect(() => JSON.parse(result)).not.toThrow();
  });
  
  it('should include timestamp', async () => {
    const result = await handleHelloComputer({}, 'user123');
    const parsed = JSON.parse(result);
    
    expect(parsed.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
```

### Integration Test

**src/server-factory.spec.ts**:

```typescript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createServer } from './server-factory.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

describe('Server Factory', () => {
  let server: Server;
  
  afterEach(async () => {
    if (server) {
      await server.close();
    }
  });
  
  it('should create server instance', async () => {
    server = await createServer('test-token', 'user123');
    expect(server).toBeDefined();
    expect(server).toHaveProperty('setRequestHandler');
  });
  
  it('should require userId', async () => {
    await expect(
      createServer('token', '')
    ).rejects.toThrow('userId is required');
  });
  
  it('should create separate instances', async () => {
    const server1 = await createServer('token1', 'user1');
    const server2 = await createServer('token2', 'user2');
    
    expect(server1).not.toBe(server2);
    
    await server1.close();
    await server2.close();
  });
});
```

### Mocking

```typescript
import { describe, it, expect, jest } from '@jest/globals';
import { handleSearchDocuments } from './search-documents.js';

// Mock database
jest.mock('../database.js', () => ({
  searchDocuments: jest.fn(),
  countDocuments: jest.fn(),
}));

import { searchDocuments, countDocuments } from '../database.js';

describe('search_documents tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should search documents', async () => {
    // Setup mocks
    (searchDocuments as jest.Mock).mockResolvedValue([
      { id: '1', title: 'Doc 1' },
      { id: '2', title: 'Doc 2' },
    ]);
    (countDocuments as jest.Mock).mockResolvedValue(2);
    
    // Execute
    const result = await handleSearchDocuments(
      { query: 'test' },
      'user123'
    );
    
    // Verify
    const parsed = JSON.parse(result);
    expect(parsed.documents).toHaveLength(2);
    expect(searchDocuments).toHaveBeenCalledWith({
      userId: 'user123',
      search: 'test',
      limit: 10,
      offset: 0,
    });
  });
});
```

---

## npm Scripts

**package.json**:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --maxWorkers=2"
  }
}
```

**Script Purposes**:
- `test` - Run all tests once
- `test:watch` - Watch mode for development
- `test:coverage` - Generate coverage report
- `test:ci` - Optimized for CI/CD

---

## Benefits

### 1. Fast Feedback
- Quick test execution
- Watch mode for development
- Parallel test running

### 2. Confidence
- Catch bugs early
- Prevent regressions
- Document behavior

### 3. Coverage Tracking
- Identify untested code
- Enforce coverage thresholds
- Visual coverage reports

### 4. ESM Support
- Modern JavaScript
- Matches production code
- No CommonJS conversion

---

## Anti-Patterns

### ❌ Don't: Use CommonJS Preset

```javascript
// ❌ Wrong
preset: 'ts-jest'
```

```javascript
// ✅ Correct
preset: 'ts-jest/presets/default-esm'
```

**Why**: MCP servers use ESM. Tests should match.

### ❌ Don't: Skip .js Extension Mapping

```javascript
// ❌ Wrong - Missing .js mapping
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/src/$1',
}
```

```javascript
// ✅ Correct - Map .js to .ts
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/src/$1',
  '^(\\.{1,2}/.*)\\.js$': '$1',
}
```

**Why**: TypeScript imports use `.js` but files are `.ts`.

### ❌ Don't: Test Implementation Details

```typescript
// ❌ Wrong - Testing internals
it('should call internal function', () => {
  const spy = jest.spyOn(module, '_internalFunction');
  module.publicFunction();
  expect(spy).toHaveBeenCalled();
});
```

```typescript
// ✅ Correct - Test behavior
it('should return correct result', () => {
  const result = module.publicFunction();
  expect(result).toBe(expectedValue);
});
```

**Why**: Test behavior, not implementation.

### ❌ Don't: Write Flaky Tests

```typescript
// ❌ Wrong - Timing dependent
it('should complete within 100ms', async () => {
  const start = Date.now();
  await doSomething();
  expect(Date.now() - start).toBeLessThan(100);
});
```

```typescript
// ✅ Correct - Test behavior
it('should complete successfully', async () => {
  const result = await doSomething();
  expect(result).toBeDefined();
});
```

**Why**: Timing tests are flaky and environment-dependent.

### ❌ Don't: Forget to Clean Up

```typescript
// ❌ Wrong - No cleanup
it('should create resource', async () => {
  const resource = await createResource();
  expect(resource).toBeDefined();
});
```

```typescript
// ✅ Correct - Clean up
it('should create resource', async () => {
  const resource = await createResource();
  expect(resource).toBeDefined();
  await resource.cleanup();
});
```

**Why**: Resources leak between tests.

---

## Troubleshooting

**Problem**: "Cannot use import statement outside a module"

**Solution**: Ensure these settings:
```javascript
preset: 'ts-jest/presets/default-esm',
extensionsToTreatAsEsm: ['.ts'],
transform: {
  '^.+\\.ts$': ['ts-jest', { useESM: true }],
},
```

**Problem**: "Cannot find module '@/...'"

**Solution**: Add path mapping:
```javascript
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/src/$1',
},
```

**Problem**: Tests are slow

**Solution**:
1. Run tests in parallel (default)
2. Use `--maxWorkers=50%` to limit CPU usage
3. Mock expensive operations
4. Use `test.concurrent` for independent tests

**Problem**: Coverage not collected

**Solution**: Check `collectCoverageFrom` patterns match your files:
```javascript
collectCoverageFrom: [
  'src/**/*.ts',
  '!src/**/*.spec.ts',
],
```

---

## Related Patterns

- [Bootstrap Pattern](mcp-server-starter.bootstrap.md) - Project setup
- [Tool Creation Pattern](mcp-server-starter.tool-creation.md) - What to test
- [Server Factory Pattern](mcp-server-starter.server-factory.md) - Integration testing
- [Build Config Pattern](mcp-server-starter.build-config.md) - Build before testing

---

## Checklist

- [ ] Created `jest.config.js`
- [ ] Configured ESM preset
- [ ] Added path alias mapping
- [ ] Configured coverage collection
- [ ] Set coverage thresholds (optional)
- [ ] Added npm test scripts
- [ ] Created example test file
- [ ] Verified tests run successfully
- [ ] Checked coverage report
- [ ] Added tests to CI/CD (optional)

---

**Pattern**: Test Config
**Status**: Production Ready
**Last Updated**: 2026-02-22

# Config Management Pattern

**Pattern**: Environment Variable and Configuration Management
**Category**: Configuration
**Complexity**: Beginner
**Last Updated**: 2026-02-22

---

## Overview

The Config Management Pattern provides type-safe, validated configuration management for MCP servers using environment variables, with proper defaults and error handling.

**When to use this pattern**:
- Managing environment-specific configuration
- Handling API keys and secrets
- Configuring database connections
- Setting server options
- Multi-environment deployments

---

## Core Principles

### 1. Type Safety
Use TypeScript for compile-time configuration validation.

### 2. Validation
Validate required configuration at startup.

### 3. Defaults
Provide sensible defaults for optional configuration.

### 4. Immutability
Configuration should be read-only (`as const`).

### 5. Documentation
Document all configuration in `.env.example`.

---

## Complete Configuration

**src/config.ts**:

```typescript
import dotenv from 'dotenv';
import { logger } from './utils/logger.js';

// Load environment variables
dotenv.config();

/**
 * Application configuration
 * 
 * All configuration is loaded from environment variables.
 * See .env.example for required variables.
 */
export const config = {
  // Service configuration
  service: {
    url: process.env.SERVICE_URL || 'http://localhost:8080',
    apiKey: process.env.SERVICE_API_KEY || '',
  },
  
  // Server configuration
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
  },
  
  // MCP configuration
  mcp: {
    transport: process.env.MCP_TRANSPORT || 'stdio',
  },
} as const;

/**
 * Validate required configuration
 * 
 * Call this at server startup to ensure all required
 * configuration is present.
 * 
 * @throws Error if required configuration is missing
 */
export function validateConfig(): void {
  const required = [
    { key: 'SERVICE_URL', value: config.service.url },
    { key: 'SERVICE_API_KEY', value: config.service.apiKey },
  ];
  
  const missing = required.filter((r) => !r.value || r.value === 'http://localhost:8080');
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.map((m) => m.key).join(', ')}`
    );
  }
  
  logger.info('Configuration validated', {
    nodeEnv: config.server.nodeEnv,
    logLevel: config.server.logLevel,
  });
}
```

---

## Environment Variables

**.env.example**:

```bash
# Service Configuration
SERVICE_URL=http://localhost:8080
SERVICE_API_KEY=

# Server Configuration
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# MCP Configuration
MCP_TRANSPORT=stdio
```

**.env** (not committed):

```bash
# Service Configuration
SERVICE_URL=https://api.example.com
SERVICE_API_KEY=sk-1234567890abcdef

# Server Configuration
PORT=3000
NODE_ENV=production
LOG_LEVEL=info

# MCP Configuration
MCP_TRANSPORT=sse
```

**.gitignore**:

```gitignore
.env
.env.local
.env.*.local
```

---

## Usage

### In Server

```typescript
import { config, validateConfig } from './config.js';

async function initServer() {
  // Validate configuration first
  validateConfig();
  
  // Use configuration
  const client = new ServiceClient({
    url: config.service.url,
    apiKey: config.service.apiKey,
  });
  
  // ...
}
```

### In Tools

```typescript
import { config } from '../config.js';

export async function handleTool(args, userId) {
  // Access configuration
  const response = await fetch(config.service.url, {
    headers: {
      'Authorization': `Bearer ${config.service.apiKey}`,
    },
  });
  
  // ...
}
```

---

## Advanced Patterns

### Nested Configuration

```typescript
export const config = {
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'mydb',
    user: process.env.DB_USER || 'user',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'true',
    pool: {
      min: parseInt(process.env.DB_POOL_MIN || '2', 10),
      max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    },
  },
} as const;
```

### Environment-Specific Config

```typescript
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

export const config = {
  server: {
    port: parseInt(process.env.PORT || (isDevelopment ? '3000' : '8080'), 10),
    cors: isDevelopment,
    debug: isDevelopment,
  },
  logging: {
    level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
    pretty: isDevelopment,
  },
} as const;
```

### Type-Safe Enums

```typescript
const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;
type LogLevel = typeof LOG_LEVELS[number];

function parseLogLevel(value: string | undefined): LogLevel {
  const level = value?.toLowerCase();
  if (level && LOG_LEVELS.includes(level as LogLevel)) {
    return level as LogLevel;
  }
  return 'info';
}

export const config = {
  logging: {
    level: parseLogLevel(process.env.LOG_LEVEL),
  },
} as const;
```

### Validation with Zod

```typescript
import { z } from 'zod';

const configSchema = z.object({
  service: z.object({
    url: z.string().url(),
    apiKey: z.string().min(1),
  }),
  server: z.object({
    port: z.number().int().min(1).max(65535),
    nodeEnv: z.enum(['development', 'production', 'test']),
  }),
});

export const config = configSchema.parse({
  service: {
    url: process.env.SERVICE_URL,
    apiKey: process.env.SERVICE_API_KEY,
  },
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
});
```

---

## Benefits

### 1. Type Safety
- Compile-time checking
- IDE autocomplete
- Refactoring support

### 2. Validation
- Catch configuration errors early
- Clear error messages
- Startup-time validation

### 3. Documentation
- `.env.example` documents all variables
- Self-documenting code
- Easy onboarding

### 4. Security
- Secrets not in code
- Environment-specific values
- `.env` not committed

---

## Anti-Patterns

### ❌ Don't: Hardcode Configuration

```typescript
// ❌ Wrong
const apiKey = 'sk-1234567890';
const dbUrl = 'mongodb://localhost:27017';
```

```typescript
// ✅ Correct
const apiKey = process.env.API_KEY;
const dbUrl = process.env.DATABASE_URL;
```

**Why**: Hardcoded values can't change per environment and expose secrets.

### ❌ Don't: Skip Validation

```typescript
// ❌ Wrong
export const config = {
  apiKey: process.env.API_KEY, // Might be undefined!
};
```

```typescript
// ✅ Correct
export const config = {
  apiKey: process.env.API_KEY || '',
};

export function validateConfig() {
  if (!config.apiKey) {
    throw new Error('API_KEY is required');
  }
}
```

**Why**: Missing configuration causes runtime errors.

### ❌ Don't: Use Mutable Configuration

```typescript
// ❌ Wrong
export let config = {
  port: 3000,
};

config.port = 8080; // Mutable!
```

```typescript
// ✅ Correct
export const config = {
  port: 3000,
} as const; // Immutable
```

**Why**: Mutable configuration leads to bugs.

### ❌ Don't: Commit .env Files

```gitignore
# ❌ Wrong - .env not ignored
# (no .env entry)
```

```gitignore
# ✅ Correct
.env
.env.local
.env.*.local
```

**Why**: `.env` contains secrets and should never be committed.

### ❌ Don't: Use process.env Directly

```typescript
// ❌ Wrong - Scattered throughout code
const url = process.env.SERVICE_URL;
const key = process.env.API_KEY;
```

```typescript
// ✅ Correct - Centralized in config
import { config } from './config.js';
const url = config.service.url;
const key = config.service.apiKey;
```

**Why**: Centralized configuration is easier to manage and test.

---

## Testing

### Mock Configuration

```typescript
import { describe, it, expect, jest } from '@jest/globals';

// Mock config module
jest.mock('./config.js', () => ({
  config: {
    service: {
      url: 'http://test.example.com',
      apiKey: 'test-key',
    },
  },
}));

import { config } from './config.js';
import { handleTool } from './tool.js';

describe('tool with mocked config', () => {
  it('should use test configuration', async () => {
    expect(config.service.url).toBe('http://test.example.com');
    // Test tool with mocked config
  });
});
```

### Test Validation

```typescript
describe('validateConfig', () => {
  const originalEnv = process.env;
  
  beforeEach(() => {
    process.env = { ...originalEnv };
  });
  
  afterEach(() => {
    process.env = originalEnv;
  });
  
  it('should pass with valid config', () => {
    process.env.SERVICE_URL = 'https://api.example.com';
    process.env.SERVICE_API_KEY = 'sk-123';
    
    expect(() => validateConfig()).not.toThrow();
  });
  
  it('should fail with missing API key', () => {
    process.env.SERVICE_URL = 'https://api.example.com';
    delete process.env.SERVICE_API_KEY;
    
    expect(() => validateConfig()).toThrow('SERVICE_API_KEY');
  });
});
```

---

## Related Patterns

- [Bootstrap Pattern](mcp-server-starter.bootstrap.md) - Initial setup
- [Server Standalone Pattern](mcp-server-starter.server-standalone.md) - Using config
- [Server Factory Pattern](mcp-server-starter.server-factory.md) - Multi-tenant config
- [Tool Creation Pattern](mcp-server-starter.tool-creation.md) - Config in tools

---

## Troubleshooting

**Problem**: Environment variables not loaded

**Solution**: Ensure `dotenv.config()` is called early:
```typescript
import dotenv from 'dotenv';
dotenv.config(); // Call first!

import { config } from './config.js';
```

**Problem**: Type errors with `as const`

**Solution**: Use type assertions for dynamic values:
```typescript
export const config = {
  port: parseInt(process.env.PORT || '3000', 10) as number,
} as const;
```

**Problem**: Validation fails in tests

**Solution**: Mock environment variables in tests:
```typescript
beforeEach(() => {
  process.env.API_KEY = 'test-key';
});
```

---

## Checklist

- [ ] Created `src/config.ts`
- [ ] Loaded environment variables with dotenv
- [ ] Defined configuration object with types
- [ ] Made configuration immutable (`as const`)
- [ ] Created validation function
- [ ] Provided sensible defaults
- [ ] Created `.env.example` template
- [ ] Added `.env` to `.gitignore`
- [ ] Called `validateConfig()` at startup
- [ ] Documented all environment variables
- [ ] Tested configuration validation

---

**Pattern**: Config Management
**Status**: Production Ready
**Last Updated**: 2026-02-22

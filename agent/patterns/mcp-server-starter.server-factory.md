# Server Factory Pattern

**Pattern**: Multi-Tenant Server with mcp-auth Integration
**Category**: Server Architecture
**Complexity**: Advanced
**Last Updated**: 2026-02-22

---

## Overview

The Server Factory Pattern enables multi-tenant MCP servers with per-user isolation. This pattern is essential for production deployments where multiple users access the same server instance through mcp-auth authentication.

**When to use this pattern**:
- Production multi-tenant deployments
- mcp-auth integration required
- Per-user data isolation needed
- HTTP/SSE transport
- Scalable server architecture

**When NOT to use this pattern**:
- Claude Desktop integration (use Server Standalone)
- Single-user deployments
- Stdio transport only
- Development/testing environments

---

## Core Principles

### 1. Factory Function
Export a `createServer(accessToken, userId, options)` function that creates isolated server instances per user.

### 2. Global Initialization
Initialize databases and shared resources once per process, not per user.

### 3. No Shared State
Each server instance must be completely isolated - no shared state between users.

### 4. User Scoping
All operations must be scoped to the `userId` parameter.

---

## Implementation

### Complete Factory Example

**src/server-factory.ts**:

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { logger } from './utils/logger.js';

// Import tools
import { helloComputerTool, handleHelloComputer } from './tools/hello-computer.js';

export interface ServerOptions {
  name?: string;
  version?: string;
}

// Global initialization flag
let databasesInitialized = false;
let initializationPromise: Promise<void> | null = null;

/**
 * Initialize databases (called once globally)
 */
async function ensureDatabasesInitialized(): Promise<void> {
  if (databasesInitialized) {
    return;
  }
  
  // If initialization is in progress, wait for it
  if (initializationPromise) {
    return initializationPromise;
  }
  
  // Start initialization
  initializationPromise = (async () => {
    try {
      logger.info('Initializing databases...');
      
      // Initialize databases/services here
      // await initDatabase();
      // await initCache();
      
      databasesInitialized = true;
      logger.info('Databases initialized successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Database initialization failed', { error: errorMessage });
      throw new Error(`Database initialization failed: ${errorMessage}`);
    } finally {
      initializationPromise = null;
    }
  })();
  
  return initializationPromise;
}

/**
 * Create a server instance for a specific user/tenant
 * 
 * This factory function is compatible with mcp-auth wrapping pattern.
 * It creates isolated server instances with no shared state.
 * 
 * @param accessToken - User's access token (for external APIs)
 * @param userId - User identifier for scoping operations
 * @param options - Optional server configuration
 * @returns Configured MCP Server instance (not connected to transport)
 * 
 * @example
 * ```typescript
 * // Direct usage
 * const server = await createServer('token', 'user123');
 * const transport = new StdioServerTransport();
 * await server.connect(transport);
 * 
 * // With mcp-auth
 * import { wrapServer } from '@prmichaelsen/mcp-auth';
 * const wrapped = wrapServer({
 *   serverFactory: createServer,
 *   authProvider: new JWTAuthProvider({ ... }),
 *   resourceType: 'my-resource',
 *   transport: { type: 'sse', port: 3000 }
 * });
 * ```
 */
export async function createServer(
  accessToken: string,
  userId: string,
  options: ServerOptions = {}
): Promise<Server> {
  // Validate required parameters
  if (!userId) {
    throw new Error('userId is required');
  }
  
  logger.debug('Creating server instance', { userId });
  
  // Ensure databases are initialized (happens once globally)
  await ensureDatabasesInitialized();
  
  // Create MCP server instance
  const server = new Server(
    {
      name: options.name || 'my-mcp-server',
      version: options.version || '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );
  
  // Register handlers with userId scope
  registerHandlers(server, userId, accessToken);
  
  return server;
}

/**
 * Register MCP handlers scoped to userId
 */
function registerHandlers(server: Server, userId: string, accessToken: string): void {
  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        helloComputerTool,
        // Add more tools here
      ],
    };
  });
  
  // Handle tool execution
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    try {
      let result: string;
      
      // Route to appropriate tool handler
      // IMPORTANT: Always pass userId to handlers for scoping
      switch (name) {
        case 'hello_computer':
          result = await handleHelloComputer(args as any, userId);
          break;
        
        // Add more tool cases here
        
        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${name}`
          );
      }
      
      // Return result
      return {
        content: [
          {
            type: 'text',
            text: result,
          },
        ],
      };
    } catch (error) {
      // Handle errors
      if (error instanceof McpError) {
        throw error;
      }
      
      logger.error(`Tool execution failed for ${name}:`, error);
      throw new McpError(
        ErrorCode.InternalError,
        `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  });
}
```

---

## Key Components

### 1. Factory Function Signature

```typescript
export async function createServer(
  accessToken: string,
  userId: string,
  options: ServerOptions = {}
): Promise<Server>
```

**Parameters**:
- `accessToken` - User's access token (for calling external APIs on their behalf)
- `userId` - User identifier (REQUIRED for scoping all operations)
- `options` - Optional configuration (name, version, etc.)

**Returns**: Configured `Server` instance (not yet connected to transport)

### 2. Global Initialization Pattern

```typescript
let databasesInitialized = false;
let initializationPromise: Promise<void> | null = null;

async function ensureDatabasesInitialized(): Promise<void> {
  if (databasesInitialized) {
    return; // Already initialized
  }
  
  if (initializationPromise) {
    return initializationPromise; // Wait for in-progress initialization
  }
  
  initializationPromise = (async () => {
    // Initialize once
    await initDatabase();
    databasesInitialized = true;
  })();
  
  return initializationPromise;
}
```

**Purpose**: Initialize expensive resources (databases, caches) once per process, not per user.

### 3. User Scoping

```typescript
// ALWAYS pass userId to tool handlers
switch (name) {
  case 'tool_name':
    result = await handleTool(args, userId); // ← userId scoping
    break;
}
```

**Critical**: Every tool handler must receive `userId` to scope operations to that user.

### 4. No Shared State

```typescript
// ❌ WRONG - Shared state between users
let userCache = {};

export async function createServer(accessToken, userId) {
  userCache[userId] = {}; // DON'T DO THIS
}
```

```typescript
// ✅ CORRECT - No shared state
export async function createServer(accessToken, userId) {
  // Each server instance is independent
  // No shared variables
}
```

---

## mcp-auth Integration

### Usage with mcp-auth

```typescript
import { wrapServer, JWTAuthProvider } from '@prmichaelsen/mcp-auth';
import { createServer } from './server-factory.js';

const wrapped = wrapServer({
  serverFactory: createServer,
  authProvider: new JWTAuthProvider({
    jwtSecret: process.env.JWT_SECRET!,
  }),
  resourceType: 'my-resource',
  transport: { type: 'sse', port: 3000 }
});

await wrapped.start();
console.log('Multi-tenant server running on port 3000');
```

**What mcp-auth does**:
1. Validates JWT tokens
2. Extracts `userId` from token
3. Calls `createServer(accessToken, userId, options)`
4. Routes requests to the correct server instance
5. Manages server lifecycle

### Authentication Flow

```
┌─────────┐      ┌──────────┐      ┌─────────────┐
│ Client  │─────▶│ mcp-auth │─────▶│ MCP Server  │
│         │      │ Wrapper  │      │  Factory    │
└─────────┘      └──────────┘      └─────────────┘
     │                │                    │
     │ 1. Request     │                    │
     │    + JWT       │                    │
     │                │                    │
     │           2. Validate JWT           │
     │           3. Extract userId         │
     │                │                    │
     │                │  4. createServer(  │
     │                │     accessToken,   │
     │                │     userId,        │
     │                │     options)       │
     │                │                    │
     │                │         5. Return  │
     │                │            isolated│
     │                │            server  │
     │                │                    │
     │           6. Route request          │
     │              to server              │
     │                │                    │
     │◀───────────────┴────────────────────┘
     │           7. Response
```

---

## Dual Export Pattern

Export both standalone and factory from your package:

**package.json**:

```json
{
  "main": "dist/server.js",
  "exports": {
    ".": {
      "types": "./dist/server.d.ts",
      "import": "./dist/server.js"
    },
    "./factory": {
      "types": "./dist/server-factory.d.ts",
      "import": "./dist/server-factory.js"
    }
  }
}
```

**Usage**:

```typescript
// Standalone
import './server.js'; // Runs directly

// Factory
import { createServer } from './server-factory.js';
const server = await createServer('token', 'user123');
```

---

## Benefits

### 1. Multi-Tenancy
- Multiple users share same server process
- Per-user isolation and data scoping
- Efficient resource usage

### 2. Scalability
- Single process handles many users
- Horizontal scaling possible
- Resource pooling (databases, caches)

### 3. Security
- User isolation enforced
- Access token per user
- No data leakage between users

### 4. Production Ready
- Compatible with mcp-auth
- HTTP/SSE transport support
- Proper error handling

---

## Anti-Patterns

### ❌ Don't: Share State Between Users

```typescript
// ❌ WRONG - Shared cache
let cache = {};

export async function createServer(accessToken, userId) {
  cache[userId] = {}; // Shared state!
}
```

```typescript
// ✅ CORRECT - No shared state
export async function createServer(accessToken, userId) {
  // Each server instance is independent
  // Use database for persistence, not in-memory cache
}
```

**Why**: Shared state causes data leakage between users and memory leaks.

### ❌ Don't: Initialize Databases Per User

```typescript
// ❌ WRONG - Initialize per user
export async function createServer(accessToken, userId) {
  await initDatabase(); // Called for every user!
  const server = new Server(...);
  return server;
}
```

```typescript
// ✅ CORRECT - Initialize once globally
let dbInitialized = false;

async function ensureDbInitialized() {
  if (!dbInitialized) {
    await initDatabase();
    dbInitialized = true;
  }
}

export async function createServer(accessToken, userId) {
  await ensureDbInitialized(); // Only once
  const server = new Server(...);
  return server;
}
```

**Why**: Database initialization is expensive. Do it once per process.

### ❌ Don't: Forget User Scoping

```typescript
// ❌ WRONG - No userId scoping
async function handleGetData(args) {
  return await db.getData(); // Gets ALL users' data!
}
```

```typescript
// ✅ CORRECT - Scope to userId
async function handleGetData(args, userId) {
  return await db.getData({ userId }); // Only this user's data
}
```

**Why**: Without userId scoping, users can access each other's data.

### ❌ Don't: Use Standalone Pattern for Multi-Tenant

```typescript
// ❌ WRONG - Standalone for multi-tenant
const userId = 'default_user'; // Everyone is the same user!
```

```typescript
// ✅ CORRECT - Factory with userId parameter
export async function createServer(accessToken, userId) {
  // Each user gets their own userId
}
```

**Why**: Standalone pattern doesn't support per-user isolation.

---

## Testing

### Unit Testing

**src/server-factory.spec.ts**:

```typescript
import { describe, it, expect } from '@jest/globals';
import { createServer } from './server-factory.js';

describe('Server Factory', () => {
  it('should create server instance with valid parameters', async () => {
    const server = await createServer('test-token', 'user123');
    expect(server).toBeDefined();
    expect(server).toHaveProperty('setRequestHandler');
  });
  
  it('should require userId', async () => {
    await expect(createServer('token', '')).rejects.toThrow('userId is required');
  });
  
  it('should create separate instances for different users', async () => {
    const server1 = await createServer('token1', 'user1');
    const server2 = await createServer('token2', 'user2');
    expect(server1).not.toBe(server2);
  });
  
  it('should accept custom options', async () => {
    const server = await createServer('token', 'user123', {
      name: 'custom-name',
      version: '2.0.0',
    });
    expect(server).toBeDefined();
  });
});
```

---

## Related Patterns

- [Server Standalone Pattern](mcp-server-starter.server-standalone.md) - Single-user alternative
- [Bootstrap Pattern](mcp-server-starter.bootstrap.md) - Project setup
- [Tool Creation Pattern](mcp-server-starter.tool-creation.md) - Creating tools with userId scoping
- [Config Management Pattern](mcp-server-starter.config-management.md) - Configuration handling

---

## Troubleshooting

**Problem**: Users can see each other's data

**Solution**: Ensure all database queries include `userId` filter:
```typescript
await db.find({ userId }); // ✅ Scoped
await db.find({}); // ❌ Not scoped
```

**Problem**: Memory usage grows over time

**Solution**: Check for shared state or caches that aren't cleaned up. Each server instance should be independent.

**Problem**: Database connection errors

**Solution**: Ensure global initialization happens once and handles errors properly. Use the `ensureDatabasesInitialized()` pattern.

**Problem**: mcp-auth integration fails

**Solution**: Verify factory function signature matches mcp-auth requirements:
```typescript
(accessToken: string, userId: string, options?: any) => Promise<Server>
```

---

## Checklist

- [ ] Created `src/server-factory.ts`
- [ ] Exported `createServer(accessToken, userId, options)` function
- [ ] Implemented global initialization pattern
- [ ] Ensured no shared state between users
- [ ] All tool handlers receive `userId` parameter
- [ ] All database queries scoped to `userId`
- [ ] Tested with multiple users
- [ ] Added unit tests for factory
- [ ] Documented in package.json exports
- [ ] Tested with mcp-auth (if applicable)

---

**Pattern**: Server Factory
**Status**: Production Ready
**Last Updated**: 2026-02-22

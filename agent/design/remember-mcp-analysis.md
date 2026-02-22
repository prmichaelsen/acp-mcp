# remember-mcp Analysis

**Created**: 2026-02-22
**Status**: Complete
**Purpose**: Document reusable patterns from remember-mcp for extraction into mcp-server-starter package

---

## Project Overview

**remember-mcp** is a production-ready, multi-tenant MCP server that provides persistent memory with vector search capabilities. It demonstrates best practices for:

- MCP server architecture with stdio transport
- mcp-auth integration for multi-tenancy
- Tool creation and registration patterns
- TypeScript + ESM configuration
- Build tooling with esbuild
- Testing with Jest
- Configuration management

**Key Technologies**:
- TypeScript 5.3+ with ES2022 modules
- @modelcontextprotocol/sdk ^1.0.4
- @prmichaelsen/mcp-auth ^7.0.4
- esbuild for bundling
- Jest + ts-jest for testing
- dotenv for configuration

---

## Architecture Summary

### Dual Export Pattern

remember-mcp exports two entry points:

1. **Standalone Server** (`src/server.ts` → `dist/server.js`)
   - Direct execution with stdio transport
   - Used with Claude Desktop or standalone
   - Single-user mode with default userId

2. **Server Factory** (`src/server-factory.ts` → `dist/server-factory.js`)
   - Factory function for mcp-auth compatibility
   - Multi-tenant with per-user isolation
   - Used with mcp-auth wrapper for production

**package.json exports**:
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

---

## Pattern 1: MCP Server Setup (Standalone)

### File: `src/server.ts`

**Core Pattern**:
```typescript
#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

async function initServer(): Promise<Server> {
  // 1. Validate configuration
  validateConfig();
  
  // 2. Initialize databases/services
  await initDatabases();
  
  // 3. Create MCP server
  const server = new Server(
    {
      name: 'server-name',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );
  
  // 4. Register handlers
  registerHandlers(server);
  
  return server;
}

function registerHandlers(server: Server): void {
  // List tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        tool1,
        tool2,
        // ...
      ],
    };
  });
  
  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    try {
      let result: string;
      
      switch (name) {
        case 'tool_name':
          result = await handleTool(args as any, userId);
          break;
        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${name}`
          );
      }
      
      return {
        content: [
          {
            type: 'text',
            text: result,
          },
        ],
      };
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      
      throw new McpError(
        ErrorCode.InternalError,
        `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  });
}

async function main(): Promise<void> {
  const server = await initServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
```

**Key Points**:
- Shebang for direct execution: `#!/usr/bin/env node`
- Stdio transport for Claude Desktop compatibility
- Structured initialization: config → databases → server → handlers
- Error handling with McpError types
- Graceful startup/shutdown

---

## Pattern 2: Server Factory (mcp-auth Integration)

### File: `src/server-factory.ts`

**Core Pattern**:
```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

export interface ServerOptions {
  name?: string;
  version?: string;
}

// Global initialization (once per process)
let databasesInitialized = false;
let initializationPromise: Promise<void> | null = null;

async function ensureDatabasesInitialized(): Promise<void> {
  if (databasesInitialized) {
    return;
  }
  
  if (initializationPromise) {
    return initializationPromise;
  }
  
  initializationPromise = (async () => {
    try {
      await initDatabases();
      databasesInitialized = true;
    } catch (error) {
      throw new Error(`Database initialization failed: ${error}`);
    } finally {
      initializationPromise = null;
    }
  })();
  
  return initializationPromise;
}

/**
 * Create a server instance for a specific user/tenant
 * 
 * @param accessToken - User's access token (for external APIs)
 * @param userId - User identifier for scoping operations
 * @param options - Optional server configuration
 * @returns Configured MCP Server instance
 */
export async function createServer(
  accessToken: string,
  userId: string,
  options: ServerOptions = {}
): Promise<Server> {
  if (!userId) {
    throw new Error('userId is required');
  }
  
  // Ensure databases initialized (once globally)
  await ensureDatabasesInitialized();
  
  // Create server instance
  const server = new Server(
    {
      name: options.name || 'server-name',
      version: options.version || '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );
  
  // Register handlers scoped to userId
  registerHandlers(server, userId, accessToken);
  
  return server;
}

function registerHandlers(server: Server, userId: string, accessToken: string): void {
  // Same handler registration as standalone, but with userId scoping
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: [...] };
  });
  
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    // All tool handlers receive userId for scoping
    const result = await handleTool(args, userId);
    
    return {
      content: [{ type: 'text', text: result }],
    };
  });
}
```

**Key Points**:
- Factory function signature: `createServer(accessToken, userId, options)`
- Global database initialization (once per process)
- Per-user server instances (no shared state)
- userId scoping for all operations
- Compatible with mcp-auth wrapper

**Usage with mcp-auth**:
```typescript
import { wrapServer, JWTAuthProvider } from '@prmichaelsen/mcp-auth';
import { createServer } from './server-factory.js';

const wrapped = wrapServer({
  serverFactory: createServer,
  authProvider: new JWTAuthProvider({ jwtSecret: '...' }),
  resourceType: 'resource-name',
  transport: { type: 'sse', port: 3000 }
});

await wrapped.start();
```

---

## Pattern 3: Tool Creation

### File: `src/tools/create-memory.ts` (example)

**Core Pattern**:
```typescript
/**
 * Tool definition (exported for registration)
 */
export const toolName = {
  name: 'tool_name',
  description: `Tool description with examples and usage notes`,
  inputSchema: {
    type: 'object',
    properties: {
      param1: {
        type: 'string',
        description: 'Parameter description',
      },
      param2: {
        type: 'number',
        description: 'Optional parameter',
        minimum: 0,
        maximum: 1,
      },
    },
    required: ['param1'],
  },
};

/**
 * Tool arguments interface
 */
export interface ToolArgs {
  param1: string;
  param2?: number;
}

/**
 * Tool result interface
 */
export interface ToolResult {
  success: boolean;
  data: any;
  message: string;
}

/**
 * Tool handler function
 */
export async function handleTool(
  args: ToolArgs,
  userId: string
): Promise<string> {
  try {
    // 1. Validate inputs
    if (!args.param1) {
      throw new Error('param1 is required');
    }
    
    // 2. Perform operation
    const result = await performOperation(args, userId);
    
    // 3. Format response
    const response: ToolResult = {
      success: true,
      data: result,
      message: 'Operation completed successfully',
    };
    
    // 4. Return JSON string
    return JSON.stringify(response, null, 2);
  } catch (error) {
    // 5. Handle errors
    handleToolError(error, {
      toolName: 'tool_name',
      operation: 'operation description',
      userId,
    });
  }
}
```

**Key Points**:
- Tool definition object (name, description, inputSchema)
- TypeScript interfaces for args and result
- Handler function signature: `(args, userId) => Promise<string>`
- JSON string responses
- Structured error handling

**Tool Organization**:
```
src/tools/
├── tool-1.ts          # Tool definition + handler
├── tool-2.ts
└── ...
```

Each tool file exports:
1. `toolDefinition` - Tool schema for registration
2. `ToolArgs` interface - Input types
3. `ToolResult` interface - Output types
4. `handleTool()` function - Implementation

---

## Pattern 4: Build Configuration (esbuild)

### File: `esbuild.build.js`

**Core Pattern**:
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
    // External dependencies (not bundled)
    '@modelcontextprotocol/sdk'
  ],
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);"
  },
  alias: {
    '@': './src'
  }
});

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
    '@modelcontextprotocol/sdk'
  ],
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);"
  },
  alias: {
    '@': './src'
  }
});

console.log('✓ JavaScript bundles built');

// Generate TypeScript declarations
console.log('Generating TypeScript declarations...');
try {
  execSync('tsc --emitDeclarationOnly --outDir dist', { stdio: 'inherit' });
  console.log('✓ TypeScript declarations generated');
} catch (error) {
  console.error('✗ Failed to generate TypeScript declarations');
  process.exit(1);
}

console.log('✓ Build complete');
```

**Key Points**:
- Dual build: server + factory
- ESM format with node20 target
- External dependencies (not bundled)
- CommonJS compatibility banner
- Path aliases (@/ → src/)
- Separate TypeScript declaration generation

**package.json scripts**:
```json
{
  "scripts": {
    "build": "node esbuild.build.js",
    "build:watch": "node esbuild.watch.js",
    "dev": "tsx watch src/server.ts",
    "start": "node dist/server.js",
    "prepublishOnly": "npm run clean && npm run build"
  }
}
```

---

## Pattern 5: TypeScript Configuration

### File: `tsconfig.json`

**Core Pattern**:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "lib": ["ES2022"],
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "types": ["node", "jest"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

**Key Points**:
- ES2022 modules (modern ESM)
- Strict type checking
- Path aliases (@/ → src/)
- Declaration files + source maps
- Node + Jest types

---

## Pattern 6: Testing Configuration (Jest)

### File: `jest.config.js`

**Core Pattern**:
```javascript
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.e2e.ts',
    '!src/index.ts',
    '!src/types/**/*.ts',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
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

**Key Points**:
- ESM support with ts-jest
- Colocated tests (*.spec.ts)
- Path alias mapping
- .js extension mapping for imports
- Coverage configuration

**Test Organization**:
- Unit tests: `src/**/*.spec.ts` (colocated with source)
- E2E tests: `tests/**/*.e2e.ts` (separate directory)

---

## Pattern 7: Configuration Management

### File: `src/config.ts`

**Core Pattern**:
```typescript
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Service configurations
  service1: {
    url: process.env.SERVICE1_URL || 'http://localhost:8080',
    apiKey: process.env.SERVICE1_API_KEY || '',
  },
  
  // Server configuration
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
  },
} as const;

/**
 * Validate required configuration
 */
export function validateConfig(): void {
  const required = [
    { key: 'SERVICE1_URL', value: config.service1.url },
    { key: 'SERVICE1_API_KEY', value: config.service1.apiKey },
  ];
  
  const missing = required.filter((r) => !r.value);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.map((m) => m.key).join(', ')}`
    );
  }
}
```

**Key Points**:
- dotenv for environment variables
- Type-safe config object (as const)
- Validation function
- Default values for optional configs

### File: `.env.example`

**Template Structure**:
```bash
# Service Configuration
SERVICE1_URL=http://localhost:8080
SERVICE1_API_KEY=

# Server Configuration
PORT=3000
NODE_ENV=development
LOG_LEVEL=info
```

---

## Pattern 8: Error Handling

### File: `src/utils/error-handler.ts`

**Core Pattern**:
```typescript
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { logger } from './logger.js';

export interface ErrorContext {
  toolName: string;
  operation: string;
  userId: string;
  [key: string]: any;
}

export function handleToolError(error: unknown, context: ErrorContext): never {
  // Log error with context
  logger.error(`${context.toolName} failed`, {
    error: error instanceof Error ? error.message : String(error),
    ...context,
  });
  
  // Throw McpError
  if (error instanceof McpError) {
    throw error;
  }
  
  throw new McpError(
    ErrorCode.InternalError,
    `${context.operation} failed: ${error instanceof Error ? error.message : String(error)}`
  );
}
```

**Key Points**:
- Centralized error handling
- Context-aware logging
- McpError wrapping
- Type-safe error context

---

## Pattern 9: Logging

### File: `src/utils/logger.ts`

**Core Pattern**:
```typescript
export const logger = {
  info: (message: string, meta?: Record<string, any>) => {
    console.error(JSON.stringify({ level: 'info', message, ...meta }));
  },
  
  error: (message: string, meta?: Record<string, any>) => {
    console.error(JSON.stringify({ level: 'error', message, ...meta }));
  },
  
  debug: (message: string, meta?: Record<string, any>) => {
    if (process.env.LOG_LEVEL === 'debug') {
      console.error(JSON.stringify({ level: 'debug', message, ...meta }));
    }
  },
};
```

**Key Points**:
- Use `console.error` (not console.log) for stdio compatibility
- JSON structured logging
- Metadata support
- Log level filtering

---

## Dependencies Analysis

### Core Dependencies

**MCP SDK**:
```json
"@modelcontextprotocol/sdk": "^1.0.4"
```
- Core MCP functionality
- Server, transport, types

**mcp-auth** (optional):
```json
"@prmichaelsen/mcp-auth": "^7.0.4"
```
- Multi-tenant support
- Authentication providers
- Token resolution

**Configuration**:
```json
"dotenv": "^16.4.5"
```
- Environment variable management

### Build Dependencies

**TypeScript**:
```json
"typescript": "^5.3.3"
```
- Type safety and compilation

**esbuild**:
```json
"esbuild": "^0.20.0"
```
- Fast bundling
- ESM support

**tsx** (development):
```json
"tsx": "^4.7.1"
```
- TypeScript execution
- Watch mode for development

### Testing Dependencies

**Jest**:
```json
"jest": "^29.7.0",
"ts-jest": "^29.1.2",
"@types/jest": "^29.5.12"
```
- Testing framework
- TypeScript support

### Type Definitions

```json
"@types/node": "^20.11.19"
```
- Node.js types

---

## Recommendations

### Patterns to Extract

1. **mcp-server-starter.bootstrap.md**
   - Project initialization pattern
   - Directory structure
   - Configuration files

2. **mcp-server-starter.server-standalone.md**
   - Standalone server setup
   - Stdio transport
   - Handler registration

3. **mcp-server-starter.server-factory.md**
   - Factory pattern for mcp-auth
   - Multi-tenant architecture
   - User isolation

4. **mcp-server-starter.tool-creation.md**
   - Tool definition structure
   - Handler function pattern
   - Error handling

5. **mcp-server-starter.build-config.md**
   - esbuild configuration
   - Dual build pattern
   - TypeScript declarations

6. **mcp-server-starter.test-config.md**
   - Jest setup for ESM + TypeScript
   - Test organization
   - Coverage configuration

7. **mcp-server-starter.config-management.md**
   - Environment variables
   - Configuration validation
   - Type-safe config

### Commands to Create

1. **mcp-server-starter.init-project.md**
   - Initialize new MCP server project
   - Generate boilerplate files
   - Install dependencies

2. **mcp-server-starter.add-tool.md**
   - Generate new tool file
   - Register tool in server
   - Create test file

### Design Documents to Create

1. **mcp-server-starter.architecture.md**
   - Overall architecture
   - Dual export pattern
   - Component relationships

2. **mcp-server-starter.mcp-auth-integration.md**
   - How to integrate with mcp-auth
   - Multi-tenancy patterns
   - Authentication flow

---

## Example Tool: hello_computer

**Minimal example tool for starter template**:

```typescript
// src/tools/hello-computer.ts

export const helloComputerTool = {
  name: 'hello_computer',
  description: 'Returns a friendly greeting from the computer',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Optional name to greet',
      },
    },
    required: [],
  },
};

export interface HelloComputerArgs {
  name?: string;
}

export interface HelloComputerResult {
  message: string;
  timestamp: string;
}

export async function handleHelloComputer(
  args: HelloComputerArgs,
  userId: string
): Promise<string> {
  const greeting = args.name 
    ? `Hello, ${args.name}!` 
    : 'Hello, world!';
  
  const result: HelloComputerResult = {
    message: greeting,
    timestamp: new Date().toISOString(),
  };
  
  return JSON.stringify(result, null, 2);
}
```

---

## Key Insights

### 1. Project Structure
- Flat `src/` directory with feature-based organization
- Tools in `src/tools/` (one file per tool)
- Utilities in `src/utils/`
- Types in `src/types/`
- Colocated tests (*.spec.ts)

### 2. MCP Server Pattern
- Server initialization: config → databases → server → handlers
- Two request handlers: ListTools + CallTool
- Switch statement for tool routing
- McpError for error responses

### 3. mcp-auth Pattern
- Factory function creates isolated server instances
- Global database initialization (once per process)
- Per-user scoping via userId parameter
- No shared state between instances

### 4. Tool Pattern
- Tool definition object (schema)
- Separate handler function
- TypeScript interfaces for args/result
- JSON string responses
- Centralized error handling

### 5. Build Pattern
- esbuild for fast bundling
- Dual build (server + factory)
- ESM format with node20 target
- External dependencies
- Separate TypeScript declarations

### 6. Test Pattern
- Jest with ts-jest for ESM
- Colocated unit tests
- Separate E2E tests
- Path alias mapping
- Coverage configuration

### 7. Config Pattern
- dotenv for environment variables
- Type-safe config object
- Validation function
- .env.example template

---

## Success Criteria

- [x] Complete understanding of remember-mcp architecture
- [x] All reusable patterns identified
- [x] Clear list of patterns to extract
- [x] Dependency analysis complete
- [x] Example tool documented
- [x] Build and test patterns analyzed
- [x] Configuration management reviewed

---

## Next Steps

1. Create pattern documents for each identified pattern
2. Create command documents for project initialization and tool creation
3. Create design documents for architecture and mcp-auth integration
4. Build starter template with hello_computer example
5. Test installation and usage workflow

---

**Status**: Analysis Complete
**Recommendation**: Proceed with pattern extraction (Task 2+)

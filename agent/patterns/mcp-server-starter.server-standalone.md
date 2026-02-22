# Server Standalone Pattern

**Pattern**: Basic MCP Server with stdio Transport
**Category**: Server Architecture
**Complexity**: Intermediate
**Last Updated**: 2026-02-22

---

## Overview

The Server Standalone Pattern provides the foundation for building MCP servers that communicate via stdio (standard input/output) transport. This pattern is ideal for Claude Desktop integration and standalone execution where the server runs as a subprocess.

**When to use this pattern**:
- Building MCP servers for Claude Desktop
- Creating standalone command-line MCP tools
- Single-user, single-tenant deployments
- Development and testing environments
- When stdio transport is sufficient

**When NOT to use this pattern**:
- Multi-tenant production deployments (use Server Factory Pattern)
- HTTP/SSE transport required (use Server Factory with mcp-auth)
- Need per-user isolation (use Server Factory Pattern)

---

## Core Principles

### 1. Stdio Transport
Communication happens through standard input/output streams using JSON-RPC protocol. This enables subprocess-based integration.

### 2. Request/Response Pattern
MCP uses two primary request handlers:
- `ListToolsRequestSchema` - Returns available tools
- `CallToolRequestSchema` - Executes tool calls

### 3. Error Handling
Use `McpError` types for protocol-compliant error responses.

### 4. Graceful Shutdown
Handle SIGINT and SIGTERM for clean server termination.

---

## Implementation

### Complete Server Example

**src/server.ts**:

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
import { config, validateConfig } from './config.js';
import { logger } from './utils/logger.js';

// Import tools
import { helloComputerTool, handleHelloComputer } from './tools/hello-computer.js';

/**
 * Initialize MCP server
 */
async function initServer(): Promise<Server> {
  logger.info('Initializing MCP server...');
  
  // Validate configuration
  validateConfig();
  
  // Initialize any databases or services here
  // await initDatabases();
  
  // Create MCP server
  const server = new Server(
    {
      name: 'my-mcp-server',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );
  
  // Register handlers
  registerHandlers(server);
  
  logger.info('Server initialized successfully');
  return server;
}

/**
 * Register MCP request handlers
 */
function registerHandlers(server: Server): void {
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
      
      // Default userId for standalone mode
      const userId = 'default_user';
      
      // Route to appropriate tool handler
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

/**
 * Main server startup
 */
async function main(): Promise<void> {
  try {
    logger.info('Starting MCP server...');
    
    // Initialize server
    const server = await initServer();
    
    // Create stdio transport
    const transport = new StdioServerTransport();
    
    // Connect server to transport
    await server.connect(transport);
    
    logger.info('Server running on stdio transport');
    
    // Setup graceful shutdown
    setupShutdownHandlers(server);
    
    // Note: When using stdio, avoid console.log as it interferes with JSON-RPC
    // Use logger which writes to stderr
  } catch (error) {
    logger.error('Server startup failed:', error);
    process.exit(1);
  }
}

/**
 * Setup graceful shutdown handlers
 */
function setupShutdownHandlers(server: Server): void {
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    try {
      await server.close();
      logger.info('Server closed successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  };
  
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

// Start the server
main().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
```

---

## Key Components

### 1. Server Initialization

```typescript
const server = new Server(
  {
    name: 'my-mcp-server',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);
```

**Parameters**:
- `name` - Server identifier
- `version` - Server version (semantic versioning)
- `capabilities` - Declare server capabilities (tools, resources, prompts)

### 2. Tool Registration

```typescript
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      helloComputerTool,
      // More tools...
    ],
  };
});
```

**Purpose**: Tell clients which tools are available.

### 3. Tool Execution

```typescript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  switch (name) {
    case 'tool_name':
      result = await handleTool(args, userId);
      break;
    default:
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  }
  
  return {
    content: [{ type: 'text', text: result }],
  };
});
```

**Pattern**: Switch statement routes tool calls to handlers.

### 4. Stdio Transport

```typescript
const transport = new StdioServerTransport();
await server.connect(transport);
```

**Purpose**: Enables JSON-RPC communication via stdin/stdout.

### 5. Error Handling

```typescript
try {
  result = await handleTool(args, userId);
} catch (error) {
  if (error instanceof McpError) {
    throw error;
  }
  throw new McpError(
    ErrorCode.InternalError,
    `Tool execution failed: ${error.message}`
  );
}
```

**Pattern**: Catch errors and wrap in `McpError` for protocol compliance.

---

## Logger Implementation

**src/utils/logger.ts**:

```typescript
/**
 * Logger for MCP servers
 * 
 * IMPORTANT: Use console.error (not console.log) for stdio compatibility.
 * Stdio transport uses stdout for JSON-RPC, so logs must go to stderr.
 */
export const logger = {
  info: (message: string, meta?: Record<string, any>) => {
    console.error(JSON.stringify({ 
      level: 'info', 
      message, 
      timestamp: new Date().toISOString(),
      ...meta 
    }));
  },
  
  error: (message: string, error?: any) => {
    console.error(JSON.stringify({ 
      level: 'error', 
      message,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    }));
  },
  
  debug: (message: string, meta?: Record<string, any>) => {
    if (process.env.LOG_LEVEL === 'debug') {
      console.error(JSON.stringify({ 
        level: 'debug', 
        message,
        timestamp: new Date().toISOString(),
        ...meta 
      }));
    }
  },
};
```

**Key Point**: Always use `console.error` for logging, never `console.log`, as stdout is reserved for JSON-RPC communication.

---

## Tool Handler Pattern

**src/tools/hello-computer.ts**:

```typescript
export const helloComputerTool = {
  name: 'hello_computer',
  description: 'Returns a friendly greeting',
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

## Usage

### Development Mode

```bash
npm run dev
```

Uses `tsx watch` for hot reload during development.

### Production Build

```bash
npm run build
npm start
```

### Claude Desktop Integration

Add to Claude Desktop config:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["/path/to/my-mcp-server/dist/server.js"]
    }
  }
}
```

**Or use npx**:

```json
{
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": ["-y", "@username/my-mcp-server"]
    }
  }
}
```

---

## Benefits

### 1. Simplicity
- Single entry point
- Straightforward architecture
- Easy to understand and debug

### 2. Claude Desktop Compatible
- Works out of the box with Claude Desktop
- No additional configuration needed
- Subprocess-based integration

### 3. Development Speed
- Fast iteration with watch mode
- Immediate feedback
- Simple debugging

### 4. Resource Efficient
- Lightweight process
- No HTTP overhead
- Direct communication

---

## Anti-Patterns

### ❌ Don't: Use console.log

```typescript
// ❌ Wrong - Breaks stdio transport
console.log('Server started');
console.log(JSON.stringify(result));
```

```typescript
// ✅ Correct - Use logger with console.error
logger.info('Server started');
logger.debug('Result', { result });
```

**Why**: Stdio transport uses stdout for JSON-RPC. Logging to stdout corrupts the protocol.

### ❌ Don't: Forget Error Handling

```typescript
// ❌ Wrong - Unhandled errors crash server
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const result = await handleTool(request.params.arguments);
  return { content: [{ type: 'text', text: result }] };
});
```

```typescript
// ✅ Correct - Wrap in try/catch
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const result = await handleTool(request.params.arguments);
    return { content: [{ type: 'text', text: result }] };
  } catch (error) {
    throw new McpError(ErrorCode.InternalError, error.message);
  }
});
```

**Why**: Unhandled errors crash the server. Always catch and wrap in `McpError`.

### ❌ Don't: Skip Graceful Shutdown

```typescript
// ❌ Wrong - No shutdown handling
main();
```

```typescript
// ✅ Correct - Handle shutdown signals
setupShutdownHandlers(server);
```

**Why**: Graceful shutdown ensures resources are cleaned up properly.

### ❌ Don't: Hardcode User ID

```typescript
// ❌ Wrong - Hardcoded userId
const userId = 'user123';
```

```typescript
// ✅ Correct - Default for standalone, parameter for factory
const userId = 'default_user'; // Standalone mode
// OR
const userId = args.user_id || 'default_user'; // With optional user_id
```

**Why**: Standalone servers typically don't have user authentication, but code should be ready for factory pattern migration.

### ❌ Don't: Return Non-String Results

```typescript
// ❌ Wrong - Return object directly
return {
  content: [{ type: 'text', text: { message: 'hello' } }],
};
```

```typescript
// ✅ Correct - Return JSON string
return {
  content: [{ type: 'text', text: JSON.stringify({ message: 'hello' }, null, 2) }],
};
```

**Why**: MCP expects text content as strings. Objects must be serialized.

---

## Related Patterns

- [Bootstrap Pattern](mcp-server-starter.bootstrap.md) - Project setup for this pattern
- [Server Factory Pattern](mcp-server-starter.server-factory.md) - Multi-tenant alternative
- [Tool Creation Pattern](mcp-server-starter.tool-creation.md) - How to create tools
- [Config Management Pattern](mcp-server-starter.config-management.md) - Configuration handling

---

## Troubleshooting

**Problem**: Server starts but Claude Desktop doesn't see tools

**Solution**: Check that:
1. Server is outputting to stderr (not stdout) for logs
2. `ListToolsRequestSchema` handler is registered
3. Tool schemas are valid JSON Schema
4. Server is actually running (check Claude Desktop logs)

**Problem**: "Method not found" errors

**Solution**: Ensure tool name in switch statement matches tool definition name exactly (case-sensitive).

**Problem**: Server crashes on tool execution

**Solution**: Add try/catch around tool handlers and wrap errors in `McpError`.

**Problem**: Can't debug - no logs visible

**Solution**: Logs go to stderr. Check:
- Claude Desktop logs: `~/Library/Logs/Claude/mcp*.log` (macOS)
- Or run server directly: `node dist/server.js` and send JSON-RPC manually

---

## Testing

### Manual Testing

```bash
# Start server
node dist/server.js

# Send JSON-RPC request (in another terminal)
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/server.js
```

### Integration Testing

See [Test Config Pattern](mcp-server-starter.test-config.md) for Jest setup.

---

## Checklist

- [ ] Created `src/server.ts` with shebang (`#!/usr/bin/env node`)
- [ ] Implemented `initServer()` function
- [ ] Registered `ListToolsRequestSchema` handler
- [ ] Registered `CallToolRequestSchema` handler
- [ ] Added error handling with `McpError`
- [ ] Created logger using `console.error`
- [ ] Implemented graceful shutdown handlers
- [ ] Added at least one tool
- [ ] Tested with `npm run dev`
- [ ] Built with `npm run build`
- [ ] Tested with Claude Desktop (optional)

---

**Pattern**: Server Standalone
**Status**: Production Ready
**Last Updated**: 2026-02-22

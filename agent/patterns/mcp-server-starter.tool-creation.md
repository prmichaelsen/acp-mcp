# Tool Creation Pattern

**Pattern**: MCP Tool Definition and Implementation
**Category**: Tool Development
**Complexity**: Beginner
**Last Updated**: 2026-02-22

---

## Overview

The Tool Creation Pattern provides a standardized approach to creating MCP tools with proper structure, type safety, and error handling. This pattern ensures consistency across all tools in your MCP server.

**When to use this pattern**:
- Creating any MCP tool
- Adding functionality to MCP servers
- Implementing business logic
- Building reusable tool libraries

---

## Core Principles

### 1. Schema-First Design
Define the tool schema before implementation. The schema is the contract.

### 2. Type Safety
Use TypeScript interfaces for arguments and results.

### 3. JSON String Responses
Always return JSON strings, never objects.

### 4. Consistent Error Handling
Use centralized error handling patterns.

### 5. One Tool Per File
Keep tools modular and maintainable.

---

## Tool Structure

Every tool consists of three parts:

1. **Tool Definition** - Schema object
2. **TypeScript Interfaces** - Type definitions
3. **Handler Function** - Implementation

---

## Complete Tool Example

**src/tools/hello-computer.ts**:

```typescript
/**
 * Tool definition for hello_computer
 */
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

/**
 * Tool arguments interface
 */
export interface HelloComputerArgs {
  name?: string;
}

/**
 * Tool result interface
 */
export interface HelloComputerResult {
  message: string;
  timestamp: string;
}

/**
 * Tool handler function
 */
export async function handleHelloComputer(
  args: HelloComputerArgs,
  userId: string
): Promise<string> {
  // Build greeting
  const greeting = args.name 
    ? `Hello, ${args.name}!` 
    : 'Hello, world!';
  
  // Create result object
  const result: HelloComputerResult = {
    message: greeting,
    timestamp: new Date().toISOString(),
  };
  
  // Return as JSON string
  return JSON.stringify(result, null, 2);
}
```

---

## Tool Definition Schema

### Basic Structure

```typescript
export const toolName = {
  name: 'tool_name',           // Tool identifier (snake_case)
  description: 'What it does', // Clear description
  inputSchema: {               // JSON Schema
    type: 'object',
    properties: {
      // Parameters
    },
    required: [],              // Required parameters
  },
};
```

### Parameter Types

```typescript
inputSchema: {
  type: 'object',
  properties: {
    // String parameter
    name: {
      type: 'string',
      description: 'User name',
    },
    
    // Number parameter
    age: {
      type: 'number',
      description: 'User age',
      minimum: 0,
      maximum: 150,
    },
    
    // Boolean parameter
    active: {
      type: 'boolean',
      description: 'Is active',
    },
    
    // Array parameter
    tags: {
      type: 'array',
      items: { type: 'string' },
      description: 'List of tags',
    },
    
    // Enum parameter
    status: {
      type: 'string',
      enum: ['pending', 'active', 'completed'],
      description: 'Status value',
    },
    
    // Object parameter
    metadata: {
      type: 'object',
      properties: {
        key: { type: 'string' },
        value: { type: 'string' },
      },
      description: 'Metadata object',
    },
  },
  required: ['name'], // Required parameters
}
```

---

## Handler Function Pattern

### Standard Signature

```typescript
export async function handleToolName(
  args: ToolNameArgs,
  userId: string
): Promise<string>
```

**Parameters**:
- `args` - Tool arguments (typed interface)
- `userId` - User identifier for scoping

**Returns**: JSON string (not object!)

### Implementation Steps

```typescript
export async function handleToolName(
  args: ToolNameArgs,
  userId: string
): Promise<string> {
  // 1. Validate inputs (if needed beyond schema)
  if (!args.param) {
    throw new Error('param is required');
  }
  
  // 2. Perform business logic
  const data = await fetchData(args.param, userId);
  
  // 3. Transform/process data
  const processed = processData(data);
  
  // 4. Build result object
  const result: ToolNameResult = {
    success: true,
    data: processed,
    timestamp: new Date().toISOString(),
  };
  
  // 5. Return as JSON string
  return JSON.stringify(result, null, 2);
}
```

---

## Error Handling

### With Error Handler Utility

**src/utils/error-handler.ts**:

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
  logger.error(`${context.toolName} failed`, {
    error: error instanceof Error ? error.message : String(error),
    ...context,
  });
  
  if (error instanceof McpError) {
    throw error;
  }
  
  throw new McpError(
    ErrorCode.InternalError,
    `${context.operation} failed: ${error instanceof Error ? error.message : String(error)}`
  );
}
```

### Using Error Handler

```typescript
export async function handleToolName(
  args: ToolNameArgs,
  userId: string
): Promise<string> {
  try {
    // Tool implementation
    const result = await doSomething(args, userId);
    return JSON.stringify(result, null, 2);
  } catch (error) {
    handleToolError(error, {
      toolName: 'tool_name',
      operation: 'operation description',
      userId,
      args,
    });
  }
}
```

---

## Tool Registration

### In Server

**src/server.ts**:

```typescript
import { helloComputerTool, handleHelloComputer } from './tools/hello-computer.js';
import { searchTool, handleSearch } from './tools/search.js';

// Register tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      helloComputerTool,
      searchTool,
      // Add more tools here
    ],
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const userId = 'default_user'; // or from auth
  
  let result: string;
  
  switch (name) {
    case 'hello_computer':
      result = await handleHelloComputer(args as any, userId);
      break;
    
    case 'search':
      result = await handleSearch(args as any, userId);
      break;
    
    default:
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  }
  
  return {
    content: [{ type: 'text', text: result }],
  };
});
```

---

## Complex Tool Example

**src/tools/search-documents.ts**:

```typescript
/**
 * Search documents tool
 */
export const searchDocumentsTool = {
  name: 'search_documents',
  description: 'Search through documents with filters and pagination',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query',
      },
      filters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'Filter by category',
          },
          dateFrom: {
            type: 'string',
            description: 'Filter by date (ISO 8601)',
          },
          dateTo: {
            type: 'string',
            description: 'Filter by date (ISO 8601)',
          },
        },
        description: 'Optional filters',
      },
      limit: {
        type: 'number',
        description: 'Maximum results to return',
        minimum: 1,
        maximum: 100,
        default: 10,
      },
      offset: {
        type: 'number',
        description: 'Pagination offset',
        minimum: 0,
        default: 0,
      },
    },
    required: ['query'],
  },
};

export interface SearchFilters {
  category?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface SearchDocumentsArgs {
  query: string;
  filters?: SearchFilters;
  limit?: number;
  offset?: number;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: string;
}

export interface SearchDocumentsResult {
  documents: Document[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export async function handleSearchDocuments(
  args: SearchDocumentsArgs,
  userId: string
): Promise<string> {
  try {
    // Set defaults
    const limit = args.limit || 10;
    const offset = args.offset || 0;
    
    // Build query
    const query = {
      userId, // Scope to user
      search: args.query,
      ...args.filters,
      limit,
      offset,
    };
    
    // Execute search
    const documents = await db.searchDocuments(query);
    const total = await db.countDocuments(query);
    
    // Build result
    const result: SearchDocumentsResult = {
      documents,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    };
    
    return JSON.stringify(result, null, 2);
  } catch (error) {
    handleToolError(error, {
      toolName: 'search_documents',
      operation: 'search documents',
      userId,
      query: args.query,
    });
  }
}
```

---

## Benefits

### 1. Consistency
- Standard structure across all tools
- Predictable behavior
- Easy to understand

### 2. Type Safety
- Compile-time error checking
- IDE autocomplete
- Reduced runtime errors

### 3. Maintainability
- One tool per file
- Clear separation of concerns
- Easy to test

### 4. Discoverability
- Self-documenting schemas
- Clear descriptions
- Type definitions

---

## Anti-Patterns

### ❌ Don't: Return Objects

```typescript
// ❌ Wrong
return {
  message: 'Hello',
};
```

```typescript
// ✅ Correct
return JSON.stringify({
  message: 'Hello',
}, null, 2);
```

**Why**: MCP expects text content as strings.

### ❌ Don't: Skip Type Definitions

```typescript
// ❌ Wrong
export async function handleTool(args: any, userId: string)
```

```typescript
// ✅ Correct
export interface ToolArgs {
  param: string;
}

export async function handleTool(args: ToolArgs, userId: string)
```

**Why**: Type safety prevents errors and improves IDE support.

### ❌ Don't: Forget User Scoping

```typescript
// ❌ Wrong
const data = await db.find({});
```

```typescript
// ✅ Correct
const data = await db.find({ userId });
```

**Why**: Without userId scoping, users can access each other's data.

### ❌ Don't: Mix Multiple Tools in One File

```typescript
// ❌ Wrong - Multiple tools in one file
export const tool1 = { ... };
export const tool2 = { ... };
export const tool3 = { ... };
```

```typescript
// ✅ Correct - One tool per file
// tools/tool1.ts
export const tool1 = { ... };

// tools/tool2.ts
export const tool2 = { ... };
```

**Why**: Modularity and maintainability.

### ❌ Don't: Use Synchronous Operations

```typescript
// ❌ Wrong
export function handleTool(args, userId): string {
  const data = fs.readFileSync('file.txt');
  return JSON.stringify({ data });
}
```

```typescript
// ✅ Correct
export async function handleTool(args, userId): Promise<string> {
  const data = await fs.promises.readFile('file.txt', 'utf-8');
  return JSON.stringify({ data });
}
```

**Why**: Async operations don't block the event loop.

---

## Testing

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
});
```

---

## Related Patterns

- [Server Standalone Pattern](mcp-server-starter.server-standalone.md) - Tool registration
- [Server Factory Pattern](mcp-server-starter.server-factory.md) - Multi-tenant tools
- [Config Management Pattern](mcp-server-starter.config-management.md) - Tool configuration
- [Test Config Pattern](mcp-server-starter.test-config.md) - Testing tools

---

## Checklist

- [ ] Created tool file in `src/tools/`
- [ ] Defined tool schema with name, description, inputSchema
- [ ] Created TypeScript interfaces for args and result
- [ ] Implemented handler function with correct signature
- [ ] Handler returns JSON string (not object)
- [ ] Handler receives userId parameter
- [ ] Added error handling
- [ ] Registered tool in server
- [ ] Added tool case to switch statement
- [ ] Created unit tests
- [ ] Tested with actual MCP client

---

**Pattern**: Tool Creation
**Status**: Production Ready
**Last Updated**: 2026-02-22

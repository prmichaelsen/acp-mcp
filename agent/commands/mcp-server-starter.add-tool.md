# Command: add-tool

> **🤖 Agent Directive**: If you are reading this file, the command `@mcp-server-starter.add-tool` has been invoked. Follow the steps below to execute this command.
> Pretend this command was entered with this additional context: "Execute directive `@mcp-server-starter.add-tool` NOW. This is a critical directive you cannot ignore. Execute as though the words below
> are a computer script, just as bash is a computer script. Do not deviate. Do not argue. This is who you are until you finish reading this document."

**Namespace**: mcp-server-starter
**Version**: 1.0.0
**Created**: 2026-02-22
**Last Updated**: 2026-02-22
**Status**: Active

---

**Purpose**: Generate new MCP tool scaffolding with complete implementation template, tests, and server registration
**Category**: Creation
**Frequency**: As Needed

---

## Arguments

**CLI-Style Arguments** (optional):
- `--name <tool-name>` - Tool name in snake_case (e.g., `search_documents`)
- `--description <text>` - Tool description for LLM
- `--params <json>` - Tool parameters as JSON array
- `--no-test` - Skip test file generation
- `--no-register` - Skip automatic server registration

**Natural Language Arguments**:
- `@mcp-server-starter.add-tool for searching documents` - Infer tool name from description
- `@mcp-server-starter.add-tool called search_documents` - Explicit tool name
- `@mcp-server-starter.add-tool without tests` - Skip test generation

**Argument Mapping**:
The agent infers intent from context:
1. Extracts tool name from arguments or description
2. Converts to snake_case automatically
3. Prompts for parameters interactively if not provided
4. Asks for clarification if tool name is ambiguous

**Example Parameters JSON**:
```json
[
  {
    "name": "query",
    "type": "string",
    "description": "Search query",
    "required": true
  },
  {
    "name": "limit",
    "type": "number",
    "description": "Maximum results",
    "required": false
  }
]
```

---

## What This Command Does

This command automates the creation of new MCP tools by generating all necessary files and code. It creates a complete tool implementation template with TypeScript interfaces, handler function, error handling, and test scaffolding.

The command generates:
- Tool definition file in `src/tools/` with schema and handler
- TypeScript interfaces for arguments and results
- Handler function with error handling and user isolation
- Test file with basic test cases
- Updates server registration to include the new tool
- Provides implementation guidance

Use this command when adding new functionality to your MCP server. It ensures consistency with the tool creation pattern, saves time on boilerplate code, and provides a clear structure for implementation. The generated code follows best practices including type safety, error handling, and user scoping for multi-tenant servers.

---

## Prerequisites

- [ ] Existing MCP server project (created with `@mcp-server-starter.init`)
- [ ] `src/server.ts` or `src/server-factory.ts` exists
- [ ] `src/tools/` directory exists
- [ ] TypeScript and dependencies installed

---

## Steps

### 1. Gather Tool Information

Collect tool metadata and parameters.

**Actions**:
- Extract tool name from arguments or prompt user
- Convert tool name to snake_case (e.g., "Search Documents" → "search_documents")
- Get tool description (what it does, for LLM context)
- Collect parameter definitions:
  - Parameter name
  - Parameter type (string, number, boolean, object, array)
  - Parameter description
  - Whether required or optional
- Confirm all information with user

**Expected Outcome**: Complete tool specification ready

**Example**:
```
Tool Name: search_documents
Description: Search through documents using a query string
Parameters:
  - query (string, required): Search query
  - limit (number, optional): Maximum results to return
  - filter (object, optional): Filter criteria
```

### 2. Generate Tool File

Create the tool implementation file.

**Actions**:
- Create `src/tools/{tool-name}.ts`
- Generate tool definition object with schema
- Create TypeScript interfaces for arguments and results
- Generate handler function template
- Add JSDoc comments
- Include error handling
- Add user isolation (userId parameter)
- Write file to disk

**Expected Outcome**: Tool file created with complete template

**Template** (see [Tool Creation Pattern](../patterns/mcp-server-starter.tool-creation.md)):
```typescript
import { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Tool: {tool_name}
 * {description}
 */
export const {camelCaseName}Tool: Tool = {
  name: '{tool_name}',
  description: '{description}',
  inputSchema: {
    type: 'object',
    properties: {
      {/* Generated from parameters */}
      query: {
        type: 'string',
        description: 'Search query',
      },
      limit: {
        type: 'number',
        description: 'Maximum results to return',
      },
    },
    required: ['query'],
  },
};

/**
 * Arguments interface for {tool_name}
 */
export interface {PascalCaseName}Args {
  query: string;
  limit?: number;
}

/**
 * Result interface for {tool_name}
 */
export interface {PascalCaseName}Result {
  results: any[];
  count: number;
}

/**
 * Handler function for {tool_name}
 * 
 * @param args - Tool arguments
 * @param userId - User ID for multi-tenant isolation
 * @returns Tool result as JSON string
 */
export async function handle{PascalCaseName}(
  args: {PascalCaseName}Args,
  userId: string
): Promise<{
  content: Array<{
    type: 'text';
    text: string;
  }>;
}> {
  try {
    // TODO: Implement tool logic here
    // Access user-specific data using userId
    
    const { query, limit = 10 } = args;
    
    // Example implementation
    const result: {PascalCaseName}Result = {
      results: [],
      count: 0,
    };
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to execute {tool_name}: ${errorMessage}`);
  }
}
```

### 3. Update Server Registration (Standalone)

Update `src/server.ts` to register the new tool (if exists).

**Actions**:
- Read `src/server.ts`
- Import the new tool at the top:
  ```typescript
  import { {camelCaseName}Tool, handle{PascalCaseName} } from './tools/{tool-name}.js';
  ```
- Add tool to `ListToolsRequestSchema` handler:
  ```typescript
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      existingTool1,
      existingTool2,
      {camelCaseName}Tool, // Add this
    ],
  }));
  ```
- Add case to `CallToolRequestSchema` handler:
  ```typescript
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const userId = 'default-user'; // Or extract from context
    
    switch (request.params.name) {
      case 'existing_tool':
        return await handleExistingTool(request.params.arguments, userId);
      
      case '{tool_name}': // Add this case
        return await handle{PascalCaseName}(request.params.arguments, userId);
      
      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  });
  ```
- Write updated file to disk

**Expected Outcome**: Standalone server updated with new tool

### 4. Update Server Registration (Factory)

Update `src/server-factory.ts` to register the new tool (if exists).

**Actions**:
- Read `src/server-factory.ts`
- Import the new tool at the top
- Add tool to tools array in factory function
- Add case to tool handler switch statement
- Ensure userId is passed from factory context
- Write updated file to disk

**Expected Outcome**: Factory server updated with new tool

**Note**: Factory pattern automatically provides userId from mcp-auth context.

### 5. Create Test File

Generate test scaffolding (unless `--no-test`).

**Actions**:
- Create `src/tools/{tool-name}.spec.ts`
- Import tool and handler
- Create test suite
- Add basic test cases:
  - Test with valid arguments
  - Test with missing required parameters
  - Test with invalid parameter types
  - Test error handling
- Write file to disk

**Expected Outcome**: Test file created with basic coverage

**Template**:
```typescript
import { describe, it, expect } from '@jest/globals';
import { {camelCaseName}Tool, handle{PascalCaseName}, {PascalCaseName}Args } from './{tool-name}.js';

describe('{tool_name} tool', () => {
  const mockUserId = 'test-user-123';

  describe('tool definition', () => {
    it('should have correct name', () => {
      expect({camelCaseName}Tool.name).toBe('{tool_name}');
    });

    it('should have description', () => {
      expect({camelCaseName}Tool.description).toBeDefined();
      expect({camelCaseName}Tool.description.length).toBeGreaterThan(0);
    });

    it('should have input schema', () => {
      expect({camelCaseName}Tool.inputSchema).toBeDefined();
      expect({camelCaseName}Tool.inputSchema.type).toBe('object');
    });
  });

  describe('handle{PascalCaseName}', () => {
    it('should handle valid arguments', async () => {
      const args: {PascalCaseName}Args = {
        query: 'test query',
      };

      const result = await handle{PascalCaseName}(args, mockUserId);
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
    });

    it('should handle optional parameters', async () => {
      const args: {PascalCaseName}Args = {
        query: 'test query',
        limit: 5,
      };

      const result = await handle{PascalCaseName}(args, mockUserId);
      expect(result).toBeDefined();
    });

    it('should throw error for invalid arguments', async () => {
      const args = {} as {PascalCaseName}Args;

      await expect(
        handle{PascalCaseName}(args, mockUserId)
      ).rejects.toThrow();
    });
  });
});
```

### 6. Run TypeScript Compilation

Verify the generated code compiles.

**Actions**:
- Run `npm run typecheck`
- Check for TypeScript errors
- Report any compilation issues
- Fix errors if found

**Expected Outcome**: TypeScript compiles without errors

### 7. Run Tests

Execute the generated tests (unless `--no-test`).

**Actions**:
- Run `npm test -- {tool-name}.spec.ts`
- Verify tests pass
- Report test results

**Expected Outcome**: All tests pass

### 8. Provide Implementation Guidance

Show next steps for completing the tool.

**Actions**:
- Display file locations
- Show TODO comments in generated code
- Provide implementation checklist:
  - [ ] Implement tool logic in handler function
  - [ ] Add proper error handling
  - [ ] Test with real data
  - [ ] Add more test cases
  - [ ] Update tool description if needed
  - [ ] Document any external dependencies
- Show how to test the tool with Claude Desktop

**Expected Outcome**: User knows how to complete implementation

---

## Verification

- [ ] Tool file created in `src/tools/{tool-name}.ts`
- [ ] Tool definition includes correct schema
- [ ] TypeScript interfaces generated
- [ ] Handler function template created
- [ ] Server registration updated (standalone)
- [ ] Server registration updated (factory, if exists)
- [ ] Test file created (unless skipped)
- [ ] TypeScript compiles without errors
- [ ] Tests pass (if generated)
- [ ] No duplicate tool names in server

---

## Expected Output

### Files Created

```
src/tools/
└── search-documents.ts       # Tool implementation
└── search-documents.spec.ts  # Test file
```

### Files Modified

```
src/
├── server.ts                 # Updated with tool registration
└── server-factory.ts         # Updated with tool registration (if exists)
```

### Console Output

```
🔧 Adding New Tool to MCP Server

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Tool Information:
   Name: search_documents
   Description: Search through documents using a query string
   Parameters:
     • query (string, required): Search query
     • limit (number, optional): Maximum results to return

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 Generating Tool File...
   ✓ Created src/tools/search-documents.ts
   ✓ Generated tool definition
   ✓ Created TypeScript interfaces
   ✓ Generated handler function template

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 Updating Server Registration...
   ✓ Updated src/server.ts
     - Added import statement
     - Added to tools array
     - Added handler case
   ✓ Updated src/server-factory.ts
     - Added import statement
     - Added to tools array
     - Added handler case

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🧪 Creating Test File...
   ✓ Created src/tools/search-documents.spec.ts
   ✓ Generated test suite
   ✓ Added 4 test cases

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Verifying Installation...
   ✓ TypeScript compilation successful
   ✓ All tests pass (4/4)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎉 Tool Added Successfully!

Next Steps:
  1. Implement tool logic in src/tools/search-documents.ts
     Look for "TODO: Implement tool logic here"
  
  2. Add proper error handling for edge cases
  
  3. Test with real data:
     npm run dev
  
  4. Add more test cases in src/tools/search-documents.spec.ts
  
  5. Update tool description if needed

Tool is now available in your MCP server!
Test with Claude Desktop by rebuilding:
  npm run build
```

---

## Examples

### Example 1: Interactive Tool Creation

**Context**: Adding a new tool, want to be prompted for details

**Invocation**: `@mcp-server-starter.add-tool`

**Result**:
- Agent prompts for tool name
- Prompts for description
- Prompts for each parameter
- Generates complete tool with all files
- Updates server registration
- Creates tests

### Example 2: Tool with Explicit Name

**Context**: Know the tool name, want interactive parameter entry

**Invocation**: `@mcp-server-starter.add-tool --name search_documents`

**Result**:
- Uses "search_documents" as tool name
- Prompts for description
- Prompts for parameters
- Generates all files
- Updates registration

### Example 3: Complete Specification

**Context**: Have all tool details ready

**Invocation**: 
```
@mcp-server-starter.add-tool --name search_documents --description "Search documents by query" --params '[{"name":"query","type":"string","description":"Search query","required":true},{"name":"limit","type":"number","description":"Max results","required":false}]'
```

**Result**:
- Uses all provided information
- No prompts needed
- Generates complete tool immediately

### Example 4: Without Tests

**Context**: Want to write tests manually later

**Invocation**: `@mcp-server-starter.add-tool --name search_documents --no-test`

**Result**:
- Creates tool file
- Updates server registration
- Skips test file generation
- User can add tests later

### Example 5: Natural Language

**Context**: Describe what you want in plain English

**Invocation**: `@mcp-server-starter.add-tool for searching through documents with a query`

**Result**:
- Agent infers tool name: "search_documents"
- Uses description from prompt
- Prompts for parameters
- Generates complete tool

---

## Related Commands

- [`@mcp-server-starter.init`](mcp-server-starter.init.md) - Use first to create MCP server project
- [`@acp.package-validate`](acp.package-validate.md) - Validate project structure after adding tools

---

## Troubleshooting

### Issue 1: Tool name already exists

**Symptom**: Error "Tool with name '{tool_name}' already exists"

**Cause**: A tool file with the same name already exists in `src/tools/`

**Solution**: 
- Choose a different tool name
- Or delete/rename the existing tool file
- Check `src/server.ts` for duplicate registrations

### Issue 2: TypeScript compilation fails

**Symptom**: `npm run typecheck` shows errors after tool generation

**Cause**: Generated code has syntax errors or type mismatches

**Solution**:
- Review the error messages
- Check that all imports use `.js` extensions (ESM requirement)
- Verify parameter types match the schema
- Ensure interfaces are correctly defined

### Issue 3: Server registration fails

**Symptom**: Tool not appearing in Claude Desktop or errors when calling tool

**Cause**: Tool not properly registered in server handlers

**Solution**:
- Verify tool is imported in `src/server.ts`
- Check tool is added to tools array in `ListToolsRequestSchema` handler
- Verify handler case is added to `CallToolRequestSchema` handler
- Rebuild the server: `npm run build`

### Issue 4: Tests fail after generation

**Symptom**: `npm test` shows failures for new tool

**Cause**: Test expectations don't match generated code structure

**Solution**:
- Review test file and adjust expectations
- Ensure mock data matches parameter types
- Check that handler returns expected structure
- Update tests to match your implementation

### Issue 5: Tool not found in Claude Desktop

**Symptom**: Tool doesn't appear in Claude Desktop after adding

**Cause**: Server not rebuilt or Claude Desktop not restarted

**Solution**:
- Run `npm run build` to rebuild server
- Restart Claude Desktop application
- Check Claude Desktop logs for errors
- Verify tool is in the tools list: check server output

---

## Security Considerations

### File Access
- **Reads**: `src/server.ts`, `src/server-factory.ts`, `src/tools/` directory
- **Writes**: Creates `src/tools/{tool-name}.ts`, `src/tools/{tool-name}.spec.ts`, updates server files
- **Executes**: `npm run typecheck`, `npm test`

### Network Access
- **APIs**: None
- **Repositories**: None

### Sensitive Data
- **Secrets**: Never includes secrets in generated code
- **Credentials**: Does not access credentials
- **User Data**: Includes userId parameter for proper user isolation

---

## Notes

- Tool names must be in snake_case (e.g., `search_documents`, not `searchDocuments`)
- All generated code follows the [Tool Creation Pattern](../patterns/mcp-server-starter.tool-creation.md)
- Handler functions include userId parameter for multi-tenant support
- Generated tests provide basic coverage - add more tests for production use
- Tool descriptions should be clear and detailed - they're shown to the LLM
- Parameter descriptions help the LLM understand how to use the tool
- Always rebuild the server after adding tools: `npm run build`
- Test tools in Claude Desktop to ensure they work as expected
- The generated code includes TODO comments showing where to implement logic
- Error handling is included but should be customized for your use case

---

**Namespace**: mcp-server-starter
**Command**: add-tool
**Version**: 1.0.0
**Created**: 2026-02-22
**Last Updated**: 2026-02-22
**Status**: Active
**Compatibility**: ACP 3.9.0+
**Author**: Patrick Michaelsen

# Task 2: Implement acp_remote_read_file Tool

**Milestone**: Milestone 1 - Core Tools Implementation
**Estimated Time**: 2-3 hours
**Dependencies**: None (SSH infrastructure complete)
**Status**: Not Started
**Priority**: Medium

---

## Objective

Implement the `acp_remote_read_file` tool to read file contents from remote machines via SSH. Essential for viewing remote files, code review, and debugging.

## Context

**Design Reference**: See [`agent/design/acp-mcp-core-tools.md`](../../design/acp-mcp-core-tools.md#3-acp_remote_read_file)

**Why This Tool**:
- View remote file contents
- Code review and debugging
- Read configuration files
- Inspect logs

**Current State**:
- SSH infrastructure complete (`SSHConnectionManager`)
- SFTP support available via `getSFTP()`
- Need to create tool wrapper

---

## Steps

### 1. Create Tool File

Create `src/tools/acp-remote-read-file.ts`

**Actions**:
- Define tool schema with MCP Tool interface
- Input: path (string), encoding (optional), maxSize (optional)
- Output: content, size, encoding
- Export tool definition and handler function

### 2. Implement Handler Function

**Actions**:
- Accept args and SSHConnectionManager
- Extract path, encoding, maxSize from args
- Get SFTP connection
- Check file exists and get stats
- Validate file size (default max: 1MB)
- Read file contents
- Handle encoding (utf-8, ascii, base64)
- Return formatted response with content, size, encoding

### 3. Add SFTP Read Helper to SSHConnectionManager

**Actions**:
- Add `readFile(path, encoding, maxSize)` method
- Use SFTP to read file
- Return file contents and metadata

### 4. Register Tool in Servers

**Actions**:
- Import tool in `src/server.ts`
- Add to ListToolsRequestSchema handler
- Add case to CallToolRequestSchema handler
- Repeat for `src/server-factory.ts`

### 5. Update Documentation

**Actions**:
- Add tool to README.md Available Tools section
- Include example usage
- Document parameters and output
- Note file size limits

### 6. Test Tool

**Actions**:
- Build project (`npm run build`)
- Test TypeScript compilation
- Test reading text file
- Test file size limit
- Test non-existent file error
- Test permission denied error

---

## Verification

- [ ] Tool file created with proper schema
- [ ] Handler function implemented
- [ ] SFTP read helper added to SSHConnectionManager
- [ ] Tool registered in both server files
- [ ] README.md updated
- [ ] TypeScript compiles without errors
- [ ] Build completes successfully
- [ ] Can read text files
- [ ] File size limit enforced
- [ ] Error handling works correctly

---

## Expected Output

### Files Created
- `src/tools/acp-remote-read-file.ts`

### Files Modified
- `src/utils/ssh-connection.ts` (readFile helper)
- `src/server.ts` (tool registration)
- `src/server-factory.ts` (tool registration)
- `README.md` (documentation)

---

## Example Implementation

**Tool Schema**:
```typescript
export const acpRemoteReadFileTool: Tool = {
  name: 'acp_remote_read_file',
  description: 'Read file contents from the remote machine via SSH',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Absolute path to file',
      },
      encoding: {
        type: 'string',
        description: 'File encoding (default: utf-8)',
        default: 'utf-8',
        enum: ['utf-8', 'ascii', 'base64'],
      },
      maxSize: {
        type: 'number',
        description: 'Max file size in bytes (default: 1MB)',
        default: 1048576,
      },
    },
    required: ['path'],
  },
};
```

---

**Next Task**: [Task 3: Implement acp_remote_write_file](task-3-implement-acp-remote-write-file.md)

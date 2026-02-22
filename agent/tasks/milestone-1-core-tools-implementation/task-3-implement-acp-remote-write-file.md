# Task 3: Implement acp_remote_write_file Tool

**Milestone**: Milestone 1 - Core Tools Implementation
**Estimated Time**: 3-4 hours
**Dependencies**: None (SSH infrastructure complete)
**Status**: Not Started
**Priority**: Medium

---

## Objective

Implement the `acp_remote_write_file` tool to write file contents to remote machines via SSH. Completes CRUD operations and enables remote file editing.

## Context

**Design Reference**: See [`agent/design/acp-mcp-core-tools.md`](../../design/acp-mcp-core-tools.md#4-acp_remote_write_file)

**Why This Tool**:
- Edit remote files
- Create configuration files
- Write code changes
- Update documentation

**Current State**:
- SSH infrastructure complete (`SSHConnectionManager`)
- SFTP support available via `getSFTP()`
- Need to create tool wrapper

---

## Steps

### 1. Create Tool File

Create `src/tools/acp-remote-write-file.ts`

**Actions**:
- Define tool schema with MCP Tool interface
- Input: path, content, encoding (optional), createDirs (optional), backup (optional)
- Output: success, bytesWritten, backupPath (optional)
- Export tool definition and handler function

### 2. Implement Handler Function

**Actions**:
- Accept args and SSHConnectionManager
- Extract path, content, encoding, createDirs, backup from args
- Get SFTP connection
- Optionally backup existing file
- Optionally create parent directories
- Write to temp file first (atomic write)
- Rename temp file to target (atomic operation)
- Return formatted response

### 3. Add SFTP Write Helper to SSHConnectionManager

**Actions**:
- Add `writeFile(path, content, options)` method
- Support createDirs option (mkdir -p)
- Support backup option
- Implement atomic write (temp file + rename)
- Return bytes written and backup path

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
- Note security considerations

### 6. Test Tool

**Actions**:
- Build project (`npm run build`)
- Test TypeScript compilation
- Test writing new file
- Test overwriting existing file
- Test backup functionality
- Test createDirs functionality
- Test permission denied error

---

## Verification

- [ ] Tool file created with proper schema
- [ ] Handler function implemented
- [ ] SFTP write helper added to SSHConnectionManager
- [ ] Atomic write implemented (temp + rename)
- [ ] Backup functionality works
- [ ] Create directories functionality works
- [ ] Tool registered in both server files
- [ ] README.md updated
- [ ] TypeScript compiles without errors
- [ ] Build completes successfully
- [ ] Can write files
- [ ] Error handling works correctly

---

## Expected Output

### Files Created
- `src/tools/acp-remote-write-file.ts`

### Files Modified
- `src/utils/ssh-connection.ts` (writeFile helper)
- `src/server.ts` (tool registration)
- `src/server-factory.ts` (tool registration)
- `README.md` (documentation)

---

## Example Implementation

**Tool Schema**:
```typescript
export const acpRemoteWriteFileTool: Tool = {
  name: 'acp_remote_write_file',
  description: 'Write file contents to the remote machine via SSH',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Absolute path to file',
      },
      content: {
        type: 'string',
        description: 'File contents to write',
      },
      encoding: {
        type: 'string',
        description: 'File encoding (default: utf-8)',
        default: 'utf-8',
      },
      createDirs: {
        type: 'boolean',
        description: 'Create parent directories (default: false)',
        default: false,
      },
      backup: {
        type: 'boolean',
        description: 'Backup existing file (default: false)',
        default: false,
      },
    },
    required: ['path', 'content'],
  },
};
```

---

**Next Task**: Version bump and deployment preparation

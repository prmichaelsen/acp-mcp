# Task 1: Implement acp_remote_execute_command Tool

**Milestone**: Milestone 1 - Core Tools Implementation
**Estimated Time**: 3-4 hours
**Dependencies**: None (SSH infrastructure complete)
**Status**: Not Started
**Priority**: High (Most versatile tool)

---

## Objective

Implement the `acp_remote_execute_command` tool to execute arbitrary shell commands on remote machines via SSH. This is the most important tool as it enables git operations, npm commands, and any other CLI operations users need.

## Context

**Design Reference**: See [`agent/design/acp-mcp-core-tools.md`](../../design/acp-mcp-core-tools.md#2-acp_remote_execute_command)

**Why This Tool**:
- Most versatile - handles any shell command
- Enables git operations (status, commit, push)
- Enables package management (npm, pip, cargo)
- Enables system operations (ls, pwd, whoami)
- Replaces need for specialized git tools

**Current State**:
- SSH infrastructure complete (`SSHConnectionManager`)
- `SSHConnectionManager.exec()` method already exists
- Just need to create tool wrapper and register it

---

## Steps

### 1. Create Tool File

Create `src/tools/acp-remote-execute-command.ts`

**Actions**:
- Define tool schema with MCP Tool interface
- Input: command (string), cwd (optional string), timeout (optional number)
- Output: stdout, stderr, exitCode, timedOut
- Export tool definition and handler function

### 2. Implement Handler Function

**Actions**:
- Accept args and SSHConnectionManager
- Extract command, cwd, timeout from args
- Handle working directory changes (cd && command)
- Call `sshConnection.exec()` with timeout
- Capture stdout, stderr, exit code
- Handle timeout errors
- Return formatted response

### 3. Add Timeout Support to SSHConnectionManager

**Actions**:
- Update `SSHConnectionManager.exec()` to support timeout parameter
- Implement timeout logic with Promise.race()
- Return timedOut flag in response

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

### 6. Test Tool

**Actions**:
- Build project (`npm run build`)
- Test TypeScript compilation
- Manual test with simple command (e.g., `pwd`)
- Test with working directory
- Test timeout behavior
- Test error handling

---

## Verification

- [ ] Tool file created with proper schema
- [ ] Handler function implemented
- [ ] Timeout support added to SSHConnectionManager
- [ ] Tool registered in both server files
- [ ] README.md updated
- [ ] TypeScript compiles without errors
- [ ] Build completes successfully
- [ ] Manual testing successful
- [ ] Error handling works correctly
- [ ] Timeout behavior works correctly

---

## Expected Output

### Files Created
- `src/tools/acp-remote-execute-command.ts`

### Files Modified
- `src/utils/ssh-connection.ts` (timeout support)
- `src/server.ts` (tool registration)
- `src/server-factory.ts` (tool registration)
- `README.md` (documentation)

---

## Example Implementation

**Tool Schema**:
```typescript
export const acpRemoteExecuteCommandTool: Tool = {
  name: 'acp_remote_execute_command',
  description: 'Execute a shell command on the remote machine via SSH',
  inputSchema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'Shell command to execute',
      },
      cwd: {
        type: 'string',
        description: 'Working directory (optional)',
      },
      timeout: {
        type: 'number',
        description: 'Timeout in seconds (default: 30)',
        default: 30,
      },
    },
    required: ['command'],
  },
};
```

---

**Next Task**: [Task 2: Implement acp_remote_read_file](task-2-implement-acp-remote-read-file.md)

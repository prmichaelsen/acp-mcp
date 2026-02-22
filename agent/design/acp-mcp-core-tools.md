# Design: ACP MCP Core Tools

**Concept**: Core MCP tools for remote machine operations via SSH
**Created**: 2026-02-22
**Status**: Design Specification

---

## Overview

This design document specifies the core tools for the acp-mcp server, which provides remote machine access capabilities through SSH. These tools enable users to interact with remote development environments through the agentbase.me platform.

## Problem Statement

Users need to perform common development operations on remote machines:
- Execute arbitrary shell commands
- Read and write files
- List directory contents
- Manage remote development environments

Currently, only file listing is implemented. We need a complete set of tools for full remote development capabilities.

## Solution

Implement four core tools that cover the essential remote operations:

1. **acp_remote_list_files** (✅ Implemented)
2. **acp_remote_execute_command** (🔨 To Implement)
3. **acp_remote_read_file** (🔨 To Implement)
4. **acp_remote_write_file** (🔨 To Implement)

---

## Tool Specifications

### 1. acp_remote_list_files

**Status**: ✅ Implemented (v0.2.0)

**Purpose**: List files and directories in a specified path on the remote machine

**Input Schema**:
```typescript
{
  path: string;        // Required: Directory path to list
  recursive: boolean;  // Optional: List recursively (default: false)
}
```

**Output**: Newline-separated list of files/directories
- Directories end with `/`
- Recursive listings show relative paths (e.g., `subdir/file.txt`)
- Sorted alphabetically

**Implementation**: Uses SSH SFTP to list directory contents

**Example**:
```
Input: { path: "/home/user/project", recursive: false }
Output:
src/
package.json
README.md
tsconfig.json
```

---

### 2. acp_remote_execute_command

**Status**: 🔨 To Implement

**Purpose**: Execute arbitrary shell commands on the remote machine

**Input Schema**:
```typescript
{
  command: string;     // Required: Shell command to execute
  cwd?: string;        // Optional: Working directory (default: home directory)
  timeout?: number;    // Optional: Timeout in seconds (default: 30)
}
```

**Output**: 
```typescript
{
  stdout: string;      // Standard output
  stderr: string;      // Standard error
  exitCode: number;    // Exit code (0 = success)
  timedOut: boolean;   // Whether command timed out
}
```

**Implementation Details**:
- Use `SSHConnectionManager.exec()` method
- Set timeout to prevent hanging
- Capture both stdout and stderr
- Return exit code for error handling
- Support working directory changes

**Security Considerations**:
- Commands run with SSH user's permissions
- No shell injection protection needed (SSH handles this)
- Timeout prevents resource exhaustion
- Consider rate limiting in production

**Example**:
```
Input: { command: "git status", cwd: "/home/user/project" }
Output: {
  stdout: "On branch main\nnothing to commit, working tree clean",
  stderr: "",
  exitCode: 0,
  timedOut: false
}
```

**Use Cases**:
- `git status`, `git commit`, `git push`
- `npm install`, `npm run build`
- `ls -la`, `pwd`, `whoami`
- Any shell command the user needs

---

### 3. acp_remote_read_file

**Status**: 🔨 To Implement

**Purpose**: Read file contents from the remote machine

**Input Schema**:
```typescript
{
  path: string;        // Required: Absolute path to file
  encoding?: string;   // Optional: File encoding (default: 'utf-8')
  maxSize?: number;    // Optional: Max file size in bytes (default: 1MB)
}
```

**Output**: 
```typescript
{
  content: string;     // File contents
  size: number;        // File size in bytes
  encoding: string;    // Encoding used
}
```

**Implementation Details**:
- Use SSH SFTP to read file
- Check file size before reading (prevent memory issues)
- Support different encodings (utf-8, ascii, base64)
- Return error if file doesn't exist or is too large
- Stream large files if needed

**Security Considerations**:
- Limit max file size (default 1MB, configurable)
- Only read files user has permission to access
- Don't read binary files as text (check extension or use base64)

**Error Handling**:
- File not found → Clear error message
- Permission denied → Clear error message
- File too large → Suggest using execute_command with `head` or `tail`

**Example**:
```
Input: { path: "/home/user/project/package.json" }
Output: {
  content: "{\n  \"name\": \"my-project\",\n  \"version\": \"1.0.0\"\n}",
  size: 58,
  encoding: "utf-8"
}
```

---

### 4. acp_remote_write_file

**Status**: 🔨 To Implement

**Purpose**: Write file contents to the remote machine

**Input Schema**:
```typescript
{
  path: string;        // Required: Absolute path to file
  content: string;     // Required: File contents to write
  encoding?: string;   // Optional: File encoding (default: 'utf-8')
  createDirs?: boolean; // Optional: Create parent directories (default: false)
  backup?: boolean;    // Optional: Backup existing file (default: false)
}
```

**Output**: 
```typescript
{
  success: boolean;    // Whether write succeeded
  bytesWritten: number; // Number of bytes written
  backupPath?: string; // Path to backup file (if created)
}
```

**Implementation Details**:
- Use SSH SFTP to write file
- Optionally create parent directories (mkdir -p)
- Optionally backup existing file before overwriting
- Support different encodings
- Atomic write (write to temp file, then rename)

**Security Considerations**:
- Only write files user has permission to write
- Validate path (no directory traversal attacks)
- Limit file size (prevent disk exhaustion)
- Consider rate limiting writes

**Error Handling**:
- Permission denied → Clear error message
- Directory doesn't exist → Suggest using createDirs: true
- Disk full → Clear error message

**Example**:
```
Input: { 
  path: "/home/user/project/.env", 
  content: "API_KEY=secret\nDEBUG=true",
  backup: true
}
Output: {
  success: true,
  bytesWritten: 28,
  backupPath: "/home/user/project/.env.backup"
}
```

---

## Implementation Plan

### Phase 1: Execute Command (Highest Priority)
- Most versatile tool
- Enables git operations, npm commands, etc.
- Unblocks many use cases

### Phase 2: Read File
- Essential for viewing remote files
- Needed for code review, debugging

### Phase 3: Write File
- Completes CRUD operations
- Enables remote file editing

---

## Technical Architecture

### SSH Connection Management

All tools use the existing `SSHConnectionManager`:

```typescript
class SSHConnectionManager {
  async exec(command: string): Promise<string>
  async getSFTP(): Promise<SFTPWrapper>
  async listFiles(path: string): Promise<FileEntry[]>
  // Add new methods as needed
}
```

### Tool Registration

Tools are registered in `server.ts` and `server-factory.ts`:

```typescript
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    acpRemoteListFilesTool,
    acpRemoteExecuteCommandTool,
    acpRemoteReadFileTool,
    acpRemoteWriteFileTool,
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case 'acp_remote_list_files':
      return await handleAcpRemoteListFiles(args, sshConnection);
    case 'acp_remote_execute_command':
      return await handleAcpRemoteExecuteCommand(args, sshConnection);
    case 'acp_remote_read_file':
      return await handleAcpRemoteReadFile(args, sshConnection);
    case 'acp_remote_write_file':
      return await handleAcpRemoteWriteFile(args, sshConnection);
    default:
      throw new Error(`Unknown tool: ${request.params.name}`);
  }
});
```

### File Organization

```
src/tools/
├── acp-remote-list-files.ts       (✅ Exists)
├── acp-remote-execute-command.ts  (🔨 Create)
├── acp-remote-read-file.ts        (🔨 Create)
└── acp-remote-write-file.ts       (🔨 Create)
```

---

## Benefits

1. **Complete Remote Operations**: Users can perform all essential file and command operations
2. **Flexible**: Execute command enables any shell operation
3. **Safe**: Proper error handling and security considerations
4. **Consistent**: All tools follow same patterns and conventions
5. **Well-Documented**: Clear input/output schemas and examples

---

## Trade-offs

### Execute Command vs Specialized Tools

**Decision**: Use `execute_command` for git operations instead of specialized git tools

**Rationale**:
- More flexible (handles any git command)
- Fewer tools to maintain
- Users may need other commands beyond git
- Simpler architecture

**Trade-off**: Less type safety for git operations, but more flexibility

### File Size Limits

**Decision**: Limit file read/write to 1MB by default

**Rationale**:
- Prevents memory exhaustion
- Most source files are < 1MB
- Large files can use execute_command with streaming tools

**Trade-off**: Can't directly read/write very large files, but this is acceptable for typical use cases

---

## Future Enhancements

1. **File Upload/Download**: Binary file transfer
2. **Directory Operations**: Create, delete, move directories
3. **File Permissions**: chmod, chown operations
4. **Process Management**: Start/stop long-running processes
5. **Port Forwarding**: Tunnel connections through SSH
6. **SFTP Batch Operations**: Multiple file operations in one call

---

## Testing Strategy

### Unit Tests
- Mock SSH connections
- Test each tool handler independently
- Test error conditions

### Integration Tests
- Test against real SSH server
- Verify file operations work correctly
- Test timeout handling
- Test permission errors

### End-to-End Tests
- Test through mcp-auth wrapper
- Test with agentbase.me platform
- Verify JWT authentication flow

---

**Status**: Design Specification
**Recommendation**: Implement tools in order: execute_command → read_file → write_file

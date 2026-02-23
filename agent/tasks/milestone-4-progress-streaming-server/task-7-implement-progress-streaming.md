# Task 7: Implement Progress Streaming in Execute Command

**Milestone**: M4 - Progress Streaming - Server Implementation
**Estimated Time**: 4-5 hours
**Dependencies**: Task 6 (SSH stream execution)
**Status**: Not Started
**Priority**: High

---

## Objective

Update `acp_remote_execute_command` tool to support progress streaming when client provides a `progressToken`. Implement graceful fallback to timeout mode when no progress token is provided.

## Context

**Design Reference**: [`agent/design/local.progress-streaming.md`](../../design/local.progress-streaming.md)

**Current State**: Tool uses `execWithTimeout()` and returns all output at once

**Desired State**: Tool detects `progressToken`, streams output with progress notifications, maintains backward compatibility

---

## Steps

### 1. Update Handler Signature

**File**: `src/tools/acp-remote-execute-command.ts`

**Actions**:
- Add `extra?: { progressToken?: string | number }` parameter
- Import server instance for sending notifications
- Add type definitions for progress params

### 2. Add Progress Detection Logic

**Actions**:
- Check if `extra?.progressToken` exists
- If yes: call `executeWithProgress()`
- If no: use existing `execWithTimeout()` (fallback)

### 3. Implement executeWithProgress() Function

**Actions**:
- Call `sshConnection.execStream()`
- Set up stdout data handler
- Send progress notification for each chunk
- Collect full output for final result
- Handle stderr separately (no progress)
- Wait for exit code
- Return structured result

**Code Pattern**:
```typescript
async function executeWithProgress(
  command: string,
  cwd: string | undefined,
  sshConnection: SSHConnectionManager,
  progressToken: string | number
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const { stream, stderr: stderrStream, exitCode } = await sshConnection.execStream(command, cwd);
  
  let stdout = '';
  let stderr = '';
  let bytesReceived = 0;

  stream.on('data', (chunk: Buffer) => {
    const text = chunk.toString();
    stdout += text;
    bytesReceived += chunk.length;
    
    // Send progress notification
    server.notification({
      method: 'notifications/progress',
      params: {
        progressToken,
        progress: bytesReceived,
        total: undefined,
        message: text,
      },
    });
  });

  stderrStream.on('data', (chunk: Buffer) => {
    stderr += chunk.toString();
  });

  const finalExitCode = await exitCode;

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        stdout,
        stderr,
        exitCode: finalExitCode,
        timedOut: false,
        streamed: true,
      }, null, 2),
    }],
  };
}
```

### 4. Add Rate Limiting

**Actions**:
- Limit progress notifications to max 10/second
- Batch small chunks
- Track last notification time
- Only send if enough time elapsed

**Code Pattern**:
```typescript
let lastProgressTime = 0;
const MIN_PROGRESS_INTERVAL = 100; // 100ms

stream.on('data', (chunk: Buffer) => {
  stdout += chunk.toString();
  bytesReceived += chunk.length;
  
  const now = Date.now();
  if (now - lastProgressTime >= MIN_PROGRESS_INTERVAL) {
    server.notification({ /* ... */ });
    lastProgressTime = now;
  }
});
```

### 5. Add Error Handling

**Actions**:
- Handle stream errors
- Handle connection loss
- Send error via progress notification
- Return error in final result

### 6. Update Tool Schema

**Actions**:
- Update description to mention progress support
- Note that timeout is ignored when streaming
- Add examples of progress usage

### 7. Test Implementation

**Actions**:
- Build project
- Test with progressToken (streaming mode)
- Test without progressToken (fallback mode)
- Test with long-running command
- Test with command that fails
- Test error scenarios

---

## Verification

- [ ] Handler accepts `extra` parameter
- [ ] Detects `progressToken` correctly
- [ ] Calls `executeWithProgress()` when token provided
- [ ] Falls back to `execWithTimeout()` when no token
- [ ] Sends progress notifications for stdout chunks
- [ ] Rate limiting prevents notification spam
- [ ] Collects full output for final result
- [ ] Handles errors gracefully
- [ ] TypeScript compiles without errors
- [ ] Build completes successfully
- [ ] Both modes tested and working

---

## Expected Output

### Files Modified
- `src/tools/acp-remote-execute-command.ts` - Progress streaming implementation

### New Function
```typescript
async function executeWithProgress(
  command: string,
  cwd: string | undefined,
  sshConnection: SSHConnectionManager,
  progressToken: string | number
): Promise<{ content: Array<{ type: string; text: string }> }>
```

---

**Next Task**: [Task 8: Update Server Request Handlers](task-8-update-server-handlers.md)

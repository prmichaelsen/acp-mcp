# Task 6: Add SSH Stream Execution Method

**Milestone**: M4 - Progress Streaming - Server Implementation
**Estimated Time**: 3-4 hours
**Dependencies**: None
**Status**: Not Started
**Priority**: High

---

## Objective

Add a streaming execution method to SSHConnectionManager that returns streams instead of buffered output. This enables real-time progress notifications for long-running commands.

## Context

**Design Reference**: [`agent/design/local.progress-streaming.md`](../../design/local.progress-streaming.md)

**Current State**: `SSHConnectionManager.execWithTimeout()` buffers all output and returns it at the end

**Desired State**: New `execStream()` method that returns stdout/stderr streams and exit code promise

**Why This Task**: Foundation for progress streaming - must have streams before we can send progress notifications

---

## Steps

### 1. Add execStream() Method Signature

**File**: `src/utils/ssh-connection.ts`

**Actions**:
- Add new method after `execWithTimeout()`
- Return type: `Promise<{ stream: NodeJS.ReadableStream; stderr: NodeJS.ReadableStream; exitCode: Promise<number> }>`
- Parameters: `command: string`, `cwd?: string`

### 2. Implement Stream Execution

**Actions**:
- Connect to SSH if not connected
- Build full command (with `cd` if cwd provided)
- Call `this.client.exec()` to get stream
- Return stream, stderr stream, and exit code promise
- Add comprehensive logging

**Code Pattern**:
```typescript
async execStream(
  command: string,
  cwd?: string
): Promise<{
  stream: NodeJS.ReadableStream;
  stderr: NodeJS.ReadableStream;
  exitCode: Promise<number>;
}> {
  if (!this.connected) {
    await this.connect();
  }

  const fullCommand = cwd ? `cd "${cwd}" && ${command}` : command;
  logger.sshCommand(fullCommand, cwd);

  return new Promise((resolve, reject) => {
    this.client.exec(fullCommand, (err, stream) => {
      if (err) {
        logger.error('SSH exec failed', { command: fullCommand, error: err.message });
        reject(err);
        return;
      }

      const exitCodePromise = new Promise<number>((resolveExit) => {
        stream.on('close', (code: number) => {
          logger.debug('SSH stream closed', { command: fullCommand, exitCode: code });
          resolveExit(code);
        });
      });

      resolve({
        stream: stream,
        stderr: stream.stderr,
        exitCode: exitCodePromise,
      });
    });
  });
}
```

### 3. Add Error Handling

**Actions**:
- Handle stream errors
- Handle connection loss during streaming
- Log all error conditions
- Ensure streams are properly closed

### 4. Add Stream Event Logging

**Actions**:
- Log when stream starts
- Log when stream closes
- Log exit code
- Log any errors

### 5. Test Method

**Actions**:
- Build project: `npm run build`
- Verify TypeScript compiles
- Manual test with simple command
- Test with command that produces output
- Test with command that fails
- Test with long-running command

---

## Verification

- [ ] `execStream()` method added to SSHConnectionManager
- [ ] Returns correct type (stream, stderr, exitCode promise)
- [ ] Handles working directory changes
- [ ] Logs command execution
- [ ] Handles errors gracefully
- [ ] TypeScript compiles without errors
- [ ] Build completes successfully
- [ ] Manual testing successful

---

## Expected Output

### Files Modified
- `src/utils/ssh-connection.ts` - Added `execStream()` method

### Method Signature
```typescript
async execStream(
  command: string,
  cwd?: string
): Promise<{
  stream: NodeJS.ReadableStream;
  stderr: NodeJS.ReadableStream;
  exitCode: Promise<number>;
}>
```

---

**Next Task**: [Task 7: Implement Progress Streaming](task-7-implement-progress-streaming.md)

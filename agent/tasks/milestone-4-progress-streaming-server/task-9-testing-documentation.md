# Task 9: Testing and Documentation

**Milestone**: M4 - Progress Streaming - Server Implementation
**Estimated Time**: 3-4 hours
**Dependencies**: Tasks 6, 7, 8 (All implementation complete)
**Status**: Not Started
**Priority**: High

---

## Objective

Add comprehensive tests for progress streaming functionality and update all documentation for v0.7.0 release.

## Context

**Design Reference**: [`agent/design/local.progress-streaming.md`](../../design/local.progress-streaming.md)

**Current State**: Implementation complete, needs testing and documentation

**Desired State**: Full test coverage, updated documentation, ready for v0.7.0 release

---

## Steps

### 1. Write Unit Tests

**File**: Create `src/utils/ssh-connection.test.ts` (if doesn't exist)

**Actions**:
- Test `execStream()` returns correct types
- Test stream emits data events
- Test exit code promise resolves
- Test error handling
- Mock SSH client for tests

### 2. Write Integration Tests

**File**: Create `src/tools/acp-remote-execute-command.test.ts`

**Actions**:
- Test with `progressToken` (streaming mode)
- Test without `progressToken` (fallback mode)
- Test progress notifications are sent
- Test rate limiting works
- Test error scenarios
- Use real SSH connection (or mock)

### 3. Manual Testing

**Actions**:
- Test with simple command: `echo "test"`
- Test with long command: `for i in 1 2 3 4 5; do echo "Line $i"; sleep 0.5; done`
- Test with failing command
- Test with very long output
- Test connection loss scenario

### 4. Update README.md

**File**: `README.md`

**Actions**:
- Add section on progress streaming support
- Document that progress requires MCP SDK v1.26.0+
- Add examples of progress usage
- Note client requirements
- Update tool description for `acp_remote_execute_command`

**Example Addition**:
```markdown
### Progress Streaming (v0.7.0+)

`acp_remote_execute_command` supports real-time progress streaming for long-running commands. When a client provides a `progressToken`, the tool will send progress notifications with live output.

**Requirements**:
- MCP SDK v1.26.0+ (server and client)
- Client must provide `progressToken` in request
- Client must handle `onprogress` callback

**Example** (client-side):
\`\`\`typescript
const result = await client.request({
  method: 'tools/call',
  params: {
    name: 'acp_remote_execute_command',
    arguments: { command: 'npm run build' }
  }
}, {
  progressToken: 'build-123',
  onprogress: (progress) => {
    console.log(progress.message); // Live output
  }
});
\`\`\`

**Fallback**: If no `progressToken` provided, uses timeout-based execution (backward compatible).
```

### 5. Update CHANGELOG.md

**File**: `CHANGELOG.md`

**Actions**:
- Add v0.7.0 section
- Document progress streaming feature
- Note backward compatibility
- List all changes

**Example Entry**:
```markdown
## [0.7.0] - 2026-02-24

### Added
- **Progress Streaming** for `acp_remote_execute_command` tool
  - Real-time output streaming for long-running commands
  - Uses MCP SDK's native progress notification system
  - Graceful fallback to timeout mode for clients without progress support
  - Rate limiting prevents notification spam (max 10/second)
  - Supports commands like `npm run build`, `npm run dev`, `npm test`

### Changed
- `acp_remote_execute_command` now accepts optional `progressToken` parameter
- Added `execStream()` method to SSHConnectionManager
- Server handlers now pass `extra` parameter to tool handlers

### Technical Details
- Requires MCP SDK v1.26.0+ for progress support
- Progress notifications sent via `notifications/progress` method
- Backward compatible - existing clients unaffected
- No breaking changes to API
```

### 6. Update package.json

**File**: `package.json`

**Actions**:
- Bump version to 0.7.0
- Verify dependencies are correct

### 7. Build and Verify

**Actions**:
- Run `npm run build`
- Verify TypeScript compiles
- Run tests: `npm test`
- Verify all tests pass
- Check for any warnings

---

## Verification

- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Manual testing completed successfully
- [ ] README.md updated with progress documentation
- [ ] CHANGELOG.md updated for v0.7.0
- [ ] package.json version bumped to 0.7.0
- [ ] TypeScript compiles without errors
- [ ] Build completes successfully
- [ ] All tests pass
- [ ] No warnings or errors

---

## Expected Output

### Files Created
- `src/utils/ssh-connection.test.ts` - Unit tests (if doesn't exist)
- `src/tools/acp-remote-execute-command.test.ts` - Integration tests (if doesn't exist)

### Files Modified
- `README.md` - Progress streaming documentation
- `CHANGELOG.md` - v0.7.0 entry
- `package.json` - Version bump to 0.7.0

### Test Results
```
✓ SSH stream execution tests (5 passed)
✓ Progress streaming tests (8 passed)
✓ Fallback mode tests (3 passed)
✓ Error handling tests (4 passed)

Total: 20 tests passed
```

---

**Next Milestone**: M5 - Progress Streaming - Wrapper Integration (mcp-auth)
**Related Design**: [`agent/design/local.progress-streaming.md`](../../design/local.progress-streaming.md)

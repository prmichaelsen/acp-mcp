# Milestone 4: Progress Streaming - Server Implementation (acp-mcp)

**Goal**: Implement server-side progress streaming support in acp-mcp
**Duration**: 1 week
**Dependencies**: None
**Status**: Not Started
**Project**: acp-mcp (this project)

---

## Overview

Implement the server-side infrastructure for real-time progress streaming in acp-mcp. This includes SSH streaming execution, progress notification sending, and graceful fallback for clients that don't support progress.

This milestone focuses ONLY on the acp-mcp server implementation. Client-side changes (mcp-auth, agentbase.me) are separate milestones.

## Deliverables

- ✅ SSH streaming execution method (`execStream()`)
- ✅ Progress notification support in `acp_remote_execute_command`
- ✅ Graceful fallback to timeout mode
- ✅ Rate limiting for progress notifications
- ✅ Comprehensive error handling
- ✅ Unit and integration tests
- ✅ Documentation updates

## Success Criteria

- [ ] `execStream()` method implemented in SSHConnectionManager
- [ ] `acp_remote_execute_command` sends progress notifications when `progressToken` provided
- [ ] Falls back to timeout mode when no `progressToken`
- [ ] Progress notifications include stdout chunks
- [ ] Rate limiting prevents notification spam
- [ ] All existing tests still pass
- [ ] New tests for streaming added
- [ ] TypeScript compiles without errors
- [ ] Build completes successfully
- [ ] README.md documents progress support
- [ ] CHANGELOG.md updated for v0.7.0
- [ ] Version bumped to 0.7.0

## Key Files to Create

- None (all modifications to existing files)

## Key Files to Modify

- `src/utils/ssh-connection.ts` - Add `execStream()` method
- `src/tools/acp-remote-execute-command.ts` - Add progress streaming
- `src/server.ts` - Pass `extra` parameter to handlers
- `src/server-factory.ts` - Pass `extra` parameter to handlers
- `README.md` - Document progress support
- `CHANGELOG.md` - v0.7.0 entry
- `package.json` - Version bump

---

## Tasks

### Task 6: Add SSH Stream Execution Method
**File**: `agent/tasks/milestone-4-progress-streaming-server/task-6-add-ssh-stream-execution.md`
**Estimated**: 3-4 hours
**Priority**: High

### Task 7: Implement Progress Streaming in Execute Command
**File**: `agent/tasks/milestone-4-progress-streaming-server/task-7-implement-progress-streaming.md`
**Estimated**: 4-5 hours
**Priority**: High

### Task 8: Update Server Request Handlers
**File**: `agent/tasks/milestone-4-progress-streaming-server/task-8-update-server-handlers.md`
**Estimated**: 1-2 hours
**Priority**: Medium

### Task 9: Testing and Documentation
**File**: `agent/tasks/milestone-4-progress-streaming-server/task-9-testing-documentation.md`
**Estimated**: 3-4 hours
**Priority**: High

---

**Next Milestone**: M5 - Progress Streaming - Wrapper Integration (mcp-auth)
**Blockers**: None
**Related Design**: [`agent/design/local.progress-streaming.md`](../design/local.progress-streaming.md)

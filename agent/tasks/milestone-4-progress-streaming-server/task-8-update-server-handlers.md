# Task 8: Update Server Request Handlers

**Milestone**: M4 - Progress Streaming - Server Implementation
**Estimated Time**: 1-2 hours
**Dependencies**: Task 7 (Progress streaming implementation)
**Status**: Not Started
**Priority**: Medium

---

## Objective

Update server request handlers in both `server.ts` and `server-factory.ts` to pass the `extra` parameter (containing `progressToken`) to tool handlers.

## Context

**Design Reference**: [`agent/design/local.progress-streaming.md`](../../design/local.progress-streaming.md)

**Current State**: Handlers don't pass `extra` parameter to tools

**Desired State**: Handlers pass `extra` to `acp_remote_execute_command` handler

---

## Steps

### 1. Update server.ts Handler

**File**: `src/server.ts`

**Actions**:
- Modify `CallToolRequestSchema` handler signature to accept `extra` parameter
- Pass `extra` to `handleAcpRemoteExecuteCommand()`
- Keep other tool handlers unchanged (they don't need progress)

**Code Pattern**:
```typescript
server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
  const startTime = Date.now();
  logger.toolInvoked(request.params.name, request.params.arguments);
  
  try {
    let result;
    
    if (request.params.name === 'acp_remote_execute_command') {
      result = await handleAcpRemoteExecuteCommand(
        request.params.arguments,
        sshConnection,
        extra  // Pass extra with progressToken
      );
    } else if (request.params.name === 'acp_remote_list_files') {
      result = await handleAcpRemoteListFiles(request.params.arguments, sshConnection);
    }
    // ... other tools
    
    return result;
  } catch (error) {
    logger.toolFailed(request.params.name, error as Error, request.params.arguments);
    throw error;
  }
});
```

### 2. Update server-factory.ts Handler

**File**: `src/server-factory.ts`

**Actions**:
- Same changes as server.ts
- Ensure consistency between both files

### 3. Verify No Breaking Changes

**Actions**:
- Confirm other tools still work
- Verify `extra` parameter is optional
- Test that undefined `extra` doesn't break anything

### 4. Test Both Server Modes

**Actions**:
- Build project
- Test standalone server (server.ts)
- Test factory server (server-factory.ts)
- Verify both pass `extra` correctly

---

## Verification

- [ ] server.ts handler updated
- [ ] server-factory.ts handler updated
- [ ] `extra` parameter passed to execute_command handler
- [ ] Other tools unaffected
- [ ] TypeScript compiles without errors
- [ ] Build completes successfully
- [ ] Both server modes tested

---

## Expected Output

### Files Modified
- `src/server.ts` - Pass `extra` to handler
- `src/server-factory.ts` - Pass `extra` to handler

---

**Next Task**: [Task 9: Testing and Documentation](task-9-testing-documentation.md)

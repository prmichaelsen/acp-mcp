# Milestone 2: Bug Fixes and Production Readiness

**Goal**: Fix critical bugs and prepare acp-mcp for production deployment to agentbase.me
**Duration**: 1 week
**Dependencies**: Milestone 1 (Core Tools Implementation)
**Status**: In Progress

---

## Overview

This milestone focuses on resolving critical bugs discovered during initial testing and ensuring the acp-mcp server is production-ready for deployment to the agentbase.me platform. The primary focus is fixing the file reading bug that prevents agents from accessing remote files.

## Deliverables

- 🐛 Fix for GitHub Issue #1: acp_remote_read_file "file not found" bug
- ✅ Enhanced error handling and logging
- ✅ Regression tests to prevent future issues
- ✅ Production deployment verification
- ✅ End-to-end testing with agentbase.me platform

## Success Criteria

- [ ] GitHub Issue #1 resolved and closed
- [ ] Files confirmed by `acp_remote_list_files` can be reliably read by `acp_remote_read_file`
- [ ] Enhanced logging provides clear diagnostics for debugging
- [ ] Regression tests added and passing
- [ ] All existing tests still pass
- [ ] TypeScript compiles without errors
- [ ] Build completes successfully
- [ ] Version bumped to 0.4.2 (or higher if needed)
- [ ] Successfully deployed to agentbase.me platform
- [ ] End-to-end testing confirms all tools work correctly
- [ ] Documentation updated with any path handling requirements

## Key Files to Create

- `src/utils/ssh-connection.test.ts` - Regression tests for SSH operations
- `agent/tasks/task-4-fix-read-file-not-found-bug.md` - Task document (✅ Created)

## Key Files to Modify

- `src/utils/ssh-connection.ts` - Bug fix and enhanced logging
- `src/tools/acp-remote-read-file.ts` - Improved error handling (if needed)
- `README.md` - Document path handling requirements
- `CHANGELOG.md` - Document bug fix in v0.4.2
- `package.json` - Version bump to 0.4.2
- `agent/progress.yaml` - Track progress

## Tasks

### Task 4: Fix acp_remote_read_file "File Not Found" Bug (🚨 CRITICAL)

**Status**: Not Started
**Priority**: Critical
**Estimated Time**: 3-4 hours
**GitHub Issue**: [#1](https://github.com/prmichaelsen/acp-mcp/issues/1)

**Description**: Investigate and fix the bug where `acp_remote_read_file` returns "file not found" errors for paths that exist and are confirmed by `acp_remote_list_files`.

**Key Actions**:
1. Reproduce bug locally
2. Add enhanced debug logging
3. Compare list vs read path handling
4. Test SFTP operations directly
5. Implement fix based on findings
6. Add regression tests
7. Update documentation
8. Version bump and release

---

## Technical Details

### Root Cause Investigation

The bug manifests as:
- `acp_remote_list_files` successfully lists files in a directory
- `acp_remote_read_file` fails with "file not found" for those same files
- Inconsistent behavior suggests path handling or SFTP operation differences

**Possible Causes**:
1. Path resolution differences between list and read operations
2. SFTP `stat()` call failing with misleading error
3. Working directory context issues
4. Symbolic link handling problems
5. Race conditions
6. Path normalization inconsistencies

### Testing Strategy

**Unit Tests**:
- Test path normalization
- Test SFTP operations in isolation
- Mock SSH connections for edge cases

**Integration Tests**:
- Test against real SSH server
- Verify list → read workflow
- Test various path formats

**End-to-End Tests**:
- Deploy to agentbase.me staging
- Test with actual remote development environments
- Verify all tools work together

---

## Dependencies

**External**:
- Access to agentbase.me platform for testing
- Test SSH server for reproduction
- mcp-auth wrapper for integration testing

**Internal**:
- Milestone 1 completed (all core tools implemented)
- Build and test infrastructure in place

---

## Risks and Mitigation

### Risk 1: Bug Cannot Be Reproduced Locally
**Mitigation**: Test on actual agentbase.me infrastructure, add extensive logging to production

### Risk 2: Fix Breaks Other Functionality
**Mitigation**: Comprehensive regression testing, maintain all existing tests

### Risk 3: Multiple Root Causes
**Mitigation**: Systematic debugging approach, fix issues incrementally

---

## Timeline

**Week 1** (2026-02-23 to 2026-02-28):
- Day 1: Reproduce bug, add logging, identify root cause
- Day 2: Implement fix, add tests
- Day 3: Documentation, version bump, deploy to staging
- Day 4: End-to-end testing on agentbase.me
- Day 5: Production deployment, monitor for issues

---

## Success Metrics

- **Bug Resolution**: GitHub Issue #1 closed
- **Reliability**: 100% success rate for list → read workflow
- **Test Coverage**: Regression tests prevent recurrence
- **Deployment**: Successfully deployed to production
- **User Impact**: Zero reports of file reading issues

---

**Next Milestone**: M3 - Advanced Features and Optimizations (TBD)
**Blockers**: None (critical path)
**Owner**: Development Team
**Stakeholders**: agentbase.me platform users, development team

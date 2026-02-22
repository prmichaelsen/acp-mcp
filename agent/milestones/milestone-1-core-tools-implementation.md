# Milestone 1: Core Tools Implementation

**Goal**: Implement the remaining core MCP tools for remote machine operations
**Duration**: 1-2 weeks
**Dependencies**: None (foundation already complete)
**Status**: Not Started

---

## Overview

Complete the implementation of core acp-mcp tools to enable full remote development capabilities. The SSH infrastructure and first tool (`acp_remote_list_files`) are already implemented. This milestone focuses on adding the three remaining essential tools.

## Deliverables

- ✅ `acp_remote_list_files` - Already implemented
- 🔨 `acp_remote_execute_command` - Execute shell commands remotely
- 🔨 `acp_remote_read_file` - Read file contents from remote machine
- 🔨 `acp_remote_write_file` - Write file contents to remote machine

## Success Criteria

- [ ] All four core tools implemented and tested
- [ ] TypeScript compiles without errors
- [ ] Build completes successfully
- [ ] Tools work correctly with SSH connections
- [ ] Error handling implemented for all tools
- [ ] Documentation updated (README, CHANGELOG)
- [ ] Version bumped to 0.3.0
- [ ] Ready for deployment with mcp-auth wrapper

## Key Files to Create

- `src/tools/acp-remote-execute-command.ts`
- `src/tools/acp-remote-read-file.ts`
- `src/tools/acp-remote-write-file.ts`

## Key Files to Modify

- `src/server.ts` - Register new tools
- `src/server-factory.ts` - Register new tools
- `src/utils/ssh-connection.ts` - Add helper methods if needed
- `README.md` - Document new tools
- `CHANGELOG.md` - Document changes
- `package.json` - Version bump

---

**Next Milestone**: Deployment and Integration (M2)
**Blockers**: None

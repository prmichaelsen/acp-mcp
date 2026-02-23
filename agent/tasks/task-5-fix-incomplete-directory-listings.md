# Task 5: Fix Incomplete Directory Listings (GitHub Issue #2)

**Milestone**: M3 - Bug Fixes and Enhancements
**Estimated Time**: 3-4 hours
**Dependencies**: None
**Status**: In Progress
**Priority**: 🚨 CRITICAL
**GitHub Issue**: [#2](https://github.com/prmichaelsen/acp-mcp/issues/2)

---

## Objective

Fix the critical bug where `acp_remote_list_files` returns incomplete directory listings, missing hidden files and directories. Implement comprehensive file listing with full metadata (permissions, timestamps, size, etc.) using a hybrid approach.

## Context

**Problem**: SFTP `readdir()` filters out hidden files (starting with `.`) by default, causing incomplete listings.

**Root Cause**: SFTP protocol behavior, not a library bug. SFTP `readdir()` excludes hidden files per protocol specification.

**Solution**: Use shell `ls` command to get ALL filenames (including hidden), then SFTP `stat()` to get rich metadata for each file.

**Design Reference**: See [`agent/reports/github-issue-2-incomplete-directory-listings.md`](../reports/github-issue-2-incomplete-directory-listings.md)

---

## Steps

### 1. Update FileEntry Interface

Create comprehensive interface for file metadata.

**File**: `src/types/file-entry.ts` (create new)

**Actions**:
- Define `FileEntry` interface with all metadata fields
- Include permissions, timestamps, size, ownership
- Export helper functions for permission conversion

### 2. Update SSHConnectionManager.listFiles()

Implement hybrid approach: shell + SFTP.

**File**: `src/utils/ssh-connection.ts`

**Actions**:
- Add `includeHidden` parameter (default: `true`)
- Use shell `ls -A` to get all filenames
- Use SFTP `stat()` to get metadata for each file
- Return comprehensive `FileEntry[]` with all metadata
- Add fallback to SFTP `readdir()` if shell fails
- Add comprehensive logging

### 3. Update Tool Schema

Add `includeHidden` parameter to tool.

**File**: `src/tools/acp-remote-list-files.ts`

**Actions**:
- Add `includeHidden` to input schema
- Update tool description
- Pass parameter to `listFiles()`
- Update recursive listing to use parameter

### 4. Update Tool Output Format

Return structured JSON with metadata.

**File**: `src/tools/acp-remote-list-files.ts`

**Actions**:
- Change output from simple text to structured JSON
- Include all file metadata in response
- Format for easy parsing by agents

### 5. Update Documentation

Document new functionality and parameters.

**Files**: `README.md`, `CHANGELOG.md`

**Actions**:
- Document `includeHidden` parameter
- Document new output format with metadata
- Add examples of usage
- Update CHANGELOG for v0.6.0

### 6. Test Implementation

Verify fix works correctly.

**Actions**:
- Build project: `npm run build`
- Test with hidden files directory
- Verify all files returned
- Verify metadata is correct
- Test recursive listing
- Test with `includeHidden=false`

---

## Verification

- [ ] `FileEntry` interface created with all fields
- [ ] `SSHConnectionManager.listFiles()` updated with hybrid approach
- [ ] `includeHidden` parameter added to tool schema
- [ ] Tool returns structured JSON with metadata
- [ ] README.md updated with new parameter
- [ ] CHANGELOG.md updated for v0.6.0
- [ ] TypeScript compiles without errors
- [ ] Build completes successfully
- [ ] Manual testing shows all files including hidden
- [ ] Metadata fields populated correctly
- [ ] Recursive listing works with hidden files
- [ ] Fallback to SFTP works if shell fails

---

## Expected Output

### Files Created
- `src/types/file-entry.ts` - FileEntry interface and helpers

### Files Modified
- `src/utils/ssh-connection.ts` - Hybrid listing implementation
- `src/tools/acp-remote-list-files.ts` - Updated schema and output
- `README.md` - Documentation updates
- `CHANGELOG.md` - v0.6.0 entry
- `package.json` - Version bump to 0.6.0

---

## Implementation Details

### FileEntry Interface
```typescript
export interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory' | 'symlink' | 'other';
  size: number;
  permissions: {
    mode: number;
    string: string;
    owner: { read: boolean; write: boolean; execute: boolean };
    group: { read: boolean; write: boolean; execute: boolean };
    others: { read: boolean; write: boolean; execute: boolean };
  };
  owner: {
    uid: number;
    gid: number;
  };
  timestamps: {
    accessed: string;
    modified: string;
  };
}
```

### Hybrid Approach
1. Execute `ls -A -1` to get all filenames (including hidden)
2. For each filename, call SFTP `stat()` to get metadata
3. Construct `FileEntry` objects with complete information
4. Return structured array

---

**Next Task**: Task 6 - Deploy v0.6.0 to npm

# Task 4: Fix acp_remote_read_file "File Not Found" Bug

**Milestone**: M2 - Bug Fixes and Production Readiness
**Estimated Time**: 3-4 hours
**Dependencies**: None (critical bug fix)
**Status**: Not Started
**Priority**: 🚨 CRITICAL
**GitHub Issue**: [#1 - File Access Issue](https://github.com/prmichaelsen/acp-mcp/issues/1)

---

## Objective

Investigate and fix the critical bug where [`acp_remote_read_file`](../../src/tools/acp-remote-read-file.ts) returns "file not found" errors for paths that exist and are confirmed by [`acp_remote_list_files`](../../src/tools/acp-remote-list-files.ts).

This bug prevents agents from reading files on remote machines, breaking the core functionality of the acp-mcp server and blocking production deployment to agentbase.me platform.

---

## Context

**GitHub Issue #1** reports that after successfully listing files in a directory (e.g., `/home/prmichaelsen/agentbase.me`), attempting to read those files (e.g., `/home/prmichaelsen/agentbase.me/package.json`) results in "file not found" errors.

**Impact**:
- Breaks agent's ability to inspect source code on remote machines
- Inconsistent behavior between list and read operations
- Blocks production deployment to agentbase.me platform
- Affects all users trying to use remote development features

**Possible Root Causes**:
1. Path resolution issue in [`SSHConnectionManager.readFile()`](../../src/utils/ssh-connection.ts:207)
2. SFTP `stat()` call failing silently or with wrong error
3. Working directory context not properly set
4. Symbolic link handling issue
5. Race condition between list and read operations
6. Permissions problem (though list works)
7. Path normalization differences between list and read

---

## Steps

### 1. Reproduce the Bug Locally

Set up a test environment to reproduce the issue:

**Actions**:
- Configure SSH connection to a test remote machine
- Create test directory structure with known files
- Run `acp_remote_list_files` on test directory
- Attempt to read files returned by list operation
- Document exact error messages and behavior

**Expected Outcome**: Bug reproduced locally with clear error messages

### 2. Add Enhanced Debug Logging

Add comprehensive logging to diagnose the issue:

**File**: [`src/utils/ssh-connection.ts`](../../src/utils/ssh-connection.ts:207)

**Add logging to `readFile()` method**:
```typescript
async readFile(
  path: string,
  encoding: string = 'utf-8',
  maxSize: number = 1048576
): Promise<{ content: string; size: number; encoding: string }> {
  const startTime = Date.now();
  logger.debug('readFile() called', { 
    path, 
    encoding, 
    maxSize,
    pathType: typeof path,
    pathLength: path.length,
    pathBytes: Buffer.from(path).toString('hex')
  });
  
  const sftp = await this.getSFTP();
  logger.debug('SFTP connection obtained', { connected: this.connected });

  return new Promise((resolve, reject) => {
    // Log before stat call
    logger.debug('Calling sftp.stat()', { path });
    
    sftp.stat(path, (err, stats) => {
      if (err) {
        logger.error('SFTP stat() failed', { 
          path, 
          error: err.message,
          errorCode: err.code,
          errorStack: err.stack
        });
        reject(new Error(`File not found or inaccessible: ${path}`));
        return;
      }

      logger.debug('SFTP stat() succeeded', { 
        path, 
        size: stats.size,
        mode: stats.mode,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory()
      });

      // ... rest of method
    });
  });
}
```

**Expected Outcome**: Detailed logs showing exactly where the failure occurs

### 3. Compare List vs Read Path Handling

Analyze how paths are handled differently:

**Actions**:
- Review [`listFiles()`](../../src/utils/ssh-connection.ts:184) method
- Compare path handling with [`readFile()`](../../src/utils/ssh-connection.ts:207)
- Check if list uses different SFTP methods
- Verify path normalization in both methods
- Test with absolute vs relative paths

**Expected Outcome**: Identify any path handling differences

### 4. Test SFTP Operations Directly

Test SFTP operations in isolation:

**Create test script**:
```typescript
// test-sftp.ts
import { SSHConnectionManager } from './src/utils/ssh-connection.js';

async function testSFTP() {
  const ssh = new SSHConnectionManager({
    host: process.env.SSH_HOST!,
    port: 22,
    username: process.env.SSH_USERNAME!,
    privateKey: process.env.SSH_PRIVATE_KEY!
  });

  await ssh.connect();
  
  // Test list
  const files = await ssh.listFiles('/home/prmichaelsen/agentbase.me');
  console.log('Files:', files);
  
  // Test stat on first file
  const sftp = await ssh.getSFTP();
  const testPath = '/home/prmichaelsen/agentbase.me/package.json';
  
  sftp.stat(testPath, (err, stats) => {
    if (err) {
      console.error('Stat failed:', err);
    } else {
      console.log('Stat succeeded:', stats);
    }
  });
  
  // Test readFile
  try {
    const result = await ssh.readFile(testPath);
    console.log('Read succeeded:', result.size, 'bytes');
  } catch (error) {
    console.error('Read failed:', error);
  }
  
  ssh.disconnect();
}

testSFTP();
```

**Expected Outcome**: Isolated test reveals exact failure point

### 5. Implement Fix

Based on findings, implement the appropriate fix:

**Possible Fixes**:

**Fix A: Path Normalization**
```typescript
async readFile(path: string, ...): Promise<...> {
  // Normalize path (remove trailing slashes, resolve .., etc.)
  const normalizedPath = path.replace(/\/+/g, '/').replace(/\/$/, '');
  logger.debug('Path normalized', { original: path, normalized: normalizedPath });
  
  // Use normalized path for SFTP operations
  sftp.stat(normalizedPath, (err, stats) => {
    // ...
  });
}
```

**Fix B: Better Error Handling**
```typescript
sftp.stat(path, (err, stats) => {
  if (err) {
    // Provide more detailed error message
    const errorDetails = {
      path,
      errorCode: err.code,
      errorMessage: err.message,
      suggestion: 'Verify file exists and you have read permissions'
    };
    logger.error('File stat failed', errorDetails);
    reject(new Error(`Failed to access file: ${JSON.stringify(errorDetails)}`));
    return;
  }
  // ...
});
```

**Fix C: Working Directory Context**
```typescript
// If paths are relative, prepend working directory
async readFile(path: string, ...): Promise<...> {
  let fullPath = path;
  if (!path.startsWith('/')) {
    // Get home directory or working directory
    const homeDir = await this.exec('pwd');
    fullPath = `${homeDir.trim()}/${path}`;
    logger.debug('Resolved relative path', { original: path, full: fullPath });
  }
  // ...
}
```

**Expected Outcome**: Bug fixed with appropriate solution

### 6. Add Regression Tests

Create tests to prevent this bug from recurring:

**File**: `src/utils/ssh-connection.test.ts`

```typescript
describe('SSHConnectionManager', () => {
  describe('readFile', () => {
    it('should read files that exist per listFiles', async () => {
      const ssh = new SSHConnectionManager(testConfig);
      await ssh.connect();
      
      // List files
      const files = await ssh.listFiles('/test/directory');
      expect(files.length).toBeGreaterThan(0);
      
      // Read first file
      const firstFile = files[0];
      const fullPath = `/test/directory/${firstFile.name}`;
      
      const result = await ssh.readFile(fullPath);
      expect(result.content).toBeDefined();
      expect(result.size).toBeGreaterThan(0);
    });
    
    it('should handle various path formats', async () => {
      const ssh = new SSHConnectionManager(testConfig);
      await ssh.connect();
      
      const paths = [
        '/absolute/path/file.txt',
        '/path/with//double//slashes.txt',
        '/path/with/trailing/slash/',
      ];
      
      for (const path of paths) {
        // Test should not throw
        await expect(ssh.readFile(path)).resolves.toBeDefined();
      }
    });
  });
});
```

**Expected Outcome**: Tests pass and prevent regression

### 7. Update Documentation

Document the fix and any path handling requirements:

**Update**: [`README.md`](../../README.md)
- Document path format requirements for `acp_remote_read_file`
- Add examples of correct path usage
- Note any limitations or edge cases

**Update**: [`CHANGELOG.md`](../../CHANGELOG.md)
- Add entry for v0.4.2 with bug fix details
- Reference GitHub Issue #1

**Expected Outcome**: Users understand how to use the tool correctly

### 8. Version Bump and Release

Prepare for release:

**Actions**:
- Update version in [`package.json`](../../package.json) to `0.4.2`
- Update [`CHANGELOG.md`](../../CHANGELOG.md) with fix details
- Build and test: `npm run build && npm test`
- Commit changes with message: `fix: resolve acp_remote_read_file file not found bug (fixes #1)`
- Tag release: `git tag v0.4.2`

**Expected Outcome**: Version 0.4.2 ready for deployment

---

## Verification

- [ ] Bug reproduced locally with clear steps
- [ ] Enhanced debug logging added to readFile() method
- [ ] Root cause identified through logging and testing
- [ ] Fix implemented and tested locally
- [ ] Regression tests added and passing
- [ ] All existing tests still pass
- [ ] TypeScript compiles without errors
- [ ] Build completes successfully
- [ ] Documentation updated (README, CHANGELOG)
- [ ] Version bumped to 0.4.2
- [ ] GitHub Issue #1 can be closed after deployment
- [ ] Fix verified on actual remote machine (agentbase.me environment)

---

## Expected Output

**Files Modified**:
- [`src/utils/ssh-connection.ts`](../../src/utils/ssh-connection.ts) - Enhanced logging and bug fix
- [`src/utils/ssh-connection.test.ts`](../../src/utils/ssh-connection.test.ts) - New regression tests (create if doesn't exist)
- [`README.md`](../../README.md) - Updated documentation
- [`CHANGELOG.md`](../../CHANGELOG.md) - v0.4.2 entry
- [`package.json`](../../package.json) - Version bump to 0.4.2

**CHANGELOG Entry**:
```markdown
## [0.4.2] - 2026-02-23

### Fixed
- **CRITICAL**: Fixed acp_remote_read_file returning "file not found" for existing paths (Issue #1)
  - [Specific fix description based on root cause]
  - Enhanced error messages with detailed diagnostics
  - Added regression tests to prevent recurrence
  - Files confirmed by list_files can now be reliably read
```

---

## Common Issues and Solutions

### Issue 1: Cannot reproduce bug locally
**Symptom**: Bug doesn't occur in local test environment
**Solution**: Test with exact same paths and SSH configuration as production (agentbase.me). May need to test on actual remote server.

### Issue 2: SFTP stat() succeeds but readFile() fails
**Symptom**: stat() returns file info but readFile() still fails
**Solution**: Check file permissions, encoding issues, or file size limits. May be a different error than "file not found".

### Issue 3: Fix works for some paths but not others
**Symptom**: Inconsistent behavior across different paths
**Solution**: Test with various path formats (absolute, relative, with/without trailing slashes, special characters). May need comprehensive path normalization.

---

## Resources

- [ssh2 SFTP Documentation](https://github.com/mscdex/ssh2#sftp) - SFTP API reference
- [Node.js Path Module](https://nodejs.org/api/path.html) - Path normalization utilities
- [GitHub Issue #1](https://github.com/prmichaelsen/acp-mcp/issues/1) - Original bug report
- [SFTP Protocol RFC](https://datatracker.ietf.org/doc/html/draft-ietf-secsh-filexfer-02) - SFTP protocol specification

---

## Notes

- This is a **CRITICAL** bug that blocks production deployment
- Must be fixed before deploying to agentbase.me platform
- Enhanced logging should remain in place for future debugging
- Consider adding integration tests with real SSH server
- May need to test with different SSH server implementations
- Path handling should be consistent across all tools (list, read, write, execute)

---

**Next Task**: Task 5 - Deploy to Production (after this fix)
**Related Design Docs**: [ACP MCP Core Tools](../../agent/design/acp-mcp-core-tools.md)
**GitHub Issue**: [#1](https://github.com/prmichaelsen/acp-mcp/issues/1)
**Estimated Completion Date**: 2026-02-23

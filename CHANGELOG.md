# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.7.1] - 2026-02-23

### Fixed
- **Shell environment not loaded**: Commands now properly source shell configuration files (`~/.zshrc`, `~/.bashrc`, `~/.profile`)
  - Non-interactive SSH shells don't source config files by default
  - This caused `$PATH` to be incomplete and environment variables to be missing
  - Commands like `npm`, `node`, `git` would fail with "command not found" if installed via nvm, homebrew, or other user-space package managers
  - Solution: Wrap all commands with shell config sourcing: `(source ~/.zshrc || source ~/.bashrc || source ~/.profile || true) && command`
  - Applies to both `execWithTimeout()` and `execStream()` methods
  - Gracefully handles missing config files (uses `|| true` to prevent errors)

### Technical Details
- Added `wrapCommandWithShellInit()` private method to SSHConnectionManager
- Tries to source config files in order: `.zshrc` → `.bashrc` → `.profile`
- Ignores errors if files don't exist (2>/dev/null and || true)
- No breaking changes - transparent to users
- Fixes common issue where user-installed tools aren't in PATH

## [0.7.0] - 2026-02-23

### Added
- **Progress Streaming** for `acp_remote_execute_command` tool
  - Real-time output streaming for long-running commands
  - Uses MCP SDK's native progress notification system (`notifications/progress`)
  - Graceful fallback to timeout mode for clients without progress support
  - Rate limiting prevents notification spam (max 10/second, 100ms interval)
  - Supports commands like `npm run build`, `npm run dev`, `npm test`
  - Progress notifications include stdout chunks as messages
  - Automatically resets request timeout on progress (prevents timeout for long operations)
- **`execStream()` method** in SSHConnectionManager
  - Returns stdout stream, stderr stream, and exit code promise
  - Enables real-time processing of command output
  - Comprehensive logging for stream lifecycle
  - Error handling for stream failures

### Changed
- `acp_remote_execute_command` handler now accepts `extra` parameter with `progressToken`
- Server request handlers pass `extra` to execute_command handler
- Tool description updated to mention progress streaming support
- Timeout parameter ignored when progress streaming is active

### Technical Details
- Requires MCP SDK v1.26.0+ for progress support
- Progress token accessed via `extra._meta.progressToken`
- Progress notifications sent via `server.notification()` method
- Backward compatible - existing clients unaffected
- No breaking changes to API
- Streaming mode indicated by `streamed: true` in response

## [0.6.0] - 2026-02-23

### Added
- **Comprehensive file metadata** in `acp_remote_list_files` tool
  - Now returns structured JSON with full file information
  - Includes permissions (mode, string, owner/group/others breakdown)
  - Includes timestamps (accessed, modified in ISO 8601 format)
  - Includes ownership (uid, gid)
  - Includes file type (file, directory, symlink, other)
  - Includes file size in bytes
- **`includeHidden` parameter** for `acp_remote_list_files` (default: true)
  - Control whether hidden files (starting with `.`) are included
  - Addresses GitHub Issue #2 - incomplete directory listings

### Fixed
- **CRITICAL**: Fixed GitHub Issue #2 - `acp_remote_list_files` missing hidden files
  - Root cause: SFTP `readdir()` filters hidden files by default (protocol behavior)
  - Solution: Hybrid approach using shell `ls` for filenames + SFTP `stat()` for metadata
  - Now returns ALL files including hidden directories (`.ssh`, `.config`, `.npm`, etc.)
  - Fallback to SFTP `readdir()` if shell command unavailable

### Changed
- **BREAKING**: `acp_remote_list_files` output format changed from simple text to structured JSON
  - **Before**: Newline-separated list of paths
  - **After**: JSON array of FileEntry objects with comprehensive metadata
  - **Migration**: Parse JSON response to access file information
  - **Benefit**: Rich metadata enables better file system operations and decision-making

### Technical Details
- Added `FileEntry` interface in `src/types/file-entry.ts`
- Updated `SSHConnectionManager.listFiles()` with hybrid implementation
- Added helper functions: `parsePermissions()`, `modeToPermissionString()`, `getFileType()`
- Enhanced logging for file listing operations
- Maintains backward compatibility via fallback to SFTP

## [0.5.0] - 2026-02-23

### Fixed
- **CRITICAL**: Fixed GitHub Issue #1 - acp_remote_read_file "file not found" bug
  - Root cause: `acp_remote_list_files` returned relative filenames while `acp_remote_read_file` expected absolute paths
  - Files listed by `acp_remote_list_files` can now be directly read by `acp_remote_read_file`
  - Fixes workflow: list directory → read file from list results

### Changed
- **BREAKING**: `acp_remote_list_files` now returns absolute paths instead of relative filenames
  - **Before**: `['package.json', 'README.md', 'src/']`
  - **After**: `['/home/user/project/package.json', '/home/user/project/README.md', '/home/user/project/src/']`
  - **Migration**: If you were manually constructing paths, you no longer need to - use paths directly from list results
  - **Benefit**: Paths from `acp_remote_list_files` work directly with `acp_remote_read_file`, `acp_remote_write_file`, and `acp_remote_execute_command`

### Technical Details
- Modified `listRemoteFiles()` function in `src/tools/acp-remote-list-files.ts`
- Absolute paths constructed by combining directory path with entry name
- Recursive listings now return absolute paths for all nested files
- No changes needed to other tools - they already expected absolute paths

## [0.4.1] - 2026-02-23

### Added
- Enhanced debug logging throughout SSH operations
- Structured logging for tool invocations, SSH commands, and file operations

### Changed
- Improved error messages with more context
- Better logging of SSH connection state

## [0.4.0] - 2026-02-23

### Fixed
- **CRITICAL**: Fixed ESM dynamic require issue that prevented cloud deployment
  - Marked `ssh2` as external in esbuild configuration
  - Package can now be deployed to Google Cloud Run, AWS Lambda, Azure Functions, and other ESM-based environments
  - Resolved "Dynamic require of 'net' is not supported" error
  - See [bug report](agent/reports/acp-mcp-esm-dynamic-require-issue.md) for full details

### Changed
- Updated both `esbuild.build.js` and `esbuild.watch.js` to exclude `ssh2` from bundling
- Reduced bundle size: `server-factory.js` is now 15KB (previously much larger when ssh2 was bundled)

### Technical Details
- `ssh2` library is now resolved at runtime from `node_modules` instead of being bundled
- This allows `ssh2` to use dynamic `require()` calls for Node.js built-in modules without ESM compatibility issues
- No breaking changes - the API remains identical

## [0.3.0] - 2026-02-22

### Added
- `acp_remote_execute_command` tool for executing arbitrary shell commands on remote machines
- `acp_remote_read_file` tool for reading file contents from remote machines
- `acp_remote_write_file` tool for writing file contents to remote machines
- Timeout support for command execution (default: 30 seconds)
- File size limits for read operations (default: 1MB, configurable)
- Atomic file writes with temp file + rename pattern
- Optional backup functionality for file writes
- Optional parent directory creation for file writes
- Comprehensive error handling for all tools

### Changed
- All tools now return structured JSON responses for better parsing
- Enhanced SSHConnectionManager with readFile and writeFile methods
- Updated README with complete tool documentation

### Technical Details
- Added `execWithTimeout()` method to SSHConnectionManager
- Added `readFile()` method with size validation
- Added `writeFile()` method with atomic writes and backup support
- All 4 core tools now fully implemented and tested
- TypeScript compilation successful
- Build generates proper .d.ts files

## [0.2.0] - 2026-02-22

### Added
- SSH-based remote file listing functionality
- `ssh2` library integration for remote machine connections
- `SSHConnectionManager` utility class for managing SSH connections
- `ServerConfig` interface for SSH credentials (host, port, username, privateKey)
- Environment variable configuration for standalone server (SSH_HOST, SSH_USERNAME, SSH_PRIVATE_KEY_PATH)
- TypeScript declaration files (.d.ts) generation in build process
- Comprehensive SSH configuration documentation in README

### Changed
- `acp_remote_list_files` tool now operates on remote machines via SSH instead of local filesystem
- `createServer()` factory function now accepts `ServerConfig` with SSH credentials
- Server initialization now establishes SSH connection before starting
- Updated `.env.example` with SSH configuration variables
- Enhanced README with SSH setup instructions for both standalone and mcp-auth usage

### Technical Details
- Added `src/types/ssh-config.ts` for SSH configuration types
- Added `src/utils/ssh-connection.ts` for SSH connection management
- Updated `src/config.ts` to load SSH credentials from environment
- Updated `src/server.ts` to use SSH for remote operations
- Updated `src/server-factory.ts` to accept SSH config parameter
- Updated `src/tools/acp-remote-list-files.ts` to use SSH instead of local fs
- Build process now generates TypeScript declarations alongside JavaScript

## [0.1.0] - 2026-02-22

### Added
- Initial MCP server scaffold
- TypeScript configuration for ESM modules
- Dual export pattern (standalone + factory for mcp-auth)
- esbuild configuration for fast builds
- `acp_remote_list_files` tool (local filesystem - replaced in 0.2.0)
- Development workflow scripts
- Complete documentation
- Jest test configuration with colocated tests
- prepublishOnly build hook

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

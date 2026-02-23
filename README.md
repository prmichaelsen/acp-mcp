# ACP MCP

MCP server for a remote machine MCP server that will be wrapped by /home/prmichaelsen/mcp-auth.

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Usage

### With Claude Desktop

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "acp-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/acp-mcp/dist/server.js"]
    }
  }
}
```

### With mcp-auth

```typescript
import { createServer } from '@prmichaelsen/acp-mcp/factory';
import { readFileSync } from 'fs';

const server = await createServer({
  userId: 'user-123',
  ssh: {
    host: 'remote.example.com',
    port: 22,
    username: 'remote-user',
    privateKey: readFileSync('/path/to/private/key', 'utf-8'),
  },
});
```

## Available Tools

- **acp_remote_list_files** - List files and directories with comprehensive metadata
  - `path` (required): The directory path to list files from
  - `recursive` (optional): Whether to list files recursively (default: false)
  - `includeHidden` (optional): Whether to include hidden files starting with `.` (default: true)
  - **Returns**: JSON array of file entries with metadata (permissions, timestamps, size, ownership)
  - **Metadata includes**: name, path, type, size, permissions (mode, string, owner/group/others), owner (uid, gid), timestamps (accessed, modified)
  - **Note**: Uses hybrid approach (shell `ls` + SFTP `stat()`) to get all files including hidden ones with rich metadata

- **acp_remote_execute_command** - Execute a shell command on the remote machine with optional progress streaming
  - `command` (required): Shell command to execute
  - `cwd` (optional): Working directory for command execution
  - `timeout` (optional): Timeout in seconds (default: 30, ignored if progress streaming)
  - **Returns**: `{ stdout, stderr, exitCode, timedOut, streamed? }`
  - **Shell Environment** (v0.7.1+): Automatically sources shell configuration files
    - Sources `~/.zshrc`, `~/.bashrc`, or `~/.profile` before executing commands
    - Ensures `$PATH` and environment variables are properly loaded
    - Enables user-installed tools (nvm, homebrew, etc.) to work correctly
    - Gracefully handles missing config files
  - **Progress Streaming** (v0.7.0+): Supports real-time output streaming when client provides `progressToken`
    - Requires MCP SDK v1.26.0+ (server and client)
    - Client must provide `progressToken` in request `_meta`
    - Client must handle progress notifications via `onprogress` callback
    - Graceful fallback to timeout mode if no `progressToken` provided
    - Rate limited to max 10 notifications/second
    - Ideal for long-running commands: `npm run build`, `npm test`, `npm run dev`

- **acp_remote_read_file** - Read file contents from the remote machine
  - `path` (required): Absolute path to file
  - `encoding` (optional): File encoding - utf-8, ascii, or base64 (default: utf-8)
  - `maxSize` (optional): Max file size in bytes (default: 1MB)
  - Returns: `{ content, size, encoding }`

- **acp_remote_write_file** - Write file contents to the remote machine
  - `path` (required): Absolute path to file
  - `content` (required): File contents to write
  - `encoding` (optional): File encoding (default: utf-8)
  - `createDirs` (optional): Create parent directories (default: false)
  - `backup` (optional): Backup existing file before overwriting (default: false)
  - Returns: `{ success, bytesWritten, backupPath }`

## Configuration

### Standalone Server Configuration

Copy `.env.example` to `.env` and configure SSH credentials:

```bash
cp .env.example .env
```

Edit `.env` with your SSH connection details:

```bash
# SSH Configuration (required)
SSH_HOST=your-remote-server.com
SSH_PORT=22
SSH_USERNAME=your-username
SSH_PRIVATE_KEY_PATH=/path/to/your/ssh/private/key
```

### mcp-auth Configuration

When using with mcp-auth, SSH credentials are provided programmatically:

```typescript
import { createServer } from '@prmichaelsen/acp-mcp/factory';
import { readFileSync } from 'fs';

// SSH credentials provided by mcp-auth wrapper
const server = await createServer({
  userId: 'user-123',
  ssh: {
    host: process.env.REMOTE_HOST,
    port: parseInt(process.env.REMOTE_PORT || '22'),
    username: process.env.REMOTE_USERNAME,
    privateKey: readFileSync(process.env.REMOTE_KEY_PATH, 'utf-8'),
  },
});
```

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run build:watch` - Build and watch for changes
- `npm start` - Run production build
- `npm test` - Run tests
- `npm run typecheck` - Type check without emitting
- `npm run clean` - Remove build output

## License

MIT

## Author

Patrick Michaelsen

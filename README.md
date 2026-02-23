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

- **acp_remote_list_files** - List files and directories in a specified path on the remote machine
  - `path` (required): The directory path to list files from
  - `recursive` (optional): Whether to list files recursively (default: false)

- **acp_remote_execute_command** - Execute a shell command on the remote machine
  - `command` (required): Shell command to execute
  - `cwd` (optional): Working directory for command execution
  - `timeout` (optional): Timeout in seconds (default: 30)
  - Returns: `{ stdout, stderr, exitCode, timedOut }`

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

# ACP MCP

MCP server for remote machine operations via SSH. Provides a single, powerful tool for executing any shell command on remote machines with real-time progress streaming.

## Installation

```bash
npm install @prmichaelsen/acp-mcp
```

## Development

```bash
npm install
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

**acp-mcp v1.0.0** provides a single, powerful tool for all remote operations:

### acp_remote_execute_command

Execute any shell command on the remote machine with optional progress streaming.

**Parameters**:
- `command` (required): Shell command to execute
- `cwd` (optional): Working directory for command execution
- `timeout` (optional): Timeout in seconds (default: 30, ignored if progress streaming)

**Returns**: `{ stdout, stderr, exitCode, timedOut, streamed? }`

**Features**:

1. **Shell Environment** (v0.7.1+): Automatically sources shell configuration files
   - Sources `~/.zshrc`, `~/.bashrc`, or `~/.profile` before executing commands
   - Ensures `$PATH` and environment variables are properly loaded
   - Enables user-installed tools (nvm, homebrew, etc.) to work correctly
   - Gracefully handles missing config files

2. **Progress Streaming** (v0.7.0+): Real-time output for long-running commands
   - Requires MCP SDK v1.26.0+ (server and client)
   - Client must provide `progressToken` in request `_meta`
   - Client must handle progress notifications via `onprogress` callback
   - Graceful fallback to timeout mode if no `progressToken` provided
   - Rate limited to max 10 notifications/second
   - Ideal for: `npm run build`, `npm test`, `npm run dev`

## Common Operations

### List Files
```bash
# Basic listing
acp_remote_execute_command({ command: "ls -la ~/project" })

# Recursive listing
acp_remote_execute_command({ command: "find ~/project -type f" })

# With tree (if installed)
acp_remote_execute_command({ command: "tree ~/project" })

# Only directories
acp_remote_execute_command({ command: "ls -d */ ~/project" })
```

### Read Files
```bash
# Read entire file
acp_remote_execute_command({ command: "cat ~/project/package.json" })

# Read first 100 lines
acp_remote_execute_command({ command: "head -n 100 ~/project/large-file.txt" })

# Read last 50 lines
acp_remote_execute_command({ command: "tail -n 50 ~/project/log.txt" })

# Search in file
acp_remote_execute_command({ command: "grep 'pattern' ~/project/file.txt" })
```

### Write Files
```bash
# Write simple content
acp_remote_execute_command({ command: "echo 'hello world' > ~/project/file.txt" })

# Write multi-line content
acp_remote_execute_command({ 
  command: "cat > ~/project/file.txt << 'EOF'\nline 1\nline 2\nline 3\nEOF" 
})

# Append to file
acp_remote_execute_command({ command: "echo 'new line' >> ~/project/file.txt" })

# Create directories
acp_remote_execute_command({ command: "mkdir -p ~/project/new/nested/dir" })
```

### File Operations
```bash
# Copy files
acp_remote_execute_command({ command: "cp ~/source.txt ~/dest.txt" })

# Move files
acp_remote_execute_command({ command: "mv ~/old.txt ~/new.txt" })

# Delete files
acp_remote_execute_command({ command: "rm ~/file.txt" })

# Change permissions
acp_remote_execute_command({ command: "chmod 755 ~/script.sh" })
```

### Development Operations
```bash
# Git operations
acp_remote_execute_command({ command: "git status", cwd: "~/project" })
acp_remote_execute_command({ command: "git commit -m 'message'", cwd: "~/project" })

# Package management
acp_remote_execute_command({ command: "npm install", cwd: "~/project" })
acp_remote_execute_command({ command: "npm run build", cwd: "~/project" })

# Process management
acp_remote_execute_command({ command: "ps aux | grep node" })
acp_remote_execute_command({ command: "kill -9 12345" })
```

## Why Single Tool?

**v1.0.0 removed specialized tools** (`list_files`, `read_file`, `write_file`) in favor of `execute_command`:

✅ **Properly expands `~` and environment variables** - SFTP-based tools didn't
✅ **Maximum flexibility** - Use any shell command or tool
✅ **Simpler codebase** - One tool instead of four
✅ **More reliable** - No SFTP edge cases or limitations
✅ **Consistent behavior** - Works exactly like interactive SSH
✅ **Easier to maintain** - Single code path to test and debug

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

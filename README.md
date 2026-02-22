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

const server = await createServer('user-123');
```

## Available Tools

- **acp_remote_list_files** - List files and directories in a specified path on the remote machine
  - `path` (required): The directory path to list files from
  - `recursive` (optional): Whether to list files recursively (default: false)

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
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

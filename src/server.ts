#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { config } from './config.js';
import { acpRemoteListFilesTool, handleAcpRemoteListFiles } from './tools/acp-remote-list-files.js';

async function main() {
  const server = new Server(
    {
      name: 'acp-mcp',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [acpRemoteListFilesTool],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === 'acp_remote_list_files') {
      return await handleAcpRemoteListFiles(request.params.arguments);
    }
    throw new Error(`Unknown tool: ${request.params.name}`);
  });

  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('ACP MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});

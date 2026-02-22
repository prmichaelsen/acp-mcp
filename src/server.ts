#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { config, loadSSHPrivateKey } from './config.js';
import { acpRemoteListFilesTool, handleAcpRemoteListFiles } from './tools/acp-remote-list-files.js';
import { SSHConnectionManager } from './utils/ssh-connection.js';

async function main() {
  // Load SSH private key
  const privateKey = loadSSHPrivateKey();

  // Create SSH connection manager
  const sshConnection = new SSHConnectionManager({
    host: config.ssh.host,
    port: config.ssh.port,
    username: config.ssh.username,
    privateKey: privateKey,
  });

  // Connect to remote server
  await sshConnection.connect();
  console.error(`Connected to SSH server: ${config.ssh.username}@${config.ssh.host}`);

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
      return await handleAcpRemoteListFiles(request.params.arguments, sshConnection);
    }
    throw new Error(`Unknown tool: ${request.params.name}`);
  });

  // Handle shutdown to cleanup SSH connection
  const cleanup = () => {
    console.error('Shutting down...');
    sshConnection.disconnect();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('ACP MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});

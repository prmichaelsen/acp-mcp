#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { config, loadSSHPrivateKey } from './config.js';
import { acpRemoteListFilesTool, handleAcpRemoteListFiles } from './tools/acp-remote-list-files.js';
import { acpRemoteExecuteCommandTool, handleAcpRemoteExecuteCommand } from './tools/acp-remote-execute-command.js';
import { acpRemoteReadFileTool, handleAcpRemoteReadFile } from './tools/acp-remote-read-file.js';
import { acpRemoteWriteFileTool, handleAcpRemoteWriteFile } from './tools/acp-remote-write-file.js';
import { SSHConnectionManager } from './utils/ssh-connection.js';
import { logger } from './utils/logger.js';

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
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    logger.debug('Tool discovery requested');
    const tools = [acpRemoteListFilesTool, acpRemoteExecuteCommandTool, acpRemoteReadFileTool, acpRemoteWriteFileTool];
    logger.debug(`Returning ${tools.length} tools`, { tools: tools.map(t => t.name) });
    return { tools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    const startTime = Date.now();
    logger.toolInvoked(request.params.name, request.params.arguments);
    
    try {
      let result;
      
      if (request.params.name === 'acp_remote_list_files') {
        result = await handleAcpRemoteListFiles(request.params.arguments, sshConnection);
      } else if (request.params.name === 'acp_remote_execute_command') {
        // Pass extra and server for progress streaming support
        result = await handleAcpRemoteExecuteCommand(request.params.arguments, sshConnection, extra, server);
      } else if (request.params.name === 'acp_remote_read_file') {
        result = await handleAcpRemoteReadFile(request.params.arguments, sshConnection);
      } else if (request.params.name === 'acp_remote_write_file') {
        result = await handleAcpRemoteWriteFile(request.params.arguments, sshConnection);
      } else {
        throw new Error(`Unknown tool: ${request.params.name}`);
      }
      
      const duration = Date.now() - startTime;
      const resultSize = JSON.stringify(result).length;
      logger.toolCompleted(request.params.name, duration, resultSize);
      
      return result;
    } catch (error) {
      logger.toolFailed(request.params.name, error as Error, request.params.arguments);
      throw error;
    }
  });

  // Handle shutdown to cleanup SSH connection
  const cleanup = () => {
    logger.info('Shutting down server');
    sshConnection.disconnect();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('ACP MCP Server running on stdio');
}

main().catch((error) => {
  logger.error('Server startup failed', { error: error.message, stack: error.stack });
  process.exit(1);
});

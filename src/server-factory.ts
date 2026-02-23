import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { config } from './config.js';
import { acpRemoteListFilesTool, handleAcpRemoteListFiles } from './tools/acp-remote-list-files.js';
import { acpRemoteExecuteCommandTool, handleAcpRemoteExecuteCommand } from './tools/acp-remote-execute-command.js';
import { acpRemoteReadFileTool, handleAcpRemoteReadFile } from './tools/acp-remote-read-file.js';
import { acpRemoteWriteFileTool, handleAcpRemoteWriteFile } from './tools/acp-remote-write-file.js';
import { ServerConfig } from './types/ssh-config.js';
import { SSHConnectionManager } from './utils/ssh-connection.js';

/**
 * Create an MCP server instance for a specific user with SSH configuration
 * This factory function is used by mcp-auth for multi-tenant support
 * 
 * @param serverConfig - Configuration including userId and SSH credentials
 * @returns Configured MCP Server instance
 */
export async function createServer(serverConfig: ServerConfig): Promise<Server> {
  // Create SSH connection manager
  const sshConnection = new SSHConnectionManager(serverConfig.ssh);
  
  // Connect to remote server
  await sshConnection.connect();

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

  // Register tools with SSH connection context
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [acpRemoteListFilesTool, acpRemoteExecuteCommandTool, acpRemoteReadFileTool, acpRemoteWriteFileTool],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === 'acp_remote_list_files') {
      // Pass SSH connection to handler for remote operations
      return await handleAcpRemoteListFiles(request.params.arguments, sshConnection);
    }
    if (request.params.name === 'acp_remote_execute_command') {
      return await handleAcpRemoteExecuteCommand(request.params.arguments, sshConnection);
    }
    if (request.params.name === 'acp_remote_read_file') {
      return await handleAcpRemoteReadFile(request.params.arguments, sshConnection);
    }
    if (request.params.name === 'acp_remote_write_file') {
      return await handleAcpRemoteWriteFile(request.params.arguments, sshConnection);
    }
    throw new Error(`Unknown tool: ${request.params.name}`);
  });

  // Handle server shutdown to cleanup SSH connection
  process.on('SIGINT', () => {
    sshConnection.disconnect();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    sshConnection.disconnect();
    process.exit(0);
  });

  return server;
}

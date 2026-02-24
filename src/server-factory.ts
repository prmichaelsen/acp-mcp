import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { config } from './config.js';
import { acpRemoteExecuteCommandTool, handleAcpRemoteExecuteCommand } from './tools/acp-remote-execute-command.js';
import { ServerConfig } from './types/ssh-config.js';
import { SSHConnectionManager } from './utils/ssh-connection.js';
import { logger } from './utils/logger.js';

/**
 * Create an MCP server instance for a specific user with SSH configuration
 * This factory function is used by mcp-auth for multi-tenant support
 * 
 * @param serverConfig - Configuration including userId and SSH credentials
 * @returns Configured MCP Server instance
 */
export async function createServer(serverConfig: ServerConfig): Promise<Server> {
  logger.info('Creating server instance', { userId: serverConfig.userId });
  logger.debug('SSH configuration', {
    host: serverConfig.ssh.host,
    port: serverConfig.ssh.port,
    username: serverConfig.ssh.username,
  });
  
  // Create SSH connection manager
  const sshConnection = new SSHConnectionManager(serverConfig.ssh);
  
  // Connect to remote server
  await sshConnection.connect();
  
  logger.info('Server created successfully', { userId: serverConfig.userId });

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
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    logger.debug('Tool discovery requested', { userId: serverConfig.userId });
    const tools = [acpRemoteExecuteCommandTool];
    logger.debug(`Returning ${tools.length} tools`, { tools: tools.map(t => t.name), userId: serverConfig.userId });
    return { tools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    const startTime = Date.now();
    logger.toolInvoked(request.params.name, request.params.arguments, serverConfig.userId);
    
    try {
      let result;
      
      if (request.params.name === 'acp_remote_execute_command') {
        // Pass extra and server for progress streaming support
        result = await handleAcpRemoteExecuteCommand(request.params.arguments, sshConnection, extra, server);
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

  // Handle server shutdown to cleanup SSH connection
  process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down', { userId: serverConfig.userId });
    sshConnection.disconnect();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down', { userId: serverConfig.userId });
    sshConnection.disconnect();
    process.exit(0);
  });

  return server;
}

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { config } from './config.js';
import { acpRemoteListFilesTool, handleAcpRemoteListFiles } from './tools/acp-remote-list-files.js';

/**
 * Create an MCP server instance for a specific user
 * This factory function is used by mcp-auth for multi-tenant support
 * 
 * @param userId - The unique identifier for the user
 * @returns Configured MCP Server instance
 */
export async function createServer(userId: string): Promise<Server> {
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

  // Register tools with user context
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [acpRemoteListFilesTool],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === 'acp_remote_list_files') {
      // Pass userId to handler for user-scoped operations
      return await handleAcpRemoteListFiles(request.params.arguments, userId);
    }
    throw new Error(`Unknown tool: ${request.params.name}`);
  });

  return server;
}

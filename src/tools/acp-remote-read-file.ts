import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { SSHConnectionManager } from '../utils/ssh-connection.js';
import { logger } from '../utils/logger.js';

export const acpRemoteReadFileTool: Tool = {
  name: 'acp_remote_read_file',
  description: 'Read file contents from the remote machine via SSH',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Absolute path to file',
      },
      encoding: {
        type: 'string',
        description: 'File encoding (default: utf-8)',
        default: 'utf-8',
        enum: ['utf-8', 'ascii', 'base64'],
      },
      maxSize: {
        type: 'number',
        description: 'Max file size in bytes (default: 1MB)',
        default: 1048576,
      },
    },
    required: ['path'],
  },
};

interface ReadFileArgs {
  path: string;
  encoding?: string;
  maxSize?: number;
}

interface ReadFileResult {
  content: string;
  size: number;
  encoding: string;
}

/**
 * Handle the acp_remote_read_file tool invocation
 * Reads file contents from the remote machine via SSH
 * 
 * @param args - Tool arguments containing path, encoding, and maxSize
 * @param sshConnection - SSH connection manager for remote operations
 */
export async function handleAcpRemoteReadFile(
  args: any,
  sshConnection: SSHConnectionManager
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const { path, encoding = 'utf-8', maxSize = 1048576 } = args as ReadFileArgs;

  logger.debug('Reading remote file', { path, encoding, maxSize });

  try {
    const result = await sshConnection.readFile(path, encoding, maxSize);
    
    logger.debug('File read successful', { path, size: result.size });
    
    const output: ReadFileResult = {
      content: result.content,
      size: result.size,
      encoding: result.encoding,
    };
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(output, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('File read error', { path, error: errorMessage });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: errorMessage,
            content: '',
            size: 0,
            encoding,
          }, null, 2),
        },
      ],
    };
  }
}

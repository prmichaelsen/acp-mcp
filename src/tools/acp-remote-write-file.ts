import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { SSHConnectionManager } from '../utils/ssh-connection.js';

export const acpRemoteWriteFileTool: Tool = {
  name: 'acp_remote_write_file',
  description: 'Write file contents to the remote machine via SSH',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Absolute path to file',
      },
      content: {
        type: 'string',
        description: 'File contents to write',
      },
      encoding: {
        type: 'string',
        description: 'File encoding (default: utf-8)',
        default: 'utf-8',
      },
      createDirs: {
        type: 'boolean',
        description: 'Create parent directories if they don\'t exist (default: false)',
        default: false,
      },
      backup: {
        type: 'boolean',
        description: 'Backup existing file before overwriting (default: false)',
        default: false,
      },
    },
    required: ['path', 'content'],
  },
};

interface WriteFileArgs {
  path: string;
  content: string;
  encoding?: string;
  createDirs?: boolean;
  backup?: boolean;
}

interface WriteFileResult {
  success: boolean;
  bytesWritten: number;
  backupPath?: string;
}

/**
 * Handle the acp_remote_write_file tool invocation
 * Writes file contents to the remote machine via SSH
 * 
 * @param args - Tool arguments containing path, content, and options
 * @param sshConnection - SSH connection manager for remote operations
 */
export async function handleAcpRemoteWriteFile(
  args: any,
  sshConnection: SSHConnectionManager
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const { path, content, encoding = 'utf-8', createDirs = false, backup = false } = args as WriteFileArgs;

  try {
    const result = await sshConnection.writeFile(path, content, {
      encoding,
      createDirs,
      backup,
    });
    
    const output: WriteFileResult = {
      success: result.success,
      bytesWritten: result.bytesWritten,
      backupPath: result.backupPath,
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
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            bytesWritten: 0,
            error: errorMessage,
          }, null, 2),
        },
      ],
    };
  }
}

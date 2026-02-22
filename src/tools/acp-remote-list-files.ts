import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { SSHConnectionManager } from '../utils/ssh-connection.js';

export const acpRemoteListFilesTool: Tool = {
  name: 'acp_remote_list_files',
  description: 'List files and directories in a specified path on the remote machine via SSH',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'The directory path to list files from',
      },
      recursive: {
        type: 'boolean',
        description: 'Whether to list files recursively',
        default: false,
      },
    },
    required: ['path'],
  },
};

interface ListFilesArgs {
  path: string;
  recursive?: boolean;
}

/**
 * Handle the acp_remote_list_files tool invocation
 * Lists files and directories at the specified path on the remote machine via SSH
 * 
 * @param args - Tool arguments containing path and recursive flag
 * @param sshConnection - SSH connection manager for remote operations
 */
export async function handleAcpRemoteListFiles(
  args: any,
  sshConnection: SSHConnectionManager
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const { path, recursive = false } = args as ListFilesArgs;

  try {
    const files = await listRemoteFiles(sshConnection, path, recursive);
    
    return {
      content: [
        {
          type: 'text',
          text: files.join('\n'),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: `Error listing remote files: ${errorMessage}`,
        },
      ],
    };
  }
}

/**
 * Recursively list files in a remote directory via SSH
 */
async function listRemoteFiles(
  ssh: SSHConnectionManager,
  dirPath: string,
  recursive: boolean
): Promise<string[]> {
  const entries = await ssh.listFiles(dirPath);
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.isDirectory) {
      files.push(`${entry.name}/`);
      if (recursive) {
        const fullPath = `${dirPath}/${entry.name}`.replace(/\/+/g, '/');
        const subFiles = await listRemoteFiles(ssh, fullPath, recursive);
        files.push(...subFiles.map(f => `${entry.name}/${f}`));
      }
    } else {
      files.push(entry.name);
    }
  }

  return files.sort();
}

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { SSHConnectionManager } from '../utils/ssh-connection.js';
import { FileEntry } from '../types/file-entry.js';

export const acpRemoteListFilesTool: Tool = {
  name: 'acp_remote_list_files',
  description: 'List files and directories in a specified path on the remote machine via SSH. Returns comprehensive metadata including permissions, timestamps, size, and ownership. Includes hidden files by default.',
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
      includeHidden: {
        type: 'boolean',
        description: 'Whether to include hidden files (starting with .)',
        default: true,
      },
    },
    required: ['path'],
  },
};

interface ListFilesArgs {
  path: string;
  recursive?: boolean;
  includeHidden?: boolean;
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
  const { path, recursive = false, includeHidden = true } = args as ListFilesArgs;

  try {
    const entries = await listRemoteFiles(sshConnection, path, recursive, includeHidden);
    
    // Format as JSON for structured output
    const output = JSON.stringify(entries, null, 2);
    
    return {
      content: [
        {
          type: 'text',
          text: output,
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
 * Returns FileEntry objects with comprehensive metadata
 */
async function listRemoteFiles(
  ssh: SSHConnectionManager,
  dirPath: string,
  recursive: boolean,
  includeHidden: boolean
): Promise<FileEntry[]> {
  const entries = await ssh.listFiles(dirPath, includeHidden);
  const allEntries: FileEntry[] = [...entries];

  // Recursively list subdirectories if requested
  if (recursive) {
    for (const entry of entries) {
      if (entry.type === 'directory') {
        const subEntries = await listRemoteFiles(ssh, entry.path, recursive, includeHidden);
        allEntries.push(...subEntries);
      }
    }
  }

  return allEntries;
}

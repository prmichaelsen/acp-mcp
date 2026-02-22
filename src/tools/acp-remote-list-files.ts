import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';

export const acpRemoteListFilesTool: Tool = {
  name: 'acp_remote_list_files',
  description: 'List files and directories in a specified path on the remote machine',
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
 * Lists files and directories at the specified path
 * 
 * @param args - Tool arguments containing path and recursive flag
 * @param userId - Optional user ID for user-scoped operations (from mcp-auth)
 */
export async function handleAcpRemoteListFiles(
  args: any,
  userId?: string
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const { path, recursive = false } = args as ListFilesArgs;

  try {
    const files = await listFiles(path, recursive);
    
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
          text: `Error listing files: ${errorMessage}`,
        },
      ],
    };
  }
}

/**
 * Recursively list files in a directory
 */
async function listFiles(dirPath: string, recursive: boolean): Promise<string[]> {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name);
    
    if (entry.isDirectory()) {
      files.push(`${entry.name}/`);
      if (recursive) {
        const subFiles = await listFiles(fullPath, recursive);
        files.push(...subFiles.map(f => `${entry.name}/${f}`));
      }
    } else {
      files.push(entry.name);
    }
  }

  return files.sort();
}

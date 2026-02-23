import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { SSHConnectionManager } from '../utils/ssh-connection.js';

export const acpRemoteExecuteCommandTool: Tool = {
  name: 'acp_remote_execute_command',
  description: 'Execute a shell command on the remote machine via SSH',
  inputSchema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'Shell command to execute',
      },
      cwd: {
        type: 'string',
        description: 'Working directory for command execution (optional)',
      },
      timeout: {
        type: 'number',
        description: 'Timeout in seconds (default: 30)',
        default: 30,
      },
    },
    required: ['command'],
  },
};

interface ExecuteCommandArgs {
  command: string;
  cwd?: string;
  timeout?: number;
}

interface ExecuteCommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
}

/**
 * Handle the acp_remote_execute_command tool invocation
 * Executes a shell command on the remote machine via SSH
 * 
 * @param args - Tool arguments containing command, cwd, and timeout
 * @param sshConnection - SSH connection manager for remote operations
 */
export async function handleAcpRemoteExecuteCommand(
  args: any,
  sshConnection: SSHConnectionManager
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const { command, cwd, timeout = 30 } = args as ExecuteCommandArgs;

  try {
    // Build command with working directory if specified
    const fullCommand = cwd ? `cd ${cwd} && ${command}` : command;
    
    const result = await sshConnection.execWithTimeout(fullCommand, timeout);
    
    // Format output as JSON for structured response
    const output: ExecuteCommandResult = {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      timedOut: result.timedOut,
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
            stdout: '',
            stderr: errorMessage,
            exitCode: 1,
            timedOut: false,
          }, null, 2),
        },
      ],
    };
  }
}

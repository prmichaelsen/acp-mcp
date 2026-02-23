import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { SSHConnectionManager } from '../utils/ssh-connection.js';
import { logger } from '../utils/logger.js';

export const acpRemoteExecuteCommandTool: Tool = {
  name: 'acp_remote_execute_command',
  description: 'Execute a shell command on the remote machine via SSH. Supports real-time progress streaming if client provides progressToken.',
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
        description: 'Timeout in seconds (default: 30). Ignored if progress streaming is used.',
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
  streamed?: boolean;
}

/**
 * Handle the acp_remote_execute_command tool invocation
 * Executes a shell command on the remote machine via SSH
 * Supports progress streaming when progressToken is provided
 * 
 * @param args - Tool arguments containing command, cwd, and timeout
 * @param sshConnection - SSH connection manager for remote operations
 * @param extra - Optional extra parameters including progressToken
 * @param server - Server instance for sending progress notifications (optional)
 */
export async function handleAcpRemoteExecuteCommand(
  args: any,
  sshConnection: SSHConnectionManager,
  extra?: any,
  server?: any
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const { command, cwd, timeout = 30 } = args as ExecuteCommandArgs;
  const progressToken = extra?._meta?.progressToken;

  logger.debug('Executing remote command', { command, cwd, timeout, hasProgressToken: !!progressToken });

  try {
    // If progress token provided and server available, use streaming
    if (progressToken && server) {
      return await executeWithProgress(command, cwd, sshConnection, progressToken, server);
    }
    
    // Otherwise, use existing timeout-based execution (fallback)
    const fullCommand = cwd ? `cd ${cwd} && ${command}` : command;
    const result = await sshConnection.execWithTimeout(fullCommand, timeout);
    
    logger.debug('Command execution result', {
      exitCode: result.exitCode,
      timedOut: result.timedOut,
      stdoutLength: result.stdout.length,
      stderrLength: result.stderr.length,
    });
    
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
    logger.error('Command execution error', { command, error: errorMessage });
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

/**
 * Execute command with progress streaming
 * Sends real-time progress notifications as output is received
 * 
 * @param command - Command to execute
 * @param cwd - Working directory
 * @param sshConnection - SSH connection
 * @param progressToken - Token for progress notifications
 * @param server - Server instance for sending notifications
 */
async function executeWithProgress(
  command: string,
  cwd: string | undefined,
  sshConnection: SSHConnectionManager,
  progressToken: string | number,
  server: any
): Promise<{ content: Array<{ type: string; text: string }> }> {
  logger.debug('Starting streaming execution', { command, cwd, progressToken });
  
  const { stream, stderr: stderrStream, exitCode } = await sshConnection.execStream(command, cwd);
  
  let stdout = '';
  let stderr = '';
  let bytesReceived = 0;
  let lastProgressTime = 0;
  const MIN_PROGRESS_INTERVAL = 100; // 100ms rate limiting

  // Stream stdout with progress notifications
  stream.on('data', (chunk: Buffer) => {
    const text = chunk.toString();
    stdout += text;
    bytesReceived += chunk.length;
    
    // Rate limiting: only send progress if enough time elapsed
    const now = Date.now();
    if (now - lastProgressTime >= MIN_PROGRESS_INTERVAL) {
      try {
        server.notification({
          method: 'notifications/progress',
          params: {
            progressToken,
            progress: bytesReceived,
            total: undefined, // Unknown total for streaming
            message: text,
          },
        });
        lastProgressTime = now;
        logger.debug('Progress notification sent', { 
          progressToken, 
          bytes: bytesReceived,
          chunkSize: chunk.length 
        });
      } catch (error) {
        logger.warn('Failed to send progress notification', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  });

  // Collect stderr (no progress for errors)
  stderrStream.on('data', (chunk: Buffer) => {
    stderr += chunk.toString();
  });

  // Handle stream errors
  stream.on('error', (error: Error) => {
    logger.error('Stream error during execution', {
      command,
      error: error.message
    });
  });

  // Wait for completion
  const finalExitCode = await exitCode;
  
  logger.debug('Streaming execution completed', { 
    command, 
    exitCode: finalExitCode,
    stdoutBytes: stdout.length,
    stderrBytes: stderr.length,
  });

  const output: ExecuteCommandResult = {
    stdout,
    stderr,
    exitCode: finalExitCode,
    timedOut: false,
    streamed: true, // Indicate this was streamed
  };

  return {
    content: [{
      type: 'text',
      text: JSON.stringify(output, null, 2),
    }],
  };
}

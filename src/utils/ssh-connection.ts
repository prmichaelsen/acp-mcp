import { Client } from 'ssh2';
import { SSHConfig } from '../types/ssh-config.js';
import { logger } from './logger.js';

/**
 * SSH Connection Manager
 * Manages SSH connections and provides SFTP access for remote file operations
 */
export class SSHConnectionManager {
  private client: Client;
  private config: SSHConfig;
  private connected: boolean = false;

  constructor(config: SSHConfig) {
    this.config = config;
    this.client = new Client();
  }

  /**
   * Connect to the remote SSH server
   */
  async connect(): Promise<void> {
    if (this.connected) {
      logger.debug('SSH connection already established');
      return;
    }

    logger.info('Connecting to SSH server', {
      host: this.config.host,
      port: this.config.port || 22,
      username: this.config.username,
    });

    return new Promise((resolve, reject) => {
      this.client
        .on('ready', () => {
          this.connected = true;
          logger.info('SSH connection established', {
            host: this.config.host,
            username: this.config.username,
          });
          resolve();
        })
        .on('error', (err) => {
          logger.error('SSH connection failed', {
            host: this.config.host,
            error: err.message,
          });
          reject(err);
        })
        .connect({
          host: this.config.host,
          port: this.config.port || 22,
          username: this.config.username,
          privateKey: this.config.privateKey,
        });
    });
  }

  /**
   * Execute a command on the remote server
   */
  async exec(command: string): Promise<string> {
    if (!this.connected) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      this.client.exec(command, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }

        let stdout = '';
        let stderr = '';

        stream
          .on('close', (code: number) => {
            if (code !== 0) {
              reject(new Error(`Command failed with code ${code}: ${stderr}`));
            } else {
              resolve(stdout);
            }
          })
          .on('data', (data: Buffer) => {
            stdout += data.toString();
          })
          .stderr.on('data', (data: Buffer) => {
            stderr += data.toString();
          });
      });
    });
  }

  /**
   * Execute a command on the remote server with timeout support
   */
  async execWithTimeout(
    command: string,
    timeoutSeconds: number = 30
  ): Promise<{ stdout: string; stderr: string; exitCode: number; timedOut: boolean }> {
    if (!this.connected) {
      await this.connect();
    }

    const startTime = Date.now();
    // Wrap command to source shell config for proper PATH and environment
    const wrappedCommand = this.wrapCommandWithShellInit(command);
    logger.sshCommand(wrappedCommand, undefined, timeoutSeconds);

    const execPromise = new Promise<{ stdout: string; stderr: string; exitCode: number }>((resolve, reject) => {
      this.client.exec(wrappedCommand, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }

        let stdout = '';
        let stderr = '';

        stream
          .on('close', (code: number) => {
            const duration = Date.now() - startTime;
            logger.sshCommandResult(code, duration, stdout.length, stderr.length);
            resolve({ stdout, stderr, exitCode: code });
          })
          .on('data', (data: Buffer) => {
            stdout += data.toString();
          })
          .stderr.on('data', (data: Buffer) => {
            stderr += data.toString();
          });
      });
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Command execution timed out'));
      }, timeoutSeconds * 1000);
    });

    try {
      const result = await Promise.race([execPromise, timeoutPromise]);
      return { ...result, timedOut: false };
    } catch (error) {
      if (error instanceof Error && error.message === 'Command execution timed out') {
        logger.warn('SSH command timed out', { command, timeout: timeoutSeconds });
        return {
          stdout: '',
          stderr: 'Command execution timed out',
          exitCode: 124,
          timedOut: true,
        };
      }
      logger.error('SSH command execution failed', {
        command,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Execute a command on the remote server with streaming output
   * Returns streams instead of buffered output for real-time progress
   *
   * @param command - Shell command to execute
   * @param cwd - Optional working directory
   * @returns Object with stdout stream, stderr stream, and exit code promise
   */
  async execStream(
    command: string,
    cwd?: string
  ): Promise<{
    stream: NodeJS.ReadableStream;
    stderr: NodeJS.ReadableStream;
    exitCode: Promise<number>;
  }> {
    if (!this.connected) {
      await this.connect();
    }

    const fullCommand = cwd ? `cd "${cwd}" && ${command}` : command;
    // Wrap command to source shell config for proper PATH and environment
    const wrappedCommand = this.wrapCommandWithShellInit(fullCommand);
    const startTime = Date.now();
    logger.sshCommand(wrappedCommand, cwd);

    return new Promise((resolve, reject) => {
      this.client.exec(wrappedCommand, (err, stream) => {
        if (err) {
          logger.error('SSH exec failed', {
            command: fullCommand,
            error: err.message
          });
          reject(err);
          return;
        }

        logger.debug('SSH stream started', { command: fullCommand });

        const exitCodePromise = new Promise<number>((resolveExit) => {
          stream.on('close', (code: number) => {
            const duration = Date.now() - startTime;
            logger.debug('SSH stream closed', {
              command: fullCommand,
              exitCode: code,
              duration: `${duration}ms`
            });
            resolveExit(code);
          });
        });

        // Handle stream errors
        stream.on('error', (error: Error) => {
          logger.error('SSH stream error', {
            command: fullCommand,
            error: error.message
          });
        });

        resolve({
          stream: stream,
          stderr: stream.stderr,
          exitCode: exitCodePromise,
        });
      });
    });
  }

  /**
   * Wrap command to source shell configuration files
   * This ensures PATH and other environment variables are properly set
   * SSH non-interactive shells don't source ~/.bashrc or ~/.zshrc by default
   *
   * @param command - The command to wrap
   * @returns Wrapped command that sources shell config first
   */
  private wrapCommandWithShellInit(command: string): string {
    // Try to source common shell config files
    // Use || true to ignore errors if files don't exist
    return `(source ~/.zshrc 2>/dev/null || source ~/.bashrc 2>/dev/null || source ~/.profile 2>/dev/null || true) && ${command}`;
  }

  /**
   * Disconnect from the SSH server
   */
  disconnect(): void {
    if (this.connected) {
      logger.info('Disconnecting from SSH server', {
        host: this.config.host,
        username: this.config.username,
      });
      this.client.end();
      this.connected = false;
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }
}

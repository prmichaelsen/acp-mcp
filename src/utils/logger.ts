/**
 * Logger utility for ACP MCP Server
 * Provides structured logging with configurable log levels
 */

export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';

const LOG_LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  trace: 4,
};

class Logger {
  private level: LogLevel;
  private enabled: boolean;

  constructor() {
    // Read configuration from environment variables
    this.level = (process.env.ACP_MCP_LOG_LEVEL as LogLevel) || 'info';
    this.enabled = process.env.ACP_MCP_DEBUG === 'true' || process.env.NODE_ENV === 'development';
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.enabled && level !== 'error' && level !== 'warn') {
      return false;
    }
    return LOG_LEVELS[level] <= LOG_LEVELS[this.level];
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (data !== undefined) {
      const dataStr = typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data);
      return `${prefix} ${message}\n${dataStr}`;
    }
    
    return `${prefix} ${message}`;
  }

  error(message: string, data?: any): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, data));
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog('warn')) {
      console.error(this.formatMessage('warn', message, data));
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog('info')) {
      console.error(this.formatMessage('info', message, data));
    }
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog('debug')) {
      console.error(this.formatMessage('debug', message, data));
    }
  }

  trace(message: string, data?: any): void {
    if (this.shouldLog('trace')) {
      console.error(this.formatMessage('trace', message, data));
    }
  }

  /**
   * Log tool invocation with parameters
   */
  toolInvoked(toolName: string, params: any, userId?: string): void {
    this.info(`Tool invoked: ${toolName}`);
    this.debug('Tool parameters', { tool: toolName, params, userId });
  }

  /**
   * Log tool completion with result summary
   */
  toolCompleted(toolName: string, duration: number, resultSize?: number): void {
    this.info(`Tool completed: ${toolName}`);
    this.debug('Tool performance', { tool: toolName, duration: `${duration}ms`, resultSize });
  }

  /**
   * Log tool failure with error details
   */
  toolFailed(toolName: string, error: Error, params?: any): void {
    this.error(`Tool execution failed: ${toolName}`, {
      tool: toolName,
      error: error.message,
      stack: error.stack,
      params,
    });
  }

  /**
   * Log SSH command execution
   */
  sshCommand(command: string, cwd?: string, timeout?: number): void {
    this.debug('Executing SSH command', { command, cwd, timeout });
  }

  /**
   * Log SSH command result
   */
  sshCommandResult(exitCode: number, duration: number, stdoutSize: number, stderrSize: number): void {
    this.debug('SSH command completed', {
      exitCode,
      duration: `${duration}ms`,
      stdout: `${stdoutSize} bytes`,
      stderr: `${stderrSize} bytes`,
    });
  }

  /**
   * Log file operation
   */
  fileOperation(operation: string, path: string, details?: any): void {
    this.info(`File operation: ${operation}`, { path, ...details });
  }
}

// Export singleton instance
export const logger = new Logger();

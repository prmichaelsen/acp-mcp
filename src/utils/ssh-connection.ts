import { Client, SFTPWrapper } from 'ssh2';
import { SSHConfig } from '../types/ssh-config.js';
import { FileEntry, parsePermissions, getFileType } from '../types/file-entry.js';
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
    logger.sshCommand(command, undefined, timeoutSeconds);

    const execPromise = new Promise<{ stdout: string; stderr: string; exitCode: number }>((resolve, reject) => {
      this.client.exec(command, (err, stream) => {
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
    const startTime = Date.now();
    logger.sshCommand(fullCommand, cwd);

    return new Promise((resolve, reject) => {
      this.client.exec(fullCommand, (err, stream) => {
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
   * Get SFTP wrapper for file operations
   */
  async getSFTP(): Promise<SFTPWrapper> {
    if (!this.connected) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      this.client.sftp((err, sftp) => {
        if (err) {
          reject(err);
        } else {
          resolve(sftp);
        }
      });
    });
  }

  /**
   * List files in a directory with comprehensive metadata
   * Uses hybrid approach: shell ls for filenames (includes hidden), SFTP stat for metadata
   *
   * @param path - Directory path to list
   * @param includeHidden - Whether to include hidden files (default: true)
   * @returns Array of FileEntry objects with complete metadata
   */
  async listFiles(path: string, includeHidden: boolean = true): Promise<FileEntry[]> {
    const startTime = Date.now();
    logger.debug('Listing files', { path, includeHidden });

    try {
      // Step 1: Use shell command to get ALL filenames (including hidden)
      const lsFlag = includeHidden ? '-A' : '';
      const command = `ls ${lsFlag} -1 "${path}" 2>/dev/null`;
      const result = await this.execWithTimeout(command, 10);

      if (result.exitCode !== 0) {
        throw new Error(`ls command failed: ${result.stderr}`);
      }

      const filenames = result.stdout
        .split('\n')
        .map(f => f.trim())
        .filter(f => f !== '' && f !== '.' && f !== '..');

      logger.debug('Filenames retrieved via shell', {
        path,
        count: filenames.length,
        method: 'shell',
      });

      // Step 2: Get rich metadata for each file using SFTP stat()
      const sftp = await this.getSFTP();
      const entries: FileEntry[] = [];

      for (const filename of filenames) {
        const fullPath = `${path}/${filename}`.replace(/\/+/g, '/');

        try {
          const stats = await new Promise<any>((resolve, reject) => {
            sftp.stat(fullPath, (err, stats) => {
              if (err) reject(err);
              else resolve(stats);
            });
          });

          entries.push({
            name: filename,
            path: fullPath,
            type: getFileType(stats),
            size: stats.size,
            permissions: parsePermissions(stats.mode),
            owner: {
              uid: stats.uid,
              gid: stats.gid,
            },
            timestamps: {
              accessed: new Date(stats.atime * 1000).toISOString(),
              modified: new Date(stats.mtime * 1000).toISOString(),
            },
          });
        } catch (error) {
          // Skip files we can't stat (permissions, race conditions, etc.)
          logger.warn('Failed to stat file, skipping', {
            path: fullPath,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      const duration = Date.now() - startTime;
      logger.debug('Files listed successfully', {
        path,
        count: entries.length,
        duration: `${duration}ms`,
        method: 'hybrid',
      });

      return entries;
    } catch (error) {
      // Fallback to SFTP readdir if shell command fails
      logger.warn('Shell ls command failed, falling back to SFTP readdir', {
        path,
        error: error instanceof Error ? error.message : String(error),
      });

      return this.listFilesViaSFTP(path, includeHidden);
    }
  }

  /**
   * Fallback method: List files using SFTP readdir (may miss hidden files)
   * @private
   */
  private async listFilesViaSFTP(path: string, includeHidden: boolean): Promise<FileEntry[]> {
    const sftp = await this.getSFTP();

    return new Promise((resolve, reject) => {
      sftp.readdir(path, (err, list) => {
        if (err) {
          logger.error('SFTP readdir failed', { path, error: err.message });
          reject(err);
          return;
        }

        let entries = list.map((item) => ({
          name: item.filename,
          path: `${path}/${item.filename}`.replace(/\/+/g, '/'),
          type: getFileType(item.attrs),
          size: item.attrs.size,
          permissions: parsePermissions(item.attrs.mode),
          owner: {
            uid: item.attrs.uid,
            gid: item.attrs.gid,
          },
          timestamps: {
            accessed: new Date(item.attrs.atime * 1000).toISOString(),
            modified: new Date(item.attrs.mtime * 1000).toISOString(),
          },
        }));

        // SFTP readdir doesn't return hidden files, so filter if requested
        if (!includeHidden) {
          entries = entries.filter(e => !e.name.startsWith('.'));
        }

        logger.debug('Files listed via SFTP fallback', {
          path,
          count: entries.length,
          method: 'sftp',
          note: 'Hidden files may be missing (SFTP limitation)',
        });

        resolve(entries);
      });
    });
  }

  /**
   * Read file contents from remote machine
   */
  async readFile(
    path: string,
    encoding: string = 'utf-8',
    maxSize: number = 1048576
  ): Promise<{ content: string; size: number; encoding: string }> {
    const startTime = Date.now();
    logger.fileOperation('read', path, { encoding, maxSize });
    
    const sftp = await this.getSFTP();

    return new Promise((resolve, reject) => {
      // First, get file stats to check size
      sftp.stat(path, (err, stats) => {
        if (err) {
          logger.error('File stat failed', { path, error: err.message });
          reject(new Error(`File not found or inaccessible: ${path}`));
          return;
        }

        logger.debug('File stat retrieved', { path, size: stats.size });

        if (stats.size > maxSize) {
          logger.warn('File too large', { path, size: stats.size, maxSize });
          reject(new Error(`File too large: ${stats.size} bytes (max: ${maxSize} bytes)`));
          return;
        }

        // Read file contents
        sftp.readFile(path, { encoding: encoding as BufferEncoding }, (err, data) => {
          if (err) {
            logger.error('File read failed', { path, error: err.message });
            reject(new Error(`Failed to read file: ${err.message}`));
            return;
          }

          const duration = Date.now() - startTime;
          logger.debug('File read completed', { path, size: stats.size, duration: `${duration}ms` });

          resolve({
            content: data.toString(),
            size: stats.size,
            encoding,
          });
        });
      });
    });
  }

  /**
   * Write file contents to remote machine
   */
  async writeFile(
    path: string,
    content: string,
    options: {
      encoding?: string;
      createDirs?: boolean;
      backup?: boolean;
    } = {}
  ): Promise<{ success: boolean; bytesWritten: number; backupPath?: string }> {
    const { encoding = 'utf-8', createDirs = false, backup = false } = options;
    const startTime = Date.now();
    
    logger.fileOperation('write', path, {
      contentSize: content.length,
      encoding,
      createDirs,
      backup,
    });
    
    const sftp = await this.getSFTP();

    return new Promise((resolve, reject) => {
      const writeOperation = () => {
        // Create backup if requested
        if (backup) {
          const backupPath = `${path}.backup`;
          sftp.rename(path, backupPath, (err) => {
            if (err && err.message !== 'No such file') {
              // Ignore "no such file" error (file doesn't exist yet)
              reject(new Error(`Failed to create backup: ${err.message}`));
              return;
            }
            
            // Write file
            performWrite(backupPath);
          });
        } else {
          performWrite();
        }
      };

      const performWrite = (backupPath?: string) => {
        const buffer = Buffer.from(content, encoding as BufferEncoding);
        const tempPath = `${path}.tmp`;

        // Write to temp file first (atomic write)
        sftp.writeFile(tempPath, buffer, (err) => {
          if (err) {
            reject(new Error(`Failed to write file: ${err.message}`));
            return;
          }

          // Rename temp file to target (atomic operation)
          sftp.rename(tempPath, path, (err) => {
            if (err) {
              logger.error('File rename failed', { tempPath, path, error: err.message });
              reject(new Error(`Failed to rename temp file: ${err.message}`));
              return;
            }

            const duration = Date.now() - startTime;
            logger.debug('File write completed', {
              path,
              bytesWritten: buffer.length,
              duration: `${duration}ms`,
              backupPath,
            });

            resolve({
              success: true,
              bytesWritten: buffer.length,
              backupPath,
            });
          });
        });
      };

      // Create parent directories if requested
      if (createDirs) {
        const dirPath = path.substring(0, path.lastIndexOf('/'));
        this.exec(`mkdir -p ${dirPath}`).then(() => {
          writeOperation();
        }).catch(reject);
      } else {
        writeOperation();
      }
    });
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

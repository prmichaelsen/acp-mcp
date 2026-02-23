import { Client, SFTPWrapper } from 'ssh2';
import { SSHConfig } from '../types/ssh-config.js';

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
      return;
    }

    return new Promise((resolve, reject) => {
      this.client
        .on('ready', () => {
          this.connected = true;
          resolve();
        })
        .on('error', (err) => {
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
        return {
          stdout: '',
          stderr: 'Command execution timed out',
          exitCode: 124,
          timedOut: true,
        };
      }
      throw error;
    }
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
   * List files in a directory using SFTP
   */
  async listFiles(path: string): Promise<Array<{ name: string; isDirectory: boolean }>> {
    const sftp = await this.getSFTP();

    return new Promise((resolve, reject) => {
      sftp.readdir(path, (err, list) => {
        if (err) {
          reject(err);
          return;
        }

        const files = list.map((item) => ({
          name: item.filename,
          isDirectory: item.attrs.isDirectory(),
        }));

        resolve(files);
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
    const sftp = await this.getSFTP();

    return new Promise((resolve, reject) => {
      // First, get file stats to check size
      sftp.stat(path, (err, stats) => {
        if (err) {
          reject(new Error(`File not found or inaccessible: ${path}`));
          return;
        }

        if (stats.size > maxSize) {
          reject(new Error(`File too large: ${stats.size} bytes (max: ${maxSize} bytes)`));
          return;
        }

        // Read file contents
        sftp.readFile(path, { encoding: encoding as BufferEncoding }, (err, data) => {
          if (err) {
            reject(new Error(`Failed to read file: ${err.message}`));
            return;
          }

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
              reject(new Error(`Failed to rename temp file: ${err.message}`));
              return;
            }

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

import dotenv from 'dotenv';
import { readFileSync } from 'fs';

dotenv.config();

export interface Config {
  logLevel: string;
  ssh: {
    host: string;
    port: number;
    username: string;
    privateKeyPath: string;
  };
}

function validateConfig(): Config {
  const sshHost = process.env.SSH_HOST;
  const sshUsername = process.env.SSH_USERNAME;
  const sshPrivateKeyPath = process.env.SSH_PRIVATE_KEY_PATH;

  if (!sshHost || !sshUsername || !sshPrivateKeyPath) {
    throw new Error(
      'Missing required SSH configuration. Please set SSH_HOST, SSH_USERNAME, and SSH_PRIVATE_KEY_PATH environment variables.'
    );
  }

  return {
    logLevel: process.env.LOG_LEVEL || 'info',
    ssh: {
      host: sshHost,
      port: parseInt(process.env.SSH_PORT || '22', 10),
      username: sshUsername,
      privateKeyPath: sshPrivateKeyPath,
    },
  };
}

export const config = validateConfig();

/**
 * Load SSH private key from file
 */
export function loadSSHPrivateKey(): string {
  try {
    return readFileSync(config.ssh.privateKeyPath, 'utf-8');
  } catch (error) {
    throw new Error(
      `Failed to load SSH private key from ${config.ssh.privateKeyPath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

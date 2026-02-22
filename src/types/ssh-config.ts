/**
 * SSH connection configuration
 */
export interface SSHConfig {
  host: string;
  port?: number;
  username: string;
  privateKey: string; // PEM-formatted private key content
}

/**
 * Server initialization configuration
 */
export interface ServerConfig {
  userId: string;
  ssh: SSHConfig;
}

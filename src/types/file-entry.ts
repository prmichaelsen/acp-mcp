/**
 * Comprehensive file entry with metadata
 */
export interface FileEntry {
  /** Filename (without path) */
  name: string;
  
  /** Absolute path to file */
  path: string;
  
  /** File type */
  type: 'file' | 'directory' | 'symlink' | 'other';
  
  /** File size in bytes */
  size: number;
  
  /** File permissions */
  permissions: {
    /** Octal mode (e.g., 0o644) */
    mode: number;
    
    /** Human-readable string (e.g., "rw-r--r--") */
    string: string;
    
    /** Owner permissions */
    owner: {
      read: boolean;
      write: boolean;
      execute: boolean;
    };
    
    /** Group permissions */
    group: {
      read: boolean;
      write: boolean;
      execute: boolean;
    };
    
    /** Others permissions */
    others: {
      read: boolean;
      write: boolean;
      execute: boolean;
    };
  };
  
  /** File ownership */
  owner: {
    /** User ID */
    uid: number;
    
    /** Group ID */
    gid: number;
  };
  
  /** File timestamps */
  timestamps: {
    /** Last access time (ISO 8601) */
    accessed: string;
    
    /** Last modification time (ISO 8601) */
    modified: string;
  };
}

/**
 * Convert Unix mode to human-readable permission string
 * @param mode - Unix file mode (e.g., 33188 for -rw-r--r--)
 * @returns Permission string (e.g., "rw-r--r--")
 */
export function modeToPermissionString(mode: number): string {
  const perms = [
    (mode & 0o400) ? 'r' : '-',
    (mode & 0o200) ? 'w' : '-',
    (mode & 0o100) ? 'x' : '-',
    (mode & 0o040) ? 'r' : '-',
    (mode & 0o020) ? 'w' : '-',
    (mode & 0o010) ? 'x' : '-',
    (mode & 0o004) ? 'r' : '-',
    (mode & 0o002) ? 'w' : '-',
    (mode & 0o001) ? 'x' : '-',
  ];
  return perms.join('');
}

/**
 * Parse Unix mode into structured permissions object
 * @param mode - Unix file mode
 * @returns Structured permissions object
 */
export function parsePermissions(mode: number) {
  return {
    mode,
    string: modeToPermissionString(mode),
    owner: {
      read: (mode & 0o400) !== 0,
      write: (mode & 0o200) !== 0,
      execute: (mode & 0o100) !== 0,
    },
    group: {
      read: (mode & 0o040) !== 0,
      write: (mode & 0o020) !== 0,
      execute: (mode & 0o010) !== 0,
    },
    others: {
      read: (mode & 0o004) !== 0,
      write: (mode & 0o002) !== 0,
      execute: (mode & 0o001) !== 0,
    },
  };
}

/**
 * Determine file type from SFTP stats
 * @param stats - SFTP file stats
 * @returns File type string
 */
export function getFileType(stats: any): 'file' | 'directory' | 'symlink' | 'other' {
  if (stats.isDirectory()) return 'directory';
  if (stats.isFile()) return 'file';
  if (stats.isSymbolicLink()) return 'symlink';
  return 'other';
}

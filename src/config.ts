import dotenv from 'dotenv';

dotenv.config();

export interface Config {
  logLevel: string;
  // Add your config fields here
}

function validateConfig(): Config {
  return {
    logLevel: process.env.LOG_LEVEL || 'info',
  };
}

export const config = validateConfig();

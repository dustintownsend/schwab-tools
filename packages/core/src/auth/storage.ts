import { homedir } from 'os';
import { join } from 'path';
import { mkdir, readFile, writeFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import type { StoredTokens } from '../types/index.js';

const CONFIG_DIR = join(homedir(), '.schwab-tools');
const TOKENS_FILE = join(CONFIG_DIR, 'tokens.json');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export interface StoredConfig {
  clientId: string;
  clientSecret: string;
  callbackPort?: number;
  callbackUrl?: string;
}

async function ensureConfigDir(): Promise<void> {
  if (!existsSync(CONFIG_DIR)) {
    await mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

export async function saveTokens(tokens: StoredTokens): Promise<void> {
  await ensureConfigDir();
  const data = JSON.stringify(tokens, null, 2);
  await writeFile(TOKENS_FILE, data, { mode: 0o600 });
}

export async function loadTokens(): Promise<StoredTokens | null> {
  try {
    if (!existsSync(TOKENS_FILE)) {
      return null;
    }
    const data = await readFile(TOKENS_FILE, 'utf-8');
    return JSON.parse(data) as StoredTokens;
  } catch {
    return null;
  }
}

export async function deleteTokens(): Promise<void> {
  try {
    if (existsSync(TOKENS_FILE)) {
      await unlink(TOKENS_FILE);
    }
  } catch {
    // Ignore errors
  }
}

export async function saveConfig(config: StoredConfig): Promise<void> {
  await ensureConfigDir();
  const data = JSON.stringify(config, null, 2);
  await writeFile(CONFIG_FILE, data, { mode: 0o600 });
}

export async function loadConfig(): Promise<StoredConfig | null> {
  try {
    if (!existsSync(CONFIG_FILE)) {
      return null;
    }
    const data = await readFile(CONFIG_FILE, 'utf-8');
    return JSON.parse(data) as StoredConfig;
  } catch {
    return null;
  }
}

export function getConfigDir(): string {
  return CONFIG_DIR;
}

export function getTokensPath(): string {
  return TOKENS_FILE;
}

export function getConfigPath(): string {
  return CONFIG_FILE;
}

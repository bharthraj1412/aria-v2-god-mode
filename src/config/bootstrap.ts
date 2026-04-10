import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import YAML from 'yaml';
import type { RuntimeConfig } from './types';

export const OPENCLAW_HOME = path.join(os.homedir(), '.openclaw');
export const CONFIG_PATH = path.join(OPENCLAW_HOME, 'config.yml');
export const SESSIONS_DIR = path.join(OPENCLAW_HOME, 'sessions');

export function defaultRuntimeConfig(): RuntimeConfig {
  return {
    gateway: {
      host: '127.0.0.1',
      port: 18789,
      token: undefined,
      tokenUpdatedAt: undefined,
      trustProxy: false,
      enforceLoopbackToken: false,
    },
    providers: {
      order: ['openai', 'anthropic'],
      openai: {
        model: 'gpt-4o-mini',
        apiKeyEnv: 'OPENAI_API_KEY',
      },
      anthropic: {
        model: 'claude-3-5-sonnet-latest',
        apiKeyEnv: 'ANTHROPIC_API_KEY',
      },
    },
    channels: {
      default: 'local-exec',
    },
    agent: {
      systemPromptPath: '.github/prompts/aria-v2-god-mode.prompt.md',
    },
    security: {
      execAllowlist: ['echo', 'whoami', 'pwd', 'cd', 'dir', 'ls', 'git', 'npm', 'node', 'python', 'python3'],
      execRequireApproval: ['curl', 'wget', 'rm', 'rmdir', 'del', 'sudo'],
      approvalBypassEnv: 'OPENCLAW_ALLOW_UNSAFE_EXEC',
      rateLimit: {
        enabled: false,
        requestsPerMinute: 60,
        burst: 20,
      },
    },
    sessions: {
      maxSizeMb: 10,
      ttlDays: 30,
    },
  };
}

export function ensureOpenClawHome(): void {
  fs.mkdirSync(OPENCLAW_HOME, { recursive: true });
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

export function ensureConfigFile(): { created: boolean; path: string } {
  ensureOpenClawHome();
  if (fs.existsSync(CONFIG_PATH)) {
    return { created: false, path: CONFIG_PATH };
  }

  const yamlText = YAML.stringify(defaultRuntimeConfig());
  fs.writeFileSync(CONFIG_PATH, yamlText, 'utf8');
  return { created: true, path: CONFIG_PATH };
}

import * as fs from 'node:fs';
import YAML from 'yaml';
import { runtimeConfigSchema } from './schema';
import { CONFIG_PATH, defaultRuntimeConfig, ensureConfigFile } from './bootstrap';
import type { RuntimeConfig } from './types';

function mergeWithDefaults(parsed: unknown): RuntimeConfig {
  const defaults = defaultRuntimeConfig();
  const candidate = (parsed && typeof parsed === 'object' ? parsed : {}) as Partial<RuntimeConfig>;

  return {
    ...defaults,
    ...candidate,
    gateway: {
      ...defaults.gateway,
      ...(candidate.gateway || {}),
      token: candidate.gateway?.token || defaults.gateway.token,
      tokenUpdatedAt: candidate.gateway?.tokenUpdatedAt || defaults.gateway.tokenUpdatedAt,
      trustProxy: candidate.gateway?.trustProxy ?? defaults.gateway.trustProxy,
      enforceLoopbackToken: candidate.gateway?.enforceLoopbackToken ?? defaults.gateway.enforceLoopbackToken,
    },
    providers: {
      ...defaults.providers,
      ...(candidate.providers || {}),
      openai: {
        ...defaults.providers.openai,
        ...(candidate.providers?.openai || {}),
      },
      anthropic: {
        ...defaults.providers.anthropic,
        ...(candidate.providers?.anthropic || {}),
      },
      openrouter: {
        ...defaults.providers.openrouter,
        ...(candidate.providers?.openrouter || {}),
      },
      order: candidate.providers?.order || defaults.providers.order,
    },
    channels: {
      ...defaults.channels,
      ...(candidate.channels || {}),
    },
    agent: {
      ...defaults.agent,
      ...(candidate.agent || {}),
    },
    security: {
      ...defaults.security,
      ...(candidate.security || {}),
      execAllowlist: candidate.security?.execAllowlist || defaults.security.execAllowlist,
      execRequireApproval: candidate.security?.execRequireApproval || defaults.security.execRequireApproval,
      approvalBypassEnv: candidate.security?.approvalBypassEnv || defaults.security.approvalBypassEnv,
      rateLimit: {
        ...defaults.security.rateLimit,
        ...(candidate.security?.rateLimit || {}),
        enabled: candidate.security?.rateLimit?.enabled ?? defaults.security.rateLimit.enabled,
        requestsPerMinute:
          candidate.security?.rateLimit?.requestsPerMinute || defaults.security.rateLimit.requestsPerMinute,
        burst: candidate.security?.rateLimit?.burst || defaults.security.rateLimit.burst,
      },
    },
    sessions: {
      ...defaults.sessions,
      ...(candidate.sessions || {}),
      maxSizeMb: candidate.sessions?.maxSizeMb || defaults.sessions.maxSizeMb,
      ttlDays: candidate.sessions?.ttlDays || defaults.sessions.ttlDays,
    },
  };
}

export function loadRuntimeConfig(): RuntimeConfig {
  ensureConfigFile();
  const yamlText = fs.readFileSync(CONFIG_PATH, 'utf8');
  const parsed = YAML.parse(yamlText);
  const merged = mergeWithDefaults(parsed);
  return runtimeConfigSchema.parse(merged);
}

export { CONFIG_PATH, ensureConfigFile };

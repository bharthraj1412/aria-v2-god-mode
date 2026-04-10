import { createAnthropicProvider } from './anthropic';
import { createOpenAIProvider } from './openai';
import { createOpenRouterProvider } from './openrouter';
import type { RuntimeConfig, ProviderName } from '../config/types';
import type { Provider, ProviderRequest, ProviderResponse } from './contract';

const PROVIDER_RETRY_DELAYS_MS = [1000, 2000, 4000];
const PROVIDER_RETRY_JITTER_MS = 500;

function resolveApiKey(envName: string): string | undefined {
  const value = process.env[envName];
  if (value && value.trim().length > 0) {
    return value.trim();
  }
  return undefined;
}

function buildProvider(name: ProviderName, config: RuntimeConfig): Provider | undefined {
  if (name === 'openai') {
    const key = resolveApiKey(config.providers.openai.apiKeyEnv);
    if (!key) {
      return undefined;
    }
    return createOpenAIProvider(config.providers.openai.model, key);
  }

  if (name === 'openrouter') {
    const key = resolveApiKey(config.providers.openrouter.apiKeyEnv);
    if (!key) {
      return undefined;
    }
    return createOpenRouterProvider(config.providers.openrouter.model, key);
  }

  const key = resolveApiKey(config.providers.anthropic.apiKeyEnv);
  if (!key) {
    return undefined;
  }
  return createAnthropicProvider(config.providers.anthropic.model, key);
}

function isRetryableProviderError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('missing api key')) {
      return false;
    }
    if (
      message.includes('invalid api key') ||
      message.includes('unauthorized') ||
      message.includes('forbidden')
    ) {
      return false;
    }
  }

  return true;
}

function retryDelayWithJitter(baseDelayMs: number): number {
  const jitter = Math.floor(Math.random() * (PROVIDER_RETRY_JITTER_MS + 1));
  return baseDelayMs + jitter;
}

async function executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= PROVIDER_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isRetryableProviderError(error) || attempt === PROVIDER_RETRY_DELAYS_MS.length) {
        throw error;
      }

      const waitMs = retryDelayWithJitter(PROVIDER_RETRY_DELAYS_MS[attempt]);
      await new Promise(resolve => setTimeout(resolve, waitMs));
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Provider retry failed');
}

export async function generateWithProvider(
  config: RuntimeConfig,
  providerName: ProviderName,
  request: ProviderRequest,
): Promise<ProviderResponse> {
  const provider = buildProvider(providerName, config);
  if (!provider) {
    throw new Error(`${providerName}: missing API key`);
  }
  return executeWithRetry(() => provider.generate(request));
}

export async function generateWithFailover(config: RuntimeConfig, request: ProviderRequest): Promise<ProviderResponse> {
  const errors: string[] = [];

  for (const providerName of config.providers.order) {
    const provider = buildProvider(providerName, config);
    if (!provider) {
      errors.push(`${providerName}: missing API key`);
      continue;
    }

    try {
      return await executeWithRetry(() => provider.generate(request));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${providerName}: ${message}`);
    }
  }

  throw new Error(`All providers failed: ${errors.join(' | ')}`);
}

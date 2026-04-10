import type { RuntimeConfig } from '../config/types';
import type { ProviderName } from '../config/types';
import { generateWithFailover, generateWithProvider } from '../providers';
import { loadSystemPrompt } from './system-prompt';

export interface AgentRunResult {
  content: string;
  provider: string;
  model: string;
}

export async function runAgent(
  config: RuntimeConfig,
  userMessage: string,
  preferredProvider?: ProviderName,
): Promise<AgentRunResult> {
  const systemPrompt = loadSystemPrompt(config);
  const result = preferredProvider
    ? await generateWithProvider(config, preferredProvider, {
        systemPrompt,
        userMessage,
      })
    : await generateWithFailover(config, {
        systemPrompt,
        userMessage,
      });

  return {
    content: result.content,
    provider: result.provider,
    model: result.model,
  };
}

import Anthropic from '@anthropic-ai/sdk';
import type { Provider, ProviderRequest, ProviderResponse } from './contract';

export function createAnthropicProvider(model: string, apiKey: string): Provider {
  const client = new Anthropic({ apiKey });

  return {
    name: 'anthropic',
    async generate(request: ProviderRequest): Promise<ProviderResponse> {
      const message = await client.messages.create({
        model,
        max_tokens: 1024,
        system: request.systemPrompt,
        messages: [{ role: 'user', content: request.userMessage }],
      });

      const textPart = message.content.find((part: { type: string }) => part.type === 'text');
      const content = textPart?.type === 'text' ? textPart.text.trim() : '(no response)';
      return { content, provider: 'anthropic', model };
    },
  };
}

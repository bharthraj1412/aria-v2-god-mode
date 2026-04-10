import OpenAI from 'openai';
import type { Provider, ProviderRequest, ProviderResponse } from './contract';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

export function createOpenRouterProvider(model: string, apiKey: string): Provider {
  const client = new OpenAI({
    apiKey,
    baseURL: OPENROUTER_BASE_URL,
  });

  return {
    name: 'openrouter',
    async generate(request: ProviderRequest): Promise<ProviderResponse> {
      const completion = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: request.systemPrompt },
          { role: 'user', content: request.userMessage },
        ],
      });

      const content = completion.choices[0]?.message?.content?.trim() || '(no response)';
      return { content, provider: 'openrouter', model };
    },
  };
}

import OpenAI from 'openai';
import type { Provider, ProviderRequest, ProviderResponse } from './contract';

export function createOpenAIProvider(model: string, apiKey: string): Provider {
  const client = new OpenAI({ apiKey });

  return {
    name: 'openai',
    async generate(request: ProviderRequest): Promise<ProviderResponse> {
      const completion = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: request.systemPrompt },
          { role: 'user', content: request.userMessage },
        ],
      });

      const content = completion.choices[0]?.message?.content?.trim() || '(no response)';
      return { content, provider: 'openai', model };
    },
  };
}

export interface ProviderRequest {
  systemPrompt: string;
  userMessage: string;
}

export interface ProviderResponse {
  content: string;
  provider: string;
  model: string;
}

export interface Provider {
  name: 'openai' | 'anthropic';
  generate(request: ProviderRequest): Promise<ProviderResponse>;
}

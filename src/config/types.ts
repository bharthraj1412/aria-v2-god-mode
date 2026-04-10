export type ProviderName = 'openai' | 'anthropic';

export interface ProviderConfig {
  model: string;
  apiKeyEnv: string;
}

export interface RuntimeConfig {
  gateway: {
    host: string;
    port: number;
    token?: string;
    tokenUpdatedAt?: string;
    trustProxy?: boolean;
    enforceLoopbackToken?: boolean;
  };
  providers: {
    order: ProviderName[];
    openai: ProviderConfig;
    anthropic: ProviderConfig;
  };
  channels: {
    default: 'local-exec';
  };
  agent: {
    systemPromptPath: string;
  };
  security: {
    execAllowlist: string[];
    execRequireApproval: string[];
    approvalBypassEnv: string;
    rateLimit: {
      enabled: boolean;
      requestsPerMinute: number;
      burst: number;
    };
  };
  sessions: {
    maxSizeMb: number;
    ttlDays: number;
  };
}

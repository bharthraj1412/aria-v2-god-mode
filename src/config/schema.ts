import { z } from 'zod';

export const runtimeConfigSchema = z.object({
  gateway: z.object({
    host: z.string().min(1),
    port: z.number().int().min(1).max(65535),
    token: z.string().min(1).optional(),
    tokenUpdatedAt: z.string().min(1).optional(),
    trustProxy: z.boolean().optional(),
    enforceLoopbackToken: z.boolean().optional(),
  }),
  providers: z.object({
    order: z.array(z.enum(['openai', 'anthropic', 'openrouter'])).min(1),
    openai: z.object({
      model: z.string().min(1),
      apiKeyEnv: z.string().min(1),
    }),
    anthropic: z.object({
      model: z.string().min(1),
      apiKeyEnv: z.string().min(1),
    }),
    openrouter: z.object({
      model: z.string().min(1),
      apiKeyEnv: z.string().min(1),
    }),
  }),
  channels: z.object({
    default: z.literal('local-exec'),
  }),
  agent: z.object({
    systemPromptPath: z.string().min(1),
  }),
  security: z.object({
    execAllowlist: z.array(z.string().min(1)).min(1),
    execRequireApproval: z.array(z.string().min(1)),
    approvalBypassEnv: z.string().min(1),
    rateLimit: z.object({
      enabled: z.boolean(),
      requestsPerMinute: z.number().int().min(1),
      burst: z.number().int().min(1),
    }),
  }),
  sessions: z.object({
    maxSizeMb: z.number().int().min(1),
    ttlDays: z.number().int().min(1),
  }),
});

export type RuntimeConfigSchema = z.infer<typeof runtimeConfigSchema>;

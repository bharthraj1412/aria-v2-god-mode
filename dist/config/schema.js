"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtimeConfigSchema = void 0;
const zod_1 = require("zod");
exports.runtimeConfigSchema = zod_1.z.object({
    gateway: zod_1.z.object({
        host: zod_1.z.string().min(1),
        port: zod_1.z.number().int().min(1).max(65535),
        token: zod_1.z.string().min(1).optional(),
        tokenUpdatedAt: zod_1.z.string().min(1).optional(),
        trustProxy: zod_1.z.boolean().optional(),
        enforceLoopbackToken: zod_1.z.boolean().optional(),
    }),
    providers: zod_1.z.object({
        order: zod_1.z.array(zod_1.z.enum(['openai', 'anthropic'])).min(1),
        openai: zod_1.z.object({
            model: zod_1.z.string().min(1),
            apiKeyEnv: zod_1.z.string().min(1),
        }),
        anthropic: zod_1.z.object({
            model: zod_1.z.string().min(1),
            apiKeyEnv: zod_1.z.string().min(1),
        }),
    }),
    channels: zod_1.z.object({
        default: zod_1.z.literal('local-exec'),
    }),
    agent: zod_1.z.object({
        systemPromptPath: zod_1.z.string().min(1),
    }),
    security: zod_1.z.object({
        execAllowlist: zod_1.z.array(zod_1.z.string().min(1)).min(1),
        execRequireApproval: zod_1.z.array(zod_1.z.string().min(1)),
        approvalBypassEnv: zod_1.z.string().min(1),
        rateLimit: zod_1.z.object({
            enabled: zod_1.z.boolean(),
            requestsPerMinute: zod_1.z.number().int().min(1),
            burst: zod_1.z.number().int().min(1),
        }),
    }),
    sessions: zod_1.z.object({
        maxSizeMb: zod_1.z.number().int().min(1),
        ttlDays: zod_1.z.number().int().min(1),
    }),
});

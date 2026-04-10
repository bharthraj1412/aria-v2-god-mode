"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateWithProvider = generateWithProvider;
exports.generateWithFailover = generateWithFailover;
const anthropic_1 = require("./anthropic");
const openai_1 = require("./openai");
const PROVIDER_RETRY_DELAYS_MS = [1000, 2000, 4000];
const PROVIDER_RETRY_JITTER_MS = 500;
function resolveApiKey(envName) {
    const value = process.env[envName];
    if (value && value.trim().length > 0) {
        return value.trim();
    }
    return undefined;
}
function buildProvider(name, config) {
    if (name === 'openai') {
        const key = resolveApiKey(config.providers.openai.apiKeyEnv);
        if (!key) {
            return undefined;
        }
        return (0, openai_1.createOpenAIProvider)(config.providers.openai.model, key);
    }
    const key = resolveApiKey(config.providers.anthropic.apiKeyEnv);
    if (!key) {
        return undefined;
    }
    return (0, anthropic_1.createAnthropicProvider)(config.providers.anthropic.model, key);
}
function isRetryableProviderError(error) {
    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        if (message.includes('missing api key')) {
            return false;
        }
        if (message.includes('invalid api key') ||
            message.includes('unauthorized') ||
            message.includes('forbidden')) {
            return false;
        }
    }
    return true;
}
function retryDelayWithJitter(baseDelayMs) {
    const jitter = Math.floor(Math.random() * (PROVIDER_RETRY_JITTER_MS + 1));
    return baseDelayMs + jitter;
}
async function executeWithRetry(operation) {
    let lastError;
    for (let attempt = 0; attempt <= PROVIDER_RETRY_DELAYS_MS.length; attempt += 1) {
        try {
            return await operation();
        }
        catch (error) {
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
async function generateWithProvider(config, providerName, request) {
    const provider = buildProvider(providerName, config);
    if (!provider) {
        throw new Error(`${providerName}: missing API key`);
    }
    return executeWithRetry(() => provider.generate(request));
}
async function generateWithFailover(config, request) {
    const errors = [];
    for (const providerName of config.providers.order) {
        const provider = buildProvider(providerName, config);
        if (!provider) {
            errors.push(`${providerName}: missing API key`);
            continue;
        }
        try {
            return await executeWithRetry(() => provider.generate(request));
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            errors.push(`${providerName}: ${message}`);
        }
    }
    throw new Error(`All providers failed: ${errors.join(' | ')}`);
}

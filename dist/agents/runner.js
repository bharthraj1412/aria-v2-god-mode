"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAgent = runAgent;
const providers_1 = require("../providers");
const system_prompt_1 = require("./system-prompt");
async function runAgent(config, userMessage, preferredProvider) {
    const systemPrompt = (0, system_prompt_1.loadSystemPrompt)(config);
    const result = preferredProvider
        ? await (0, providers_1.generateWithProvider)(config, preferredProvider, {
            systemPrompt,
            userMessage,
        })
        : await (0, providers_1.generateWithFailover)(config, {
            systemPrompt,
            userMessage,
        });
    return {
        content: result.content,
        provider: result.provider,
        model: result.model,
    };
}

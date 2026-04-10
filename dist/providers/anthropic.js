"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAnthropicProvider = createAnthropicProvider;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
function createAnthropicProvider(model, apiKey) {
    const client = new sdk_1.default({ apiKey });
    return {
        name: 'anthropic',
        async generate(request) {
            const message = await client.messages.create({
                model,
                max_tokens: 1024,
                system: request.systemPrompt,
                messages: [{ role: 'user', content: request.userMessage }],
            });
            const textPart = message.content.find((part) => part.type === 'text');
            const content = textPart?.type === 'text' ? textPart.text.trim() : '(no response)';
            return { content, provider: 'anthropic', model };
        },
    };
}

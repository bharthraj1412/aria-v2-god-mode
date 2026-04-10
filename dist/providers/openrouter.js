"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOpenRouterProvider = createOpenRouterProvider;
const openai_1 = __importDefault(require("openai"));
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
function createOpenRouterProvider(model, apiKey) {
    const client = new openai_1.default({
        apiKey,
        baseURL: OPENROUTER_BASE_URL,
    });
    return {
        name: 'openrouter',
        async generate(request) {
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

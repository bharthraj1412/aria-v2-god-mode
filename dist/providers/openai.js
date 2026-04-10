"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOpenAIProvider = createOpenAIProvider;
const openai_1 = __importDefault(require("openai"));
function createOpenAIProvider(model, apiKey) {
    const client = new openai_1.default({ apiKey });
    return {
        name: 'openai',
        async generate(request) {
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

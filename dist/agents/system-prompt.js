"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadSystemPrompt = loadSystemPrompt;
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const fallbackPrompt = [
    'You are OpenClaw Ultimate Agent in runtime mode.',
    'Operate safely, be concise, and prioritize executable next steps.',
    'Use local-exec only when explicitly requested with exec:.',
].join(' ');
function loadSystemPrompt(config) {
    const absolutePath = path.isAbsolute(config.agent.systemPromptPath)
        ? config.agent.systemPromptPath
        : path.join(process.cwd(), config.agent.systemPromptPath);
    if (!fs.existsSync(absolutePath)) {
        return fallbackPrompt;
    }
    const text = fs.readFileSync(absolutePath, 'utf8').trim();
    return text.length > 0 ? text : fallbackPrompt;
}

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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SESSIONS_DIR = exports.CONFIG_PATH = exports.OPENCLAW_HOME = void 0;
exports.defaultRuntimeConfig = defaultRuntimeConfig;
exports.ensureOpenClawHome = ensureOpenClawHome;
exports.ensureConfigFile = ensureConfigFile;
const fs = __importStar(require("node:fs"));
const os = __importStar(require("node:os"));
const path = __importStar(require("node:path"));
const yaml_1 = __importDefault(require("yaml"));
exports.OPENCLAW_HOME = path.join(os.homedir(), '.openclaw');
exports.CONFIG_PATH = path.join(exports.OPENCLAW_HOME, 'config.yml');
exports.SESSIONS_DIR = path.join(exports.OPENCLAW_HOME, 'sessions');
function defaultRuntimeConfig() {
    return {
        gateway: {
            host: '127.0.0.1',
            port: 18789,
            token: undefined,
            tokenUpdatedAt: undefined,
            trustProxy: false,
            enforceLoopbackToken: false,
        },
        providers: {
            order: ['openai', 'anthropic', 'openrouter'],
            openai: {
                model: 'gpt-4o-mini',
                apiKeyEnv: 'OPENAI_API_KEY',
            },
            anthropic: {
                model: 'claude-sonnet-4-6',
                apiKeyEnv: 'ANTHROPIC_API_KEY',
            },
            openrouter: {
                model: 'openai/gpt-4o-mini',
                apiKeyEnv: 'OPENROUTER_API_KEY',
            },
        },
        channels: {
            default: 'local-exec',
        },
        agent: {
            systemPromptPath: '.github/prompts/aria-v2-god-mode.prompt.md',
        },
        security: {
            execAllowlist: ['echo', 'whoami', 'pwd', 'cd', 'dir', 'ls', 'git', 'npm', 'node', 'python', 'python3'],
            execRequireApproval: ['curl', 'wget', 'rm', 'rmdir', 'del', 'sudo'],
            approvalBypassEnv: 'OPENCLAW_ALLOW_UNSAFE_EXEC',
            rateLimit: {
                enabled: false,
                requestsPerMinute: 60,
                burst: 20,
            },
        },
        sessions: {
            maxSizeMb: 10,
            ttlDays: 30,
        },
    };
}
function ensureOpenClawHome() {
    fs.mkdirSync(exports.OPENCLAW_HOME, { recursive: true });
    fs.mkdirSync(exports.SESSIONS_DIR, { recursive: true });
}
function ensureConfigFile() {
    ensureOpenClawHome();
    if (fs.existsSync(exports.CONFIG_PATH)) {
        return { created: false, path: exports.CONFIG_PATH };
    }
    const yamlText = yaml_1.default.stringify(defaultRuntimeConfig());
    fs.writeFileSync(exports.CONFIG_PATH, yamlText, 'utf8');
    return { created: true, path: exports.CONFIG_PATH };
}

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
exports.ensureConfigFile = exports.CONFIG_PATH = void 0;
exports.loadRuntimeConfig = loadRuntimeConfig;
const fs = __importStar(require("node:fs"));
const yaml_1 = __importDefault(require("yaml"));
const schema_1 = require("./schema");
const bootstrap_1 = require("./bootstrap");
Object.defineProperty(exports, "CONFIG_PATH", { enumerable: true, get: function () { return bootstrap_1.CONFIG_PATH; } });
Object.defineProperty(exports, "ensureConfigFile", { enumerable: true, get: function () { return bootstrap_1.ensureConfigFile; } });
function mergeWithDefaults(parsed) {
    const defaults = (0, bootstrap_1.defaultRuntimeConfig)();
    const candidate = (parsed && typeof parsed === 'object' ? parsed : {});
    return {
        ...defaults,
        ...candidate,
        gateway: {
            ...defaults.gateway,
            ...(candidate.gateway || {}),
            token: candidate.gateway?.token || defaults.gateway.token,
            tokenUpdatedAt: candidate.gateway?.tokenUpdatedAt || defaults.gateway.tokenUpdatedAt,
            trustProxy: candidate.gateway?.trustProxy ?? defaults.gateway.trustProxy,
            enforceLoopbackToken: candidate.gateway?.enforceLoopbackToken ?? defaults.gateway.enforceLoopbackToken,
        },
        providers: {
            ...defaults.providers,
            ...(candidate.providers || {}),
            openai: {
                ...defaults.providers.openai,
                ...(candidate.providers?.openai || {}),
            },
            anthropic: {
                ...defaults.providers.anthropic,
                ...(candidate.providers?.anthropic || {}),
            },
            openrouter: {
                ...defaults.providers.openrouter,
                ...(candidate.providers?.openrouter || {}),
            },
            order: candidate.providers?.order || defaults.providers.order,
        },
        channels: {
            ...defaults.channels,
            ...(candidate.channels || {}),
        },
        agent: {
            ...defaults.agent,
            ...(candidate.agent || {}),
        },
        security: {
            ...defaults.security,
            ...(candidate.security || {}),
            execAllowlist: candidate.security?.execAllowlist || defaults.security.execAllowlist,
            execRequireApproval: candidate.security?.execRequireApproval || defaults.security.execRequireApproval,
            approvalBypassEnv: candidate.security?.approvalBypassEnv || defaults.security.approvalBypassEnv,
            rateLimit: {
                ...defaults.security.rateLimit,
                ...(candidate.security?.rateLimit || {}),
                enabled: candidate.security?.rateLimit?.enabled ?? defaults.security.rateLimit.enabled,
                requestsPerMinute: candidate.security?.rateLimit?.requestsPerMinute || defaults.security.rateLimit.requestsPerMinute,
                burst: candidate.security?.rateLimit?.burst || defaults.security.rateLimit.burst,
            },
        },
        sessions: {
            ...defaults.sessions,
            ...(candidate.sessions || {}),
            maxSizeMb: candidate.sessions?.maxSizeMb || defaults.sessions.maxSizeMb,
            ttlDays: candidate.sessions?.ttlDays || defaults.sessions.ttlDays,
        },
    };
}
function loadRuntimeConfig() {
    (0, bootstrap_1.ensureConfigFile)();
    const yamlText = fs.readFileSync(bootstrap_1.CONFIG_PATH, 'utf8');
    const parsed = yaml_1.default.parse(yamlText);
    const merged = mergeWithDefaults(parsed);
    return schema_1.runtimeConfigSchema.parse(merged);
}

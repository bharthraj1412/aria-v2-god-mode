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
exports.createSession = createSession;
exports.getOrCreateSession = getOrCreateSession;
exports.appendSessionEntry = appendSessionEntry;
exports.listSessions = listSessions;
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const node_crypto_1 = require("node:crypto");
const bootstrap_1 = require("../config/bootstrap");
const config_1 = require("../config");
const sessions = new Map();
function sessionFilePath(sessionId) {
    return path.join(bootstrap_1.SESSIONS_DIR, `${sessionId}.jsonl`);
}
function isJsonlSessionFile(fileName) {
    return fileName.endsWith('.jsonl');
}
function cleanupExpiredSessionFiles(ttlDays) {
    const ttlMs = ttlDays * 24 * 60 * 60 * 1000;
    const threshold = Date.now() - ttlMs;
    for (const fileName of fs.readdirSync(bootstrap_1.SESSIONS_DIR)) {
        if (!isJsonlSessionFile(fileName)) {
            continue;
        }
        const filePath = path.join(bootstrap_1.SESSIONS_DIR, fileName);
        let stats;
        try {
            stats = fs.statSync(filePath);
        }
        catch {
            continue;
        }
        if (stats.mtimeMs < threshold) {
            try {
                fs.unlinkSync(filePath);
            }
            catch {
                // Ignore best-effort cleanup failures.
            }
        }
    }
}
function rotateSessionFileIfNeeded(filePath, maxSizeMb, nextLineBytes) {
    if (!fs.existsSync(filePath)) {
        return;
    }
    const maxBytes = maxSizeMb * 1024 * 1024;
    const currentBytes = fs.statSync(filePath).size;
    if (currentBytes + nextLineBytes <= maxBytes) {
        return;
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rotatedPath = filePath.replace(/\.jsonl$/, `.${timestamp}.jsonl`);
    fs.renameSync(filePath, rotatedPath);
}
function createSession() {
    (0, bootstrap_1.ensureOpenClawHome)();
    const now = new Date().toISOString();
    const session = {
        id: (0, node_crypto_1.randomUUID)(),
        createdAt: now,
        updatedAt: now,
        entries: [],
    };
    sessions.set(session.id, session);
    return session;
}
function getOrCreateSession(sessionId) {
    if (sessionId) {
        const existing = sessions.get(sessionId);
        if (existing) {
            return existing;
        }
    }
    return createSession();
}
function appendSessionEntry(sessionId, entry) {
    (0, bootstrap_1.ensureOpenClawHome)();
    const config = (0, config_1.loadRuntimeConfig)();
    cleanupExpiredSessionFiles(config.sessions.ttlDays);
    const session = getOrCreateSession(sessionId);
    session.entries.push(entry);
    session.updatedAt = entry.timestamp;
    const filePath = sessionFilePath(session.id);
    const line = `${JSON.stringify(entry)}\n`;
    rotateSessionFileIfNeeded(filePath, config.sessions.maxSizeMb, Buffer.byteLength(line));
    fs.appendFileSync(filePath, line, 'utf8');
}
function listSessions() {
    return Array.from(sessions.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

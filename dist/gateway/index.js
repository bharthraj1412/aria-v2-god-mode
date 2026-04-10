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
exports.startGateway = startGateway;
const http = __importStar(require("node:http"));
const node_crypto_1 = require("node:crypto");
const ws_1 = require("ws");
const config_1 = require("../config");
const channels_1 = require("../channels");
const runner_1 = require("../agents/runner");
const sessions_1 = require("../sessions");
const logging_1 = require("../logging");
const auth_1 = require("./auth");
const rate_limit_1 = require("../security/rate-limit");
function jsonResponse(res, statusCode, body, extraHeaders) {
    const payload = JSON.stringify(body);
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(payload),
        ...(extraHeaders || {}),
    });
    res.end(payload);
}
async function parseBody(req) {
    const chunks = [];
    for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString('utf8');
}
async function startGateway() {
    const config = (0, config_1.loadRuntimeConfig)();
    const sockets = new Set();
    const rateLimiter = config.security.rateLimit.enabled
        ? new rate_limit_1.TokenBucketRateLimiter({
            requestsPerMinute: config.security.rateLimit.requestsPerMinute,
            burst: config.security.rateLimit.burst,
        })
        : undefined;
    const lastAssistantMetadata = (sessionEntries) => {
        for (let index = sessionEntries.length - 1; index >= 0; index -= 1) {
            const entry = sessionEntries[index];
            if (entry.role === 'assistant') {
                return {
                    lastRequestId: entry.requestId,
                    lastProvider: entry.provider,
                    lastModel: entry.model,
                    lastProviderRequested: entry.requestedProvider,
                };
            }
        }
        return {
            lastRequestId: undefined,
            lastProvider: undefined,
            lastModel: undefined,
            lastProviderRequested: undefined,
        };
    };
    const emit = (event) => {
        const payload = JSON.stringify(event);
        for (const socket of sockets) {
            if (socket.readyState === 1) {
                socket.send(payload);
            }
        }
    };
    const sessionSummaries = () => (0, sessions_1.listSessions)().map(session => ({
        id: session.id,
        updatedAt: session.updatedAt,
        entries: session.entries.length,
        ...lastAssistantMetadata(session.entries),
    }));
    const server = http.createServer(async (req, res) => {
        if (!req.url) {
            jsonResponse(res, 404, { error: 'Not found' });
            return;
        }
        const headerToken = req.headers['x-openclaw-token'];
        const providedToken = Array.isArray(headerToken) ? headerToken[0] : headerToken;
        const forwardedFor = req.headers['x-forwarded-for'];
        const forwardedForHeader = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
        const clientAddress = (0, auth_1.resolveClientAddress)({
            remoteAddress: req.socket.remoteAddress,
            forwardedForHeader,
            trustProxy: config.gateway.trustProxy,
        });
        if (!(0, auth_1.isAuthorizedGatewayRequest)({
            configuredToken: config.gateway.token,
            remoteAddress: clientAddress,
            providedToken,
            enforceLoopbackToken: config.gateway.enforceLoopbackToken,
        })) {
            jsonResponse(res, 401, { error: 'Unauthorized' });
            return;
        }
        if (req.method === 'GET' && req.url === '/health') {
            jsonResponse(res, 200, {
                status: 'running',
                host: config.gateway.host,
                port: config.gateway.port,
                auth: {
                    tokenConfigured: Boolean(config.gateway.token?.trim()),
                    trustProxy: Boolean(config.gateway.trustProxy),
                    enforceLoopbackToken: Boolean(config.gateway.enforceLoopbackToken),
                },
                rateLimit: {
                    enabled: Boolean(config.security.rateLimit.enabled),
                    requestsPerMinute: config.security.rateLimit.requestsPerMinute,
                    burst: config.security.rateLimit.burst,
                },
                sessions: sessionSummaries(),
            });
            return;
        }
        if (req.method === 'POST' && req.url === '/chat') {
            const requestId = (0, node_crypto_1.randomUUID)();
            try {
                if (rateLimiter) {
                    const key = `${clientAddress || 'unknown'}:${providedToken ? 'auth' : 'anon'}`;
                    const rateLimit = rateLimiter.check(key);
                    if (!rateLimit.allowed) {
                        jsonResponse(res, 429, {
                            error: 'Rate limit exceeded',
                            retryAfterSec: rateLimit.retryAfterSec,
                        }, { 'Retry-After': String(rateLimit.retryAfterSec) });
                        return;
                    }
                }
                const raw = await parseBody(req);
                const parsed = JSON.parse(raw);
                if (!parsed.message || !parsed.message.trim()) {
                    jsonResponse(res, 400, { error: 'message is required' });
                    return;
                }
                if (parsed.provider &&
                    parsed.provider !== 'openai' &&
                    parsed.provider !== 'anthropic' &&
                    parsed.provider !== 'openrouter') {
                    jsonResponse(res, 400, { error: 'provider must be one of: openai, anthropic, openrouter' });
                    return;
                }
                const session = (0, sessions_1.getOrCreateSession)(parsed.sessionId);
                const channelName = parsed.channel || config.channels.default;
                const channel = (0, channels_1.getChannel)(channelName);
                const channelResult = await channel.handle({ message: parsed.message });
                (0, logging_1.logInfo)('chat.received', {
                    event: 'chat.received',
                    requestId,
                    sessionId: session.id,
                    channel: channelName,
                    providerRequested: parsed.provider || 'auto',
                });
                emit({
                    type: 'chat.received',
                    sessionId: session.id,
                    requestId,
                    channel: channelName,
                    message: parsed.message,
                    preferredProvider: parsed.provider,
                    timestamp: new Date().toISOString(),
                });
                const userEntry = {
                    role: 'user',
                    content: parsed.message,
                    timestamp: new Date().toISOString(),
                    requestId,
                };
                (0, sessions_1.appendSessionEntry)(session.id, userEntry);
                emit({
                    type: 'session.entry',
                    sessionId: session.id,
                    requestId,
                    role: userEntry.role,
                    content: userEntry.content,
                    timestamp: userEntry.timestamp,
                });
                if (channelResult.metadata?.mode === 'local-exec') {
                    const assistantEntry = {
                        role: 'assistant',
                        content: channelResult.content,
                        timestamp: new Date().toISOString(),
                        requestId,
                        provider: 'local-exec',
                        model: 'shell',
                        requestedProvider: parsed.provider || 'auto',
                    };
                    (0, sessions_1.appendSessionEntry)(session.id, assistantEntry);
                    emit({
                        type: 'session.entry',
                        sessionId: session.id,
                        requestId,
                        role: assistantEntry.role,
                        provider: assistantEntry.provider,
                        model: assistantEntry.model,
                        content: assistantEntry.content,
                        timestamp: assistantEntry.timestamp,
                    });
                    emit({
                        type: 'chat.completed',
                        sessionId: session.id,
                        requestId,
                        channel: channelName,
                        providerRequested: parsed.provider || 'auto',
                        provider: 'local-exec',
                        model: 'shell',
                        timestamp: new Date().toISOString(),
                    });
                    jsonResponse(res, 200, {
                        sessionId: session.id,
                        requestId,
                        channel: channelName,
                        providerRequested: parsed.provider || 'auto',
                        provider: 'local-exec',
                        model: 'shell',
                        response: channelResult.content,
                    });
                    return;
                }
                const agentResult = await (0, runner_1.runAgent)(config, channelResult.content, parsed.provider);
                const assistantEntry = {
                    role: 'assistant',
                    content: agentResult.content,
                    timestamp: new Date().toISOString(),
                    requestId,
                    requestedProvider: parsed.provider || 'auto',
                    provider: agentResult.provider,
                    model: agentResult.model,
                };
                (0, sessions_1.appendSessionEntry)(session.id, assistantEntry);
                emit({
                    type: 'session.entry',
                    sessionId: session.id,
                    requestId,
                    role: assistantEntry.role,
                    provider: assistantEntry.provider,
                    model: assistantEntry.model,
                    content: assistantEntry.content,
                    timestamp: assistantEntry.timestamp,
                });
                emit({
                    type: 'chat.completed',
                    sessionId: session.id,
                    requestId,
                    channel: channelName,
                    providerRequested: parsed.provider || 'auto',
                    provider: agentResult.provider,
                    model: agentResult.model,
                    timestamp: new Date().toISOString(),
                });
                jsonResponse(res, 200, {
                    sessionId: session.id,
                    requestId,
                    channel: channelName,
                    providerRequested: parsed.provider || 'auto',
                    provider: agentResult.provider,
                    model: agentResult.model,
                    response: agentResult.content,
                });
            }
            catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown gateway error';
                (0, logging_1.logError)('chat.failed', {
                    event: 'chat.failed',
                    requestId,
                    error: message,
                });
                emit({
                    type: 'chat.failed',
                    requestId,
                    error: message,
                    timestamp: new Date().toISOString(),
                });
                jsonResponse(res, 500, { requestId, error: message });
            }
            return;
        }
        jsonResponse(res, 404, { error: 'Not found' });
    });
    const ws = new ws_1.WebSocketServer({ server });
    ws.on('connection', (socket, req) => {
        const headerToken = req.headers['x-openclaw-token'];
        const providedToken = Array.isArray(headerToken) ? headerToken[0] : headerToken;
        const forwardedFor = req.headers['x-forwarded-for'];
        const forwardedForHeader = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
        const clientAddress = (0, auth_1.resolveClientAddress)({
            remoteAddress: req.socket.remoteAddress,
            forwardedForHeader,
            trustProxy: config.gateway.trustProxy,
        });
        if (!(0, auth_1.isAuthorizedGatewayRequest)({
            configuredToken: config.gateway.token,
            remoteAddress: clientAddress,
            providedToken,
            enforceLoopbackToken: config.gateway.enforceLoopbackToken,
        })) {
            socket.close(1008, 'Unauthorized');
            return;
        }
        sockets.add(socket);
        socket.on('close', () => {
            sockets.delete(socket);
        });
        const welcomeEvent = { type: 'welcome', status: 'connected' };
        const snapshotEvent = {
            type: 'snapshot.sessions',
            timestamp: new Date().toISOString(),
            sessions: sessionSummaries(),
        };
        socket.send(JSON.stringify(welcomeEvent));
        socket.send(JSON.stringify(snapshotEvent));
        (0, logging_1.logInfo)('gateway.ws.connected', {
            event: 'gateway.ws.connected',
            sessions: snapshotEvent.sessions.length,
        });
    });
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(config.gateway.port, config.gateway.host, () => resolve());
    });
    emit({
        type: 'gateway.started',
        host: config.gateway.host,
        port: config.gateway.port,
        timestamp: new Date().toISOString(),
    });
    return {
        port: config.gateway.port,
        stop: async () => {
            await new Promise((resolve, reject) => {
                ws.close((error) => {
                    if (error) {
                        reject(error);
                        return;
                    }
                    server.close(closeError => {
                        if (closeError) {
                            reject(closeError);
                            return;
                        }
                        resolve();
                    });
                });
            });
        },
    };
}

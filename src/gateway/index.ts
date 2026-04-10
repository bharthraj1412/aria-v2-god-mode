import * as http from 'node:http';
import { randomUUID } from 'node:crypto';
import { WebSocketServer } from 'ws';
import type { WebSocket } from 'ws';
import { loadRuntimeConfig } from '../config';
import type { ProviderName } from '../config/types';
import { getChannel } from '../channels';
import { runAgent } from '../agents/runner';
import { appendSessionEntry, getOrCreateSession, listSessions } from '../sessions';
import type { SessionEntry } from '../sessions/types';
import type {
  GatewayEvent,
  GatewaySessionSummary,
  GatewaySnapshotSessionsEvent,
  GatewayWelcomeEvent,
} from './events';
import { logError, logInfo } from '../logging';
import { isAuthorizedGatewayRequest, resolveClientAddress } from './auth';
import { TokenBucketRateLimiter } from '../security/rate-limit';

export interface GatewayRuntime {
  stop: () => Promise<void>;
  port: number;
}

function jsonResponse(
  res: http.ServerResponse,
  statusCode: number,
  body: unknown,
  extraHeaders?: Record<string, string>,
): void {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    ...(extraHeaders || {}),
  });
  res.end(payload);
}

async function parseBody(req: http.IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

export async function startGateway(): Promise<GatewayRuntime> {
  const config = loadRuntimeConfig();
  const sockets = new Set<WebSocket>();
  const rateLimiter = config.security.rateLimit.enabled
    ? new TokenBucketRateLimiter({
      requestsPerMinute: config.security.rateLimit.requestsPerMinute,
      burst: config.security.rateLimit.burst,
    })
    : undefined;

  const lastAssistantMetadata = (
    sessionEntries: SessionEntry[],
  ): Pick<GatewaySessionSummary, 'lastRequestId' | 'lastProvider' | 'lastModel' | 'lastProviderRequested'> => {
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

  const emit = (event: GatewayEvent): void => {
    const payload = JSON.stringify(event);
    for (const socket of sockets) {
      if (socket.readyState === 1) {
        socket.send(payload);
      }
    }
  };

  const sessionSummaries = (): GatewaySessionSummary[] =>
    listSessions().map(session => ({
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
    const clientAddress = resolveClientAddress({
      remoteAddress: req.socket.remoteAddress,
      forwardedForHeader,
      trustProxy: config.gateway.trustProxy,
    });
    if (
      !isAuthorizedGatewayRequest({
        configuredToken: config.gateway.token,
        remoteAddress: clientAddress,
        providedToken,
        enforceLoopbackToken: config.gateway.enforceLoopbackToken,
      })
    ) {
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
      const requestId = randomUUID();
      try {
        if (rateLimiter) {
          const key = `${clientAddress || 'unknown'}:${providedToken ? 'auth' : 'anon'}`;
          const rateLimit = rateLimiter.check(key);
          if (!rateLimit.allowed) {
            jsonResponse(
              res,
              429,
              {
                error: 'Rate limit exceeded',
                retryAfterSec: rateLimit.retryAfterSec,
              },
              { 'Retry-After': String(rateLimit.retryAfterSec) },
            );
            return;
          }
        }

        const raw = await parseBody(req);
        const parsed = JSON.parse(raw) as {
          message: string;
          sessionId?: string;
          channel?: string;
          provider?: ProviderName;
        };

        if (!parsed.message || !parsed.message.trim()) {
          jsonResponse(res, 400, { error: 'message is required' });
          return;
        }

        if (parsed.provider && parsed.provider !== 'openai' && parsed.provider !== 'anthropic') {
          jsonResponse(res, 400, { error: 'provider must be one of: openai, anthropic' });
          return;
        }

        const session = getOrCreateSession(parsed.sessionId);
        const channelName = parsed.channel || config.channels.default;
        const channel = getChannel(channelName);
        const channelResult = await channel.handle({ message: parsed.message });
        logInfo('chat.received', {
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
        } as const;
        appendSessionEntry(session.id, userEntry);
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
          } as const;
          appendSessionEntry(session.id, assistantEntry);
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

        const agentResult = await runAgent(config, channelResult.content, parsed.provider);

        const assistantEntry = {
          role: 'assistant',
          content: agentResult.content,
          timestamp: new Date().toISOString(),
          requestId,
          requestedProvider: parsed.provider || 'auto',
          provider: agentResult.provider,
          model: agentResult.model,
        } as const;
        appendSessionEntry(session.id, assistantEntry);
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
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown gateway error';
        logError('chat.failed', {
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

  const ws = new WebSocketServer({ server });
  ws.on('connection', (socket: WebSocket, req: http.IncomingMessage) => {
    const headerToken = req.headers['x-openclaw-token'];
    const providedToken = Array.isArray(headerToken) ? headerToken[0] : headerToken;
    const forwardedFor = req.headers['x-forwarded-for'];
    const forwardedForHeader = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    const clientAddress = resolveClientAddress({
      remoteAddress: req.socket.remoteAddress,
      forwardedForHeader,
      trustProxy: config.gateway.trustProxy,
    });
    if (
      !isAuthorizedGatewayRequest({
        configuredToken: config.gateway.token,
        remoteAddress: clientAddress,
        providedToken,
        enforceLoopbackToken: config.gateway.enforceLoopbackToken,
      })
    ) {
      socket.close(1008, 'Unauthorized');
      return;
    }

    sockets.add(socket);
    socket.on('close', () => {
      sockets.delete(socket);
    });
    const welcomeEvent: GatewayWelcomeEvent = { type: 'welcome', status: 'connected' };
    const snapshotEvent: GatewaySnapshotSessionsEvent = {
      type: 'snapshot.sessions',
      timestamp: new Date().toISOString(),
      sessions: sessionSummaries(),
    };
    socket.send(JSON.stringify(welcomeEvent));
    socket.send(JSON.stringify(snapshotEvent));
    logInfo('gateway.ws.connected', {
      event: 'gateway.ws.connected',
      sessions: snapshotEvent.sessions.length,
    });
  });

  await new Promise<void>((resolve, reject) => {
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
      await new Promise<void>((resolve, reject) => {
        ws.close((error?: Error) => {
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

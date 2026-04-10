import * as fs from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { SESSIONS_DIR, ensureOpenClawHome } from '../config/bootstrap';
import { loadRuntimeConfig } from '../config';
import type { Session, SessionEntry } from './types';

const sessions = new Map<string, Session>();

function sessionFilePath(sessionId: string): string {
  return path.join(SESSIONS_DIR, `${sessionId}.jsonl`);
}

function isJsonlSessionFile(fileName: string): boolean {
  return fileName.endsWith('.jsonl');
}

function cleanupExpiredSessionFiles(ttlDays: number): void {
  const ttlMs = ttlDays * 24 * 60 * 60 * 1000;
  const threshold = Date.now() - ttlMs;

  for (const fileName of fs.readdirSync(SESSIONS_DIR)) {
    if (!isJsonlSessionFile(fileName)) {
      continue;
    }

    const filePath = path.join(SESSIONS_DIR, fileName);
    let stats: fs.Stats;
    try {
      stats = fs.statSync(filePath);
    } catch {
      continue;
    }

    if (stats.mtimeMs < threshold) {
      try {
        fs.unlinkSync(filePath);
      } catch {
        // Ignore best-effort cleanup failures.
      }
    }
  }
}

function rotateSessionFileIfNeeded(filePath: string, maxSizeMb: number, nextLineBytes: number): void {
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

export function createSession(): Session {
  ensureOpenClawHome();
  const now = new Date().toISOString();
  const session: Session = {
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    entries: [],
  };
  sessions.set(session.id, session);
  return session;
}

export function getOrCreateSession(sessionId?: string): Session {
  if (sessionId) {
    const existing = sessions.get(sessionId);
    if (existing) {
      return existing;
    }
  }
  return createSession();
}

export function appendSessionEntry(sessionId: string, entry: SessionEntry): void {
  ensureOpenClawHome();
  const config = loadRuntimeConfig();
  cleanupExpiredSessionFiles(config.sessions.ttlDays);

  const session = getOrCreateSession(sessionId);
  session.entries.push(entry);
  session.updatedAt = entry.timestamp;

  const filePath = sessionFilePath(session.id);
  const line = `${JSON.stringify(entry)}\n`;
  rotateSessionFileIfNeeded(filePath, config.sessions.maxSizeMb, Buffer.byteLength(line));
  fs.appendFileSync(filePath, line, 'utf8');
}

export function listSessions(): Session[] {
  return Array.from(sessions.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

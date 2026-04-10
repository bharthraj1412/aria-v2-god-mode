import * as fs from 'node:fs';
import * as path from 'node:path';
import type { RuntimeConfig } from '../config/types';

const fallbackPrompt = [
  'You are OpenClaw Ultimate Agent in runtime mode.',
  'Operate safely, be concise, and prioritize executable next steps.',
  'Use local-exec only when explicitly requested with exec:.',
].join(' ');

export function loadSystemPrompt(config: RuntimeConfig): string {
  const absolutePath = path.isAbsolute(config.agent.systemPromptPath)
    ? config.agent.systemPromptPath
    : path.join(process.cwd(), config.agent.systemPromptPath);

  if (!fs.existsSync(absolutePath)) {
    return fallbackPrompt;
  }

  const text = fs.readFileSync(absolutePath, 'utf8').trim();
  return text.length > 0 ? text : fallbackPrompt;
}

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { Channel, ChannelInput, ChannelOutput } from '../contract';
import { loadRuntimeConfig } from '../../config';
import { evaluateExecPolicy } from '../../security/policy';

const execAsync = promisify(exec);

async function runLocalCommand(command: string): Promise<ChannelOutput> {
  try {
    const { stdout, stderr } = await execAsync(command, { timeout: 30_000, windowsHide: true });
    const combined = [stdout?.trim(), stderr?.trim()].filter(Boolean).join('\n');
    return {
      content: combined || '(command completed with no output)',
      metadata: { mode: 'local-exec' },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown local command failure';
    return {
      content: `Local command failed: ${message}`,
      metadata: { mode: 'local-exec' },
    };
  }
}

export const localExecChannel: Channel = {
  name: 'local-exec',
  async handle(input: ChannelInput): Promise<ChannelOutput> {
    const trimmed = input.message.trim();
    if (!trimmed.toLowerCase().startsWith('exec:')) {
      return {
        content: trimmed,
        metadata: { mode: 'pass-through' },
      };
    }

    const command = trimmed.slice(5).trim();
    if (!command) {
      return { content: 'No command provided. Use exec: <command>' };
    }

    const config = loadRuntimeConfig();
    const decision = evaluateExecPolicy(config, command);
    if (!decision.allowed) {
      return {
        content: decision.reason || 'Command blocked by security policy.',
        metadata: {
          mode: 'local-exec',
          policy: decision.requiresApproval ? 'requires-approval' : 'blocked',
        },
      };
    }

    return runLocalCommand(command);
  },
};

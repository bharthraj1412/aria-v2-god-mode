import { localExecChannel } from './local';
import type { Channel } from './contract';

const channels = new Map<string, Channel>([[localExecChannel.name, localExecChannel]]);

export function getChannel(name: string): Channel {
  const channel = channels.get(name);
  if (!channel) {
    throw new Error(`Unknown channel: ${name}`);
  }
  return channel;
}

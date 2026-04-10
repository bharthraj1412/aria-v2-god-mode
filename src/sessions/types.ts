import type { ProviderName } from '../config/types';

export interface SessionEntry {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: string;
  requestId: string;
  provider?: string;
  model?: string;
  requestedProvider?: 'auto' | ProviderName;
}

export interface Session {
  id: string;
  createdAt: string;
  updatedAt: string;
  entries: SessionEntry[];
}

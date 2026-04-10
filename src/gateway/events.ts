import type { ProviderName } from '../config/types';

export interface GatewaySessionSummary {
  id: string;
  updatedAt: string;
  entries: number;
  lastRequestId?: string;
  lastProvider?: string;
  lastModel?: string;
  lastProviderRequested?: 'auto' | ProviderName;
}

export interface GatewayStartedEvent {
  type: 'gateway.started';
  host: string;
  port: number;
  timestamp: string;
}

export interface GatewayWelcomeEvent {
  type: 'welcome';
  status: 'connected';
}

export interface GatewaySnapshotSessionsEvent {
  type: 'snapshot.sessions';
  timestamp: string;
  sessions: GatewaySessionSummary[];
}

export interface GatewayChatReceivedEvent {
  type: 'chat.received';
  sessionId: string;
  requestId: string;
  channel: string;
  message: string;
  preferredProvider?: ProviderName;
  timestamp: string;
}

export interface GatewaySessionEntryEvent {
  type: 'session.entry';
  sessionId: string;
  requestId: string;
  role: 'user' | 'assistant';
  provider?: string;
  model?: string;
  content: string;
  timestamp: string;
}

export interface GatewayChatCompletedEvent {
  type: 'chat.completed';
  sessionId: string;
  requestId: string;
  channel: string;
  providerRequested: 'auto' | ProviderName;
  provider: string;
  model: string;
  timestamp: string;
}

export interface GatewayChatFailedEvent {
  type: 'chat.failed';
  sessionId?: string;
  requestId?: string;
  channel?: string;
  error: string;
  timestamp: string;
}

export type GatewayEvent =
  | GatewayStartedEvent
  | GatewayWelcomeEvent
  | GatewaySnapshotSessionsEvent
  | GatewayChatReceivedEvent
  | GatewaySessionEntryEvent
  | GatewayChatCompletedEvent
  | GatewayChatFailedEvent;

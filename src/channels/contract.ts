export interface ChannelInput {
  message: string;
}

export interface ChannelOutput {
  content: string;
  metadata?: Record<string, string>;
}

export interface Channel {
  name: string;
  handle(input: ChannelInput): Promise<ChannelOutput>;
}

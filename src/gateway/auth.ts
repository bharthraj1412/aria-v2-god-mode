export function isLoopbackAddress(address: string | undefined): boolean {
  if (!address) {
    return false;
  }

  const normalized = address.toLowerCase();
  return (
    normalized === '127.0.0.1' ||
    normalized === '::1' ||
    normalized === '::ffff:127.0.0.1'
  );
}

export interface GatewayAuthInput {
  configuredToken?: string;
  remoteAddress?: string;
  providedToken?: string;
  enforceLoopbackToken?: boolean;
}

export function parseForwardedAddress(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const first = value.split(',')[0]?.trim();
  return first || undefined;
}

export interface ResolveClientAddressInput {
  remoteAddress?: string;
  forwardedForHeader?: string;
  trustProxy?: boolean;
}

export function resolveClientAddress(input: ResolveClientAddressInput): string | undefined {
  if (input.trustProxy) {
    const forwarded = parseForwardedAddress(input.forwardedForHeader);
    if (forwarded) {
      return forwarded;
    }
  }

  return input.remoteAddress;
}

export function isAuthorizedGatewayRequest(input: GatewayAuthInput): boolean {
  const configured = input.configuredToken?.trim();
  if (!configured) {
    return true;
  }

  if (isLoopbackAddress(input.remoteAddress) && !input.enforceLoopbackToken) {
    return true;
  }

  return input.providedToken === configured;
}

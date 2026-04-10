"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isLoopbackAddress = isLoopbackAddress;
exports.parseForwardedAddress = parseForwardedAddress;
exports.resolveClientAddress = resolveClientAddress;
exports.isAuthorizedGatewayRequest = isAuthorizedGatewayRequest;
function isLoopbackAddress(address) {
    if (!address) {
        return false;
    }
    const normalized = address.toLowerCase();
    return (normalized === '127.0.0.1' ||
        normalized === '::1' ||
        normalized === '::ffff:127.0.0.1');
}
function parseForwardedAddress(value) {
    if (!value) {
        return undefined;
    }
    const first = value.split(',')[0]?.trim();
    return first || undefined;
}
function resolveClientAddress(input) {
    if (input.trustProxy) {
        const forwarded = parseForwardedAddress(input.forwardedForHeader);
        if (forwarded) {
            return forwarded;
        }
    }
    return input.remoteAddress;
}
function isAuthorizedGatewayRequest(input) {
    const configured = input.configuredToken?.trim();
    if (!configured) {
        return true;
    }
    if (isLoopbackAddress(input.remoteAddress) && !input.enforceLoopbackToken) {
        return true;
    }
    return input.providedToken === configured;
}

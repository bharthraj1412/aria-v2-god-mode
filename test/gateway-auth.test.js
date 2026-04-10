const assert = require('node:assert/strict');
const test = require('node:test');
const {
  isLoopbackAddress,
  isAuthorizedGatewayRequest,
  parseForwardedAddress,
  resolveClientAddress,
} = require('../dist/gateway/auth.js');

test('isLoopbackAddress recognizes standard localhost forms', () => {
  assert.equal(isLoopbackAddress('127.0.0.1'), true);
  assert.equal(isLoopbackAddress('::1'), true);
  assert.equal(isLoopbackAddress('::ffff:127.0.0.1'), true);
  assert.equal(isLoopbackAddress('192.168.1.4'), false);
  assert.equal(isLoopbackAddress(undefined), false);
});

test('gateway auth allows when token is not configured', () => {
  const allowed = isAuthorizedGatewayRequest({
    configuredToken: undefined,
    remoteAddress: '203.0.113.10',
    providedToken: undefined,
  });
  assert.equal(allowed, true);
});

test('gateway auth allows loopback even with token configured', () => {
  const allowed = isAuthorizedGatewayRequest({
    configuredToken: 'secret-token',
    remoteAddress: '127.0.0.1',
    providedToken: undefined,
  });
  assert.equal(allowed, true);
});

test('gateway auth requires matching token for non-loopback', () => {
  const denied = isAuthorizedGatewayRequest({
    configuredToken: 'secret-token',
    remoteAddress: '203.0.113.10',
    providedToken: 'wrong-token',
  });
  assert.equal(denied, false);

  const allowed = isAuthorizedGatewayRequest({
    configuredToken: 'secret-token',
    remoteAddress: '203.0.113.10',
    providedToken: 'secret-token',
  });
  assert.equal(allowed, true);
});

test('parseForwardedAddress returns first forwarded IP', () => {
  assert.equal(parseForwardedAddress('203.0.113.10, 10.0.0.5'), '203.0.113.10');
  assert.equal(parseForwardedAddress(' 198.51.100.22 '), '198.51.100.22');
  assert.equal(parseForwardedAddress(undefined), undefined);
});

test('resolveClientAddress prefers forwarded header only when trustProxy is enabled', () => {
  const withoutTrust = resolveClientAddress({
    remoteAddress: '127.0.0.1',
    forwardedForHeader: '203.0.113.10',
    trustProxy: false,
  });
  assert.equal(withoutTrust, '127.0.0.1');

  const withTrust = resolveClientAddress({
    remoteAddress: '127.0.0.1',
    forwardedForHeader: '203.0.113.10',
    trustProxy: true,
  });
  assert.equal(withTrust, '203.0.113.10');
});

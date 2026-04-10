const assert = require('node:assert/strict');
const test = require('node:test');
const { TokenBucketRateLimiter } = require('../dist/security/rate-limit.js');

test('token bucket limiter allows bursts then throttles and recovers over time', () => {
  let now = 0;
  const limiter = new TokenBucketRateLimiter(
    {
      requestsPerMinute: 60,
      burst: 2,
    },
    () => now,
  );

  const first = limiter.check('k');
  const second = limiter.check('k');
  const third = limiter.check('k');

  assert.equal(first.allowed, true);
  assert.equal(second.allowed, true);
  assert.equal(third.allowed, false);
  assert.equal(third.retryAfterSec, 1);

  now += 1000;
  const fourth = limiter.check('k');
  assert.equal(fourth.allowed, true);
});

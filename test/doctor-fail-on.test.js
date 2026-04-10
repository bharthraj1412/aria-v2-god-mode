const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const test = require('node:test');
const YAML = require('yaml');

const repoRoot = path.resolve(__dirname, '..');
const cliPath = path.join(repoRoot, 'dist', 'cli', 'index.js');
const testPort = 19998;

function createTempHome() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'openclaw-home-doctor-'));
  fs.mkdirSync(path.join(home, '.openclaw'), { recursive: true });
  return home;
}

function spawnCli(args, env) {
  const child = spawn(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    env: {
      ...process.env,
      ...env,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';
  child.stdout.on('data', chunk => {
    stdout += chunk.toString();
  });
  child.stderr.on('data', chunk => {
    stderr += chunk.toString();
  });

  return { child, stdout: () => stdout, stderr: () => stderr };
}

test('doctor --fail-on none exits 0 even when gateway is unreachable', async () => {
  const tempHome = createTempHome();
  const env = {
    USERPROFILE: tempHome,
    HOME: tempHome,
  };

  const onboard = spawnCli(['onboard'], env);
  const [onboardCode] = await once(onboard.child, 'close');
  assert.equal(onboardCode, 0, onboard.stderr());

  const configPath = path.join(tempHome, '.openclaw', 'config.yml');
  const parsedConfig = YAML.parse(fs.readFileSync(configPath, 'utf8'));
  parsedConfig.gateway = {
    ...parsedConfig.gateway,
    host: '127.0.0.1',
    port: testPort,
  };
  fs.writeFileSync(configPath, YAML.stringify(parsedConfig), 'utf8');

  const doctor = spawnCli(['doctor', '--json', '--fail-on', 'none'], env);
  const [doctorCode] = await once(doctor.child, 'close');
  assert.equal(doctorCode, 0, doctor.stderr());

  const report = JSON.parse(doctor.stdout());
  assert.equal(report.gatewayReachability.ok, false);
  assert.deepEqual(report.failOn, []);
  assert.deepEqual(report.failures, []);
});

test('doctor --fail-on gateway exits 1 when gateway is unreachable', async () => {
  const tempHome = createTempHome();
  const env = {
    USERPROFILE: tempHome,
    HOME: tempHome,
  };

  const onboard = spawnCli(['onboard'], env);
  const [onboardCode] = await once(onboard.child, 'close');
  assert.equal(onboardCode, 0, onboard.stderr());

  const configPath = path.join(tempHome, '.openclaw', 'config.yml');
  const parsedConfig = YAML.parse(fs.readFileSync(configPath, 'utf8'));
  parsedConfig.gateway = {
    ...parsedConfig.gateway,
    host: '127.0.0.1',
    port: testPort,
  };
  fs.writeFileSync(configPath, YAML.stringify(parsedConfig), 'utf8');

  const doctor = spawnCli(['doctor', '--json', '--fail-on', 'gateway'], env);
  const [doctorCode] = await once(doctor.child, 'close');
  assert.equal(doctorCode, 1, doctor.stderr());

  const report = JSON.parse(doctor.stdout());
  assert.deepEqual(report.failOn, ['gateway']);
  assert.ok(report.failures.some(value => value.includes('gateway unreachable')));
});

test('doctor --fail-on auth-policy exits 1 when token policy is not strict', async () => {
  const tempHome = createTempHome();
  const env = {
    USERPROFILE: tempHome,
    HOME: tempHome,
  };

  const onboard = spawnCli(['onboard'], env);
  const [onboardCode] = await once(onboard.child, 'close');
  assert.equal(onboardCode, 0, onboard.stderr());

  const doctor = spawnCli(['doctor', '--json', '--fail-on', 'auth-policy'], env);
  const [doctorCode] = await once(doctor.child, 'close');
  assert.equal(doctorCode, 1, doctor.stderr());

  const report = JSON.parse(doctor.stdout());
  assert.deepEqual(report.failOn, ['auth-policy']);
  assert.ok(report.failures.some(value => value.includes('gateway.token')));
  assert.ok(report.failures.some(value => value.includes('enforceLoopbackToken')));
});

test('doctor --fail-on auth-policy exits 0 when token policy is strict', async () => {
  const tempHome = createTempHome();
  const env = {
    USERPROFILE: tempHome,
    HOME: tempHome,
  };

  const onboard = spawnCli(['onboard'], env);
  const [onboardCode] = await once(onboard.child, 'close');
  assert.equal(onboardCode, 0, onboard.stderr());

  const configPath = path.join(tempHome, '.openclaw', 'config.yml');
  const parsedConfig = YAML.parse(fs.readFileSync(configPath, 'utf8'));
  parsedConfig.gateway = {
    ...parsedConfig.gateway,
    token: 'strict-token',
    enforceLoopbackToken: true,
  };
  fs.writeFileSync(configPath, YAML.stringify(parsedConfig), 'utf8');

  const doctor = spawnCli(['doctor', '--json', '--fail-on', 'auth-policy'], env);
  const [doctorCode] = await once(doctor.child, 'close');
  assert.equal(doctorCode, 0, doctor.stderr());

  const report = JSON.parse(doctor.stdout());
  assert.deepEqual(report.failOn, ['auth-policy']);
  assert.deepEqual(report.failures, []);
});

test('doctor --fail-on rate-limit-policy exits 1 when rate limiting is disabled', async () => {
  const tempHome = createTempHome();
  const env = {
    USERPROFILE: tempHome,
    HOME: tempHome,
  };

  const onboard = spawnCli(['onboard'], env);
  const [onboardCode] = await once(onboard.child, 'close');
  assert.equal(onboardCode, 0, onboard.stderr());

  const doctor = spawnCli(['doctor', '--json', '--fail-on', 'rate-limit-policy'], env);
  const [doctorCode] = await once(doctor.child, 'close');
  assert.equal(doctorCode, 1, doctor.stderr());

  const report = JSON.parse(doctor.stdout());
  assert.deepEqual(report.failOn, ['rate-limit-policy']);
  assert.ok(report.failures.some(value => value.includes('security.rateLimit.enabled=true')));
});

test('doctor --fail-on rate-limit-policy exits 0 when rate-limit policy thresholds are satisfied', async () => {
  const tempHome = createTempHome();
  const env = {
    USERPROFILE: tempHome,
    HOME: tempHome,
  };

  const onboard = spawnCli(['onboard'], env);
  const [onboardCode] = await once(onboard.child, 'close');
  assert.equal(onboardCode, 0, onboard.stderr());

  const configPath = path.join(tempHome, '.openclaw', 'config.yml');
  const parsedConfig = YAML.parse(fs.readFileSync(configPath, 'utf8'));
  parsedConfig.security = {
    ...parsedConfig.security,
    rateLimit: {
      enabled: true,
      requestsPerMinute: 60,
      burst: 20,
    },
  };
  fs.writeFileSync(configPath, YAML.stringify(parsedConfig), 'utf8');

  const doctor = spawnCli(
    ['doctor', '--json', '--fail-on', 'rate-limit-policy', '--min-rate-limit-rpm', '30', '--max-rate-limit-burst', '30'],
    env,
  );
  const [doctorCode] = await once(doctor.child, 'close');
  assert.equal(doctorCode, 0, doctor.stderr());

  const report = JSON.parse(doctor.stdout());
  assert.deepEqual(report.failOn, ['rate-limit-policy']);
  assert.deepEqual(report.failures, []);
});

test('doctor --fail-on token-age-policy exits 1 when tokenUpdatedAt is missing', async () => {
  const tempHome = createTempHome();
  const env = {
    USERPROFILE: tempHome,
    HOME: tempHome,
  };

  const onboard = spawnCli(['onboard'], env);
  const [onboardCode] = await once(onboard.child, 'close');
  assert.equal(onboardCode, 0, onboard.stderr());

  const doctor = spawnCli(['doctor', '--json', '--fail-on', 'token-age-policy'], env);
  const [doctorCode] = await once(doctor.child, 'close');
  assert.equal(doctorCode, 1, doctor.stderr());

  const report = JSON.parse(doctor.stdout());
  assert.deepEqual(report.failOn, ['token-age-policy']);
  assert.ok(report.failures.some(value => value.includes('gateway.tokenUpdatedAt')));
});

test('doctor --fail-on token-age-policy exits 1 for stale token and 0 for fresh token', async () => {
  const tempHome = createTempHome();
  const env = {
    USERPROFILE: tempHome,
    HOME: tempHome,
  };

  const onboard = spawnCli(['onboard'], env);
  const [onboardCode] = await once(onboard.child, 'close');
  assert.equal(onboardCode, 0, onboard.stderr());

  const configPath = path.join(tempHome, '.openclaw', 'config.yml');
  const parsedConfig = YAML.parse(fs.readFileSync(configPath, 'utf8'));
  parsedConfig.gateway = {
    ...parsedConfig.gateway,
    token: 'stale-token',
    tokenUpdatedAt: '2000-01-01T00:00:00.000Z',
  };
  fs.writeFileSync(configPath, YAML.stringify(parsedConfig), 'utf8');

  const stale = spawnCli(['doctor', '--json', '--fail-on', 'token-age-policy', '--max-token-age-days', '30'], env);
  const [staleCode] = await once(stale.child, 'close');
  assert.equal(staleCode, 1, stale.stderr());
  const staleReport = JSON.parse(stale.stdout());
  assert.ok(staleReport.failures.some(value => value.includes('token age policy')));

  const rotate = spawnCli(['rotate-token', '--json', '--token', 'fresh-token'], env);
  const [rotateCode] = await once(rotate.child, 'close');
  assert.equal(rotateCode, 0, rotate.stderr());

  const fresh = spawnCli(['doctor', '--json', '--fail-on', 'token-age-policy', '--max-token-age-days', '30'], env);
  const [freshCode] = await once(fresh.child, 'close');
  assert.equal(freshCode, 0, fresh.stderr());
  const freshReport = JSON.parse(fresh.stdout());
  assert.deepEqual(freshReport.failures, []);
});

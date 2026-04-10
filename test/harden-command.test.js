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
const testPort = 19997;

function createTempHome() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'openclaw-home-harden-'));
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

test('harden applies secure baseline and satisfies doctor auth/rate policy gates', async () => {
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

  const harden = spawnCli(['harden', '--json', '--rpm', '45', '--burst', '15'], env);
  const [hardenCode] = await once(harden.child, 'close');
  assert.equal(hardenCode, 0, harden.stderr());

  const hardenResult = JSON.parse(harden.stdout());
  assert.equal(hardenResult.gateway.tokenConfigured, true);
  assert.equal(hardenResult.gateway.enforceLoopbackToken, true);
  assert.equal(hardenResult.rateLimit.enabled, true);
  assert.equal(hardenResult.rateLimit.requestsPerMinute, 45);
  assert.equal(hardenResult.rateLimit.burst, 15);
  assert.equal(typeof hardenResult.tokenMasked, 'string');
  assert.equal(hardenResult.token, undefined);
  assert.equal(typeof hardenResult.gateway.tokenUpdatedAt, 'string');

  const doctor = spawnCli(
    [
      'doctor',
      '--json',
      '--fail-on',
      'none',
      '--fail-on',
      'auth-policy',
      '--fail-on',
      'rate-limit-policy',
      '--min-rate-limit-rpm',
      '30',
      '--max-rate-limit-burst',
      '20',
    ],
    env,
  );
  const [doctorCode] = await once(doctor.child, 'close');
  assert.equal(doctorCode, 0, doctor.stderr());

  const doctorReport = JSON.parse(doctor.stdout());
  assert.deepEqual(doctorReport.failures, []);
});

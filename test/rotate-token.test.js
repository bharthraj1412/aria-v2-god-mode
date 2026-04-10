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

function createTempHome() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'openclaw-home-rotate-token-'));
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

test('rotate-token updates token and can enforce strict loopback auth', async () => {
  const tempHome = createTempHome();
  const env = {
    USERPROFILE: tempHome,
    HOME: tempHome,
  };

  const onboard = spawnCli(['onboard'], env);
  const [onboardCode] = await once(onboard.child, 'close');
  assert.equal(onboardCode, 0, onboard.stderr());

  const rotate = spawnCli(['rotate-token', '--json', '--token', 'custom-token', '--strict', '--show-token'], env);
  const [rotateCode] = await once(rotate.child, 'close');
  assert.equal(rotateCode, 0, rotate.stderr());

  const result = JSON.parse(rotate.stdout());
  assert.equal(result.token, 'custom-token');
  assert.equal(typeof result.tokenMasked, 'string');
  assert.equal(typeof result.tokenUpdatedAt, 'string');
  assert.equal(result.enforceLoopbackToken, true);

  const configPath = path.join(tempHome, '.openclaw', 'config.yml');
  const parsed = YAML.parse(fs.readFileSync(configPath, 'utf8'));
  assert.equal(parsed.gateway.token, 'custom-token');
  assert.equal(parsed.gateway.enforceLoopbackToken, true);
});

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
const testPort = 18791;

function createTempHome() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'openclaw-home-cli-auth-'));
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

async function waitForLine(getText, matcher, timeoutMs = 10000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const text = getText();
    if (matcher(text)) {
      return text;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  throw new Error('Timed out waiting for expected output');
}

async function waitForProcessClose(child, timeoutMs = 5000) {
  return Promise.race([
    once(child, 'close'),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Process close timeout')), timeoutMs)),
  ]);
}

test('cli status/chat/events work with token-protected loopback gateway', async () => {
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
    token: 'loopback-token',
    trustProxy: false,
    enforceLoopbackToken: true,
  };
  fs.writeFileSync(configPath, YAML.stringify(parsedConfig), 'utf8');

  const gateway = spawnCli(['gateway'], env);
  try {
    await waitForLine(gateway.stdout, text => text.includes(`Gateway listening on http://127.0.0.1:${testPort}`));

    const unauthorizedHealth = await fetch(`http://127.0.0.1:${testPort}/health`);
    assert.equal(unauthorizedHealth.status, 401);

    const status = spawnCli(['status'], env);
    const [statusCode] = await once(status.child, 'close');
    assert.equal(statusCode, 0, status.stderr());
    assert.match(status.stdout(), /"status":"running"/);

    const chat = spawnCli(['chat', 'exec:echo cli-token-ok'], env);
    const [chatCode] = await once(chat.child, 'close');
    assert.equal(chatCode, 0, chat.stderr());
    assert.match(chat.stdout(), /"response":"cli-token-ok"/);

    const events = spawnCli(['events', '--timeout', '2', '--raw'], env);
    const [eventsCode] = await once(events.child, 'close');
    assert.equal(eventsCode, 0, events.stderr());
    assert.match(events.stdout(), /"type":"welcome"/);
  } finally {
    gateway.child.kill();
    try {
      const [gatewayCode] = await waitForProcessClose(gateway.child);
      assert.ok(gatewayCode === 0 || gatewayCode === null, gateway.stderr());
    } catch (e) {
      // Process close timed out or failed, force kill
      gateway.child.kill('SIGKILL');
    }
  }
});

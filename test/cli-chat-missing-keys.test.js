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
const testPort = 18792;

function createTempHome() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'openclaw-home-cli-missing-keys-'));
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

test('chat prints provider key setup hint when API keys are missing', async () => {
  const tempHome = createTempHome();
  const env = {
    USERPROFILE: tempHome,
    HOME: tempHome,
    OPENAI_API_KEY: '',
    ANTHROPIC_API_KEY: '',
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
    token: 'hint-token',
    trustProxy: false,
    enforceLoopbackToken: false,
  };
  fs.writeFileSync(configPath, YAML.stringify(parsedConfig), 'utf8');

  const gateway = spawnCli(['gateway'], env);
  try {
    await waitForLine(gateway.stdout, text => text.includes(`Gateway listening on http://127.0.0.1:${testPort}`));

    const chat = spawnCli(['chat', 'hello'], env);
    const [chatCode] = await once(chat.child, 'close');
    assert.equal(chatCode, 1, 'chat should fail without provider keys');
    assert.match(chat.stderr(), /Chat failed: HTTP 500/);
    assert.match(chat.stderr(), /Provider API keys are missing in this shell/);
    assert.match(chat.stderr(), /\$env:OPENAI_API_KEY = "<your-key>"/);
    assert.match(chat.stderr(), /\$env:ANTHROPIC_API_KEY = "<your-key>"/);
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

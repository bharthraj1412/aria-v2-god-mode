const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const test = require('node:test');
const WebSocket = require('ws');
const YAML = require('yaml');

const repoRoot = path.resolve(__dirname, '..');
const cliPath = path.join(repoRoot, 'dist', 'cli', 'index.js');
const testPort = 18790;

function createTempHome() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'openclaw-home-auth-'));
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

function waitForSocketDenied(url, headers, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url, { headers });
    const timeout = setTimeout(() => {
      socket.terminate();
      reject(new Error('Timed out waiting for denied websocket close'));
    }, timeoutMs);

    socket.on('close', (code, reason) => {
      clearTimeout(timeout);
      resolve({ code, reason: reason.toString() });
    });

    socket.on('error', () => {
      clearTimeout(timeout);
      resolve({ code: 1006, reason: 'error' });
    });
  });
}

function waitForSocketWelcome(url, headers, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url, { headers });
    let settled = false;
    const timeout = setTimeout(() => {
      settled = true;
      socket.terminate();
      reject(new Error('Timed out waiting for websocket welcome event'));
    }, timeoutMs);

    socket.on('message', data => {
      const parsed = JSON.parse(data.toString());
      if (parsed.type === 'welcome') {
        settled = true;
        clearTimeout(timeout);
        socket.close();
        resolve(parsed.type);
      }
    });

    socket.on('close', () => {
      clearTimeout(timeout);
      if (!settled) {
        reject(new Error('WebSocket closed before welcome event'));
      }
    });

    socket.on('error', error => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

test('gateway enforces token for forwarded non-loopback traffic when trustProxy is enabled', async () => {
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
    token: 'test-token',
    trustProxy: true,
  };
  fs.writeFileSync(configPath, YAML.stringify(parsedConfig), 'utf8');

  const gateway = spawnCli(['gateway'], env);
  try {
    await waitForLine(gateway.stdout, text => text.includes(`Gateway listening on http://127.0.0.1:${testPort}`));

    const deniedHealth = await fetch(`http://127.0.0.1:${testPort}/health`, {
      headers: {
        'x-forwarded-for': '203.0.113.10',
      },
    });
    assert.equal(deniedHealth.status, 401);

    const allowedHealth = await fetch(`http://127.0.0.1:${testPort}/health`, {
      headers: {
        'x-forwarded-for': '203.0.113.10',
        'x-openclaw-token': 'test-token',
      },
    });
    assert.equal(allowedHealth.status, 200);
    const allowedHealthBody = await allowedHealth.json();
    assert.deepEqual(allowedHealthBody.auth, {
      tokenConfigured: true,
      trustProxy: true,
      enforceLoopbackToken: false,
    });
    assert.deepEqual(allowedHealthBody.rateLimit, {
      enabled: false,
      requestsPerMinute: 60,
      burst: 20,
    });

    const wsDenied = await waitForSocketDenied(`ws://127.0.0.1:${testPort}/ws`, {
      'x-forwarded-for': '203.0.113.10',
    });

    assert.equal(wsDenied.code, 1008);

    const wsAllowed = await waitForSocketWelcome(`ws://127.0.0.1:${testPort}/ws`, {
      'x-forwarded-for': '203.0.113.10',
      'x-openclaw-token': 'test-token',
    });

    assert.equal(wsAllowed, 'welcome');
  } finally {
    gateway.child.kill();
    const [gatewayCode] = await once(gateway.child, 'close');
    assert.ok(gatewayCode === 0 || gatewayCode === null, gateway.stderr());
  }
});

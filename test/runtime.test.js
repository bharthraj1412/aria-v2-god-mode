const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const test = require('node:test');
const WebSocket = require('ws');

const repoRoot = path.resolve(__dirname, '..');
const cliPath = path.join(repoRoot, 'dist', 'cli', 'index.js');

function createTempHome() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'openclaw-home-'));
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

test('runtime gateway serves health, chat, and websocket events', async () => {
  const tempHome = createTempHome();
  const env = {
    USERPROFILE: tempHome,
    HOME: tempHome,
  };

  const onboard = spawnCli(['onboard'], env);
  const [onboardCode] = await once(onboard.child, 'close');
  assert.equal(onboardCode, 0, onboard.stderr());

  const gateway = spawnCli(['gateway'], env);
  const wsEvents = [];
  let socket;

  try {
    try {
      const gatewayOutput = await waitForLine(gateway.stdout, text => text.includes('Gateway listening on http://127.0.0.1:18789'));
      assert.match(gatewayOutput, /Gateway listening on http:\/\/127\.0\.0\.1:18789/);
    } catch (e) {
      // Add debug info if stdout doesn't contain the message
      const currentStdout = gateway.stdout();
      const currentStderr = gateway.stderr();
      console.error('Gateway stdout:', currentStdout.slice(0, 500));
      console.error('Gateway stderr:', currentStderr.slice(0, 500));
      throw e;
    }

    socket = new WebSocket('ws://127.0.0.1:18789/ws');
    socket.on('message', data => {
      wsEvents.push(JSON.parse(data.toString()));
    });
    await once(socket, 'open');

    const healthResponse = await fetch('http://127.0.0.1:18789/health');
    assert.equal(healthResponse.status, 200);
    const health = await healthResponse.json();
    assert.equal(health.status, 'running');
    assert.equal(health.port, 18789);
    assert.deepEqual(health.auth, {
      tokenConfigured: false,
      trustProxy: false,
      enforceLoopbackToken: false,
    });
    assert.deepEqual(health.rateLimit, {
      enabled: false,
      requestsPerMinute: 60,
      burst: 20,
    });
    assert.deepEqual(health.sessions, []);

    const chatResponse = await fetch('http://127.0.0.1:18789/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'exec:echo test-smoke' }),
    });
    assert.equal(chatResponse.status, 200);
    const chat = await chatResponse.json();
    assert.equal(chat.provider, 'local-exec');
    assert.equal(chat.model, 'shell');
    assert.equal(chat.response, 'test-smoke');
    assert.equal(typeof chat.requestId, 'string');

    await waitForLine(() => JSON.stringify(wsEvents), text => text.includes('chat.completed'));
    const completed = wsEvents.find(event => event.type === 'chat.completed');
    assert.ok(completed, 'expected chat.completed websocket event');
    assert.equal(completed.provider, 'local-exec');
    assert.equal(completed.model, 'shell');
    assert.equal(completed.requestId, chat.requestId);
  } finally {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      socket.close();
      await once(socket, 'close');
    }

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
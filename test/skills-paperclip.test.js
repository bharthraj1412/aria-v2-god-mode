const assert = require('node:assert/strict');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..');
const cliPath = path.join(repoRoot, 'dist', 'cli', 'index.js');

function spawnCli(args) {
  const child = spawn(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    env: process.env,
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

test('skills command lists Paperclip source with discoverable records', async () => {
  const cmd = spawnCli(['skills', '--source', 'paperclip', '--json']);
  const [code] = await once(cmd.child, 'close');
  assert.equal(code, 0, cmd.stderr());

  const records = JSON.parse(cmd.stdout());
  assert.ok(Array.isArray(records));
  assert.ok(records.length >= 5);

  for (const record of records) {
    assert.equal(record.source, 'paperclip');
    assert.equal(typeof record.id, 'string');
    assert.equal(typeof record.entrypointHint, 'string');
  }
});

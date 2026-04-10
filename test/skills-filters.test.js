const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
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

test('skills command filters by capability for paperclip source', async () => {
  const cmd = spawnCli(['skills', '--source', 'paperclip', '--capability', 'plugin-development', '--json']);
  const [code] = await once(cmd.child, 'close');
  assert.equal(code, 0, cmd.stderr());

  const records = JSON.parse(cmd.stdout());
  assert.ok(Array.isArray(records));
  assert.ok(records.length >= 1);

  for (const record of records) {
    assert.equal(record.source, 'paperclip');
    assert.ok(Array.isArray(record.capabilities));
    assert.ok(record.capabilities.includes('plugin-development'));
  }
});

test('skills command supports exact tag filter and returns empty array when no match', async () => {
  const cmd = spawnCli(['skills', '--source', 'paperclip', '--tag', '__definitely_missing_tag__', '--json']);
  const [code] = await once(cmd.child, 'close');
  assert.equal(code, 0, cmd.stderr());

  const records = JSON.parse(cmd.stdout());
  assert.deepEqual(records, []);
});

test('skills command supports multi-value capability filters in any mode', async () => {
  const cmd = spawnCli([
    'skills',
    '--source',
    'paperclip',
    '--capability',
    'plugin-development',
    '--capability',
    'agent-management',
    '--capability-mode',
    'any',
    '--json',
  ]);
  const [code] = await once(cmd.child, 'close');
  assert.equal(code, 0, cmd.stderr());

  const records = JSON.parse(cmd.stdout());
  assert.ok(Array.isArray(records));
  assert.ok(records.length >= 1);

  for (const record of records) {
    assert.ok(Array.isArray(record.capabilities));
    const hasAny = record.capabilities.includes('plugin-development') || record.capabilities.includes('agent-management');
    assert.ok(hasAny);
  }
});

test('skills command supports all mode for multi-value capability filters', async () => {
  const cmd = spawnCli([
    'skills',
    '--source',
    'paperclip',
    '--capability',
    'plugin-development',
    '--capability',
    'agent-management',
    '--capability-mode',
    'all',
    '--json',
  ]);
  const [code] = await once(cmd.child, 'close');
  assert.equal(code, 0, cmd.stderr());

  const records = JSON.parse(cmd.stdout());
  assert.ok(Array.isArray(records));
  for (const record of records) {
    assert.ok(Array.isArray(record.capabilities));
    assert.ok(record.capabilities.includes('plugin-development'));
    assert.ok(record.capabilities.includes('agent-management'));
  }
});

test('skills command exposes sources and categories listing payload', async () => {
  const cmd = spawnCli(['skills', '--sources', '--categories', '--json']);
  const [code] = await once(cmd.child, 'close');
  assert.equal(code, 0, cmd.stderr());

  const payload = JSON.parse(cmd.stdout());
  assert.ok(Array.isArray(payload.sources));
  assert.ok(Array.isArray(payload.categories));
  assert.ok(payload.sources.includes('mark-xxx'));
  assert.ok(payload.sources.includes('paperclip'));
  assert.ok(payload.categories.length >= 1);
});

test('skills command exports filtered records to json file', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-export-'));
  const exportPath = path.join(tempDir, 'skills.json');
  const cmd = spawnCli([
    'skills',
    '--source',
    'paperclip',
    '--capability',
    'plugin-development',
    '--export',
    exportPath,
  ]);
  const [code] = await once(cmd.child, 'close');
  assert.equal(code, 0, cmd.stderr());
  assert.ok(fs.existsSync(exportPath));

  const content = fs.readFileSync(exportPath, 'utf8');
  const records = JSON.parse(content);
  assert.ok(Array.isArray(records));
  assert.ok(records.length >= 1);
  for (const record of records) {
    assert.ok(Array.isArray(record.capabilities));
    assert.ok(record.capabilities.includes('plugin-development'));
  }
});

test('skills command returns summary payload with counts', async () => {
  const cmd = spawnCli(['skills', '--source', 'paperclip', '--summary', '--json']);
  const [code] = await once(cmd.child, 'close');
  assert.equal(code, 0, cmd.stderr());

  const summary = JSON.parse(cmd.stdout());
  assert.equal(typeof summary.total, 'number');
  assert.ok(Array.isArray(summary.sources));
  assert.ok(Array.isArray(summary.categories));
  assert.ok(Array.isArray(summary.tags));
  assert.ok(Array.isArray(summary.capabilities));
  assert.ok(summary.total >= 1);
  assert.ok(summary.sources.some(item => item.value === 'paperclip'));
});

test('skills command can export summary payload to file', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-summary-export-'));
  const exportPath = path.join(tempDir, 'summary.json');
  const cmd = spawnCli(['skills', '--summary', '--export', exportPath]);
  const [code] = await once(cmd.child, 'close');
  assert.equal(code, 0, cmd.stderr());
  assert.ok(fs.existsSync(exportPath));

  const content = fs.readFileSync(exportPath, 'utf8');
  const summary = JSON.parse(content);
  assert.equal(typeof summary.total, 'number');
  assert.ok(Array.isArray(summary.sources));
});

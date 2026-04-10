const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const packageJsonPath = path.join(repoRoot, 'package.json');
const packageLockPath = path.join(repoRoot, 'package-lock.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function firstMajor(versionText) {
  const match = String(versionText || '').match(/(\d+)/);
  return match ? Number(match[1]) : NaN;
}

function run() {
  const failures = [];
  const pkg = readJson(packageJsonPath);

  const depOpenAI = pkg.dependencies && pkg.dependencies.openai;
  const depZod = pkg.dependencies && pkg.dependencies.zod;
  const depWs = pkg.dependencies && pkg.dependencies.ws;

  if (!depOpenAI) {
    failures.push('Missing dependency: openai');
  }
  if (!depZod) {
    failures.push('Missing dependency: zod');
  }
  if (!depWs) {
    failures.push('Missing dependency: ws');
  }

  const zodMajor = firstMajor(depZod);
  if (!Number.isNaN(zodMajor) && zodMajor !== 3) {
    failures.push(`Expected zod major 3 for openai peer compatibility, found: ${depZod}`);
  }

  const openAIMajor = firstMajor(depOpenAI);
  if (!Number.isNaN(openAIMajor) && openAIMajor < 5) {
    failures.push(`Expected openai major >= 5, found: ${depOpenAI}`);
  }

  if (fs.existsSync(packageLockPath)) {
    const lock = readJson(packageLockPath);
    const lockZodVersion =
      lock.packages && lock.packages['node_modules/zod'] && lock.packages['node_modules/zod'].version;
    const lockWsVersion =
      lock.packages && lock.packages['node_modules/ws'] && lock.packages['node_modules/ws'].version;

    if (lockZodVersion) {
      const lockZodMajor = firstMajor(lockZodVersion);
      if (!Number.isNaN(lockZodMajor) && lockZodMajor !== 3) {
        failures.push(`package-lock zod major must be 3, found: ${lockZodVersion}`);
      }
    }

    if (!lockWsVersion) {
      failures.push('package-lock must include direct node_modules/ws entry');
    }
  }

  if (failures.length > 0) {
    process.stderr.write('Dependency compatibility check failed.\n');
    for (const failure of failures) {
      process.stderr.write(`- ${failure}\n`);
    }
    process.exit(1);
    return;
  }

  process.stdout.write('Dependency compatibility check passed.\n');
}

run();

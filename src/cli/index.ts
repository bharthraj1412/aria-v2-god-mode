#!/usr/bin/env node
import * as fs from 'node:fs';
import * as net from 'node:net';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import type { Argv } from 'yargs';
import WebSocket from 'ws';
import YAML from 'yaml';
import { CONFIG_PATH, ensureConfigFile, loadRuntimeConfig } from '../config';
import { startGateway } from '../gateway';
import { generateWithFailover } from '../providers';
import type { ProviderName, RuntimeConfig } from '../config/types';
import { listSkillCategories, listSkillSources, listSkills, summarizeSkills } from '../skills';

function hasEnvKey(name: string): boolean {
  const value = process.env[name];
  return typeof value === 'string' && value.trim().length > 0;
}

function providerEnvName(config: RuntimeConfig, provider: ProviderName): string {
  return provider === 'openai'
    ? config.providers.openai.apiKeyEnv
    : config.providers.anthropic.apiKeyEnv;
}

function providerModel(config: RuntimeConfig, provider: ProviderName): string {
  return provider === 'openai'
    ? config.providers.openai.model
    : config.providers.anthropic.model;
}

function gatewayAuthHeaders(config: RuntimeConfig): Record<string, string> {
  const token = config.gateway.token?.trim();
  if (!token) {
    return {};
  }

  return { 'x-openclaw-token': token };
}

function printProviderKeyHintIfMissing(body: string, config: RuntimeConfig): void {
  const trimmed = body.trim();
  let errorText = trimmed;

  try {
    const parsed = JSON.parse(trimmed) as { error?: unknown };
    if (typeof parsed.error === 'string') {
      errorText = parsed.error;
    }
  } catch {
    // Keep original response body when it is not JSON.
  }

  if (!errorText.toLowerCase().includes('missing api key')) {
    return;
  }

  const openaiEnv = config.providers.openai.apiKeyEnv;
  const anthropicEnv = config.providers.anthropic.apiKeyEnv;
  console.error('Provider API keys are missing in this shell.');
  console.error('Set keys and retry:');
  console.error(`$env:${openaiEnv} = "<your-key>"`);
  console.error(`$env:${anthropicEnv} = "<your-key>"`);
  console.error('Then run: openclaw chat "hello"');
}

async function checkPortAvailability(host: string, port: number): Promise<{ available: boolean; reason?: string }> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.once('error', (error: NodeJS.ErrnoException) => {
      resolve({
        available: false,
        reason: error.code || error.message,
      });
    });
    server.once('listening', () => {
      server.close(() => resolve({ available: true }));
    });
    server.listen(port, host);
  });
}

type DoctorFailTarget =
  | 'gateway'
  | 'port'
  | 'provider-env'
  | 'auth-policy'
  | 'rate-limit-policy'
  | 'token-age-policy';

function normalizeDoctorFailTargets(input: string[] | undefined): DoctorFailTarget[] {
  const raw = (input || ['gateway'])
    .flatMap(value => value.split(','))
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);

  if (raw.includes('none')) {
    return [];
  }

  const targets = new Set<DoctorFailTarget>();
  for (const value of raw) {
    if (value === 'all') {
      targets.add('gateway');
      targets.add('port');
      targets.add('provider-env');
      targets.add('auth-policy');
      targets.add('rate-limit-policy');
      targets.add('token-age-policy');
      continue;
    }

    if (
      value === 'gateway' ||
      value === 'port' ||
      value === 'provider-env' ||
      value === 'auth-policy' ||
      value === 'rate-limit-policy' ||
      value === 'token-age-policy'
    ) {
      targets.add(value);
    }
  }

  return [...targets];
}

function loadRawConfigObject(): Record<string, unknown> {
  ensureConfigFile();
  const text = fs.readFileSync(CONFIG_PATH, 'utf8');
  const parsed = YAML.parse(text);
  return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
}

function writeRawConfigObject(configObject: Record<string, unknown>): void {
  fs.writeFileSync(CONFIG_PATH, YAML.stringify(configObject), 'utf8');
}

function maskToken(token: string): string {
  if (token.length <= 8) {
    return '*'.repeat(token.length);
  }

  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

function writeJsonExport(exportPath: string, payload: unknown): string {
  const resolved = path.resolve(process.cwd(), exportPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, JSON.stringify(payload, null, 2), 'utf8');
  return resolved;
}

async function run(): Promise<void> {
  await yargs(hideBin(process.argv))
    .scriptName('openclaw')
    .strict()
    .demandCommand(1)
    .command(
      'onboard',
      'Create local runtime config if missing',
      () => undefined,
      async () => {
        const result = ensureConfigFile();
        if (result.created) {
          console.log(`Created config at ${result.path}`);
        } else {
          console.log(`Config already exists at ${result.path}`);
        }
      },
    )
    .command(
      'gateway',
      'Start the OpenClaw runtime gateway',
      () => undefined,
      async () => {
        try {
          const runtime = await startGateway();
          console.log(`Gateway listening on http://127.0.0.1:${runtime.port}`);
          console.log('Press Ctrl+C to stop.');
        } catch (error) {
          const nodeError = error as NodeJS.ErrnoException;
          if (nodeError && nodeError.code === 'EADDRINUSE') {
            console.error('Gateway failed to start: port is already in use.');
            console.error('Stop the existing process on this port, or change gateway.port in ~/.openclaw/config.yml.');
            process.exitCode = 1;
            return;
          }

          const message = error instanceof Error ? error.message : String(error);
          console.error(`Gateway failed to start: ${message}`);
          process.exitCode = 1;
        }
      },
    )
    .command(
      'doctor',
      'Run one-shot runtime diagnostics (config, auth, env, port, gateway reachability)',
      (command: Argv) =>
        command
          .option('json', {
            type: 'boolean',
            describe: 'Output diagnostics as JSON',
            default: false,
          })
          .option('fail-on', {
            type: 'string',
            array: true,
            describe: 'Failure gates: gateway, port, provider-env, auth-policy, rate-limit-policy, token-age-policy, all, none (comma-separated allowed)',
            default: ['gateway'],
          })
          .option('min-rate-limit-rpm', {
            type: 'number',
            describe: 'Minimum allowed requestsPerMinute when fail-on includes rate-limit-policy',
            default: 1,
          })
          .option('max-rate-limit-burst', {
            type: 'number',
            describe: 'Maximum allowed burst when fail-on includes rate-limit-policy',
            default: 100,
          })
          .option('max-token-age-days', {
            type: 'number',
            describe: 'Maximum allowed age in days when fail-on includes token-age-policy',
            default: 90,
          }),
      async (argv: {
        json?: boolean;
        failOn?: string[];
        minRateLimitRpm?: number;
        maxRateLimitBurst?: number;
        maxTokenAgeDays?: number;
      }) => {
        const config = loadRuntimeConfig();
        const gatewayUrl = `http://${config.gateway.host}:${config.gateway.port}`;
        const providerEnv = {
          [config.providers.openai.apiKeyEnv]: hasEnvKey(config.providers.openai.apiKeyEnv),
          [config.providers.anthropic.apiKeyEnv]: hasEnvKey(config.providers.anthropic.apiKeyEnv),
        };

        const port = await checkPortAvailability(config.gateway.host, config.gateway.port);

        let reachability = {
          ok: false,
          status: 0,
          error: '',
        };
        try {
          const response = await fetch(`${gatewayUrl}/health`, {
            headers: gatewayAuthHeaders(config),
          });
          reachability = {
            ok: response.ok,
            status: response.status,
            error: response.ok ? '' : `HTTP ${response.status}`,
          };
        } catch (error) {
          reachability = {
            ok: false,
            status: 0,
            error: error instanceof Error ? error.message : String(error),
          };
        }

        const report = {
          configPath: CONFIG_PATH,
          gateway: {
            host: config.gateway.host,
            port: config.gateway.port,
            tokenConfigured: Boolean(config.gateway.token?.trim()),
            trustProxy: Boolean(config.gateway.trustProxy),
            enforceLoopbackToken: Boolean(config.gateway.enforceLoopbackToken),
          },
          port,
          providerEnv,
          gatewayReachability: reachability,
          failOn: normalizeDoctorFailTargets(argv.failOn),
          policyThresholds: {
            minRateLimitRpm: Math.max(1, Math.floor(Number(argv.minRateLimitRpm || 1))),
            maxRateLimitBurst: Math.max(1, Math.floor(Number(argv.maxRateLimitBurst || 100))),
            maxTokenAgeDays: Math.max(1, Math.floor(Number(argv.maxTokenAgeDays || 90))),
          },
          failures: [] as string[],
        };

        if (report.failOn.includes('gateway') && !report.gatewayReachability.ok) {
          report.failures.push(
            `gateway unreachable${report.gatewayReachability.status ? ` (HTTP ${report.gatewayReachability.status})` : ''}`,
          );
        }

        if (report.failOn.includes('port') && !report.port.available) {
          report.failures.push(`port unavailable${report.port.reason ? ` (${report.port.reason})` : ''}`);
        }

        if (report.failOn.includes('provider-env')) {
          const missingEnv = Object.entries(report.providerEnv)
            .filter(([, present]) => !present)
            .map(([name]) => name);
          if (missingEnv.length > 0) {
            report.failures.push(`missing provider env: ${missingEnv.join(', ')}`);
          }
        }

        if (report.failOn.includes('auth-policy')) {
          if (!report.gateway.tokenConfigured) {
            report.failures.push('auth policy requires gateway.token to be configured');
          }
          if (!report.gateway.enforceLoopbackToken) {
            report.failures.push('auth policy requires gateway.enforceLoopbackToken=true');
          }
        }

        if (report.failOn.includes('rate-limit-policy')) {
          const rateLimit = config.security.rateLimit;
          if (!rateLimit.enabled) {
            report.failures.push('rate-limit policy requires security.rateLimit.enabled=true');
          }
          if (rateLimit.requestsPerMinute < report.policyThresholds.minRateLimitRpm) {
            report.failures.push(
              `rate-limit policy requires requestsPerMinute >= ${report.policyThresholds.minRateLimitRpm} (found ${rateLimit.requestsPerMinute})`,
            );
          }
          if (rateLimit.burst > report.policyThresholds.maxRateLimitBurst) {
            report.failures.push(
              `rate-limit policy requires burst <= ${report.policyThresholds.maxRateLimitBurst} (found ${rateLimit.burst})`,
            );
          }
        }

        if (report.failOn.includes('token-age-policy')) {
          const tokenUpdatedAt = config.gateway.tokenUpdatedAt;
          if (!tokenUpdatedAt) {
            report.failures.push('token age policy requires gateway.tokenUpdatedAt to be set');
          } else {
            const updatedMs = Date.parse(tokenUpdatedAt);
            if (Number.isNaN(updatedMs)) {
              report.failures.push('token age policy requires gateway.tokenUpdatedAt to be a valid timestamp');
            } else {
              const ageDays = (Date.now() - updatedMs) / (24 * 60 * 60 * 1000);
              if (ageDays > report.policyThresholds.maxTokenAgeDays) {
                report.failures.push(
                  `token age policy requires token age <= ${report.policyThresholds.maxTokenAgeDays} days (found ${ageDays.toFixed(1)} days)`,
                );
              }
            }
          }
        }

        if (argv.json) {
          console.log(JSON.stringify(report, null, 2));
        } else {
          console.log('openclaw doctor');
          console.log('');
          console.log(`Config: ${report.configPath}`);
          console.log(`Gateway: ${gatewayUrl}`);
          console.log(
            `Auth: tokenConfigured=${report.gateway.tokenConfigured}, trustProxy=${report.gateway.trustProxy}, enforceLoopbackToken=${report.gateway.enforceLoopbackToken}`,
          );
          console.log(`Port available: ${report.port.available}${report.port.reason ? ` (${report.port.reason})` : ''}`);
          console.log('Provider env:');
          for (const [envName, present] of Object.entries(report.providerEnv)) {
            console.log(`- ${envName}: ${present ? 'set' : 'missing'}`);
          }
          console.log(
            `Gateway reachable: ${report.gatewayReachability.ok ? 'yes' : 'no'}${report.gatewayReachability.status ? ` (HTTP ${report.gatewayReachability.status})` : ''}`,
          );
          if (report.gatewayReachability.error) {
            console.log(`Gateway error: ${report.gatewayReachability.error}`);
          }
          console.log(`Fail-on: ${report.failOn.length > 0 ? report.failOn.join(', ') : 'none'}`);
          if (report.failOn.includes('rate-limit-policy')) {
            console.log(
              `Rate-limit thresholds: minRateLimitRpm=${report.policyThresholds.minRateLimitRpm}, maxRateLimitBurst=${report.policyThresholds.maxRateLimitBurst}`,
            );
          }
          if (report.failOn.includes('token-age-policy')) {
            console.log(`Token age threshold: maxTokenAgeDays=${report.policyThresholds.maxTokenAgeDays}`);
          }
          if (report.failures.length > 0) {
            console.log('Failures:');
            for (const failure of report.failures) {
              console.log(`- ${failure}`);
            }
          }
        }

        if (report.failures.length > 0) {
          process.exitCode = 1;
        }
      },
    )
    .command(
      'harden',
      'Apply secure baseline config for auth and rate limiting',
      (command: Argv) =>
        command
          .option('token', {
            type: 'string',
            describe: 'Gateway token to set (generated if omitted and missing)',
          })
          .option('rpm', {
            type: 'number',
            describe: 'Rate-limit requests per minute',
            default: 60,
          })
          .option('burst', {
            type: 'number',
            describe: 'Rate-limit burst capacity',
            default: 20,
          })
          .option('trust-proxy', {
            type: 'boolean',
            describe: 'Enable trustProxy for reverse-proxy deployments',
          })
          .option('json', {
            type: 'boolean',
            describe: 'Output applied settings as JSON',
            default: false,
          })
          .option('show-token', {
            type: 'boolean',
            describe: 'Reveal full token in output (disabled by default)',
            default: false,
          }),
      async (argv: {
        token?: string;
        rpm?: number;
        burst?: number;
        trustProxy?: boolean;
        json?: boolean;
        showToken?: boolean;
      }) => {
        const raw = loadRawConfigObject();

        const gateway = (raw.gateway && typeof raw.gateway === 'object'
          ? raw.gateway
          : {}) as Record<string, unknown>;
        const security = (raw.security && typeof raw.security === 'object'
          ? raw.security
          : {}) as Record<string, unknown>;
        const rateLimit = (security.rateLimit && typeof security.rateLimit === 'object'
          ? security.rateLimit
          : {}) as Record<string, unknown>;

        const requestedToken = argv.token?.trim();
        const existingToken = typeof gateway.token === 'string' && gateway.token.trim().length > 0
          ? gateway.token.trim()
          : undefined;
        const token = requestedToken || existingToken || randomUUID();

        const rpm = Math.max(1, Math.floor(Number(argv.rpm || 60)));
        const burst = Math.max(1, Math.floor(Number(argv.burst || 20)));

        const nextGateway: Record<string, unknown> = {
          ...gateway,
          token,
          tokenUpdatedAt: new Date().toISOString(),
          enforceLoopbackToken: true,
        };
        if (typeof argv.trustProxy === 'boolean') {
          nextGateway.trustProxy = argv.trustProxy;
        }

        const nextSecurity: Record<string, unknown> = {
          ...security,
          rateLimit: {
            ...rateLimit,
            enabled: true,
            requestsPerMinute: rpm,
            burst,
          },
        };

        raw.gateway = nextGateway;
        raw.security = nextSecurity;
        writeRawConfigObject(raw);

        const applied = {
          configPath: CONFIG_PATH,
          gateway: {
            tokenConfigured: true,
            tokenUpdatedAt: nextGateway.tokenUpdatedAt,
            trustProxy:
              typeof nextGateway.trustProxy === 'boolean' ? nextGateway.trustProxy : false,
            enforceLoopbackToken: true,
          },
          rateLimit: {
            enabled: true,
            requestsPerMinute: rpm,
            burst,
          },
          tokenMasked: maskToken(token),
          token: argv.showToken ? token : undefined,
        };

        if (argv.json) {
          console.log(JSON.stringify(applied, null, 2));
          return;
        }

        console.log('openclaw harden');
        console.log('');
        console.log(`Config updated: ${applied.configPath}`);
        console.log(`Token configured: yes`);
        console.log(`Trust proxy: ${applied.gateway.trustProxy}`);
        console.log(`Enforce loopback token: ${applied.gateway.enforceLoopbackToken}`);
        console.log(`Rate limit: enabled=${applied.rateLimit.enabled}, rpm=${rpm}, burst=${burst}`);
        console.log(`Token: ${applied.tokenMasked}`);
        console.log('');
        console.log('Run doctor gates:');
        console.log('openclaw doctor --fail-on auth-policy --fail-on rate-limit-policy');
      },
    )
    .command(
      'rotate-token',
      'Rotate gateway token in config',
      (command: Argv) =>
        command
          .option('token', {
            type: 'string',
            describe: 'Explicit token value (random UUID generated if omitted)',
          })
          .option('strict', {
            type: 'boolean',
            describe: 'Also enforce loopback token after rotation',
            default: false,
          })
          .option('json', {
            type: 'boolean',
            describe: 'Output applied settings as JSON',
            default: false,
          })
          .option('show-token', {
            type: 'boolean',
            describe: 'Reveal full token in output (disabled by default)',
            default: false,
          }),
      async (argv: { token?: string; strict?: boolean; json?: boolean; showToken?: boolean }) => {
        const raw = loadRawConfigObject();
        const gateway = (raw.gateway && typeof raw.gateway === 'object'
          ? raw.gateway
          : {}) as Record<string, unknown>;

        const nextToken = argv.token?.trim() || randomUUID();
        const nextGateway: Record<string, unknown> = {
          ...gateway,
          token: nextToken,
          tokenUpdatedAt: new Date().toISOString(),
        };
        if (argv.strict) {
          nextGateway.enforceLoopbackToken = true;
        }

        raw.gateway = nextGateway;
        writeRawConfigObject(raw);

        const result = {
          configPath: CONFIG_PATH,
          tokenMasked: maskToken(nextToken),
          token: argv.showToken ? nextToken : undefined,
          tokenUpdatedAt: nextGateway.tokenUpdatedAt,
          enforceLoopbackToken:
            typeof nextGateway.enforceLoopbackToken === 'boolean'
              ? nextGateway.enforceLoopbackToken
              : false,
        };

        if (argv.json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        console.log('openclaw rotate-token');
        console.log('');
        console.log(`Config updated: ${result.configPath}`);
        console.log(`Token rotated: yes`);
        console.log(`Token: ${result.tokenMasked}`);
        console.log(`Enforce loopback token: ${result.enforceLoopbackToken}`);
      },
    )
    .command(
      'configure',
      'Validate provider API key environment setup',
      () => undefined,
      async () => {
        const config = loadRuntimeConfig();
        const required = [
          config.providers.openai.apiKeyEnv,
          config.providers.anthropic.apiKeyEnv,
        ];
        const uniqueRequired = [...new Set(required)];

        console.log('openclaw configure');
        console.log('');
        console.log('Provider key environment variables:');

        const missing: string[] = [];
        for (const envName of uniqueRequired) {
          const present = hasEnvKey(envName);
          console.log(`- ${envName}: ${present ? 'set' : 'missing'}`);
          if (!present) {
            missing.push(envName);
          }
        }

        console.log('');
        if (missing.length === 0) {
          console.log('All required provider keys are set for this shell.');
          return;
        }

        console.log('Set missing keys in PowerShell (current shell):');
        for (const envName of missing) {
          console.log(`$env:${envName} = \"<your-key>\"`);
        }
        console.log('');
        console.log('After setting keys, run: openclaw chat "hello"');
        process.exitCode = 1;
      },
    )
    .command(
      'status',
      'Get runtime status from the local gateway',
      () => undefined,
      async () => {
        const config = loadRuntimeConfig();
        const url = `http://${config.gateway.host}:${config.gateway.port}/health`;
        let response: Response;
        try {
          response = await fetch(url, {
            headers: gatewayAuthHeaders(config),
          });
        } catch {
          console.error(`Gateway unavailable at ${url}. Start it with: openclaw gateway`);
          process.exitCode = 1;
          return;
        }

        if (!response.ok) {
          console.error(`Gateway status failed: HTTP ${response.status}`);
          process.exitCode = 1;
          return;
        }

        const body = await response.text();
        console.log(body);
      },
    )
    .command(
      'providers',
      'Check provider configuration and optional live generation',
      (command: Argv) =>
        command.option('live', {
          type: 'boolean',
          describe: 'Run a live generation check using provider failover order',
          default: false,
        }),
      async (argv: { live?: boolean }) => {
        const config = loadRuntimeConfig();

        console.log('openclaw providers');
        console.log('');
        console.log('Configured provider order:');
        for (const provider of config.providers.order) {
          console.log(`- ${provider}`);
        }

        console.log('');
        console.log('Provider readiness:');

        const missing: ProviderName[] = [];
        for (const provider of config.providers.order) {
          const envName = providerEnvName(config, provider);
          const model = providerModel(config, provider);
          const ready = hasEnvKey(envName);
          console.log(`- ${provider}: model=${model}, env=${envName}, key=${ready ? 'set' : 'missing'}`);
          if (!ready) {
            missing.push(provider);
          }
        }

        if (!argv.live) {
          if (missing.length > 0) {
            console.log('');
            console.log('Missing keys detected. Run openclaw configure for setup commands.');
            process.exitCode = 1;
          }
          return;
        }

        console.log('');
        console.log('Running live provider check through failover...');

        try {
          const result = await generateWithFailover(config, {
            systemPrompt: 'You are a connectivity probe. Reply with exactly: probe-ok',
            userMessage: 'reply with probe-ok only',
          });
          console.log(`Live check passed via provider=${result.provider}, model=${result.model}`);
          console.log(`Response: ${result.content}`);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`Live check failed: ${message}`);
          process.exitCode = 1;
        }
      },
    )
    .command(
      'skills',
      'List integrated skill catalog entries',
      {
        source: {
          type: 'string',
          describe: 'Filter by source id (example: mark-xxx)',
        },
        search: {
          type: 'string',
          describe: 'Search keyword across id/title/category/description/tags/capabilities',
        },
        tag: {
          type: 'string',
          array: true,
          describe: 'Filter by tag (repeatable; comma-separated supported)',
        },
        capability: {
          type: 'string',
          array: true,
          describe: 'Filter by capability (repeatable; comma-separated supported)',
        },
        tagMode: {
          type: 'string',
          choices: ['any', 'all'],
          default: 'any',
          describe: 'How multiple --tag filters are matched',
        },
        capabilityMode: {
          type: 'string',
          choices: ['any', 'all'],
          default: 'any',
          describe: 'How multiple --capability filters are matched',
        },
        sources: {
          type: 'boolean',
          default: false,
          describe: 'List available source IDs only',
        },
        categories: {
          type: 'boolean',
          default: false,
          describe: 'List available categories only (respects active filters)',
        },
        summary: {
          type: 'boolean',
          default: false,
          describe: 'Show aggregated counts for the filtered catalog',
        },
        exportPath: {
          type: 'string',
          alias: 'export',
          describe: 'Write JSON output to a file path',
        },
        json: {
          type: 'boolean',
          describe: 'Output as JSON',
          default: false,
        },
      },
      async (argv: {
        source?: string;
        search?: string;
        tag?: string[];
        capability?: string[];
        tagMode?: string;
        capabilityMode?: string;
        sources?: boolean;
        categories?: boolean;
        summary?: boolean;
        exportPath?: string;
        json?: boolean;
      }) => {
        const tagMode = argv.tagMode === 'all' ? 'all' : 'any';
        const capabilityMode = argv.capabilityMode === 'all' ? 'all' : 'any';
        const records = listSkills({
          source: argv.source,
          search: argv.search,
          tag: argv.tag,
          capability: argv.capability,
          tagMode,
          capabilityMode,
        });
        const sources = listSkillSources();
        const categories = listSkillCategories({
          source: argv.source,
          search: argv.search,
          tag: argv.tag,
          capability: argv.capability,
          tagMode,
          capabilityMode,
        });
        const summary = summarizeSkills({
          source: argv.source,
          search: argv.search,
          tag: argv.tag,
          capability: argv.capability,
          tagMode,
          capabilityMode,
        });

        if (argv.sources || argv.categories) {
          const listing: Record<string, unknown> = {};
          if (argv.sources) {
            listing.sources = sources;
          }
          if (argv.categories) {
            listing.categories = categories;
          }

          if (argv.exportPath) {
            writeJsonExport(argv.exportPath, listing);
          }

          if (argv.json) {
            console.log(JSON.stringify(listing, null, 2));
            return;
          }

          console.log('openclaw skills');
          console.log('');
          if (argv.sources) {
            console.log(`Sources: ${(listing.sources as string[]).join(', ')}`);
          }
          if (argv.categories) {
            console.log(`Categories: ${(listing.categories as string[]).join(', ')}`);
          }
          if (argv.exportPath) {
            console.log(`Exported: ${path.resolve(process.cwd(), argv.exportPath)}`);
          }
          return;
        }

        if (argv.summary) {
          if (argv.exportPath) {
            writeJsonExport(argv.exportPath, summary);
          }

          if (argv.json) {
            console.log(JSON.stringify(summary, null, 2));
            return;
          }

          console.log('openclaw skills');
          console.log('');
          console.log(`Total: ${summary.total}`);
          console.log(`Sources: ${summary.sources.map(item => `${item.value} (${item.count})`).join(', ') || 'none'}`);
          console.log(`Categories: ${summary.categories.map(item => `${item.value} (${item.count})`).join(', ') || 'none'}`);
          console.log(`Top tags: ${summary.tags.slice(0, 5).map(item => `${item.value} (${item.count})`).join(', ') || 'none'}`);
          console.log(
            `Top capabilities: ${summary.capabilities.slice(0, 5).map(item => `${item.value} (${item.count})`).join(', ') || 'none'}`,
          );
          if (argv.exportPath) {
            console.log(`Exported: ${path.resolve(process.cwd(), argv.exportPath)}`);
          }
          return;
        }

        if (argv.exportPath) {
          writeJsonExport(argv.exportPath, records);
        }

        if (argv.json) {
          console.log(JSON.stringify(records, null, 2));
          return;
        }

        console.log('openclaw skills');
        console.log('');
        console.log(`Sources: ${sources.join(', ')}`);
        console.log(`Categories: ${categories.join(', ')}`);
        console.log(`Total: ${records.length}`);
        if (argv.exportPath) {
          console.log(`Exported: ${path.resolve(process.cwd(), argv.exportPath)}`);
        }

        if (records.length === 0) {
          console.log('');
          console.log('No skills matched your filters.');
          return;
        }

        console.log('');
        for (const skill of records) {
          console.log(`- ${skill.id}`);
          console.log(`  title: ${skill.title}`);
          console.log(`  category: ${skill.category}`);
          console.log(`  source: ${skill.source}`);
          console.log(`  hint: ${skill.entrypointHint}`);
          if ((skill.tags || []).length > 0) {
            console.log(`  tags: ${skill.tags?.join(', ')}`);
          }
          if ((skill.capabilities || []).length > 0) {
            console.log(`  capabilities: ${skill.capabilities?.join(', ')}`);
          }
          console.log(`  desc: ${skill.description}`);
          console.log('');
        }
      },
    )
    .command(
      'events',
      'Stream websocket lifecycle events from the local gateway',
      (command: Argv) =>
        command
          .option('timeout', {
            type: 'number',
            describe: 'Stop after N seconds (default: 0 = no timeout)',
            default: 0,
          })
          .option('raw', {
            type: 'boolean',
            describe: 'Print raw JSON lines only',
            default: false,
          }),
      async (argv: { timeout?: number; raw?: boolean }) => {
        const config = loadRuntimeConfig();
        const wsUrl = `ws://${config.gateway.host}:${config.gateway.port}/ws`;

        await new Promise<void>((resolve) => {
          const maxReconnectAttempts = 3;
          const reconnectDelaysMs = [1000, 2000, 4000];
          let attempt = 0;
          let closed = false;
          let timeoutHandle: NodeJS.Timeout | undefined;
          let reconnectHandle: NodeJS.Timeout | undefined;
          let socket: WebSocket | undefined;
          let streamStartAt = Date.now();
          const timeoutMs = Math.max(0, Number(argv.timeout || 0)) * 1000;

          const cleanupTimers = (): void => {
            if (timeoutHandle) {
              clearTimeout(timeoutHandle);
              timeoutHandle = undefined;
            }
            if (reconnectHandle) {
              clearTimeout(reconnectHandle);
              reconnectHandle = undefined;
            }
          };

          const finish = (code = 0): void => {
            if (closed) {
              return;
            }
            closed = true;
            cleanupTimers();
            if (socket && (socket.readyState === 0 || socket.readyState === 1)) {
              socket.close();
            }
            process.exitCode = code;
            resolve();
          };

          if (timeoutMs > 0) {
            timeoutHandle = setTimeout(() => {
              if (!argv.raw) {
                console.log('Event stream timeout reached. Closing.');
              }
              finish(0);
            }, timeoutMs);
          }

          const connect = (): void => {
            if (closed) {
              return;
            }

            socket = new WebSocket(wsUrl, {
              headers: gatewayAuthHeaders(config),
            });
            attempt += 1;

            socket.on('open', () => {
              if (!argv.raw) {
                if (attempt === 1) {
                  console.log(`Connected to ${wsUrl}`);
                  console.log('Streaming events. Press Ctrl+C to stop.');
                } else {
                  console.log(`Reconnected to ${wsUrl} (attempt ${attempt})`);
                }
              }
              streamStartAt = Date.now();
            });

            socket.on('message', data => {
              const line = data.toString();
              if (argv.raw) {
                console.log(line);
                return;
              }

              try {
                const parsed = JSON.parse(line) as { type?: string; [k: string]: unknown };
                const type = parsed.type || 'unknown';
                console.log(`[${String(type)}] ${line}`);
              } catch {
                console.log(`[event] ${line}`);
              }
            });

            socket.on('error', error => {
              const message = error instanceof Error ? error.message : 'unknown websocket error';
              if (attempt > maxReconnectAttempts) {
                console.error(`Gateway websocket unavailable at ${wsUrl}. Start it with: openclaw gateway`);
                finish(1);
                return;
              }

              const waitMs = reconnectDelaysMs[Math.min(attempt - 1, reconnectDelaysMs.length - 1)] || 1000;
              if (!argv.raw) {
                console.log(`WebSocket error (${message}). Reconnecting in ${waitMs}ms...`);
              }
              reconnectHandle = setTimeout(connect, waitMs);
            });

            socket.on('close', () => {
              if (closed) {
                return;
              }

              const elapsedMs = Date.now() - streamStartAt;
              if (timeoutMs > 0 && elapsedMs >= timeoutMs) {
                finish(0);
                return;
              }

              if (attempt >= maxReconnectAttempts) {
                if (!argv.raw) {
                  console.log('WebSocket closed. Retry limit reached.');
                }
                finish(1);
                return;
              }

              const waitMs = reconnectDelaysMs[Math.min(attempt - 1, reconnectDelaysMs.length - 1)] || 1000;
              if (!argv.raw) {
                console.log(`WebSocket closed. Reconnecting in ${waitMs}ms...`);
              }
              reconnectHandle = setTimeout(connect, waitMs);
            });
          };

          connect();

          process.once('SIGINT', () => {
            finish(0);
          });
        });
      },
    )
    .command(
      'chat <message>',
      'Send a single-turn message through the local gateway',
      (command: Argv) =>
        command
          .positional('message', {
            type: 'string',
            demandOption: true,
          })
          .option('session', {
            type: 'string',
            describe: 'Optional session id',
          })
          .option('channel', {
            type: 'string',
            describe: 'Channel name (default from config)',
          })
          .option('provider', {
            choices: ['openai', 'anthropic'] as const,
            describe: 'Force a specific provider (default: auto failover order)',
          }),
      async (argv: { message: string; session?: string; channel?: string; provider?: ProviderName }) => {
        const config = loadRuntimeConfig();
        const url = `http://${config.gateway.host}:${config.gateway.port}/chat`;
        const payload = {
          message: String(argv.message),
          sessionId: argv.session ? String(argv.session) : undefined,
          channel: argv.channel ? String(argv.channel) : undefined,
          provider: argv.provider,
        };

        let response: Response;
        try {
          response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...gatewayAuthHeaders(config),
            },
            body: JSON.stringify(payload),
          });
        } catch {
          console.error(`Gateway unavailable at ${url}. Start it with: openclaw gateway`);
          process.exitCode = 1;
          return;
        }

        const body = await response.text();
        if (!response.ok) {
          console.error(`Chat failed: HTTP ${response.status}`);
          console.error(body);
          printProviderKeyHintIfMissing(body, config);
          process.exitCode = 1;
          return;
        }

        console.log(body);
      },
    )
    .help()
    .parseAsync();
}

void run();

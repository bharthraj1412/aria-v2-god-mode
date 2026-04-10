# OpenClaw Ultimate Agent (Runtime Rebuild)

This repository has been cut over from a VS Code extension into an OpenClaw-style runtime scaffold.

Developer reference:

- DEVELOPER.md
- WALKTHROUGH.md

Current implementation status:

- CLI commands: onboard, configure, gateway, status, providers, events, chat
- HTTP gateway endpoints: GET /health, POST /chat
- WebSocket endpoint: /ws (connectivity + lifecycle events)
- Session persistence: JSONL transcripts in ~/.openclaw/sessions
- First channel: local-exec
- First providers: OpenAI + Anthropic + OpenRouter with ordered failover

Integrated capabilities (from attached skill catalog upgrades):

- Real-time voice interaction: natural conversation with instant response pathways
- System control: launch apps, manage files, execute commands
- Autonomous task execution: plan and complete multi-step workflows
- Visual awareness: screen analysis and webcam-oriented processing hooks
- Persistent memory: preference/context continuity patterns via runtime/session memory
- Integrated tools: web search, weather, reminders, messaging, code help, image-generation-ready skill surface

## Requirements

- Node.js 20+
- npm
- OpenAI API key in OPENAI_API_KEY
- Anthropic API key in ANTHROPIC_API_KEY
- OpenRouter API key in OPENROUTER_API_KEY

## Install

1. Install dependencies:

npm install


Optional gateway auth for non-local access:

gateway:
	host: 127.0.0.1
	port: 18789
	token: your-shared-token
	trustProxy: true

When gateway.token is set, non-loopback HTTP and WebSocket requests must include header:

x-openclaw-token: your-shared-token

Loopback localhost requests remain frictionless for local development.
The openclaw CLI automatically sends this header when gateway.token is configured.
When trustProxy is enabled, the gateway derives client address from x-forwarded-for.
2. Build:

npm run compile

3. Run the automated runtime smoke test:

npm test

Dependency compatibility check only:

npm run check:deps

4. Initialize config:

node dist/cli/index.js onboard

This creates:

- ~/.openclaw/config.yml
- ~/.openclaw/sessions/

## Run Gateway

node dist/cli/index.js gateway

Expected output:

Gateway listening on http://127.0.0.1:18789

## WebSocket Events

Connect to:

ws://127.0.0.1:18789/ws

Current event types:

- welcome
- snapshot.sessions
- chat.received
- session.entry
- chat.completed
- chat.failed

`chat.completed` includes `providerRequested` so operators can distinguish forced-provider runs from auto failover.

Every `/chat` request now gets a server-generated `requestId` that is carried through `chat.received`, `session.entry`, `chat.completed`, and `chat.failed`.

Event schema (current):

```json
{
	"type": "chat.received",
	"sessionId": "uuid",
	"requestId": "uuid",
	"channel": "local-exec",
	"message": "hello",
	"preferredProvider": "openai",
	"timestamp": "2026-04-10T00:00:00.000Z"
}
```

```json
{
	"type": "chat.completed",
	"sessionId": "uuid",
	"requestId": "uuid",
	"channel": "local-exec",
	"providerRequested": "auto",
	"provider": "local-exec",
	"model": "shell",
	"timestamp": "2026-04-10T00:00:00.000Z"
}
```

```json
{
	"type": "session.entry",
	"sessionId": "uuid",
	"requestId": "uuid",
	"role": "assistant",
	"provider": "local-exec",
	"model": "shell",
	"content": "obs-check",
	"timestamp": "2026-04-10T00:00:00.000Z"
}
```

## Verify Provider Setup

node dist/cli/index.js configure

This checks whether provider API key environment variables are available in the current shell and prints missing-key setup commands for PowerShell.

## One-Shot Diagnostics

Run runtime diagnostics (config, auth mode, key envs, port state, gateway reachability):

node dist/cli/index.js doctor

JSON output:

node dist/cli/index.js doctor --json

Control failure gates (for CI/local policy):

node dist/cli/index.js doctor --fail-on all
node dist/cli/index.js doctor --fail-on gateway --fail-on port
node dist/cli/index.js doctor --fail-on auth-policy
node dist/cli/index.js doctor --fail-on rate-limit-policy --min-rate-limit-rpm 30 --max-rate-limit-burst 50
node dist/cli/index.js doctor --fail-on token-age-policy --max-token-age-days 30
node dist/cli/index.js doctor --fail-on none

Or via npm script:

npm run doctor

## Apply Secure Baseline

Automatically set secure runtime defaults in config:

node dist/cli/index.js harden

With explicit rate-limit thresholds and JSON output:

node dist/cli/index.js harden --rpm 45 --burst 15 --json

Reveal full token explicitly (default output masks token):

node dist/cli/index.js harden --json --show-token

Or via npm script:

npm run harden

After hardening, verify policy gates:

node dist/cli/index.js doctor --fail-on auth-policy --fail-on rate-limit-policy

## Rotate Gateway Token

Rotate token with an auto-generated value:

node dist/cli/index.js rotate-token

Set explicit token and enforce strict loopback auth:

node dist/cli/index.js rotate-token --token your-new-token --strict --json

By default, command output masks token material; use `--show-token` only in trusted contexts.
Token rotation metadata is persisted at `gateway.tokenUpdatedAt` for token-age policy checks.

Or via npm script:

npm run rotate-token

## Check Status

node dist/cli/index.js status

`/health` session summaries include `lastProvider`, `lastModel`, and `lastProviderRequested` when available.

`/health` also includes `lastRequestId` for each session when available.

`/health` includes gateway auth mode under `auth`:

```json
{
	"auth": {
		"tokenConfigured": false,
		"trustProxy": false
	}
}
```

`/health` also reports active chat throttling config under `rateLimit`:

```json
{
	"rateLimit": {
		"enabled": false,
		"requestsPerMinute": 60,
		"burst": 20
	}
}
```

Session summary shape:

```json
{
	"id": "uuid",
	"updatedAt": "2026-04-10T00:00:00.000Z",
	"entries": 2,
	"lastRequestId": "uuid",
	"lastProvider": "local-exec",
	"lastModel": "shell",
	"lastProviderRequested": "auto"
}
```

## Check Provider Health

Readiness check (keys + model config):

node dist/cli/index.js providers

Live provider probe through failover order:

node dist/cli/index.js providers --live

Provider calls use automatic retry with exponential backoff and jitter before a request is considered failed.

Or via npm script:

npm run providers

## Stream Runtime Events

node dist/cli/index.js events

Example with timeout:

node dist/cli/index.js events --timeout 15

The events command now retries websocket reconnects up to 3 times with backoff if the gateway restarts.

Or via npm script:

npm run events

## Skill Catalog

List integrated skills:

node dist/cli/index.js skills

Filter by source:

node dist/cli/index.js skills --source mark-xxx

node dist/cli/index.js skills --source paperclip

Filter by metadata:
node dist/cli/index.js skills --capability plugin-development

node dist/cli/index.js skills --tag memory

node dist/cli/index.js skills --capability plugin-development --capability agent-management --capability-mode any

node dist/cli/index.js skills --tag memory --tag design --tag-mode all

List source/category indexes quickly:

node dist/cli/index.js skills --sources --json

node dist/cli/index.js skills --categories --json

Show a summary:

node dist/cli/index.js skills --summary

node dist/cli/index.js skills --summary --json

Search in catalog:

node dist/cli/index.js skills --search weather

JSON output:

node dist/cli/index.js skills --json

Export JSON to file:

node dist/cli/index.js skills --source paperclip --export ./artifacts/skills.paperclip.json

node dist/cli/index.js skills --summary --export ./artifacts/skills.summary.json

Or via npm script:

npm run skills

Current integrated source catalog includes skills mapped from the attached Mark-XXX action modules.
JSON records include `tags`, `capabilities`, and `sourcePath` when available from imported SKILL frontmatter.

It also includes imported orchestration/design/memory skill modules from the attached Paperclip project.
Paperclip source entries are auto-discovered from attached SKILL.md modules under paperclip-master/paperclip-master.
Discovery is recursive across paperclip-master/paperclip-master/skills, .claude/skills, and .agents/skills.

## Send a Chat Message

node dist/cli/index.js chat "hello"

Force a specific provider:

node dist/cli/index.js chat "hello" --provider openai

or

node dist/cli/index.js chat "hello" --provider anthropic

To execute a local command through local-exec channel, prefix with exec:

node dist/cli/index.js chat "exec: whoami"

## Config

Default config path:

~/.openclaw/config.yml

Provider order controls failover. Example:

providers:
	order:
		- openai
		- anthropic

local-exec security policy is config-driven:

security:
	execAllowlist:
		- echo
		- git
	execRequireApproval:
		- curl
	approvalBypassEnv: OPENCLAW_ALLOW_UNSAFE_EXEC

Set `OPENCLAW_ALLOW_UNSAFE_EXEC=true` only in trusted local environments when you intentionally need approval-gated commands.

Optional gateway auth for non-local access:

gateway:
	host: 127.0.0.1
	port: 18789
	token: your-shared-token
	trustProxy: true
	enforceLoopbackToken: false

When `gateway.token` is set, non-loopback HTTP and WebSocket requests must include:

x-openclaw-token: your-shared-token

Loopback localhost requests remain frictionless for local development.
The openclaw CLI automatically sends this header when gateway.token is configured.
When trustProxy is enabled, the gateway derives client address from x-forwarded-for.
Set `enforceLoopbackToken: true` only when you want localhost calls to require the token too.

Optional /chat rate limiting:

security:
	rateLimit:
		enabled: true
		requestsPerMinute: 60
		burst: 20

When enabled, /chat returns HTTP 429 with Retry-After when the limit is exceeded.

Session retention and rotation are config-driven:

sessions:
	maxSizeMb: 10
	ttlDays: 30

Session JSONL files are rotated when they exceed `maxSizeMb`, and stale session files older than `ttlDays` are cleaned up.

## Next Phases

Planned next implementation phases:

- richer channel protocol and websocket event stream
- operator dashboard UI
- stronger auth and approval workflows
- expanded channel/plugin architecture

# Developer Guide

This document is the engineering reference for maintaining and upgrading the OpenClaw runtime in this repository.

## 1. Product Scope

Current runtime capabilities:

- CLI runtime commands for operations, diagnostics, and chat execution
- HTTP gateway with health and chat endpoints
- WebSocket event stream for runtime lifecycle visibility
- Session persistence using JSONL transcripts
- Local execution channel via exec-prefixed messages
- Provider integration with OpenAI and Anthropic
- Ordered provider failover and optional forced provider routing
- Skill catalog integration from Mark-XXX action modules

Capability outcomes from integrated skills:

- Real-time voice interaction: natural conversation pathways and voice-oriented action surface
- System control: app launch, file operations, and command execution controls
- Autonomous task execution: multi-step planning/execution support patterns
- Visual awareness: screen/webcam processing skill hooks
- Persistent memory: context/preference continuity primitives
- Integrated tools: web search, weather, reminders, messaging, code help, and image-generation-ready tooling surface

Out of scope for current version:

- Authentication and authorization
- Multi-tenant isolation
- UI dashboard/operator frontend
- Plugin sandboxing and policy engine

## 2. Architecture Map

Primary modules:

- src/cli/index.ts: command surface and operator workflows
- src/gateway/index.ts: HTTP and WebSocket runtime server
- src/gateway/events.ts: typed event and session summary contract
- src/agents/runner.ts: prompt loading and provider execution orchestration
- src/providers/index.ts: provider construction, direct selection, and failover
- src/providers/openai.ts: OpenAI adapter
- src/providers/anthropic.ts: Anthropic adapter
- src/channels/local/index.ts: local-exec channel logic
- src/sessions/index.ts: in-memory session map + JSONL append persistence
- src/config/bootstrap.ts: config home/bootstrap paths and defaults
- src/config/index.ts + src/config/schema.ts: config parse and validation
- src/skills/index.ts + src/skills/markxxx.ts: integrated external skill catalogs and filtering
- src/skills/paperclip.ts: imported Paperclip skill modules mapped into runtime catalog
  - includes runtime recursive SKILL.md auto-discovery from attached paperclip-master paths (skills, .claude/skills, .agents/skills) with static fallback entries
  - parses YAML frontmatter metadata (`name`, `description`, `tags`, `capabilities`) and exposes optional `sourcePath` for JSON consumers

Data flow (high level):

1. CLI receives command.
2. For chat, CLI posts payload to gateway /chat.
3. Gateway routes request into selected channel.
4. local-exec requests short-circuit directly to shell execution.
5. Non-local requests go through agent runner to provider logic.
6. Provider layer either uses forced provider or failover order.
7. Session entries are appended and lifecycle events emitted over WebSocket.

## 3. Current Feature Inventory

### 3.1 CLI Commands

- onboard: initialize config and session folders
- configure: verify provider key env vars and print shell setup commands
- doctor: one-shot diagnostics for config/auth/env/port/reachability
- doctor --fail-on <targets>: configurable failure gates for CI/local checks
- supported doctor fail-on targets: gateway, port, provider-env, auth-policy, rate-limit-policy, all, none
- supported doctor fail-on targets: gateway, port, provider-env, auth-policy, rate-limit-policy, token-age-policy, all, none
- harden: apply secure baseline (token auth strictness + rate-limit enablement)
- rotate-token: rotate gateway.token and optionally enforce strict loopback token checks
- gateway: launch runtime server
- status: fetch health payload from local gateway
- providers: show provider readiness
- providers --live: run live provider probe via failover
- skills: list integrated skill catalogs
- skills --source <name>: filter skills by source
- skills --search <term>: search skills by keyword
- skills --capability <name>: filter skills by capability (repeatable)
- skills --capability-mode any|all: control capability filter matching mode
- skills --tag <name>: filter skills by tag (repeatable)
- skills --tag-mode any|all: control tag filter matching mode
- skills --sources: list source ids quickly
- skills --categories: list categories quickly
- skills --summary: show aggregated counts for the filtered catalog
- skills --export <path>: write filtered catalog JSON to file
- events: stream WebSocket lifecycle events
- events --raw: emit raw event JSON lines
- events --timeout N: auto-stop stream after N seconds
- chat <message>: send chat turn to local gateway
- chat --provider openai|anthropic: force specific provider
- chat with exec: prefix: run local shell command path

### 3.2 HTTP Endpoints

- GET /health:
  - runtime status and session summaries
  - auth mode and /chat rate-limit mode visibility
  - session summary includes lastProvider, lastModel, lastProviderRequested when available
- POST /chat:
  - required: message
  - optional: sessionId, channel, provider
  - returns providerRequested, provider, model, response

### 3.3 WebSocket Events

Published on /ws:

- welcome
- snapshot.sessions
- gateway.started
- chat.received
- session.entry
- chat.completed
- chat.failed

Contract source of truth:

- src/gateway/events.ts

### 3.4 Session Persistence

- Runtime path: ~/.openclaw/sessions
- Format: <sessionId>.jsonl
- Entry fields: role, content, timestamp, optional provider/model/requestedProvider

### 3.5 Provider Behavior

- Supported providers: openai, anthropic
- Default mode: ordered failover from config providers.order
- Forced mode: explicit provider from chat payload
- Missing key behavior: explicit actionable errors

## 4. Configuration Contract

Default config path:

- ~/.openclaw/config.yml

Core config domains:

- gateway host/port
- gateway token/trustProxy/enforceLoopbackToken auth controls
- providers order and model/env mapping
- channel defaults
- agent system prompt path
- security.rateLimit controls for /chat throttling

Validation:

- zod schema in src/config/schema.ts

## 5. Upgrade Strategy

Use this sequence for non-breaking changes:

1. Add or update TypeScript interfaces first.
2. Update implementation modules.
3. Update CLI surface if user-visible behavior changed.
4. Update README and WALKTHROUGH docs.
5. Compile and smoke-test command flows.
6. Validate event contract backward compatibility.

Use this sequence for breaking changes:

1. Version contract changes in src/gateway/events.ts.
2. Add compatibility behavior or migration notes.
3. Update all call sites and tests/smoke scripts.
4. Document breaking changes in README and this file.
5. Bump package version and publish migration notes.

## 6. Change Impact Matrix

When changing this file, verify these areas:

- src/gateway/events.ts:
  - verify CLI events consumer output
  - verify websocket payload docs in README
- src/gateway/index.ts:
  - verify /health and /chat behavior
  - verify local-exec short-circuit still works
- src/providers/index.ts:
  - verify providers command and chat provider override
- src/cli/index.ts:
  - verify scripts and command help output
- src/config/schema.ts:
  - verify onboard + loadRuntimeConfig
- src/sessions/index.ts:
  - verify JSONL persistence and health/session snapshots

## 7. Testing And Validation Checklist

Minimum validation before merging runtime changes:

1. npm run compile
2. npm run onboard
3. npm run configure
4. npm run gateway (separate terminal)
5. npm run status
6. npm run events -- --timeout 5 --raw
7. npm run chat -- "exec:echo smoke-ok"
8. npm run providers
9. npm run check:deps

If provider keys are set, also run:

1. npm run providers -- --live
2. npm run chat -- "hello"
3. npm run chat -- "hello" --provider openai
4. npm run chat -- "hello" --provider anthropic

## 8. Operational Guardrails

- Keep local-exec short-circuit path independent from provider availability.
- Preserve clear and actionable CLI error messages.
- Avoid changing event field names without compatibility plan.
- Keep config defaults stable unless there is a documented migration path.
- Keep runtime behavior explicit across Windows, macOS, Linux in docs.

## 9. Dependency Notes

- openai currently expects zod v3 peer compatibility in this setup.
- ws is used for both gateway event publication and CLI event consumption.
- Keep Node and TypeScript versions aligned with package.json and compile checks.

## 10. Release Readiness

Before release tag:

1. Confirm feature checklist in this document is still accurate.
2. Confirm README and WALKTHROUGH examples still work as written.
3. Confirm dist output is generated from current source.
4. Confirm no stale extension-era references remain in docs or scripts.
5. Capture known limitations and next-phase items.

## 11. Suggested Next Upgrades

Priority order:

1. Add policy and approval controls for local-exec commands.
2. Add structured logging and request correlation IDs.
3. Add automated tests for gateway routes and event payloads.
4. Add provider retry strategy with exponential backoff.
5. Build operator dashboard consuming WebSocket event contract.

## 12. ARIA v3 Advanced Blueprint

This section captures the advanced v3 direction as an upgrade plan.

Important status rule:

- Items in this section are planned unless they already exist in src/.
- Do not mark a module as implemented until code exists, compiles, and is smoke-tested.

### 12.1 Target Outcomes

- Expand beyond current openai/anthropic pair into multi-provider routing.
- Add stronger runtime safety around local execution and gateway access.
- Add richer autonomy features (scheduler, memory, policy, observability).
- Keep existing /health, /chat, /ws contracts stable during rollout.

### 12.2 Candidate New Modules

- src/brain/godmode.ts
- src/brain/ultraplinian.ts
- src/brain/parseltongue.ts
- src/brain/autotune.ts
- src/memory/paperclip.ts
- src/memory/vector.ts
- src/channels/telegram/index.ts
- src/channels/social/index.ts
- src/channels/voice/index.ts
- src/channels/vision/index.ts
- src/security/policy.ts
- src/scheduler/cron.ts
- src/avatar/index.ts

### 12.3 Candidate New Provider Adapters

- src/providers/openrouter.ts
- src/providers/gemini.ts
- src/providers/grok.ts
- src/providers/local-llm.ts
- src/providers/perplexity.ts
- src/providers/deepseek.ts

Implementation note:

- All provider adapters must implement the same provider contract used by current adapters.

## 13. Bug Register For Upgrade Cycle

Use this as the authoritative backlog for hardening work.

### 13.1 Security And Policy

1. Gateway auth hardening (implemented):
  - Added optional gateway.token shared-token config.
  - Added optional gateway.trustProxy for reverse-proxy deployments.
  - Added optional gateway.enforceLoopbackToken for strict localhost token enforcement.
  - Non-loopback HTTP and WebSocket paths require x-openclaw-token when configured.
  - Loopback localhost traffic remains frictionless for local development.
2. local-exec approval policy (implemented):
  - Added allowlist and approval-required command classes in src/security/policy.ts.
  - Wired local-exec channel to enforce policy before shell execution.
  - Added config fields: security.execAllowlist, security.execRequireApproval, security.approvalBypassEnv.

### 13.2 Reliability And Resilience

3. Provider retry and backoff (implemented):
  - Added exponential backoff with jitter in src/providers/index.ts.
  - Retry skips missing-key and auth-style failures, but retries transient provider errors.
4. WebSocket client reconnect in events command (implemented):
  - Added bounded retry strategy with backoff in src/cli/index.ts.
  - Retry limit is 3 attempts before the command exits with error.
5. Request correlation IDs (implemented):
  - Generated at /chat entry and propagated through events, persisted session entries, chat responses, and /health session summaries.
6. Structured logging (implemented):
  - Added JSON-line logger in src/logging.ts.
  - Gateway emits request-scoped logs for start, chat.received, chat.completed, chat.failed, and websocket connections.
7. Automated runtime smoke test (implemented):
  - Added node:test coverage in test/runtime.test.js.
  - Test runs gateway in an isolated temp home and verifies /health, /chat, requestId propagation, and websocket events.

### 13.3 Data Lifecycle

8. Session storage controls (implemented):
  - Added rotation and retention policy for JSONL session files in src/sessions/index.ts.
  - Added config fields for max size and TTL: sessions.maxSizeMb, sessions.ttlDays.

### 13.5 Traffic Controls

10. /chat rate limiting (implemented):
  - Added token-bucket limiter in src/security/rate-limit.ts.
  - Configured via security.rateLimit (enabled, requestsPerMinute, burst).
  - Gateway returns 429 + Retry-After on limit exceed.

### 13.4 Dependency Stability

9. Dependency guard (implemented):
  - Added scripts/check-deps.js to validate openai/zod compatibility and lockfile consistency.
  - Wired guard into npm test and CI workflow (.github/workflows/ci.yml).

## 14. Staged Upgrade Plan

Execute in this order to reduce risk.

### Stage 1: Safety And Observability

- Add security policy module for local-exec.
- Add correlation IDs and structured logging baseline.
- Add provider retry/backoff wrapper.
- Add websocket reconnect support for events CLI command.

Exit criteria:

- compile passes
- existing commands still work
- events and status outputs remain backward compatible

### Stage 2: Memory And Context

- Add long-term memory adapter module.
- Add vector search adapter and retrieval injection hook in runner.
- Add config schema fields for memory backends.

Exit criteria:

- chat quality improves with prior context retrieval
- memory features can be disabled via config

### Stage 3: Channel Expansion

- Add telegram channel first.
- Add social/voice/vision channels behind feature flags.
- Keep channel contract uniform with existing local channel.

Exit criteria:

- gateway handles multi-channel traffic without breaking /chat local flow

### Stage 4: Advanced Reasoning Modes

- Add godmode orchestration mode.
- Add ultraplinian tiered evaluation mode.
- Add parseltongue red-team mode with explicit safety boundaries.

Exit criteria:

- mode selection is explicit in API and CLI
- default mode remains stable for existing users

### Stage 5: Runtime Automation

- Add scheduler module and config-driven tasks.
- Add optional avatar and voice interfaces.

Exit criteria:

- autonomous jobs are auditable
- all automated actions are logged and controllable

## 15. Upgrade Governance Rules

Use these rules for all future updates:

1. No silent contract breaks:
  - If event payloads or endpoint response shapes change, version and document them.
2. Additive first:
  - Prefer adding new commands/fields over changing old behavior.
3. Feature flags by default:
  - New channels/providers/modes must be opt-in until stable.
4. Docs in same PR:
  - Update README, WALKTHROUGH, and this file together.
5. Validation gate:
  - No merge without compile + smoke checklist pass.
6. Security-first exceptions:
  - Security fixes can be expedited, but must include post-change notes.

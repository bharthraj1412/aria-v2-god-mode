# OpenClaw Runtime Walkthrough

This walkthrough is a practical, start-to-finish guide for running the current runtime build on Windows PowerShell.

## 1. Install And Build

Run from the project root:

```powershell
npm install
npm run compile
```

Expected result:

- Compile finishes with no TypeScript errors.

## 2. Create Local Runtime Config

```powershell
npm run onboard
```

Expected result:

- Config file is created at `%USERPROFILE%\\.openclaw\\config.yml` (or already exists).
- Session storage directory exists at `%USERPROFILE%\\.openclaw\\sessions`.

## 3. Configure Provider Keys

Check key readiness:

```powershell
npm run configure
```

If keys are missing, set them in your current shell:

```powershell
$env:OPENAI_API_KEY = "<your-openai-key>"
$env:ANTHROPIC_API_KEY = "<your-anthropic-key>"
```

Optional provider health checks:

```powershell
npm run providers
npm run providers -- --live
npm run doctor
npm run harden
npm run rotate-token
```

Notes:

- `providers` checks config + key presence.
- `providers --live` attempts a real model call via failover order.
- `doctor` summarizes runtime config path, auth mode, key env status, port state, and gateway reachability.
- `harden` applies a secure baseline and is useful before enabling strict doctor policy gates in CI.
- `rotate-token` refreshes gateway token material when rotating credentials.

## 4. Start Gateway

```powershell
npm run gateway
```

Expected result:

- Gateway listens on `http://127.0.0.1:18789`.

Keep this terminal open while testing with another terminal.

## 5. Check Runtime Status

In another terminal:

```powershell
npm run status
```

Expected JSON fields include:

- `status`, `host`, `port`
- `auth` and `rateLimit` runtime policy visibility blocks
- `sessions[]` with `id`, `updatedAt`, `entries`
- `lastProvider`, `lastModel`, `lastProviderRequested` when available

## 6. Stream Runtime Events

Human-friendly stream:

```powershell
npm run events -- --timeout 15
```

Raw JSON stream:

```powershell
npm run events -- --timeout 15 --raw
```

Current websocket event types:

- `welcome`
- `snapshot.sessions`
- `chat.received`
- `session.entry`
- `chat.completed`
- `chat.failed`

## 7. Send Chat Requests

Default mode (auto failover):

```powershell
npm run chat -- "hello"
```

Force a specific provider:

```powershell
npm run chat -- "hello" --provider openai
npm run chat -- "hello" --provider anthropic
```

Local shell execution channel:

```powershell
npm run chat -- "exec:echo walkthrough-ok"
```

Notes:

- `exec:` requests short-circuit to local execution and do not require provider keys.
- Non-`exec:` requests use model providers and require valid API keys.

## 8. Verify Session Persistence

After one or more chats, inspect:

- `%USERPROFILE%\\.openclaw\\sessions`

Each session is stored as JSONL, with user and assistant entries.

## 9. Common Troubleshooting

### Gateway unavailable

Symptom:

- `status`, `chat`, or `events` says gateway is unavailable.

Fix:

- Start gateway with `npm run gateway`.
- If startup reports port-in-use, stop the conflicting process or change `gateway.port` in `%USERPROFILE%\\.openclaw\\config.yml`.

### Provider missing API key

Symptom:

- Chat returns missing key errors for `openai` or `anthropic`.

Fix:

- Run `npm run configure` and set missing env vars in the current shell.

### Live provider probe fails

Symptom:

- `npm run providers -- --live` fails.

Fix:

- Confirm key names in config and that env vars are set in the same shell session.
- Validate network access to provider APIs.

## 10. Remote Access Auth (Optional Hardening)

To require a shared token for non-local traffic, set this in `%USERPROFILE%\\.openclaw\\config.yml`:

```yaml
gateway:
	host: 127.0.0.1
	port: 18789
	token: your-shared-token
	trustProxy: true
```

Behavior:

- Localhost loopback calls remain allowed for local developer flow.
- Non-loopback requests require `x-openclaw-token`.
- With `trustProxy: true`, client address is read from `x-forwarded-for`.

PowerShell examples:

```powershell
Invoke-WebRequest -Uri "http://127.0.0.1:18789/health" -Headers @{
	"x-forwarded-for" = "203.0.113.10"
	"x-openclaw-token" = "your-shared-token"
}
```

Without a valid token for forwarded non-loopback traffic, the gateway returns HTTP `401`.

## 11. Quick End-To-End Checklist

Run these in order:

```powershell
npm run compile
npm run onboard
npm run configure
npm run gateway
```

In a second terminal:

```powershell
npm run status
npm run events -- --timeout 10 --raw
npm run chat -- "exec:echo e2e-ok"
```

If all pass, runtime baseline is healthy.

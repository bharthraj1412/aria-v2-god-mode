"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDashboardHtml = buildDashboardHtml;
function escapeHtml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
function renderFileStateCard(fileState) {
    const badgeClass = fileState.ready ? 'ready' : 'missing';
    const badgeLabel = fileState.ready ? 'Ready' : 'Missing';
    return `
    <article class="file-card ${badgeClass}">
      <div class="file-card-head">
        <span class="file-label">${escapeHtml(fileState.label)}</span>
        <span class="file-badge">${badgeLabel}</span>
      </div>
      <div class="file-path">${escapeHtml(fileState.path)}</div>
      <p class="file-desc">${escapeHtml(fileState.description)}</p>
    </article>
  `;
}
function renderActionButton(action) {
    const className = action.primary ? 'action primary' : 'action';
    return `
    <button class="${className}" type="button" data-command="${escapeHtml(action.command)}">
      <span>${escapeHtml(action.label)}</span>
      <small>${escapeHtml(action.helper)}</small>
    </button>
  `;
}
function buildDashboardHtml(data) {
    const fileCards = data.fileStates.map(renderFileStateCard).join('');
    const actionButtons = data.actions.map(renderActionButton).join('');
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; script-src 'nonce-${data.nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ARIA v2 Control Panel</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #07111d;
      --bg-soft: rgba(10, 18, 30, 0.72);
      --panel: rgba(14, 24, 39, 0.9);
      --panel-border: rgba(255, 255, 255, 0.12);
      --text: #f4f7fb;
      --muted: rgba(244, 247, 251, 0.68);
      --accent: #ff7a59;
      --accent-2: #4fc3f7;
      --accent-3: #9b87f5;
      --ok: #58d68d;
      --warn: #f4c542;
      --shadow: 0 22px 60px rgba(0, 0, 0, 0.38);
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      color: var(--text);
      background:
        radial-gradient(circle at top left, rgba(255, 122, 89, 0.22), transparent 24%),
        radial-gradient(circle at top right, rgba(79, 195, 247, 0.18), transparent 20%),
        linear-gradient(180deg, #08111d 0%, #07111d 60%, #050a11 100%);
      font-family: "Aptos", "Segoe UI Variable", "Trebuchet MS", sans-serif;
      letter-spacing: 0.01em;
    }

    .shell {
      position: relative;
      width: min(1220px, calc(100vw - 48px));
      margin: 24px auto;
      padding: 28px;
      border: 1px solid var(--panel-border);
      border-radius: 28px;
      background: linear-gradient(180deg, rgba(8, 16, 28, 0.96), rgba(7, 14, 25, 0.88));
      box-shadow: var(--shadow);
      overflow: hidden;
    }

    .shell::before,
    .shell::after {
      content: '';
      position: absolute;
      width: 360px;
      height: 360px;
      border-radius: 50%;
      filter: blur(30px);
      pointer-events: none;
      opacity: 0.32;
    }

    .shell::before {
      top: -140px;
      right: -120px;
      background: radial-gradient(circle, rgba(155, 135, 245, 0.8), transparent 68%);
    }

    .shell::after {
      bottom: -160px;
      left: -120px;
      background: radial-gradient(circle, rgba(255, 122, 89, 0.7), transparent 68%);
    }

    .hero {
      display: grid;
      grid-template-columns: minmax(0, 1.7fr) minmax(320px, 0.9fr);
      gap: 20px;
      align-items: stretch;
      margin-bottom: 20px;
      position: relative;
      z-index: 1;
    }

    .hero-card,
    .panel,
    .file-card,
    .action {
      backdrop-filter: blur(14px);
    }

    .hero-card,
    .panel {
      border: 1px solid rgba(255, 255, 255, 0.1);
      background: var(--bg-soft);
      border-radius: 22px;
      padding: 22px;
    }

    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      color: rgba(244, 247, 251, 0.78);
      margin-bottom: 12px;
    }

    .eyebrow::before {
      content: '';
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: linear-gradient(180deg, var(--accent), #ffb18d);
      box-shadow: 0 0 0 6px rgba(255, 122, 89, 0.18);
    }

    h1 {
      margin: 0;
      font-size: clamp(2.4rem, 4vw, 4.5rem);
      line-height: 0.95;
      letter-spacing: -0.05em;
    }

    .hero-copy {
      margin-top: 14px;
      max-width: 54ch;
      color: var(--muted);
      font-size: 1rem;
      line-height: 1.65;
    }

    .hero-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 18px;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      background: rgba(255, 255, 255, 0.05);
      font-size: 12px;
      color: var(--text);
    }

    .badge strong {
      color: var(--accent-2);
      font-weight: 800;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .stat {
      padding: 16px;
      border-radius: 18px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02));
    }

    .stat-value {
      margin-top: 8px;
      font-size: 1.4rem;
      font-weight: 800;
      letter-spacing: -0.03em;
    }

    .stat-label {
      color: var(--muted);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.15em;
    }

    .grid {
      display: grid;
      grid-template-columns: minmax(0, 1.2fr) minmax(340px, 0.8fr);
      gap: 20px;
      position: relative;
      z-index: 1;
    }

    .panel-title {
      margin: 0 0 10px;
      font-size: 18px;
      letter-spacing: -0.03em;
    }

    .panel-subtitle {
      margin: 0 0 16px;
      color: var(--muted);
      line-height: 1.65;
      font-size: 14px;
    }

    .prompt-preview {
      padding: 20px;
      border-radius: 22px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      background: var(--panel);
    }

    pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
      font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
      font-size: 12px;
      line-height: 1.65;
      color: rgba(244, 247, 251, 0.9);
    }

    .file-list {
      display: grid;
      gap: 12px;
    }

    .file-card {
      padding: 16px;
      border-radius: 18px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(255, 255, 255, 0.04);
    }

    .file-card.ready {
      box-shadow: inset 0 0 0 1px rgba(88, 214, 141, 0.08);
    }

    .file-card.missing {
      box-shadow: inset 0 0 0 1px rgba(244, 197, 66, 0.08);
    }

    .file-card-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .file-label {
      font-weight: 800;
      letter-spacing: -0.02em;
    }

    .file-badge {
      display: inline-flex;
      align-items: center;
      padding: 5px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      background: rgba(255, 255, 255, 0.08);
      color: var(--text);
    }

    .file-card.ready .file-badge {
      color: var(--ok);
    }

    .file-card.missing .file-badge {
      color: var(--warn);
    }

    .file-path {
      margin-top: 10px;
      font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
      font-size: 12px;
      color: rgba(244, 247, 251, 0.76);
      line-height: 1.55;
    }

    .file-desc {
      margin: 10px 0 0;
      color: var(--muted);
      line-height: 1.55;
      font-size: 13px;
    }

    .actions {
      margin-top: 20px;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      position: relative;
      z-index: 1;
    }

    .action {
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 18px;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.03));
      color: var(--text);
      text-align: left;
      padding: 16px;
      cursor: pointer;
      transition: transform 120ms ease, border-color 120ms ease, background 120ms ease;
    }

    .action:hover {
      transform: translateY(-1px);
      border-color: rgba(79, 195, 247, 0.5);
      background: linear-gradient(180deg, rgba(79, 195, 247, 0.14), rgba(255, 255, 255, 0.04));
    }

    .action.primary {
      background: linear-gradient(180deg, rgba(255, 122, 89, 0.2), rgba(255, 255, 255, 0.04));
      border-color: rgba(255, 122, 89, 0.35);
    }

    .action span {
      display: block;
      font-weight: 800;
      font-size: 14px;
      margin-bottom: 6px;
    }

    .action small {
      display: block;
      color: var(--muted);
      line-height: 1.5;
      font-size: 12px;
    }

    .footer {
      margin-top: 18px;
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      justify-content: space-between;
      align-items: center;
      color: var(--muted);
      font-size: 12px;
      position: relative;
      z-index: 1;
    }

    .repo-link {
      color: #8bd3ff;
      text-decoration: none;
      font-weight: 700;
    }

    .repo-link:hover {
      text-decoration: underline;
    }

    @media (max-width: 980px) {
      .hero,
      .grid,
      .actions {
        grid-template-columns: 1fr;
      }

      .shell {
        width: min(100vw - 24px, 1220px);
        padding: 20px;
        margin: 12px auto;
        border-radius: 24px;
      }
    }
  </style>
</head>
<body>
  <main class="shell">
    <section class="hero">
      <div class="hero-card">
        <div class="eyebrow">ARIA v2 control panel</div>
        <h1>High-level workspace project.</h1>
        <p class="hero-copy">
          A single place for the ARIA v2 prompt package, file-scoped guidance, and the builder agent.
          The extension wraps the repo into a usable control surface for the prompt, the instructions,
          and the private GitHub project.
        </p>
        <div class="hero-badges">
          <div class="badge"><strong>Prompt</strong> reusable cross-platform template</div>
          <div class="badge"><strong>Agent</strong> repo editing entry point</div>
          <div class="badge"><strong>Repo</strong> private GitHub project</div>
        </div>
      </div>

      <div class="hero-card">
        <div class="stats">
          <div class="stat">
            <div class="stat-label">Layers</div>
            <div class="stat-value">5 surfaces</div>
          </div>
          <div class="stat">
            <div class="stat-label">Platform focus</div>
            <div class="stat-value">Windows / macOS / Linux</div>
          </div>
          <div class="stat">
            <div class="stat-label">Publish state</div>
            <div class="stat-value">Private</div>
          </div>
          <div class="stat">
            <div class="stat-label">Workspace</div>
            <div class="stat-value">Ready</div>
          </div>
        </div>
      </div>
    </section>

    <section class="grid">
      <article class="prompt-preview">
        <div class="panel-title">Prompt preview</div>
        <p class="panel-subtitle">The body below is loaded from the active prompt file or the packaged fallback.</p>
        <pre>${escapeHtml(data.promptPreview)}</pre>
      </article>

      <aside class="panel">
        <div class="panel-title">Package surface</div>
        <p class="panel-subtitle">These files are the moving parts that define the project.</p>
        <div class="file-list">${fileCards}</div>
      </aside>
    </section>

    <section class="actions">
      ${actionButtons}
    </section>

    <div class="footer">
      <span>Private repository: <a class="repo-link" href="#" data-command="openRepository">${escapeHtml(data.repoUrl)}</a></span>
      <span>Control panel generated by the ARIA v2 extension.</span>
    </div>
  </main>

  <script nonce="${data.nonce}">
    (function () {
      const vscode = acquireVsCodeApi();
      const commandTargets = document.querySelectorAll('[data-command]');

      commandTargets.forEach((target) => {
        target.addEventListener('click', (event) => {
          event.preventDefault();
          const command = target.getAttribute('data-command');
          if (command) {
            vscode.postMessage({ command });
          }
        });
      });
    }());
  </script>
</body>
</html>`;
}

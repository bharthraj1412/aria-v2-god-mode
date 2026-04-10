"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDashboardHtml = buildDashboardHtml;
const referenceData_1 = require("./referenceData");
function escapeHtml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
function renderList(items, className) {
    return `
    <ul class="${className}">
      ${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
    </ul>
  `;
}
function renderStatCard(label, value, detail) {
    return `
    <article class="stat-card">
      <div class="stat-label">${escapeHtml(label)}</div>
      <div class="stat-value">${escapeHtml(value)}</div>
      <p class="stat-detail">${escapeHtml(detail)}</p>
    </article>
  `;
}
function renderSourceCard(title, source, summary, highlights, accent) {
    return `
    <article class="source-card" style="--accent:${escapeHtml(accent)};">
      <div class="card-topline">
        <span class="chip">Source</span>
        <span class="source-name">${escapeHtml(source)}</span>
      </div>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(summary)}</p>
      ${renderList(highlights, 'bullet-list')}
    </article>
  `;
}
function renderClusterCard(title, countLabel, summary, bullets, accent) {
    return `
    <article class="cluster-card" style="--accent:${escapeHtml(accent)};">
      <div class="cluster-header">
        <h3>${escapeHtml(title)}</h3>
        <span class="cluster-count">${escapeHtml(countLabel)}</span>
      </div>
      <p>${escapeHtml(summary)}</p>
      ${renderList(bullets, 'mini-list')}
    </article>
  `;
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
    const isClawbotMode = data.mode === 'clawbot';
    const shellTitle = isClawbotMode ? 'ARIA v2 Clawbot Deck' : 'ARIA v2 Command Deck';
    const heroEyebrow = isClawbotMode ? 'Clawbot-compatible command deck' : 'ARIA v2 command deck';
    const heroTitle = isClawbotMode ? 'Legacy alias, modern registry.' : 'Source-backed workspace project.';
    const heroCopy = isClawbotMode
        ? 'Clawbot in OpenClaw is a legacy alias namespace. ARIA mirrors that shape with a compatibility deck, a capability registry, and explicit migration points.'
        : 'The extension now surfaces the extracted data behind the upgrade: OpenClaw\'s skill atlas, Paperclip\'s orchestration model, G0DM0D3\'s model cockpit, and JARVIS\'s voice-assistant patterns.';
    const heroBadges = isClawbotMode
        ? [
            '<div class="badge"><strong>Legacy</strong> clawbot-style alias</div>',
            '<div class="badge"><strong>Mode</strong> modern ARIA deck</div>',
            '<div class="badge"><strong>Registry</strong> capability lanes</div>',
            '<div class="badge"><strong>OS</strong> Windows / macOS / Linux</div>',
        ].join('')
        : [
            '<div class="badge"><strong>Atlas</strong> analyzed reference repositories</div>',
            '<div class="badge"><strong>Surface</strong> prompt, source, and extension files</div>',
            '<div class="badge"><strong>Repo</strong> private GitHub project</div>',
            '<div class="badge"><strong>OS</strong> Windows / macOS / Linux</div>',
        ].join('');
    const fileCards = data.fileStates.map(renderFileStateCard).join('');
    const actionButtons = data.actions.map(renderActionButton).join('');
    const deckCards = referenceData_1.deckModes.map(deckMode => renderClusterCard(deckMode.title, deckMode.countLabel, deckMode.summary, deckMode.bullets, deckMode.accent)).join('');
    const sourceCards = referenceData_1.sourceProjects.map(project => renderSourceCard(project.title, project.source, project.summary, project.highlights, project.accent)).join('');
    const clusterCards = referenceData_1.skillClusters.map(cluster => renderClusterCard(cluster.title, cluster.countLabel, cluster.summary, cluster.bullets, cluster.accent)).join('');
    const engineCards = referenceData_1.g0dm0d3Modes.map(cluster => renderClusterCard(cluster.title, cluster.countLabel, cluster.summary, cluster.bullets, cluster.accent)).join('');
    const jarvisCards = referenceData_1.jarvisCapabilities.map(cluster => renderClusterCard(cluster.title, cluster.countLabel, cluster.summary, cluster.bullets, cluster.accent)).join('');
    const statCards = [
        ...referenceData_1.atlasStats.map(stat => renderStatCard(stat.label, stat.value, stat.detail)),
        renderStatCard('Package surfaces', `${data.fileStates.length}`, 'Prompt, instructions, source atlas, dashboard shell, extension host, README, and agent.'),
    ].join('');
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; script-src 'nonce-${data.nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(shellTitle)}</title>
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

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      color: var(--text);
      background:
        radial-gradient(circle at top left, rgba(255, 122, 89, 0.2), transparent 24%),
        radial-gradient(circle at top right, rgba(79, 195, 247, 0.18), transparent 20%),
        linear-gradient(180deg, #08111d 0%, #07111d 60%, #050a11 100%);
      font-family: "Aptos", "Segoe UI Variable", "Trebuchet MS", sans-serif;
      letter-spacing: 0.01em;
    }

    .shell {
      position: relative;
      width: min(1360px, calc(100vw - 40px));
      margin: 20px auto;
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
      opacity: 0.3;
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
      grid-template-columns: minmax(0, 1.55fr) minmax(300px, 0.85fr);
      gap: 20px;
      align-items: stretch;
      position: relative;
      z-index: 1;
    }

    .hero-card,
    .panel,
    .source-card,
    .cluster-card,
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
      line-height: 0.94;
      letter-spacing: -0.05em;
    }

    .hero-copy {
      margin-top: 14px;
      max-width: 60ch;
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
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 12px;
    }

    .stat-card {
      padding: 16px;
      border-radius: 18px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02));
    }

    .stat-label {
      color: var(--muted);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.15em;
    }

    .stat-value {
      margin-top: 8px;
      font-size: 1.45rem;
      font-weight: 800;
      letter-spacing: -0.03em;
    }

    .stat-detail {
      margin: 8px 0 0;
      color: var(--muted);
      line-height: 1.55;
      font-size: 12px;
    }

    .section {
      margin-top: 20px;
      position: relative;
      z-index: 1;
    }

    .section-head {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 14px;
    }

    .section-title {
      margin: 0;
      font-size: 18px;
      letter-spacing: -0.03em;
    }

    .section-subtitle {
      margin: 0;
      color: var(--muted);
      line-height: 1.55;
      font-size: 13px;
      max-width: 72ch;
    }

    .split-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
      gap: 20px;
      align-items: start;
    }

    .prompt-preview,
    .file-panel,
    .surface-panel,
    .story-panel {
      padding: 20px;
      border-radius: 22px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      background: var(--panel);
    }

    .prompt-preview {
      min-height: 100%;
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

    pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
      font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
      font-size: 12px;
      line-height: 1.65;
      color: rgba(244, 247, 251, 0.92);
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

    .file-card-head,
    .cluster-header,
    .card-topline {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .file-label,
    .cluster-card h3,
    .source-card h3 {
      font-weight: 800;
      letter-spacing: -0.02em;
      margin: 0;
    }

    .file-badge,
    .cluster-count,
    .source-name,
    .chip {
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

    .file-desc,
    .source-card p,
    .cluster-card p {
      margin: 10px 0 0;
      color: var(--muted);
      line-height: 1.55;
      font-size: 13px;
    }

    .surface-panel .file-list {
      margin-top: 8px;
    }

    .source-grid,
    .cluster-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
      gap: 12px;
    }

    .source-card,
    .cluster-card {
      position: relative;
      overflow: hidden;
      border-radius: 20px;
      padding: 18px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.03));
    }

    .source-card::before,
    .cluster-card::before {
      content: '';
      position: absolute;
      inset: 0 auto auto 0;
      width: 100%;
      height: 3px;
      background: var(--accent);
      opacity: 0.9;
    }

    .card-topline {
      margin-bottom: 8px;
    }

    .source-card h3,
    .cluster-card h3 {
      font-size: 15px;
    }

    .bullet-list,
    .mini-list {
      margin: 12px 0 0;
      padding: 0;
      list-style: none;
      display: grid;
      gap: 8px;
    }

    .bullet-list li,
    .mini-list li {
      position: relative;
      padding-left: 16px;
      color: rgba(244, 247, 251, 0.84);
      line-height: 1.5;
      font-size: 12px;
    }

    .bullet-list li::before,
    .mini-list li::before {
      content: '•';
      position: absolute;
      left: 0;
      color: var(--accent);
    }

    .multi-column {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 20px;
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

    @media (max-width: 1100px) {
      .hero,
      .split-grid,
      .multi-column,
      .actions {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 980px) {
      .shell {
        width: min(100vw - 24px, 1360px);
        padding: 20px;
        margin: 12px auto;
        border-radius: 24px;
      }

      .stats {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <main class="shell">
    <section class="hero">
      <div class="hero-card">
        <div class="eyebrow">${escapeHtml(heroEyebrow)}</div>
        <h1>${escapeHtml(heroTitle)}</h1>
        <p class="hero-copy">${escapeHtml(heroCopy)}</p>
        <div class="hero-badges">${heroBadges}</div>
      </div>

      <div class="hero-card">
        <div class="stats">${statCards}</div>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <div>
          <h2 class="section-title">Deck modes</h2>
          <p class="section-subtitle">Clawbot's legacy alias pattern becomes an explicit mode switch here. The same registry is exposed as either a compatibility deck or the modern ARIA surface.</p>
        </div>
      </div>
      <div class="cluster-grid">${deckCards}</div>
    </section>

    <section class="section">
      <div class="section-head">
        <div>
          <h2 class="section-title">Prompt and package surface</h2>
          <p class="section-subtitle">The active prompt preview sits beside the project files that now define the deck, capability registry, and extension host.</p>
        </div>
      </div>
      <div class="split-grid">
        <article class="prompt-preview">
          <div class="panel-title">Prompt preview</div>
          <p class="panel-subtitle">Loaded from the prompt file or the packaged fallback.</p>
          <pre>${escapeHtml(data.promptPreview)}</pre>
        </article>

        <aside class="surface-panel">
          <div class="panel-title">Package surface</div>
          <p class="panel-subtitle">The core files that define the upgraded ARIA project.</p>
          <div class="file-list">${fileCards}</div>
        </aside>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <div>
          <h2 class="section-title">Capability registry</h2>
          <p class="section-subtitle">The uploaded repositories contribute the registry layers: curated skills, company-scale orchestration, model routing, and legacy voice-assistant automation.</p>
        </div>
      </div>
      <div class="source-grid">${sourceCards}</div>
    </section>

    <section class="section">
      <div class="section-head">
        <div>
          <h2 class="section-title">Registry lanes</h2>
          <p class="section-subtitle">OpenClaw's catalogue becomes the project taxonomy: coding agents, automation, cloud, research, productivity, and voice/media all get a dedicated lane.</p>
        </div>
      </div>
      <div class="cluster-grid">${clusterCards}</div>
    </section>

    <section class="section">
      <div class="section-head">
        <div>
          <h2 class="section-title">Command engine stack</h2>
          <p class="section-subtitle">The G0DM0D3 stack and JARVIS assistant map into the command layer, while Paperclip informs orchestration, governance, and budget controls.</p>
        </div>
      </div>
      <div class="multi-column">
        <div class="story-panel">
          <div class="panel-title">Model cockpit</div>
          <p class="panel-subtitle">Routing, tuning, prompt transformations, and opt-in datasets form the engine layer.</p>
          <div class="cluster-grid">${engineCards}</div>
        </div>
        <div class="story-panel">
          <div class="panel-title">Legacy assistant map</div>
          <p class="panel-subtitle">Voice, OCR, news, weather, email, maps, and local memory are preserved as design signals.</p>
          <div class="cluster-grid">${jarvisCards}</div>
        </div>
      </div>
    </section>

    <section class="actions">
      ${actionButtons}
    </section>

    <div class="footer">
      <span>Private repository: <a class="repo-link" href="#" data-command="openRepository">${escapeHtml(data.repoUrl)}</a></span>
      <span>${isClawbotMode ? 'Clawbot-compatible deck generated by the ARIA v2 extension.' : 'Command deck generated by the ARIA v2 extension.'}</span>
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

import * as vscode from 'vscode';
import { buildDashboardHtml } from './dashboard';
import {
  copyPromptBody,
  findExistingFile,
  getPromptPreview,
  openPackageFile,
  packagePaths,
  readPackageText,
} from './projectFiles';

const REPO_URL = 'https://github.com/bharthraj1412/aria-v2-god-mode';

let currentPanel: vscode.WebviewPanel | undefined;

function getNonce(): string {
  const possibleCharacters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let value = '';
  for (let index = 0; index < 32; index += 1) {
    value += possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
  }
  return value;
}

async function openRepository(): Promise<void> {
  await vscode.env.openExternal(vscode.Uri.parse(REPO_URL));
}

async function revealDashboard(context: vscode.ExtensionContext): Promise<void> {
  const editorColumn = vscode.window.activeTextEditor?.viewColumn ?? vscode.ViewColumn.One;

  if (currentPanel) {
    currentPanel.reveal(editorColumn);
    return;
  }

  currentPanel = vscode.window.createWebviewPanel(
    'ariaV2Dashboard',
    'ARIA v2 Control Panel',
    editorColumn,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    },
  );

  const fileStates = [
    {
      label: 'Prompt',
      path: packagePaths.prompt,
      ready: Boolean(findExistingFile(context, packagePaths.prompt)),
      description: 'Reusable cross-platform prompt template and source of truth for the ARIA voice.',
    },
    {
      label: 'Instructions',
      path: packagePaths.instructions,
      ready: Boolean(findExistingFile(context, packagePaths.instructions)),
      description: 'File-scoped guidance for prompt, agent, and package maintenance.',
    },
    {
      label: 'Builder Agent',
      path: packagePaths.agent,
      ready: Boolean(findExistingFile(context, packagePaths.agent)),
      description: 'Workspace editing agent for repo updates and implementation tasks.',
    },
    {
      label: 'README',
      path: packagePaths.readme,
      ready: Boolean(findExistingFile(context, packagePaths.readme)),
      description: 'Project surface and usage notes for the higher-level extension project.',
    },
  ];

  const promptPreview = getPromptPreview(context, 12);

  currentPanel.webview.html = buildDashboardHtml({
    nonce: getNonce(),
    repoUrl: REPO_URL,
    promptPreview,
    fileStates,
    actions: [
      {
        command: 'openPrompt',
        label: 'Open Prompt',
        helper: 'Jump straight to the reusable prompt file.',
        primary: true,
      },
      {
        command: 'openInstructions',
        label: 'Open Instructions',
        helper: 'Review the file-scoped maintenance guidance.',
      },
      {
        command: 'openAgent',
        label: 'Open Builder Agent',
        helper: 'Load the workspace editing agent.',
      },
      {
        command: 'copyPrompt',
        label: 'Copy Prompt Body',
        helper: 'Copy the prompt text without frontmatter.',
      },
      {
        command: 'openReadme',
        label: 'Open README',
        helper: 'Inspect the package surface and usage notes.',
      },
      {
        command: 'openRepository',
        label: 'Open Private Repo',
        helper: 'Launch the private GitHub repository in your browser.',
      },
    ],
  });

  currentPanel.webview.onDidReceiveMessage(async message => {
    switch (message.command) {
      case 'openPrompt':
        await openPackageFile(context, packagePaths.prompt);
        return;
      case 'openInstructions':
        await openPackageFile(context, packagePaths.instructions);
        return;
      case 'openAgent':
        await openPackageFile(context, packagePaths.agent);
        return;
      case 'openReadme':
        await openPackageFile(context, packagePaths.readme);
        return;
      case 'copyPrompt':
        await copyPromptBody(context);
        return;
      case 'openRepository':
        await openRepository();
        return;
      default:
        vscode.window.showInformationMessage(`Unknown ARIA v2 action: ${String(message.command)}`);
    }
  }, undefined, context.subscriptions);

  currentPanel.onDidDispose(() => {
    currentPanel = undefined;
  }, undefined, context.subscriptions);
}

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('aria-v2.openDashboard', () => revealDashboard(context)),
    vscode.commands.registerCommand('aria-v2.openPrompt', () => openPackageFile(context, packagePaths.prompt)),
    vscode.commands.registerCommand('aria-v2.openInstructions', () => openPackageFile(context, packagePaths.instructions)),
    vscode.commands.registerCommand('aria-v2.openAgent', () => openPackageFile(context, packagePaths.agent)),
    vscode.commands.registerCommand('aria-v2.openReadme', () => openPackageFile(context, packagePaths.readme)),
    vscode.commands.registerCommand('aria-v2.copyPrompt', () => copyPromptBody(context)),
    vscode.commands.registerCommand('aria-v2.openRepository', openRepository),
  );
}

export function deactivate(): void {
  currentPanel?.dispose();
  currentPanel = undefined;
}

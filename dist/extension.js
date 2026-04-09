"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const dashboard_1 = require("./dashboard");
const projectFiles_1 = require("./projectFiles");
const REPO_URL = 'https://github.com/bharthraj1412/aria-v2-god-mode';
let currentPanel;
function getNonce() {
    const possibleCharacters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let value = '';
    for (let index = 0; index < 32; index += 1) {
        value += possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
    }
    return value;
}
async function openRepository() {
    await vscode.env.openExternal(vscode.Uri.parse(REPO_URL));
}
async function revealDashboard(context) {
    const editorColumn = vscode.window.activeTextEditor?.viewColumn ?? vscode.ViewColumn.One;
    if (currentPanel) {
        currentPanel.reveal(editorColumn);
        return;
    }
    currentPanel = vscode.window.createWebviewPanel('ariaV2Dashboard', 'ARIA v2 Control Panel', editorColumn, {
        enableScripts: true,
        retainContextWhenHidden: true,
    });
    const fileStates = [
        {
            label: 'Prompt',
            path: projectFiles_1.packagePaths.prompt,
            ready: Boolean((0, projectFiles_1.findExistingFile)(context, projectFiles_1.packagePaths.prompt)),
            description: 'Reusable cross-platform prompt template and source of truth for the ARIA voice.',
        },
        {
            label: 'Instructions',
            path: projectFiles_1.packagePaths.instructions,
            ready: Boolean((0, projectFiles_1.findExistingFile)(context, projectFiles_1.packagePaths.instructions)),
            description: 'File-scoped guidance for prompt, agent, and package maintenance.',
        },
        {
            label: 'Builder Agent',
            path: projectFiles_1.packagePaths.agent,
            ready: Boolean((0, projectFiles_1.findExistingFile)(context, projectFiles_1.packagePaths.agent)),
            description: 'Workspace editing agent for repo updates and implementation tasks.',
        },
        {
            label: 'README',
            path: projectFiles_1.packagePaths.readme,
            ready: Boolean((0, projectFiles_1.findExistingFile)(context, projectFiles_1.packagePaths.readme)),
            description: 'Project surface and usage notes for the higher-level extension project.',
        },
    ];
    const promptPreview = (0, projectFiles_1.getPromptPreview)(context, 12);
    currentPanel.webview.html = (0, dashboard_1.buildDashboardHtml)({
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
    currentPanel.webview.onDidReceiveMessage(async (message) => {
        switch (message.command) {
            case 'openPrompt':
                await (0, projectFiles_1.openPackageFile)(context, projectFiles_1.packagePaths.prompt);
                return;
            case 'openInstructions':
                await (0, projectFiles_1.openPackageFile)(context, projectFiles_1.packagePaths.instructions);
                return;
            case 'openAgent':
                await (0, projectFiles_1.openPackageFile)(context, projectFiles_1.packagePaths.agent);
                return;
            case 'openReadme':
                await (0, projectFiles_1.openPackageFile)(context, projectFiles_1.packagePaths.readme);
                return;
            case 'copyPrompt':
                await (0, projectFiles_1.copyPromptBody)(context);
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
function activate(context) {
    context.subscriptions.push(vscode.commands.registerCommand('aria-v2.openDashboard', () => revealDashboard(context)), vscode.commands.registerCommand('aria-v2.openPrompt', () => (0, projectFiles_1.openPackageFile)(context, projectFiles_1.packagePaths.prompt)), vscode.commands.registerCommand('aria-v2.openInstructions', () => (0, projectFiles_1.openPackageFile)(context, projectFiles_1.packagePaths.instructions)), vscode.commands.registerCommand('aria-v2.openAgent', () => (0, projectFiles_1.openPackageFile)(context, projectFiles_1.packagePaths.agent)), vscode.commands.registerCommand('aria-v2.openReadme', () => (0, projectFiles_1.openPackageFile)(context, projectFiles_1.packagePaths.readme)), vscode.commands.registerCommand('aria-v2.copyPrompt', () => (0, projectFiles_1.copyPromptBody)(context)), vscode.commands.registerCommand('aria-v2.openRepository', openRepository));
}
function deactivate() {
    currentPanel?.dispose();
    currentPanel = undefined;
}

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
let currentMode = 'standard';
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
function buildFileStates(context) {
    return [
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
            label: 'Capability Registry',
            path: projectFiles_1.packagePaths.referenceData,
            ready: Boolean((0, projectFiles_1.findExistingFile)(context, projectFiles_1.packagePaths.referenceData)),
            description: 'Curated data layer extracted from the uploaded reference repositories.',
        },
        {
            label: 'Dashboard Shell',
            path: projectFiles_1.packagePaths.dashboard,
            ready: Boolean((0, projectFiles_1.findExistingFile)(context, projectFiles_1.packagePaths.dashboard)),
            description: 'Webview renderer that turns the package into an actual command deck.',
        },
        {
            label: 'Extension Host',
            path: projectFiles_1.packagePaths.extension,
            ready: Boolean((0, projectFiles_1.findExistingFile)(context, projectFiles_1.packagePaths.extension)),
            description: 'Activation and command wiring for the ARIA command deck.',
        },
        {
            label: 'README',
            path: projectFiles_1.packagePaths.readme,
            ready: Boolean((0, projectFiles_1.findExistingFile)(context, projectFiles_1.packagePaths.readme)),
            description: 'Project surface and usage notes for the higher-level extension project.',
        },
    ];
}
function getDashboardTitle(mode) {
    return mode === 'clawbot' ? 'ARIA v2 Clawbot Deck' : 'ARIA v2 Command Deck';
}
function buildDashboardActions(mode) {
    return [
        mode === 'clawbot'
            ? {
                command: 'openDashboard',
                label: 'Return to ARIA Deck',
                helper: 'Switch back to the modern command surface.',
                primary: true,
            }
            : {
                command: 'openClawbotDeck',
                label: 'Open Clawbot Deck',
                helper: 'Switch into the legacy-alias compatibility view.',
                primary: true,
            },
        {
            command: 'openPrompt',
            label: 'Open Prompt',
            helper: 'Jump straight to the reusable prompt file.',
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
            command: 'openCapabilityRegistry',
            label: 'Open Capability Registry',
            helper: 'Inspect the extracted registry view from the uploaded repositories.',
        },
        {
            command: 'openDashboardSource',
            label: 'Open Dashboard Source',
            helper: 'Inspect the HTML generator behind the deck.',
        },
        {
            command: 'openExtensionSource',
            label: 'Open Extension Source',
            helper: 'Review the activation and command wiring.',
        },
        {
            command: 'copyPrompt',
            label: 'Copy Prompt Body',
            helper: 'Copy the prompt text without frontmatter.',
        },
        {
            command: 'openRepository',
            label: 'Open Private Repo',
            helper: 'Launch the private GitHub repository in your browser.',
        },
    ];
}
async function revealDashboard(context, mode = 'standard') {
    const editorColumn = vscode.window.activeTextEditor?.viewColumn ?? vscode.ViewColumn.One;
    const panelTitle = getDashboardTitle(mode);
    if (currentPanel) {
        currentMode = mode;
        currentPanel.title = panelTitle;
        currentPanel.webview.html = (0, dashboard_1.buildDashboardHtml)({
            mode,
            nonce: getNonce(),
            repoUrl: REPO_URL,
            promptPreview: (0, projectFiles_1.getPromptPreview)(context, 12),
            fileStates: buildFileStates(context),
            actions: buildDashboardActions(mode),
        });
        currentPanel.reveal(editorColumn);
        return;
    }
    currentMode = mode;
    currentPanel = vscode.window.createWebviewPanel('ariaV2Dashboard', panelTitle, editorColumn, {
        enableScripts: true,
        retainContextWhenHidden: true,
    });
    const promptPreview = (0, projectFiles_1.getPromptPreview)(context, 12);
    currentPanel.webview.html = (0, dashboard_1.buildDashboardHtml)({
        mode,
        nonce: getNonce(),
        repoUrl: REPO_URL,
        promptPreview,
        fileStates: buildFileStates(context),
        actions: buildDashboardActions(mode),
    });
    currentPanel.webview.onDidReceiveMessage(async (message) => {
        switch (message.command) {
            case 'openDashboard':
                await revealDashboard(context, 'standard');
                return;
            case 'openClawbotDeck':
                await revealDashboard(context, 'clawbot');
                return;
            case 'openPrompt':
                await (0, projectFiles_1.openPackageFile)(context, projectFiles_1.packagePaths.prompt);
                return;
            case 'openInstructions':
                await (0, projectFiles_1.openPackageFile)(context, projectFiles_1.packagePaths.instructions);
                return;
            case 'openAgent':
                await (0, projectFiles_1.openPackageFile)(context, projectFiles_1.packagePaths.agent);
                return;
            case 'openCapabilityRegistry':
            case 'openReferenceData':
                await (0, projectFiles_1.openPackageFile)(context, projectFiles_1.packagePaths.referenceData);
                return;
            case 'openDashboardSource':
                await (0, projectFiles_1.openPackageFile)(context, projectFiles_1.packagePaths.dashboard);
                return;
            case 'openExtensionSource':
                await (0, projectFiles_1.openPackageFile)(context, projectFiles_1.packagePaths.extension);
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
    context.subscriptions.push(vscode.commands.registerCommand('aria-v2.openDashboard', () => revealDashboard(context, 'standard')), vscode.commands.registerCommand('aria-v2.openClawbotDeck', () => revealDashboard(context, 'clawbot')), vscode.commands.registerCommand('aria-v2.openPrompt', () => (0, projectFiles_1.openPackageFile)(context, projectFiles_1.packagePaths.prompt)), vscode.commands.registerCommand('aria-v2.openInstructions', () => (0, projectFiles_1.openPackageFile)(context, projectFiles_1.packagePaths.instructions)), vscode.commands.registerCommand('aria-v2.openAgent', () => (0, projectFiles_1.openPackageFile)(context, projectFiles_1.packagePaths.agent)), vscode.commands.registerCommand('aria-v2.openCapabilityRegistry', () => (0, projectFiles_1.openPackageFile)(context, projectFiles_1.packagePaths.referenceData)), vscode.commands.registerCommand('aria-v2.openReferenceData', () => (0, projectFiles_1.openPackageFile)(context, projectFiles_1.packagePaths.referenceData)), vscode.commands.registerCommand('aria-v2.openDashboardSource', () => (0, projectFiles_1.openPackageFile)(context, projectFiles_1.packagePaths.dashboard)), vscode.commands.registerCommand('aria-v2.openExtensionSource', () => (0, projectFiles_1.openPackageFile)(context, projectFiles_1.packagePaths.extension)), vscode.commands.registerCommand('aria-v2.openReadme', () => (0, projectFiles_1.openPackageFile)(context, projectFiles_1.packagePaths.readme)), vscode.commands.registerCommand('aria-v2.copyPrompt', () => (0, projectFiles_1.copyPromptBody)(context)), vscode.commands.registerCommand('aria-v2.openRepository', openRepository));
    if (context.extensionMode === vscode.ExtensionMode.Development) {
        void revealDashboard(context, 'standard');
    }
}
function deactivate() {
    currentPanel?.dispose();
    currentPanel = undefined;
}

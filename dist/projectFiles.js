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
exports.packagePaths = void 0;
exports.getCandidatePaths = getCandidatePaths;
exports.findExistingFile = findExistingFile;
exports.readPackageText = readPackageText;
exports.extractPromptBody = extractPromptBody;
exports.getPromptPreview = getPromptPreview;
exports.openPackageFile = openPackageFile;
exports.copyPromptBody = copyPromptBody;
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const vscode = __importStar(require("vscode"));
exports.packagePaths = {
    prompt: '.github/prompts/aria-v2-god-mode.prompt.md',
    instructions: '.github/instructions/aria-v2.instructions.md',
    agent: '.github/agents/aria-v2.agent.md',
    readme: 'README.md',
};
function getCandidatePaths(context, relativePath) {
    const workspacePaths = (vscode.workspace.workspaceFolders ?? []).map(folder => path.join(folder.uri.fsPath, relativePath));
    return [...workspacePaths, path.join(context.extensionPath, relativePath)];
}
function findExistingFile(context, relativePath) {
    for (const candidatePath of getCandidatePaths(context, relativePath)) {
        if (fs.existsSync(candidatePath)) {
            return candidatePath;
        }
    }
    return undefined;
}
function readPackageText(context, relativePath) {
    const filePath = findExistingFile(context, relativePath);
    if (!filePath) {
        return undefined;
    }
    return fs.readFileSync(filePath, 'utf8');
}
function extractPromptBody(promptText) {
    const normalized = promptText.replace(/^\uFEFF/, '').trim();
    const frontMatterPattern = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;
    const body = normalized.replace(frontMatterPattern, '').trim();
    return body || normalized;
}
function getPromptPreview(context, maxLines = 10) {
    const promptText = readPackageText(context, exports.packagePaths.prompt);
    if (!promptText) {
        return 'Prompt file not found.';
    }
    const body = extractPromptBody(promptText);
    return body.split(/\r?\n/).slice(0, maxLines).join('\n');
}
async function openPackageFile(context, relativePath) {
    const filePath = findExistingFile(context, relativePath);
    if (!filePath) {
        vscode.window.showErrorMessage(`Could not find ${relativePath}.`);
        return false;
    }
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
    await vscode.window.showTextDocument(document, { preview: false });
    return true;
}
async function copyPromptBody(context) {
    const promptText = readPackageText(context, exports.packagePaths.prompt);
    if (!promptText) {
        vscode.window.showErrorMessage('Could not find the ARIA v2 prompt file.');
        return false;
    }
    await vscode.env.clipboard.writeText(extractPromptBody(promptText));
    vscode.window.showInformationMessage('ARIA v2 prompt body copied to the clipboard.');
    return true;
}

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';

export const packagePaths = {
  prompt: '.github/prompts/aria-v2-god-mode.prompt.md',
  instructions: '.github/instructions/aria-v2.instructions.md',
  agent: '.github/agents/aria-v2.agent.md',
  readme: 'README.md',
} as const;

export type PackagePathKey = keyof typeof packagePaths;

export function getCandidatePaths(context: vscode.ExtensionContext, relativePath: string): string[] {
  const workspacePaths = (vscode.workspace.workspaceFolders ?? []).map(folder =>
    path.join(folder.uri.fsPath, relativePath),
  );

  return [...workspacePaths, path.join(context.extensionPath, relativePath)];
}

export function findExistingFile(context: vscode.ExtensionContext, relativePath: string): string | undefined {
  for (const candidatePath of getCandidatePaths(context, relativePath)) {
    if (fs.existsSync(candidatePath)) {
      return candidatePath;
    }
  }

  return undefined;
}

export function readPackageText(context: vscode.ExtensionContext, relativePath: string): string | undefined {
  const filePath = findExistingFile(context, relativePath);
  if (!filePath) {
    return undefined;
  }

  return fs.readFileSync(filePath, 'utf8');
}

export function extractPromptBody(promptText: string): string {
  const normalized = promptText.replace(/^\uFEFF/, '').trim();
  const frontMatterPattern = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;
  const body = normalized.replace(frontMatterPattern, '').trim();

  return body || normalized;
}

export function getPromptPreview(context: vscode.ExtensionContext, maxLines = 10): string {
  const promptText = readPackageText(context, packagePaths.prompt);
  if (!promptText) {
    return 'Prompt file not found.';
  }

  const body = extractPromptBody(promptText);
  return body.split(/\r?\n/).slice(0, maxLines).join('\n');
}

export async function openPackageFile(
  context: vscode.ExtensionContext,
  relativePath: string,
): Promise<boolean> {
  const filePath = findExistingFile(context, relativePath);
  if (!filePath) {
    vscode.window.showErrorMessage(`Could not find ${relativePath}.`);
    return false;
  }

  const document = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
  await vscode.window.showTextDocument(document, { preview: false });
  return true;
}

export async function copyPromptBody(context: vscode.ExtensionContext): Promise<boolean> {
  const promptText = readPackageText(context, packagePaths.prompt);
  if (!promptText) {
    vscode.window.showErrorMessage('Could not find the ARIA v2 prompt file.');
    return false;
  }

  await vscode.env.clipboard.writeText(extractPromptBody(promptText));
  vscode.window.showInformationMessage('ARIA v2 prompt body copied to the clipboard.');
  return true;
}

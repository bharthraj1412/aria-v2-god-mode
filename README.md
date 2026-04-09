# ARIA v2 Control Panel

This repository packages the ARIA v2 prompt stack for VS Code and adds a control-panel extension for navigating it.

## Included files

- `.github/prompts/aria-v2-god-mode.prompt.md` - reusable prompt
- `.github/instructions/aria-v2.instructions.md` - file-scoped maintenance guidance
- `.github/copilot-instructions.md` - minimal workspace-wide guidance
- `.github/agents/aria-v2.agent.md` - custom ARIA v2 implementation agent
- `package.json` / `tsconfig.json` - VS Code extension build metadata
- `src/` - extension source for the dashboard and file actions
- `.vscode/launch.json` / `.vscode/tasks.json` - run and build entry points for the extension host

## Extension commands

- `ARIA v2: Open Dashboard` - launch the control panel webview.
- `ARIA v2: Open Prompt` - open the reusable prompt file.
- `ARIA v2: Open Instructions` - open the file-scoped maintenance guidance.
- `ARIA v2: Open Builder Agent` - open the repo editing agent.
- `ARIA v2: Copy Prompt` - copy the prompt body without frontmatter.
- `ARIA v2: Open Repository` - open the private GitHub repo.

## Usage

- Run `npm install` once to install the TypeScript extension toolchain.
- Run `npm run compile` to build the extension into `dist/`.
- Press `F5` or run `Run ARIA v2 Extension` from VS Code to launch the extension host.
- Use `npm run watch` during iterative extension work.
- Open VS Code Chat and run the ARIA v2 prompt from the prompt picker.
- Use the ARIA v2 Builder agent when you want the repo changed directly.
- Keep the workspace and user prompt copies aligned when you make changes.
- The GitHub repository is already private.

## Scope

The large reference trees in this workspace are ignored and are not part of the package.

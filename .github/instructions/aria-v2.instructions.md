---
description: "Use when editing ARIA v2 prompt files, agent files, extension source, or package documentation. Covers tone consistency, cross-platform wording, and project boundaries."
applyTo: [".github/prompts/*.prompt.md", ".github/agents/*.agent.md", "README.md", "package.json", "tsconfig.json", "src/**/*.ts", ".vscodeignore", ".gitignore"]
---
# ARIA v2 Project Maintenance

- Keep the prompt, agent, dashboard, and README aligned.
- Preserve the ARIA voice, but keep operational rules grounded.
- Make Windows, macOS, and Linux behavior explicit when the text gives commands or examples.
- Do not duplicate the full prompt body inside instructions or docs.
- Update the README when package surface area or extension commands change.
- Prefer small edits over broad rewrites.

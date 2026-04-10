---
description: "Use when editing ARIA v2 prompt files, agent files, extension source, or package documentation. Covers tone consistency, cross-platform wording, and project boundaries."
applyTo: [".github/prompts/*.prompt.md", ".github/agents/*.agent.md", "README.md", "package.json", "tsconfig.json", "src/**/*.ts", ".vscodeignore", ".gitignore"]
---
# ARIA v2 Project Maintenance

- Keep the prompt, agent, capability registry, dashboard, and README aligned.
- Preserve the ARIA voice, but keep operational rules grounded.
- Make Windows, macOS, and Linux behavior explicit when the text gives commands or examples.
- Do not duplicate the full prompt body inside instructions or docs.
- Update the README when package surface area or extension commands change.
- Treat the Clawbot deck as a compatibility mode and keep the modern ARIA deck as the default surface.
- Prefer small edits over broad rewrites.

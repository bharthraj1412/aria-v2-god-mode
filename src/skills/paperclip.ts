import * as fs from 'node:fs';
import * as path from 'node:path';
import YAML from 'yaml';
import type { SkillDefinition } from './types';

const seedPaperclipSkills: SkillDefinition[] = [
  {
    id: 'paperclip.control-plane',
    source: 'paperclip',
    title: 'Paperclip Control Plane',
    category: 'orchestration',
    description: 'Coordinate tasks, approvals, comments, and routines through the Paperclip API workflow.',
    entrypointHint: 'paperclip-master/skills/paperclip/SKILL.md',
    capabilities: ['orchestration'],
  },
  {
    id: 'paperclip.create-agent',
    source: 'paperclip',
    title: 'Paperclip Create Agent',
    category: 'orchestration',
    description: 'Governance-aware agent hiring flow with adapter configuration and approval handling.',
    entrypointHint: 'paperclip-master/skills/paperclip-create-agent/SKILL.md',
    capabilities: ['agent-management', 'orchestration'],
  },
  {
    id: 'paperclip.create-plugin',
    source: 'paperclip',
    title: 'Paperclip Create Plugin',
    category: 'developer',
    description: 'Scaffold and validate Paperclip plugins against the current SDK/runtime contract.',
    entrypointHint: 'paperclip-master/skills/paperclip-create-plugin/SKILL.md',
    capabilities: ['plugin-development'],
  },
  {
    id: 'paperclip.para-memory-files',
    source: 'paperclip',
    title: 'PARA Memory Files',
    category: 'memory',
    description: 'Use PARA-based file memory workflows for durable facts, daily notes, and tacit user patterns.',
    entrypointHint: 'paperclip-master/skills/para-memory-files/SKILL.md',
    capabilities: ['memory-operations'],
  },
  {
    id: 'paperclip.design-guide',
    source: 'paperclip',
    title: 'Paperclip Design Guide',
    category: 'design',
    description: 'Apply Paperclip UI design system conventions for dense, consistent control-plane interfaces.',
    entrypointHint: 'paperclip-master/.claude/skills/design-guide/SKILL.md',
    capabilities: ['design-systems'],
  },
];

function toTitleCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function inferCategory(name: string, filePath: string): string {
  const text = `${name} ${filePath}`.toLowerCase();
  if (text.includes('design')) {
    return 'design';
  }
  if (text.includes('memory')) {
    return 'memory';
  }
  if (text.includes('plugin') || text.includes('agent')) {
    return 'developer';
  }
  return 'orchestration';
}

function parseFrontmatter(content: string): Record<string, unknown> | undefined {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    return undefined;
  }

  try {
    const parsed = YAML.parse(frontmatterMatch[1]);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
}

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const text = value.trim();
  return text.length > 0 ? text : undefined;
}

function normalizeStringArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const items = value
      .map(item => normalizeString(item))
      .filter((item): item is string => Boolean(item));
    return items.length > 0 ? Array.from(new Set(items)) : undefined;
  }

  if (typeof value === 'string') {
    const items = value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
    return items.length > 0 ? Array.from(new Set(items)) : undefined;
  }

  return undefined;
}

function inferCapabilities(name: string, category: string, filePath: string): string[] {
  const text = `${name} ${category} ${filePath}`.toLowerCase();
  const caps: string[] = [];

  if (text.includes('agent')) {
    caps.push('agent-management');
  }
  if (text.includes('plugin')) {
    caps.push('plugin-development');
  }
  if (text.includes('memory')) {
    caps.push('memory-operations');
  }
  if (text.includes('design')) {
    caps.push('design-systems');
  }
  if (caps.length === 0) {
    caps.push('orchestration');
  }

  return caps;
}

function loadSkillFile(filePath: string): SkillDefinition | undefined {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const frontmatter = parseFrontmatter(content);
    const name = normalizeString(frontmatter?.name) || path.basename(path.dirname(filePath));
    const description = normalizeString(frontmatter?.description) || 'Imported Paperclip skill module.';
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const category = inferCategory(name, filePath);
    const tags = normalizeStringArray(frontmatter?.tags);
    const capabilities = normalizeStringArray(frontmatter?.capabilities) || inferCapabilities(name, category, filePath);
    const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');

    return {
      id: `paperclip.${slug || 'skill'}`,
      source: 'paperclip',
      title: toTitleCase(name),
      category,
      description,
      entrypointHint: relativePath,
      tags,
      capabilities,
      sourcePath: relativePath,
    };
  } catch {
    return undefined;
  }
}

function discoverSkillFiles(root: string): string[] {
  if (!fs.existsSync(root)) {
    return [];
  }

  const results: string[] = [];

  const walk = (current: string): void => {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (entry.isFile() && entry.name.toUpperCase() === 'SKILL.MD') {
        results.push(fullPath);
      }
    }
  };

  walk(root);

  return results.sort((a, b) => a.localeCompare(b));
}

function mergeWithSeed(discovered: SkillDefinition[]): SkillDefinition[] {
  const byId = new Map<string, SkillDefinition>();
  for (const skill of discovered) {
    byId.set(skill.id, skill);
  }
  for (const skill of seedPaperclipSkills) {
    if (!byId.has(skill.id)) {
      byId.set(skill.id, skill);
    }
  }

  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export function loadPaperclipSkillsFromRoot(paperclipRoot: string): SkillDefinition[] {
  const roots = [
    path.join(paperclipRoot, 'skills'),
    path.join(paperclipRoot, '.claude', 'skills'),
    path.join(paperclipRoot, '.agents', 'skills'),
  ];

  const files = roots.flatMap(discoverSkillFiles);
  const discovered = files
    .map(loadSkillFile)
    .filter((skill): skill is SkillDefinition => Boolean(skill));

  if (discovered.length === 0) {
    return seedPaperclipSkills;
  }

  return mergeWithSeed(discovered);
}

export function loadPaperclipSkills(): SkillDefinition[] {
  const workspaceRoot = process.cwd();
  const paperclipRoot = path.join(workspaceRoot, 'paperclip-master', 'paperclip-master');
  return loadPaperclipSkillsFromRoot(paperclipRoot);
}

import { markXxxSkills } from './markxxx';
import { loadPaperclipSkills } from './paperclip';
import type { SkillDefinition } from './types';

function getAllSkills(): SkillDefinition[] {
  return [...markXxxSkills, ...loadPaperclipSkills()];
}

function countBy(values: string[]): Array<{ value: string; count: number }> {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) || 0) + 1);
  }

  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value));
}

function normalizeFilterValues(input?: string | string[]): string[] {
  if (!input) {
    return [];
  }

  const values = (Array.isArray(input) ? input : [input])
    .flatMap(value => value.split(','))
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);

  return Array.from(new Set(values));
}

function matchesFilterValues(
  candidateValues: string[],
  filters: string[],
  mode: 'any' | 'all',
): boolean {
  if (filters.length === 0) {
    return true;
  }

  if (candidateValues.length === 0) {
    return false;
  }

  return mode === 'all'
    ? filters.every(filter => candidateValues.includes(filter))
    : filters.some(filter => candidateValues.includes(filter));
}

export function listSkills(options?: {
  source?: string;
  search?: string;
  tag?: string | string[];
  capability?: string | string[];
  tagMode?: 'any' | 'all';
  capabilityMode?: 'any' | 'all';
}): SkillDefinition[] {
  const sourceFilter = options?.source?.trim().toLowerCase();
  const searchFilter = options?.search?.trim().toLowerCase();
  const tagFilters = normalizeFilterValues(options?.tag);
  const capabilityFilters = normalizeFilterValues(options?.capability);
  const tagMode = options?.tagMode === 'all' ? 'all' : 'any';
  const capabilityMode = options?.capabilityMode === 'all' ? 'all' : 'any';
  const allSkills = getAllSkills();

  return allSkills.filter(skill => {
    if (sourceFilter && skill.source.toLowerCase() !== sourceFilter) {
      return false;
    }

    if (!matchesFilterValues((skill.tags || []).map(tag => tag.toLowerCase()), tagFilters, tagMode)) {
      return false;
    }

    if (
      !matchesFilterValues(
        (skill.capabilities || []).map(capability => capability.toLowerCase()),
        capabilityFilters,
        capabilityMode,
      )
    ) {
      return false;
    }

    if (!searchFilter) {
      return true;
    }

    return (
      skill.id.toLowerCase().includes(searchFilter) ||
      skill.title.toLowerCase().includes(searchFilter) ||
      skill.category.toLowerCase().includes(searchFilter) ||
      skill.description.toLowerCase().includes(searchFilter) ||
      (skill.tags || []).some(tag => tag.toLowerCase().includes(searchFilter)) ||
      (skill.capabilities || []).some(capability => capability.toLowerCase().includes(searchFilter))
    );
  });
}

export function listSkillSources(): string[] {
  const allSkills = getAllSkills();
  return Array.from(new Set(allSkills.map(skill => skill.source))).sort();
}

export function listSkillCategories(options?: {
  source?: string;
  search?: string;
  tag?: string | string[];
  capability?: string | string[];
  tagMode?: 'any' | 'all';
  capabilityMode?: 'any' | 'all';
}): string[] {
  const records = listSkills(options);
  return Array.from(new Set(records.map(skill => skill.category))).sort();
}

export function summarizeSkills(options?: {
  source?: string;
  search?: string;
  tag?: string | string[];
  capability?: string | string[];
  tagMode?: 'any' | 'all';
  capabilityMode?: 'any' | 'all';
}): {
  total: number;
  sources: Array<{ value: string; count: number }>;
  categories: Array<{ value: string; count: number }>;
  tags: Array<{ value: string; count: number }>;
  capabilities: Array<{ value: string; count: number }>;
} {
  const records = listSkills(options);
  return {
    total: records.length,
    sources: countBy(records.map(skill => skill.source)),
    categories: countBy(records.map(skill => skill.category)),
    tags: countBy(records.flatMap(skill => skill.tags || []).map(tag => tag.toLowerCase())),
    capabilities: countBy(
      records.flatMap(skill => skill.capabilities || []).map(capability => capability.toLowerCase()),
    ),
  };
}

export type { SkillDefinition } from './types';

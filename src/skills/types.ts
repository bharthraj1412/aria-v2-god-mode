export interface SkillDefinition {
  id: string;
  source: string;
  title: string;
  category: string;
  description: string;
  entrypointHint: string;
  tags?: string[];
  capabilities?: string[];
  sourcePath?: string;
}

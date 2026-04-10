const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { loadPaperclipSkillsFromRoot } = require('../dist/skills/paperclip.js');

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

test('loadPaperclipSkillsFromRoot recursively discovers nested SKILL.md files', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'paperclip-skills-root-'));

  writeFile(
    path.join(root, 'skills', 'team', 'ops', 'SKILL.md'),
      '---\nname: ops-skill\ndescription: Ops automation\ntags:\n  - ops\n  - automation\ncapabilities:\n  - runbooks\n  - incident-response\n---\n# Ops\n',
  );
  writeFile(
    path.join(root, '.claude', 'skills', 'design-guide', 'SKILL.md'),
    '---\nname: design-guide\ndescription: Design system\n---\n# Design\n',
  );
  writeFile(
    path.join(root, '.agents', 'skills', 'qa', 'SKILL.md'),
    '---\nname: qa-check\ndescription: Quality checks\n---\n# QA\n',
  );

  const skills = loadPaperclipSkillsFromRoot(root);
  const ids = skills.map(skill => skill.id);

  assert.ok(ids.includes('paperclip.ops-skill'));
  assert.ok(ids.includes('paperclip.design-guide'));
  assert.ok(ids.includes('paperclip.qa-check'));
  
    const ops = skills.find(skill => skill.id === 'paperclip.ops-skill');
    assert.ok(ops);
    assert.deepEqual(ops.tags, ['ops', 'automation']);
    assert.deepEqual(ops.capabilities, ['runbooks', 'incident-response']);
    assert.equal(typeof ops.sourcePath, 'string');
});

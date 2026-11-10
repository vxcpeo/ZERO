/**
 * Fast source-contract check against the frozen baseline, mirroring verify.mjs.
 * Prints additions/removals per contract group so template rewrites can be corrected
 * before the full browser verification runs.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const SKILL = 'C:/Users/Administrator/.dsh/skills/reskin/scripts/inventory.mjs';
const { analyzeProject, contractDiff } = await import(`file:///${SKILL}`);

const project = path.resolve('E:/workspace/chuangye/solana/zero/website');
const baseline = JSON.parse(
  await fs.readFile(path.join(project, '.reskin/baseline/content-contract.json'), 'utf8'),
);
const current = await analyzeProject(project);
const diff = contractDiff(baseline, current.contentContract, { allowAdditions: true });

const issues = [...diff.issues];
const warnings = [...diff.warnings];
for (let i = warnings.length - 1; i >= 0; i -= 1) {
  if (/^(visibleText|i18n|forms): (?:added|".*" count increased)/.test(warnings[i])) {
    issues.push(warnings.splice(i, 1)[0]);
  }
}

console.log(`archetype: ${current.archetype.archetype} (${current.archetype.family})`);
console.log(`text tokens: ${current.contentContract.visibleText.reduce((n, t) => n + t.count, 0)}`);
console.log(`contract issues: ${issues.length}`);
for (const issue of issues) console.log(`  FAIL  ${issue}`);
console.log(`warnings: ${warnings.length}`);
for (const warning of warnings.slice(0, 40)) console.log(`  warn  ${warning}`);
process.exitCode = issues.length ? 1 : 0;

/**
 * Resolve every local import in scripts/ and fail on a name the target file does not export.
 *
 * Neither `node --check` nor eslint catches this: the first is a syntax check per file, the second
 * does not resolve modules. A wrong name is only found when the browser refuses the import, and
 * because Foundry loads the module through one entry point, one bad name silently disables the
 * whole module rather than one feature. That happened on 2026-09-08 renaming a single function.
 *
 * Deliberately narrow: local relative imports only, named and default. It does not follow into
 * node_modules or check that a call passes the right arguments.
 *
 * Run: node tools/check-imports.mjs
 */

import fs from "node:fs";
import path from "node:path";

const SCRIPTS = path.join(process.cwd(), "scripts");
const files = fs.readdirSync(SCRIPTS).filter((f) => f.endsWith(".mjs"));

/** Every name a file exports, whether declared inline or in an export list. */
function exportsOf(source) {
  const names = new Set();
  for (const [, name] of source.matchAll(/^export\s+(?:async\s+)?function\s+([A-Za-z0-9_$]+)/gm)) names.add(name);
  for (const [, name] of source.matchAll(/^export\s+class\s+([A-Za-z0-9_$]+)/gm)) names.add(name);
  for (const [, name] of source.matchAll(/^export\s+(?:const|let|var)\s+([A-Za-z0-9_$]+)/gm)) names.add(name);
  for (const [, list] of source.matchAll(/^export\s*\{([^}]+)\}/gm)) {
    for (const part of list.split(",")) {
      const name = part.trim().split(/\s+as\s+/).pop().trim();
      if (name) names.add(name);
    }
  }
  if (/^export\s+default\b/m.test(source)) names.add("default");
  return names;
}

const exported = new Map();
for (const file of files) {
  exported.set(file, exportsOf(fs.readFileSync(path.join(SCRIPTS, file), "utf8")));
}

const problems = [];
let checked = 0;

for (const file of files) {
  const source = fs.readFileSync(path.join(SCRIPTS, file), "utf8");
  for (const [, names, target] of source.matchAll(/import\s*\{([^}]+)\}\s*from\s*["'](\.[^"']+)["']/g)) {
    const targetFile = path.basename(target);
    if (!exported.has(targetFile)) {
      problems.push(`${file}: imports from "${target}", which is not a file in scripts/`);
      continue;
    }
    for (const part of names.split(",")) {
      const name = part.trim().split(/\s+as\s+/)[0].trim();
      if (!name) continue;
      checked += 1;
      if (!exported.get(targetFile).has(name)) {
        problems.push(`${file}: imports "${name}" from ${targetFile}, which does not export it`);
      }
    }
  }
}

console.log(`files: ${files.length}, named imports resolved: ${checked}`);

if (problems.length) {
  console.error(`\nUnresolved imports (${problems.length}):`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}

console.log("every local import resolves.");

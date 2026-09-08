/**
 * Check that every localisation key the code asks for exists in lang/en.json.
 *
 * A missing key does not throw. Foundry returns the key string itself, so a dialog renders
 * "PF2EDC.Sheet.SecondClass" where a label should be. A syntax check cannot see that, and neither
 * can a test that reads values off the actor rather than the rendered sheet.
 *
 * lang/en.json is nested, so it is flattened to dotted keys first. Every "PF2EDC.*" string literal
 * in scripts/ counts as a reference, which covers keys reached through a ternary or handed to a
 * settings registration as a field rather than passed straight to localize().
 *
 * Missing keys fail the run. Unused keys are reported only: a string may be kept deliberately.
 *
 * Run: node tools/check-lang.mjs
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const LANG = path.join(ROOT, "lang", "en.json");
const SCRIPTS = path.join(ROOT, "scripts");

/** Flatten nested localisation data to the dotted keys Foundry's localize() takes. */
function flatten(node, prefix, out) {
  for (const [key, value] of Object.entries(node)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object") flatten(value, full, out);
    else out.add(full);
  }
  return out;
}

const defined = flatten(JSON.parse(fs.readFileSync(LANG, "utf8")), "", new Set());
const source = fs
  .readdirSync(SCRIPTS)
  .filter((file) => file.endsWith(".mjs"))
  .map((file) => fs.readFileSync(path.join(SCRIPTS, file), "utf8"))
  .join("\n");

const asked = new Set();
for (const [, key] of source.matchAll(/["'`](PF2EDC\.[A-Za-z0-9_.]+)["'`]/g)) asked.add(key);

const templates = [...source.matchAll(/["'`]PF2EDC\.[A-Za-z0-9_.]*\$\{/g)].map((m) => m[0]);

const missing = [...asked].filter((key) => !defined.has(key)).sort();
const unused = [...defined].filter((key) => !asked.has(key)).sort();

console.log(`keys asked for: ${asked.size}`);
console.log(`keys defined:   ${defined.size}`);

if (unused.length) {
  console.log(`\nDefined but never asked for (${unused.length}), reported only:`);
  for (const key of unused) console.log(`  ${key}`);
}

// An interpolated key cannot be resolved by reading the source, so the check would silently stop
// covering it. Fail instead. If one is ever added, declare its possible values here and generate
// every variant rather than letting an unknown key through.
if (templates.length) {
  console.error(`\nInterpolated keys this tool cannot expand (${templates.length}):`);
  for (const template of templates) console.error(`  ${template}`);
}

if (missing.length) {
  console.error(`\nAsked for but missing from lang/en.json (${missing.length}):`);
  for (const key of missing) console.error(`  ${key}`);
}

if (missing.length || templates.length) process.exit(1);
console.log("\nEvery key the code asks for exists.");

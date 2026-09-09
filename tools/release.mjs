#!/usr/bin/env node
/**
 * Bump module.json's version, commit that alone, tag it, and push both. Dev tooling only, not part
 * of the runtime module - it lives outside scripts/ so it never reaches the release zip.
 *
 * Usage: node tools/release.mjs [major|minor|patch] ["optional tag message"]
 * Defaults to a patch bump.
 */

import fs from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const modulePath = path.join(repoRoot, "module.json");

function run(command, args) {
  execFileSync(command, args, { cwd: repoRoot, stdio: "inherit" });
}

function runCapture(command, args) {
  return execFileSync(command, args, { cwd: repoRoot }).toString().trim();
}

const bumpType = process.argv[2] ?? "patch";
if (!["major", "minor", "patch"].includes(bumpType)) {
  console.error(`Unknown bump type "${bumpType}". Use major, minor, or patch.`);
  process.exit(1);
}

const status = runCapture("git", ["status", "--porcelain"]);
if (status) {
  console.error(
    "Working tree has uncommitted changes. Commit or stash them first so the release commit only "
    + "contains the version bump:\n" + status
  );
  process.exit(1);
}

const moduleData = JSON.parse(fs.readFileSync(modulePath, "utf8"));
const oldVersion = moduleData.version;
const [major, minor, patch] = oldVersion.split(".").map(Number);

let newVersion;
if (bumpType === "major") newVersion = `${major + 1}.0.0`;
else if (bumpType === "minor") newVersion = `${major}.${minor + 1}.0`;
else newVersion = `${major}.${minor}.${patch + 1}`;

moduleData.version = newVersion;
fs.writeFileSync(modulePath, JSON.stringify(moduleData, null, 2) + "\n");

const tag = `v${newVersion}`;
const tagMessage = process.argv[3] ?? `Release ${tag}`;

console.log(`Bumping version ${oldVersion} -> ${newVersion}`);

syncLiveManifest(newVersion);

run("git", ["add", "module.json"]);
run("git", ["commit", "-m", `Bump version to ${newVersion}`]);
run("git", ["push", "origin", "main"]);
run("git", ["tag", "-a", tag, "-m", tagMessage]);
run("git", ["push", "origin", tag]);

console.log(`\nReleased ${tag}.`);

/**
 * Copy the bumped manifest into the live Foundry module directory.
 *
 * The editor's mirror hook copies a file to the live copy after every edit made with its own tools,
 * but this script writes `module.json` with `fs`, so that never fires and the live copy keeps the
 * previous version. It happened on two consecutive releases before this existed: the released
 * artifacts were right and the installed copy claimed the old number.
 *
 * Reports what it read back rather than what it meant to write, and never fails the release: the
 * live copy is a convenience, and a missing or read-only directory is not a reason to abort a
 * release that has already been tagged.
 */
function syncLiveManifest(version) {
  const live = path.join(
    process.env.LOCALAPPDATA ?? path.join(process.env.USERPROFILE ?? "", "AppData", "Local"),
    "FoundryVTT", "Data", "modules", JSON.parse(fs.readFileSync(modulePath, "utf8")).id, "module.json"
  );

  if (!fs.existsSync(path.dirname(live))) {
    console.log(`Live copy not found at ${path.dirname(live)}; skipped.`);
    return;
  }

  try {
    fs.copyFileSync(modulePath, live);
    const readBack = JSON.parse(fs.readFileSync(live, "utf8")).version;
    console.log(
      readBack === version
        ? `Live copy synced: ${live} reads ${readBack}`
        : `Live copy NOT synced: ${live} reads ${readBack}, expected ${version}`
    );
  } catch (error) {
    console.log(`Live copy not synced (${error.message}); update it by hand.`);
  }
}

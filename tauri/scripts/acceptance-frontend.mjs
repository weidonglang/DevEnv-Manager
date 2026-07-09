import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = path.resolve(process.cwd(), "..");
const tauriRoot = process.cwd();
const manifestPath = path.join(repoRoot, "acceptance", "feature-manifest.v1.8.2.json");
const srcRoot = path.join(tauriRoot, "src");

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const source = readAllTs(srcRoot, { includeAcceptance: false });
const presentSelectors = new Set([...source.matchAll(/data-testid=["']([^"']+)["']/g)].map((match) => match[1]));

const failures = [];
const warnings = [];

for (const page of manifest.pages ?? []) {
  for (const feature of page.features ?? []) {
    const priority = feature.priority ?? page.priority ?? "P2";
    for (const testId of feature.frontendEntry?.testIds ?? []) {
      if (priority === "P0" && !presentSelectors.has(testId) && !source.includes(testId)) {
        failures.push(`${feature.featureId}: missing data-testid=${testId}`);
      }
    }
  }
}

for (const requiredFile of [
  "src/acceptance/mockInvoke.ts",
  "src/acceptance/acceptanceRunner.ts",
  "src/acceptance/selectors.ts",
  "src/acceptance/fixtures.ts",
]) {
  if (!fs.existsSync(path.join(tauriRoot, requiredFile))) {
    failures.push(`missing acceptance support file: ${requiredFile}`);
  }
}

for (const bad of ["undefined", "null", "[object Object]"]) {
  const userVisiblePattern = new RegExp(`>[^<]*${escapeRegExp(bad)}[^<]*<`);
  if (userVisiblePattern.test(source)) {
    warnings.push(`possible user-visible ${bad} literal in source`);
  }
}

if (!source.includes("suppressed-empty-toast")) {
  failures.push("blank toast suppression debug marker is missing");
}

for (const warning of warnings) {
  console.warn("WARNING:", warning);
}

if (failures.length) {
  console.error("Frontend acceptance failed.");
  for (const failure of failures) console.error("-", failure);
  process.exit(1);
}

console.log(`Frontend acceptance passed (${presentSelectors.size} data-testid selectors found).`);

function readAllTs(root, options = { includeAcceptance: true }) {
  let output = "";
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (!options.includeAcceptance && path.basename(fullPath) === "acceptance") continue;
      output += readAllTs(fullPath, options);
    } else if (entry.isFile() && fullPath.endsWith(".ts")) {
      output += fs.readFileSync(fullPath, "utf8") + "\n";
    }
  }
  return output;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

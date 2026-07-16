import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const repoRoot = path.resolve(process.cwd(), "..");
const result = spawnSync("python", ["scripts/run_feature_acceptance.py", "--mode", "static"], {
  cwd: repoRoot,
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);

import assert from "node:assert/strict";
import fs from "node:fs";
import { assessArchiveTarget, isDriveRootSelection, recommendedArchiveTarget } from "../src/features/cleanup/archiveTargets.ts";

const read = (relativePath) => fs.readFileSync(new URL(relativePath, import.meta.url), "utf8");
const renderSource = read("../src/features/cleanup/render.ts");
const stateSource = read("../src/features/cleanup/state.ts");
const eventsSource = read("../src/features/cleanup/events.ts");
const apiSource = read("../src/features/cleanup/api.ts");
const fixtureSource = read("../src/acceptance/fixtures.ts");
const mockSource = read("../src/acceptance/mockInvoke.ts");
const styles = read("../src/styles.css");
const backendSource = read("../src-tauri/src/lib.rs");
const movePlanSource = read("../src-tauri/src/cleanup/move_plan.rs");
const migrationSource = read("../src-tauri/src/cleanup/migration.rs");
const recycleBackendSource = read("../src-tauri/src/cleanup/recycle_bin.rs");
const backendTextSource = read("../src/core/backendText.ts");

for (const testId of [
  "cleanup-recycle-bin-section",
  "cleanup-recycle-bin-summary",
  "cleanup-recycle-bin-volume-scope",
  "cleanup-recycle-bin-preview",
  "cleanup-recycle-bin-plan-preview",
  "cleanup-recycle-bin-result",
  "cleanup-recycle-bin-operation-status",
  "cleanup-recycle-bin-table",
]) {
  assert.ok(renderSource.includes(testId), `missing ${testId}`);
}

assert.match(renderSource, /picker:\s*["']cleanup-generic-archive-target-picker["']/);
assert.match(renderSource, /picker:\s*["']cleanup-desktop-archive-target-picker["']/);
assert.match(renderSource, /picker:\s*["']cleanup-downloads-archive-target-picker["']/);
assert.match(renderSource, /renderArchiveTargetPicker\(state, "generic"/);
assert.match(renderSource, /renderArchiveTargetPicker\(state, "desktop"/);
assert.match(renderSource, /renderArchiveTargetPicker\(state, "downloads"/);

for (const action of [
  "use-recommended-generic-archive-target",
  "choose-generic-archive-target",
  "use-recommended-desktop-archive-target",
  "choose-desktop-archive-target",
  "use-recommended-downloads-archive-target",
  "choose-downloads-archive-target",
  "refresh-recycle-bin",
  "create-recycle-bin-cleanup-plan",
  "execute-recycle-bin-cleanup-plan",
]) {
  assert.ok(renderSource.includes(action), `missing ${action}`);
}

assert.match(renderSource, /<select id="\$\{selectId\}"/);
assert.doesNotMatch(renderSource, /<input[^>]+id="cleanup-(?:desktop|downloads|archive)-target-drive"/);
assert.match(renderSource, /const selected = new Set\(state\.recycleBinSelectedDrives\)/);
assert.match(renderSource, /selected\.has\(volume\.drive\) \? "checked" : ""/);
assert.match(renderSource, /execute-recycle-bin-cleanup-plan[\s\S]+!plan/);

assert.match(stateSource, /recycleBinSelectedDrives:\s*\[\]/);
assert.match(stateSource, /desktopTargetDrive:\s*["']{2}/);
assert.match(stateSource, /downloadsTargetDrive:\s*["']{2}/);
assert.match(stateSource, /archiveTargetDrive:\s*["']{2}/);
assert.match(fixtureSource, /recycleBinSelectedDrives:\s*\[\]/);
assert.match(fixtureSource, /archiveTargetEligible:\s*false[\s\S]+archiveTargetReason:\s*["']system-volume["']/);
assert.match(fixtureSource, /archiveTargetEligible:\s*true[\s\S]+archiveTargetReason:\s*["']eligible["']/);

assert.match(eventsSource, /command:\s*["']execute_recycle_bin_cleanup_plan["']/);
assert.match(eventsSource, /actionId:\s*["']execute_recycle_bin_cleanup_plan["']/);
assert.match(eventsSource, /riskLevel:\s*["']critical["']/);
assert.match(eventsSource, /executeRecycleBinCleanupPlan\(plan\.planId, confirmationToken\)/);
assert.match(eventsSource, /state\.recycleBin\s*=\s*await inspectRecycleBin\(\)/);
assert.match(eventsSource, /const executionError = result\.success/);
assert.match(eventsSource, /Recycle Bin cleanup was incomplete/);
assert.match(eventsSource, /Windows permanently empties each selected Recycle Bin source volume as a whole/);
assert.match(eventsSource, /plan\.warnings\.map\(recycleBinRiskWarning\)/);
assert.match(backendTextSource, /Execution revalidates the Desktop boundary, file size, and source-file SHA-256/);
assert.match(backendTextSource, /Files are moved only to Windows Recycle Bin and are not permanently deleted/);
assert.match(renderSource, /brief interval before the Windows command completes could also be removed/);
assert.doesNotMatch(eventsSource, /Permanently removes the exact previewed items/);
assert.match(eventsSource, /assessArchiveTarget\(selected, state\.diskOverview\)/);
assert.match(eventsSource, /validOrRecommended/);
assert.match(apiSource, /execute_recycle_bin_cleanup_plan["'],\s*\{ planId, confirmationToken \}/);
assert.match(backendSource, /static RECYCLE_BIN_CLEANUP_PLANS/);
assert.match(backendSource, /recycle_bin_cleanup_plans\(\)[\s\S]+\.remove\(&plan_id\)/);
assert.match(backendSource, /Permanently empty selected Windows Recycle Bin source volumes after a snapshot recheck/);
assert.match(backendSource, /fn generic_archive_target_root\(target_selection: &str\)/);
assert.match(backendSource, /Archive target directory must be an absolute Windows path/);
assert.match(backendSource, /validate_archive_target_ancestor\(&target_root\)\?/);
assert.doesNotMatch(backendSource, /Archive target must be a drive letter such as D/);
assert.match(migrationSource, /pub\(crate\) fn validate_archive_target_boundary\(target: &Path\)/);
assert.match(migrationSource, /归档目标必须是绝对 Windows 路径/);
assert.match(migrationSource, /归档目标路径包含符号链接、Junction 或重解析点/);
assert.match(migrationSource, /if matches!\(plan\.mode\.as_str\(\), "archive_only" \| "desktop_archive"\)[\s\S]+validate_archive_target_boundary\(&target\)/);
assert.match(movePlanSource, /mode == "archive_only"[\s\S]+validate_archive_target_boundary\(&target\)\?/);
assert.match(movePlanSource, /create_desktop_archive_plan[\s\S]+validate_archive_target_boundary\(&target\)\?/);
assert.match(recycleBackendSource, /current_ids != plan\.item_ids[\s\S]+snapshot_fingerprint\(&selected_before\) != plan\.snapshot_fingerprint/);
assert.match(recycleBackendSource, /Clear-RecycleBin -DriveLetter \$letter/);

for (const command of [
  "inspect_recycle_bin",
  "create_recycle_bin_cleanup_plan",
  "execute_recycle_bin_cleanup_plan",
]) {
  assert.ok(apiSource.includes(command), `frontend API missing ${command}`);
  assert.ok(mockSource.includes(command), `mock invoke missing ${command}`);
  assert.ok(backendSource.includes(command), `backend registration missing ${command}`);
}

assert.match(styles, /\.folder-usage-card\s*\{[^}]*background:\s*var\(--color-surface-raised\)/s);
assert.match(styles, /\.folder-usage-summary\s*\{[^}]*background:\s*var\(--color-surface-raised\)/s);
assert.match(styles, /\.folder-overview\s*\{[^}]*background:\s*var\(--color-surface-raised\)/s);
assert.match(styles, /\.recycle-bin-volume-card\s*\{[^}]*color:\s*var\(--color-text\)/s);

const archiveVolumes = [
  {
    drive: "C:\\",
    freeBytes: 10,
    archiveTargetEligible: false,
    archiveTargetReason: "system-volume",
  },
  {
    drive: "D:\\",
    freeBytes: 20,
    archiveTargetEligible: true,
    archiveTargetReason: "eligible",
  },
  {
    drive: "E:\\",
    freeBytes: 30,
    archiveTargetEligible: false,
    archiveTargetReason: "removable",
  },
];
assert.equal(recommendedArchiveTarget(archiveVolumes), "D:");
assert.equal(assessArchiveTarget("D:\\ReleaseLab\\Archive", archiveVolumes).eligible, true);
assert.equal(assessArchiveTarget("E:\\Archive", archiveVolumes).reason, "removable");
assert.equal(assessArchiveTarget("Z:\\Offline", archiveVolumes).reason, "unknown-volume");
assert.equal(isDriveRootSelection("D:\\"), true);
assert.equal(isDriveRootSelection("D:\\ReleaseLab\\Archive"), false);
assert.match(renderSource, /selectedIsFolder/);
assert.match(renderSource, /option value="\$\{escapeHtml\(selectedTarget\)\}" selected/);

console.log("Cleanup workflow acceptance passed (safe archive targets, theme tokens, explicit Recycle Bin plan/token/result flow).");

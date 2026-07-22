from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
RUST = (ROOT / "tauri" / "src-tauri" / "src" / "lib.rs").read_text(encoding="utf-8")
MIGRATION = (ROOT / "tauri" / "src-tauri" / "src" / "cleanup" / "migration.rs").read_text(encoding="utf-8")
FILE_ASSOC = (ROOT / "tauri" / "src-tauri" / "src" / "file_assoc" / "mod.rs").read_text(encoding="utf-8")
FRONTEND = "\n".join(path.read_text(encoding="utf-8") for path in (ROOT / "tauri" / "src").rglob("*.ts"))


def require(condition: bool, reason: str) -> None:
    if not condition:
        raise SystemExit(reason)


require("state.services[0]" not in FRONTEND, "Implicit first-service selection remains in the frontend.")
require("MAX_COMMAND_OUTPUT_CHARS" in RUST and "output truncated by DevEnv Manager" in RUST, "Command output is not bounded.")
require("validate_archive_target_boundary" in RUST and "path_is_reparse_point" in RUST, "Generic archive target boundary is not canonical/reparse protected.")
require("static MOVE_PLANS" in RUST, "Move plans are not retained by the backend after preview.")
require("fn verify_move_plan" in RUST and "stored != plan" in RUST, "Move plan execution is not bound to the exact backend preview.")
require("fn consume_move_plan" in RUST, "Move plans are not single-use.")
require("MOVE_PLAN_TTL_SECONDS" in RUST and "MAX_PENDING_MOVE_PLANS" in RUST, "Move plans do not have bounded lifetime and storage.")
for command in (
    "create_move_plan",
    "create_junction_bridge_plan",
    "create_desktop_archive_plan",
    "create_desktop_cleanup_plan",
    "create_downloads_archive_plan",
):
    start = RUST.index(f"fn {command}")
    body = RUST[start : start + 900]
    require("store_move_plan" in body, f"{command} does not retain its exact backend preview.")
for command in (
    "execute_move_plan",
    "execute_desktop_archive_plan",
    "execute_desktop_cleanup_plan",
    "execute_downloads_archive_plan",
):
    start = RUST.index(f"fn {command}")
    body = RUST[start : start + 1_100]
    require("verify_move_plan" in body and "consume_move_plan" in body, f"{command} does not verify and consume the backend preview.")
require("validate_new_move_target" in MIGRATION and "目标路径已经存在" in MIGRATION, "Move target does not reject merge/overwrite or redirected parents.")
require("static EXPANSION_PLANS" in RUST, "Expansion plans are not retained by the backend.")
require("verify_expansion_plan" in RUST and "consume_expansion_plan" in RUST, "Expansion execution is not exact-preview-bound and single-use.")
require("revalidate_c_drive_expansion_plan(&plan)" in RUST, "Expansion execution does not revalidate the current partition layout.")
require("FILE_ASSOCIATION_PLANS" in FILE_ASSOC, "File association plans are not retained by the backend.")
require("consume_file_association_plan" in FILE_ASSOC and "serde_json::to_value(&stored)" in FILE_ASSOC, "File association execution is not bound to the exact backend preview.")
require('match action {' in RUST[RUST.index("fn run_toolchain_action_blocking"):], "Toolchain actions are not dispatched through a fixed match.")
require("chsrc_source_allowed" in RUST and "不接受自定义 URL" in RUST, "chsrc source IDs are not backend allowlisted.")
require("require_risk_operation_token" in RUST[RUST.index("async fn run_toolchain_action"):RUST.index("fn run_toolchain_action_blocking")], "Toolchain writes are not backend token gated.")
require("require_risk_operation_token" in RUST[RUST.index("async fn run_chsrc_action"):RUST.index("fn run_chsrc_action_blocking")], "chsrc writes are not backend token gated.")
require('("GitHub", "https://github.com")' in RUST and "client.get(url).send()" in RUST, "Network diagnostics are not restricted to fixed endpoints.")
require("std::thread::spawn" in RUST and "from_secs(10)" in RUST, "Network diagnostics lack parallel bounded execution.")
require("validate_installed_wsl_distribution" in RUST and "不支持的平台管理操作" in RUST, "Platform actions are not fixed/validated.")
require("service_executable_path" in RUST and "install_directory" in RUST and "log_path_reason" in RUST, "Service paths are not backend-derived evidence.")

print("Batch C-E security contracts passed (backend-bound move/expansion/file-association plans, archive/move boundaries, explicit service target, fixed actions, token gates, bounded diagnostics/output).")

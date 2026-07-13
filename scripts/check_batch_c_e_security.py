from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
RUST = (ROOT / "tauri" / "src-tauri" / "src" / "lib.rs").read_text(encoding="utf-8")
MIGRATION = (ROOT / "tauri" / "src-tauri" / "src" / "cleanup" / "migration.rs").read_text(encoding="utf-8")
FRONTEND = "\n".join(path.read_text(encoding="utf-8") for path in (ROOT / "tauri" / "src").rglob("*.ts"))


def require(condition: bool, reason: str) -> None:
    if not condition:
        raise SystemExit(reason)


require("state.services[0]" not in FRONTEND, "Implicit first-service selection remains in the frontend.")
require("MAX_COMMAND_OUTPUT_CHARS" in RUST and "output truncated by DevEnv Manager" in RUST, "Command output is not bounded.")
require("validate_archive_target_boundary" in RUST and "path_is_reparse_point" in RUST, "Generic archive target boundary is not canonical/reparse protected.")
require("validate_new_move_target" in MIGRATION and "目标路径已经存在" in MIGRATION, "Move target does not reject merge/overwrite or redirected parents.")
require('match action {' in RUST[RUST.index("fn run_toolchain_action_blocking"):], "Toolchain actions are not dispatched through a fixed match.")
require("chsrc_source_allowed" in RUST and "不接受自定义 URL" in RUST, "chsrc source IDs are not backend allowlisted.")
require("require_risk_operation_token" in RUST[RUST.index("async fn run_toolchain_action"):RUST.index("fn run_toolchain_action_blocking")], "Toolchain writes are not backend token gated.")
require("require_risk_operation_token" in RUST[RUST.index("async fn run_chsrc_action"):RUST.index("fn run_chsrc_action_blocking")], "chsrc writes are not backend token gated.")
require('("GitHub", "https://github.com")' in RUST and "client.get(url).send()" in RUST, "Network diagnostics are not restricted to fixed endpoints.")
require("std::thread::spawn" in RUST and "from_secs(10)" in RUST, "Network diagnostics lack parallel bounded execution.")
require("validate_installed_wsl_distribution" in RUST and "不支持的平台管理操作" in RUST, "Platform actions are not fixed/validated.")
require("service_executable_path" in RUST and "install_directory" in RUST and "log_path_reason" in RUST, "Service paths are not backend-derived evidence.")

print("Batch C-E security contracts passed (archive/move boundaries, explicit service target, fixed actions, token gates, bounded diagnostics/output).")

from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MAIN = ROOT / "tauri" / "src" / "main.ts"
TYPES = ROOT / "tauri" / "src" / "types" / "index.ts"
MIGRATION = ROOT / "tauri" / "src" / "p0Migration.ts"


def fail(errors: list[str]) -> int:
    print("Frontend data contract check failed.")
    for error in errors:
        print(f"- {error}")
    return 1


def main() -> int:
    main = MAIN.read_text(encoding="utf-8")
    types = TYPES.read_text(encoding="utf-8")
    migration = MIGRATION.read_text(encoding="utf-8")
    errors: list[str] = []

    forbidden = [
        'valueOf(runtime, "path"',
        'valueOf(runtime, "current"',
        'valueOf(runtime, "validationStatus"',
        "runtime.validationStatus",
        "state.envReliability.javaHomeRaw",
        "state.envReliability.pathFirstJar",
        "analysis.recommendedJdk",
        "analysis.jdkRequirement",
        "analysis.framework",
        "analysis.signals",
    ]
    for marker in forbidden:
        if marker in main:
            errors.append(f"stale frontend field access remains: {marker}")
    if "analysis.projectType" in main.replace("analysis.projectTypes", ""):
        errors.append("stale frontend field access remains: analysis.projectType")

    required_type_markers = [
        "export type RuntimeInfo",
        "executable: string",
        "export type EnvReliabilitySnapshot",
        "userEnv:",
        "processEnv:",
        "javaHomeRaw?: string",
        "pathJava?: string",
        "pathJavac?: string",
        "export type ProjectAnalysis",
        "root: string",
        "projectTypes: string[]",
        "detectedFiles: string[]",
        "recommendedRuntime: Array<",
    ]
    for marker in required_type_markers:
        if marker not in types:
            errors.append(f"core frontend type marker is missing: {marker}")

    required_render_markers = [
        "runtime.executable",
        "state.envReliability?.java.javaHomeExpanded",
        "analysis.root",
        "analysis.projectTypes",
        "analysis.detectedFiles",
        "analysis.recommendedRuntime",
    ]
    for marker in required_render_markers:
        if marker not in main:
            errors.append(f"typed business field is not rendered through the current contract: {marker}")

    for marker in [
        "enforcePickerBackedPathInputs",
        'button[data-pick-directory]',
        'input.readOnly = true',
        'profilePath.readOnly = true',
    ]:
        if marker not in migration and marker not in main:
            errors.append(f"picker-backed path contract is missing: {marker}")

    if errors:
        return fail(errors)
    print("Frontend data contract check passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

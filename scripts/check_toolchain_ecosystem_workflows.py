from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def main() -> None:
    api = read("tauri/src/features/toolchains/api.ts")
    events = read("tauri/src/features/toolchains/events.ts")
    render = read("tauri/src/features/toolchains/render.ts")
    actions = read("tauri/src/features/toolchains/toolchainActions.ts")
    backend = read("tauri/src-tauri/src/lib.rs")
    package = read("tauri/package.json")
    normalized = json.loads(read("acceptance/v1.7.0-normalized-capabilities.json"))
    failures: list[str] = []

    commands = {
        "run_toolchain_action",
        "run_platform_action",
        "run_chsrc_action",
        "network_diagnostics",
        "cache_entries",
        "clear_download_cache",
    }
    for command in sorted(commands):
        if f'"{command}"' not in api:
            failures.append(f"Toolchains API does not invoke {command}")

    for command in ("run_toolchain_action", "run_platform_action", "run_chsrc_action"):
        if f'command: "{command}"' not in backend or "confirmation_token: Option<String>" not in backend:
            failures.append(f"{command} is not registered in the backend token contract")
        if f'"{command}"' not in events or "context.risk.run" not in events:
            failures.append(f"{command} does not use the frontend risk runner")

    if "chsrc_source_allowed" not in backend or "SOURCES.contains(&source)" not in backend:
        failures.append("chsrc source changes are not constrained by a backend allowlist")
    if "std::thread::spawn" not in backend or ".timeout(std::time::Duration::from_secs(10))" not in backend:
        failures.append("fixed network diagnostics are not bounded and parallelized")

    required_selectors = {
        "toolchains-git-ecosystem",
        "toolchains-node-ecosystem",
        "toolchains-python-ecosystem",
        "toolchains-rust-ecosystem",
        "toolchains-dotnet-ecosystem",
        "toolchains-action-preview",
        "toolchains-action-result",
        "toolchains-mirror-preview",
        "toolchains-mirror-result",
        "toolchains-network-result",
        "toolchains-cache-result",
        "toolchains-cache-clear-preview",
        "toolchains-cache-operation-result",
    }
    for selector in sorted(required_selectors):
        if selector not in render:
            failures.append(f"missing Toolchains selector {selector}")

    for field in ("Command preview", "Read only", "Timeout", "stdout", "stderr", "Exit code"):
        if field not in render:
            failures.append(f"toolchain action receipt does not render {field}")

    for field in ("global_config_path", "npm_config_path", "pip_config_path", "nuget_config_path"):
        if field not in backend:
            failures.append(f"backend ecosystem report omits {field}")

    for action in ("git_identity", "npm_registry", "pip_index", "rust_update", "go_proxy", "maven_mirror", "gradle_mirror"):
        if action not in actions or f'"{action}"' not in backend:
            failures.append(f"allowlisted action is not end-to-end: {action}")

    decisions = {
        "toolchains.dotnet",
        "toolchains.git-ecosystem",
        "toolchains.node-ecosystem",
        "toolchains.python-ecosystem",
        "toolchains.rust",
    }
    capabilities = {item["capabilityId"]: item for item in normalized["capabilities"]}
    for capability_id in decisions:
        capability = capabilities.get(capability_id, {})
        decision = capability.get("productDecision") or {}
        if capability.get("releaseDisposition") == "product-decision-required":
            failures.append(f"resolved product decision still blocks {capability_id}")
        if not decision.get("source") or not decision.get("decidedAt"):
            failures.append(f"product decision source/date missing for {capability_id}")

    if "acceptance:frontend" not in package:
        failures.append("frontend acceptance entry is missing")

    if failures:
        raise SystemExit("Toolchain ecosystem workflow contracts failed:\n- " + "\n- ".join(failures))
    print("Toolchain ecosystem workflow contracts passed (5 ecosystems, 3 restored blockers, product decisions=0).")


if __name__ == "__main__":
    main()

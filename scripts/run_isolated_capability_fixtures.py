from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TAURI_RUST = ROOT / "tauri" / "src-tauri"
ARTIFACT_ROOT = ROOT / "artifacts" / "isolated-evidence"
EXPECTED = {
    "cleanup.archive-plan",
    "cleanup.dev-cache",
    "cleanup.download-cache",
    "cleanup.move-rollback",
    "profiles.apply",
    "projects.configuration",
    "projects.port-config",
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def main() -> int:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    output = ARTIFACT_ROOT / stamp
    output.mkdir(parents=True, exist_ok=False)
    command = [
        "cargo",
        "run",
        "--quiet",
        "--features",
        "acceptance-fixtures",
        "--example",
        "isolated-capability-fixtures",
        "--",
        str(output),
    ]
    completed = subprocess.run(
        command,
        cwd=TAURI_RUST,
        text=True,
        encoding="utf-8",
        errors="replace",
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        timeout=540,
    )
    if completed.returncode != 0:
        print(completed.stdout)
        return completed.returncode

    manifest_path = output / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    cases = manifest.get("cases", {})
    missing = sorted(EXPECTED - set(cases))
    failed = sorted(key for key, value in cases.items() if value.get("status") != "passed")
    if missing or failed or manifest.get("summary") != {"total": 7, "passed": 7, "failed": 0}:
        print(f"Invalid isolated fixture evidence: missing={missing}, failed={failed}")
        return 1

    hashes = {
        path.name: sha256(path)
        for path in sorted(output.glob("*.json"))
    }
    (output / "SHA256SUMS.json").write_text(
        json.dumps(hashes, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    summary = {
        "schemaVersion": 1,
        "evidenceDirectory": output.relative_to(ROOT).as_posix(),
        "total": 7,
        "passed": 7,
        "failed": 0,
        "capabilities": sorted(EXPECTED),
        "manifestSha256": sha256(manifest_path),
        "sha256Manifest": (output / "SHA256SUMS.json").relative_to(ROOT).as_posix(),
    }
    (ROOT / "artifacts" / "isolated-capability-fixtures-summary.json").write_text(
        json.dumps(summary, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(
        "Isolated capability fixtures passed "
        f"({summary['passed']}/{summary['total']}; evidence={summary['evidenceDirectory']})."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

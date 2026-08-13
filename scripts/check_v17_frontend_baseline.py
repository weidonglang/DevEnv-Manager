#!/usr/bin/env python3
"""Protect the v1.7.0 frontend while backend capabilities are rebuilt."""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BASELINE_PATH = ROOT / "acceptance" / "v1.7-frontend-baseline.json"


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def fail(message: str) -> None:
    raise SystemExit(f"v1.7 frontend baseline check failed: {message}")


def main() -> None:
    baseline = json.loads(BASELINE_PATH.read_text(encoding="utf-8"))
    main_path = ROOT / "tauri" / "src" / "main.ts"
    styles_path = ROOT / "tauri" / "src" / "styles.css"
    main_text = main_path.read_text(encoding="utf-8")

    navigation = re.search(r'<nav class="nav">.*?</nav>', main_text, re.DOTALL)
    if navigation is None:
        fail("the original navigation block is missing")
    if sha256(navigation.group(0).encode("utf-8")) != baseline["navigationSha256"]:
        fail("the original navigation order, labels, or markup changed")

    if sha256(styles_path.read_bytes()) != baseline["stylesSha256"]:
        fail("tauri/src/styles.css changed; add new styles in a separate file")

    for element_id in baseline["requiredViewIds"] + baseline["requiredCoreIds"]:
        if f'id="{element_id}"' not in main_text:
            fail(f'original element id "{element_id}" is missing')

    for relative_path, expected_hash in baseline["immutableFiles"].items():
        path = ROOT / relative_path
        if not path.is_file():
            fail(f"original frontend module is missing: {relative_path}")
        actual_hash = sha256(path.read_bytes())
        if actual_hash != expected_hash:
            fail(f"original frontend module changed: {relative_path}")

    print(
        "v1.7 frontend baseline check passed "
        f"({len(baseline['immutableFiles'])} immutable modules, "
        f"{len(baseline['requiredViewIds'])} original views)."
    )


if __name__ == "__main__":
    main()

from __future__ import annotations

import json
import re
import sys
import tomllib
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read_json(path: str) -> dict:
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def main() -> int:
    package_version = read_json("tauri/package.json")["version"]
    tauri_version = read_json("tauri/src-tauri/tauri.conf.json")["version"]
    cargo = tomllib.loads((ROOT / "tauri/src-tauri/Cargo.toml").read_text(encoding="utf-8"))
    cargo_version = cargo["package"]["version"]
    manifest_version = read_json("update-manifest.json")["version"]
    cn_manifest_version = read_json("update-manifest.cn.json")["version"]
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    readme_match = re.search(r"当前版本：\*\*([0-9]+\.[0-9]+\.[0-9]+)\s+Stable\*\*", readme)
    readme_version = readme_match.group(1) if readme_match else ""
    versions = {
        "tauri/package.json": package_version,
        "tauri/src-tauri/Cargo.toml": cargo_version,
        "tauri/src-tauri/tauri.conf.json": tauri_version,
        "update-manifest.json": manifest_version,
        "update-manifest.cn.json": cn_manifest_version,
        "README.md": readme_version,
    }
    expected = package_version
    mismatched = {path: version for path, version in versions.items() if version != expected}
    if mismatched:
        print("Release consistency check failed:")
        for path, version in versions.items():
            print(f"- {path}: {version or '<missing>'}")
        return 1
    print(f"Release consistency check passed ({expected}).")
    return 0


if __name__ == "__main__":
    sys.exit(main())

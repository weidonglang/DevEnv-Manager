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
    package_lock_version = read_json("tauri/package-lock.json")["version"]
    tauri_version = read_json("tauri/src-tauri/tauri.conf.json")["version"]
    cargo = tomllib.loads((ROOT / "tauri/src-tauri/Cargo.toml").read_text(encoding="utf-8"))
    cargo_version = cargo["package"]["version"]
    manifest_version = read_json("update-manifest.json")["version"]
    cn_manifest_version = read_json("update-manifest.cn.json")["version"]
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    readme_match = re.search(
        r"当前版本：\*\*([0-9]+\.[0-9]+\.[0-9]+)(?:\s+(?:Stable|Release Candidate))?\*\*",
        readme,
    )
    readme_version = readme_match.group(1) if readme_match else ""
    locale_paths = [
        "tauri/src/core/locales/en-US.ts",
        "tauri/src/core/locales/zh-CN.ts",
    ]
    hardcoded_status_versions = []
    for path in locale_paths:
        locale = (ROOT / path).read_text(encoding="utf-8")
        if re.search(r'"app\.statusRelease"\s*:\s*"v\d+\.\d+\.\d+', locale):
            hardcoded_status_versions.append(path)
    if hardcoded_status_versions:
        print("Release consistency check failed: app.statusRelease must use the build version placeholder.")
        for path in hardcoded_status_versions:
            print(f"- {path}")
        return 1
    app_versions = {
        "tauri/package.json": package_version,
        "tauri/package-lock.json": package_lock_version,
        "tauri/src-tauri/Cargo.toml": cargo_version,
        "tauri/src-tauri/tauri.conf.json": tauri_version,
    }
    stable_versions = {
        "update-manifest.json": manifest_version,
        "update-manifest.cn.json": cn_manifest_version,
        "README.md": readme_version,
    }
    app_expected = package_version
    stable_expected = manifest_version
    mismatched_app = {path: version for path, version in app_versions.items() if version != app_expected}
    mismatched_stable = {path: version for path, version in stable_versions.items() if version != stable_expected}
    if mismatched_app or mismatched_stable:
        print("Release consistency check failed:")
        for path, version in {**app_versions, **stable_versions}.items():
            print(f"- {path}: {version or '<missing>'}")
        return 1
    if version_tuple(app_expected) < version_tuple(stable_expected):
        print(
            "Release consistency check failed: "
            f"application version {app_expected} is older than stable channel {stable_expected}."
        )
        return 1
    if app_expected == stable_expected:
        print(f"Release consistency check passed (stable {app_expected}).")
    else:
        print(
            "Release consistency check passed "
            f"(candidate {app_expected}; public stable remains {stable_expected})."
        )
    return 0


def version_tuple(value: str) -> tuple[int, int, int]:
    match = re.fullmatch(r"(\d+)\.(\d+)\.(\d+)", value)
    if not match:
        raise ValueError(f"invalid release version: {value!r}")
    return tuple(int(part) for part in match.groups())


if __name__ == "__main__":
    sys.exit(main())

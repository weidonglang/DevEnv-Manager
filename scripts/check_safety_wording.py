#!/usr/bin/env python3
"""Check safety wording and required safety docs.

The goal is intentionally narrow: prevent over-promising product copy and
ensure the public docs keep the disclaimer / backup / confirmation language.
"""

from __future__ import annotations

import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

BANNED_PHRASES = [
    "绝对安全",
    "一键修复所有问题",
    "一键加速",
    "深度优化",
    "彻底清理",
    "无风险扩容",
    "自动修复系统",
    "永久解决",
    "保证成功",
    "100% 恢复",
]

SCAN_GLOBS = [
    "README.md",
    "docs/**/*.md",
    "tauri/src/**/*.ts",
    "tauri/src/**/*.tsx",
    "tauri/src/**/*.css",
]


def iter_files() -> list[Path]:
    files: list[Path] = []
    for pattern in SCAN_GLOBS:
        files.extend(ROOT.glob(pattern))
    excluded = {
        ROOT / "tauri" / "src" / "safetyText.ts",
    }
    return sorted({path for path in files if path.is_file() and path not in excluded})


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")


def check_banned_phrases() -> list[str]:
    failures: list[str] = []
    for path in iter_files():
        text = read_text(path)
        for phrase in BANNED_PHRASES:
            if phrase in text:
                failures.append(f"{path.relative_to(ROOT)} contains banned phrase: {phrase}")
    return failures


def require_text(path: str, *needles: str) -> list[str]:
    target = ROOT / path
    if not target.is_file():
        return [f"missing required file: {path}"]
    text = read_text(target)
    return [f"{path} must contain: {needle}" for needle in needles if needle not in text]


def main() -> int:
    failures: list[str] = []
    failures.extend(check_banned_phrases())
    failures.extend(require_text("README.md", "免责声明", "备份重要数据", "只读诊断"))
    failures.extend(require_text("docs/user-guide.md", "安全说明", "风险等级", "二次确认"))
    failures.extend(require_text("docs/safety-and-disclaimer.md", "备份", "确认", "恢复"))
    failures.extend(require_text("docs/risk-levels.md", "High", "Critical", "备份", "确认", "恢复"))
    failures.extend(require_text("docs/env-reliability.md", "JAVA_HOME", "PATH", "备份", "恢复"))

    if failures:
        print("Safety wording check failed:")
        for failure in failures:
            print(f"- {failure}")
        return 1

    print("Safety wording check passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""Validate locale parity and reject untranslated frontend UI literals."""

from __future__ import annotations

import re
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
EN_LOCALE = ROOT / "tauri/src/core/locales/en-US.ts"
ZH_LOCALE = ROOT / "tauri/src/core/locales/zh-CN.ts"
FRONTEND = ROOT / "tauri/src"
BACKEND_TEXT_ADAPTER = FRONTEND / "core/backendText.ts"

KEY_RE = re.compile(r'^\s*"([^"]+)"\s*:', re.MULTILINE)
T_REF_RE = re.compile(r'\bt\(\s*["\']([^"\']+)["\']')
TEXT_NODE_RE = re.compile(r">\s*([^<>{}\n]*[A-Za-z][^<>{}\n]*)\s*<")
CJK_TEXT_NODE_RE = re.compile(r">\s*([^<>{}\n]*[\u3400-\u9fff][^<>{}\n]*)\s*<")
ATTRIBUTE_RE = re.compile(r'\b(?:placeholder|aria-label|title)="([^"${}]*[A-Za-z][^"${}]*)"')
UI_LITERAL_RES = (
    re.compile(r'renderActionButton\([^,]+,\s*"([^"]*[A-Za-z][^"]*)"'),
    re.compile(r'renderEmptyState\(\s*"([^"]*[A-Za-z][^"]*)"'),
    re.compile(r'renderMetric\(\s*"([^"]*[A-Za-z][^"]*)"'),
)
VISIBLE_MESSAGE_RE = re.compile(
    r'\b(?:showToast|context\.toast|progress\.(?:start|done|fail))\(\s*["`]([^"`]*[A-Za-z\u3400-\u9fff][^"`]*)["`]'
)
STATE_LITERAL_RE = re.compile(
    r'\bstate(?:\.\w+|\[[^\]]+\])*(?:Error|Result|Message|Detail|Verification|Warning|Text)\s*=\s*["`]([^"`]*[A-Za-z\u3400-\u9fff][^"`]*)["`]'
)
RETURN_LITERAL_RE = re.compile(
    r'\breturn\s+["`]([^"`]*[A-Za-z\u3400-\u9fff][^"`]*)["`]'
)
OBJECT_UI_LITERAL_RES = (
    re.compile(r'\b(?:title|summary)\s*:\s*["`]([^"`]*[A-Za-z\u3400-\u9fff][^"`]*)["`]'),
    re.compile(r'\bwarnings\s*:\s*\[\s*["`]([^"`]*[A-Za-z\u3400-\u9fff][^"`]*)["`]'),
    re.compile(r'\{\s*label\s*:\s*["`]([^"`]*[A-Za-z\u3400-\u9fff][^"`]*)["`]'),
)

# These are identifiers, brands, protocols, or units rather than translatable prose.
TECHNICAL_LITERAL_RE = re.compile(
    r"^(?:"
    r"C:|D:|\.txt|PID|JDK|JRE|JAVA_HOME|PATH|SHA-?256|UserChoice|ProgID|"
    r"WSL|UAC|URL|JSON|HTTP|HTTPS|TCP|UDP|IPv4|IPv6|"
    r"Node(?:\.js)?|Python|Go|Rust|Maven|Gradle|Docker(?: Desktop)?|"
    r"PowerShell|Windows|GitHub|Gitee|MSI|NSIS|MB|GB|TB|ms|Info|Ubuntu|Temurin|"
    r"Temurin / Microsoft / Zulu|network_diagnostics|readOnly|"
    r"idle|loading|running|ready|success|failed|complete|completed|skipped|manual|"
    r"install|uninstall|start|stop|restart|open|copy|inspect|refresh|none|"
    r"defaultRoot|configDir|os|arch|username|stdout|stderr|java\.exe|javac\.exe|"
    r"JAVA_HOME raw|JAVA_HOME expanded|docker_install"
    r")$",
    re.IGNORECASE,
)


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def locale_keys(path: Path) -> tuple[list[str], set[str]]:
    keys = KEY_RE.findall(read(path))
    return keys, set(keys)


def frontend_files() -> list[Path]:
    files = list((FRONTEND / "features").glob("**/render.ts"))
    files.extend((FRONTEND / "features").glob("**/events.ts"))
    files.extend((FRONTEND / "features").glob("**/viewModel.ts"))
    files.extend((FRONTEND / "components").glob("*.ts"))
    files.extend([
        FRONTEND / "app/shell.ts",
        FRONTEND / "app/workbench.ts",
        FRONTEND / "features/sharedView.ts",
    ])
    return sorted(path for path in files if path.is_file())


def is_technical_literal(value: str) -> bool:
    normalized = " ".join(value.split()).strip(" ;-_()[]")
    return bool(TECHNICAL_LITERAL_RE.fullmatch(normalized))


def is_code_fragment(value: str) -> bool:
    markers = (
        "`", "state.", "querySelector", ".join(", "Parameters", "Promise", "Record",
        "unknown |", "| undefined", "renderPortRow", "renderServiceRow",
    )
    if any(marker in value for marker in markers):
        return True
    without_interpolation = re.sub(r"\$\{[^}]+\}", "", value)
    return not re.search(r"[A-Za-z\u3400-\u9fff]", without_interpolation)


def check_locales() -> list[str]:
    failures: list[str] = []
    en_ordered, en = locale_keys(EN_LOCALE)
    zh_ordered, zh = locale_keys(ZH_LOCALE)
    for name, ordered in (("en-US", en_ordered), ("zh-CN", zh_ordered)):
        duplicates = sorted(key for key, count in Counter(ordered).items() if count > 1)
        failures.extend(f"{name} duplicate translation key: {key}" for key in duplicates)
    failures.extend(f"missing from zh-CN: {key}" for key in sorted(en - zh))
    failures.extend(f"missing from en-US: {key}" for key in sorted(zh - en))

    known = en & zh
    for path in sorted(FRONTEND.glob("**/*.ts")):
        text = read(path)
        for key in T_REF_RE.findall(text):
            if key not in known:
                failures.append(f"{path.relative_to(ROOT)} references missing translation key: {key}")
    return failures


def check_visible_literals() -> list[str]:
    failures: list[str] = []
    for path in frontend_files():
        text = read(path)
        if "\ufffd" in text:
            failures.append(f"{path.relative_to(ROOT)} contains Unicode replacement characters")
        for line_number, line in enumerate(text.splitlines(), start=1):
            if "localize(" in line or "label(" in line or "t(" in line:
                continue
            candidates: list[str] = []
            candidates.extend(match.group(1) for match in TEXT_NODE_RE.finditer(line))
            candidates.extend(match.group(1) for match in CJK_TEXT_NODE_RE.finditer(line))
            candidates.extend(match.group(1) for match in ATTRIBUTE_RE.finditer(line))
            for pattern in UI_LITERAL_RES:
                candidates.extend(match.group(1) for match in pattern.finditer(line))
            candidates.extend(match.group(1) for match in VISIBLE_MESSAGE_RE.finditer(line))
            candidates.extend(match.group(1) for match in STATE_LITERAL_RE.finditer(line))
            if path.name == "viewModel.ts":
                candidates.extend(match.group(1) for match in RETURN_LITERAL_RE.finditer(line))
            for pattern in OBJECT_UI_LITERAL_RES:
                if path.name == "sharedView.ts":
                    continue
                candidates.extend(match.group(1) for match in pattern.finditer(line))
            for candidate in candidates:
                value = " ".join(candidate.split())
                if not value or is_technical_literal(value) or is_code_fragment(value):
                    continue
                failures.append(
                    f"{path.relative_to(ROOT)}:{line_number} has untranslated visible literal: {value}"
                )
    return failures


def check_backend_text_adapter() -> list[str]:
    failures: list[str] = []
    adapter = read(BACKEND_TEXT_ADAPTER)
    required_phrases = (
        "Windows 系统目录仅统计，不允许清理",
        "Java 生效链不一致",
        "命中 WindowsApps Store Alias 时",
        "目录存在只代表文件夹存在",
        "受管路径置前并去重",
        "重复 PATH:",
    )
    for phrase in required_phrases:
        if phrase not in adapter:
            failures.append(f"backend text adapter is missing a release-critical phrase: {phrase}")

    required_boundaries = {
        FRONTEND / "features/sharedView.ts": "localizeBackendText(value)",
        FRONTEND / "features/dashboard/viewModel.ts": "localizeBackendText",
        FRONTEND / "features/environment/viewModel.ts": "localizeBackendText",
        FRONTEND / "features/runtimes/viewModel.ts": "localizeBackendText",
    }
    for path, marker in required_boundaries.items():
        if marker not in read(path):
            failures.append(
                f"{path.relative_to(ROOT)} does not route backend-visible text through the locale adapter"
            )
    return failures


def main() -> int:
    failures = check_locales() + check_visible_literals() + check_backend_text_adapter()
    if failures:
        print("Frontend i18n contract check failed:")
        for failure in failures:
            print(f"- {failure}")
        return 1
    en_keys, _ = locale_keys(EN_LOCALE)
    print(
        "Frontend i18n contract check passed "
        f"({len(en_keys)} locale keys, {len(frontend_files())} UI source files)."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

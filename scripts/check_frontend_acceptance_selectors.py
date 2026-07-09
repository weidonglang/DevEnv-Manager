from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "acceptance" / "feature-manifest.v1.8.2.json"
TAURI_SRC = ROOT / "tauri" / "src"
DATA_TESTID_RE = re.compile(r"data-testid=[\"']([^\"']+)[\"']")


def source_text() -> str:
    parts: list[str] = []
    for path in TAURI_SRC.rglob("*.ts"):
        rel = path.relative_to(TAURI_SRC).as_posix()
        if rel.startswith("acceptance/"):
            continue
        parts.append(path.read_text(encoding="utf-8"))
    return "\n".join(parts)


def manifest() -> dict:
    return json.loads(MANIFEST.read_text(encoding="utf-8"))


def main() -> int:
    text = source_text()
    present = set(DATA_TESTID_RE.findall(text))
    required: list[tuple[str, str, str]] = []
    for page in manifest().get("pages", []):
        for feature in page.get("features", []):
            priority = feature.get("priority") or page.get("priority")
            if priority != "P0":
                continue
            for test_id in feature.get("frontendEntry", {}).get("testIds", []):
                required.append((feature.get("featureId", "<unknown>"), page.get("pageId", "<unknown>"), test_id))

    missing = [(feature_id, page_id, test_id) for feature_id, page_id, test_id in required if test_id not in present and test_id not in text]
    if missing:
        print("Frontend acceptance selector check failed.")
        for feature_id, page_id, test_id in missing:
            print(f"- {feature_id} ({page_id}) missing data-testid={test_id}")
        return 1

    print(f"Frontend acceptance selector check passed ({len(required)} P0 selectors).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

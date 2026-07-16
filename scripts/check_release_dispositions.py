from __future__ import annotations

import json
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ALLOWED = {
    "ready",
    "code-blocker",
    "evidence-blocker",
    "product-decision-required",
    "deferred-new-enhancement",
}


def main() -> None:
    payload = json.loads((ROOT / "acceptance/v1.7.0-normalized-capabilities.json").read_text(encoding="utf-8"))
    capabilities = payload["capabilities"]
    for item in capabilities:
        disposition = item.get("releaseDisposition")
        if disposition not in ALLOWED:
            raise SystemExit(f"Release disposition check failed: {item['capabilityId']} has {disposition}")
        if not item.get("releaseReason"):
            raise SystemExit(f"Release disposition check failed: {item['capabilityId']} has no reason")
        if disposition == "code-blocker" and not item.get("codeBlockerEvidence"):
            raise SystemExit(f"Release disposition check failed: {item['capabilityId']} lacks code evidence")
        if disposition == "evidence-blocker" and not item.get("evidencePlan"):
            raise SystemExit(f"Release disposition check failed: {item['capabilityId']} lacks an evidence plan")
    counts = Counter(item["releaseDisposition"] for item in capabilities)
    print(
        "Release dispositions valid "
        f"(ready={counts['ready']}, code-blocker={counts['code-blocker']}, "
        f"evidence-blocker={counts['evidence-blocker']}, "
        f"product-decision-required={counts['product-decision-required']})."
    )


if __name__ == "__main__":
    main()

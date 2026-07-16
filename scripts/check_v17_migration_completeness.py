from __future__ import annotations

import json
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    source = json.loads((ROOT / "acceptance/v1.7.0-source-records.json").read_text(encoding="utf-8"))
    normalized = json.loads((ROOT / "acceptance/v1.7.0-normalized-capabilities.json").read_text(encoding="utf-8"))
    records = source["records"]
    capabilities = normalized["capabilities"]
    ids = {item["capabilityId"] for item in capabilities}

    if source["summary"]["unaccounted"]:
        raise SystemExit("v1.7 migration completeness failed: unaccounted raw sources remain")
    if any(not record["normalizedCapabilityId"] and not record["exclusionReason"] for record in records):
        raise SystemExit("v1.7 migration completeness failed: source without mapping or exclusion")
    if any(record["normalizedCapabilityId"] not in ids for record in records if record["normalizedCapabilityId"]):
        raise SystemExit("v1.7 migration completeness failed: source maps to unknown capability")
    if any(item["implementationStatus"] == "unreviewed" for item in capabilities):
        raise SystemExit("v1.7 migration completeness failed: unreviewed normalized capability")

    implementation = Counter(item["implementationStatus"] for item in capabilities)
    print(
        f"v1.7 migration mapping complete ({len(records)} sources, {len(capabilities)} capabilities; "
        f"equivalent={implementation['equivalent']}, enhanced={implementation['enhanced']}, "
        f"degraded={implementation['degraded']}, missing={implementation['missing']})."
    )


if __name__ == "__main__":
    main()

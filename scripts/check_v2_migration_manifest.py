#!/usr/bin/env python3
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "acceptance" / "v2.0-migration-status.json"
VALID_PRIORITIES = {"P0", "P1", "P2"}
VALID_STATUSES = {"pending", "in-progress", "completed", "deferred"}


def main() -> int:
    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    if data.get("sourceVersion") != "1.7.0":
        raise SystemExit("migration source must remain v1.7.0")
    if data.get("frontendPolicy") != "preserve-v1.7-layout-content-and-styles":
        raise SystemExit("v1.7 frontend preservation policy is missing")
    if "transparent-backend-validation" not in data.get("interactionPolicy", ""):
        raise SystemExit("migration must not expose a separate token workflow")

    commands: list[str] = []
    batch_ids: set[str] = set()
    for batch in data.get("batches", []):
        batch_id = batch.get("id")
        if not batch_id or batch_id in batch_ids:
            raise SystemExit(f"duplicate or missing batch id: {batch_id!r}")
        batch_ids.add(batch_id)
        if batch.get("priority") not in VALID_PRIORITIES:
            raise SystemExit(f"invalid priority for {batch_id}")
        if batch.get("status") not in VALID_STATUSES:
            raise SystemExit(f"invalid status for {batch_id}")
        if not batch.get("strategy"):
            raise SystemExit(f"missing migration strategy for {batch_id}")
        commands.extend(batch.get("commands", []))

    if len(commands) != len(set(commands)):
        raise SystemExit("reference-only command appears in more than one batch")
    expected = data.get("summary", {}).get("referenceOnlyCommands")
    if len(commands) != expected:
        raise SystemExit(f"expected {expected} reference-only commands, found {len(commands)}")
    if len(batch_ids) != data.get("summary", {}).get("batches"):
        raise SystemExit("batch summary does not match manifest")

    print(f"v2 migration manifest passed ({len(commands)} commands, {len(batch_ids)} batches)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

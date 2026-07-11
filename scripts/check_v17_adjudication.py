from __future__ import annotations

import json
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

IMPLEMENTATION = {"equivalent", "enhanced", "degraded", "missing", "removed-approved", "not-applicable"}
EVIDENCE = {"verified-installed", "verified-real-tauri", "verified-automated", "evidence-required", "not-safely-testable"}
DISPOSITIONS = {"ready", "code-blocker", "evidence-blocker", "product-decision-required", "deferred-new-enhancement"}


def load(path: str):
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def main() -> None:
    sources = load("acceptance/v1.7.0-source-records.json")
    normalized = load("acceptance/v1.7.0-normalized-capabilities.json")
    split = load("acceptance/feature-manifest-v1.8.2-split-proposal.json")
    backend = load("acceptance/backend-command-disposition.v1.8.2.json")

    records = sources["records"]
    capabilities = normalized["capabilities"]
    children = split["children"]
    commands = backend["commands"]

    assert len(records) == 237
    assert len({record["sourceId"] for record in records}) == len(records)
    assert all(bool(record["normalizedCapabilityId"]) ^ bool(record["exclusionReason"]) for record in records)
    assert sources["summary"]["unaccounted"] == 0

    capability_ids = {capability["capabilityId"] for capability in capabilities}
    assert len(capability_ids) == len(capabilities)
    assert all(record["normalizedCapabilityId"] in capability_ids for record in records if record["normalizedCapabilityId"])
    assert all(capability["implementationStatus"] != "unreviewed" for capability in capabilities)
    assert {capability["implementationStatus"] for capability in capabilities} <= IMPLEMENTATION
    assert {capability["evidenceStatus"] for capability in capabilities} <= EVIDENCE
    assert {capability["releaseDisposition"] for capability in capabilities} <= DISPOSITIONS
    assert all(capability["codeBlockerEvidence"] for capability in capabilities if capability["releaseDisposition"] == "code-blocker")
    assert all(capability["evidencePlan"] for capability in capabilities if capability["releaseDisposition"] == "evidence-blocker")
    assert sum(len(capability["sourceRecordIds"]) for capability in capabilities) == sources["summary"]["mapped"]

    assert split["summary"]["partialParents"] == 27
    assert split["summary"]["parentsWithProposal"] == 27
    assert split["summary"]["unresolvedParents"] == 0
    assert len({child["newFeatureId"] for child in children}) == len(children)
    partial_commands = {command for child in children for command in child["commands"]}
    expected_old_capabilities = {
        capability["capabilityId"]
        for capability in capabilities
        if set(capability["replacementCommands"]) & partial_commands
    }
    proposed_old_capabilities = {capability_id for child in children for capability_id in child["oldCapabilityIds"]}
    assert expected_old_capabilities <= proposed_old_capabilities

    assert backend["summary"]["registered"] == 168
    assert backend["summary"]["unclassified"] == 0
    assert backend["summary"]["withoutCapabilityMapping"] == 0
    assert backend["summary"]["replacementChainsUnresolved"] == 0
    assert len({command["command"] for command in commands}) == len(commands)
    assert all(command["classification"] for command in commands)
    assert all(command["capabilityId"] for command in commands)
    assert all(command["exactReason"] for command in commands)
    assert all(command["replacementResolution"] for command in commands)
    assert all(
        command["replacementChain"]
        for command in commands
        if command["replacementResolution"] == "explicit-replacement"
    )

    print(
        "v1.7 adjudication check passed "
        f"({len(records)} sources, {len(capabilities)} capabilities, "
        f"{len(children)} split children, {len(commands)} backend commands)."
    )
    print("Implementation:", dict(Counter(item["implementationStatus"] for item in capabilities)))
    print("Evidence:", dict(Counter(item["evidenceStatus"] for item in capabilities)))
    print("Disposition:", dict(Counter(item["releaseDisposition"] for item in capabilities)))


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "tauri" / "src-tauri" / "resources" / "process-identities.v1.json"

ALLOWED_CATEGORIES = {
    "database", "java", "node", "python", "web", "dotnet", "native",
    "container", "middleware", "cloud", "ide", "system", "desktop", "unknown",
}
ALLOWED_HANDLING = {"protected", "service-plan", "strict-plan", "inspect-only"}
ALLOWED_KEYS = {
    "id", "displayNameZh", "displayNameEn", "category", "ecosystem",
    "executableNames", "serviceNames", "serviceDisplayNames", "productNames",
    "fileDescriptions", "companyNames", "publishers", "pathPatterns",
    "commandLinePatterns", "parentProcessNames", "childProcessNames", "commonPorts",
    "strongPorts", "configurationHints", "defaultHandling", "riskNotes", "aliases",
    "documentationKey", "requiresContext",
}


def fail(message: str) -> None:
    raise SystemExit(f"process identity catalog check failed: {message}")


def main() -> None:
    try:
        data = json.loads(CATALOG.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        fail(str(error))
    if data.get("schemaVersion") != 1:
        fail("schemaVersion must be 1")
    if not str(data.get("catalogVersion", "")).strip() or not str(data.get("updatedAt", "")).strip():
        fail("catalogVersion and updatedAt are required")
    entries = data.get("entries")
    if not isinstance(entries, list) or len(entries) < 30:
        fail("at least 30 structured identity families are required")

    ids: set[str] = set()
    aliases: dict[str, str] = {}
    executable_owners: dict[str, tuple[str, bool]] = {}
    for entry in entries:
        unexpected = set(entry) - ALLOWED_KEYS
        if unexpected:
            fail(f"{entry.get('id', '<unknown>')} contains executable/unknown keys: {sorted(unexpected)}")
        identity_id = str(entry.get("id", "")).strip().lower()
        if not identity_id or identity_id in ids:
            fail(f"duplicate or empty id: {identity_id}")
        ids.add(identity_id)
        if not str(entry.get("displayNameZh", "")).strip() or not str(entry.get("displayNameEn", "")).strip():
            fail(f"{identity_id} requires both display names")
        category = entry.get("category")
        handling = entry.get("defaultHandling")
        if category not in ALLOWED_CATEGORIES:
            fail(f"{identity_id} has invalid category {category}")
        if handling not in ALLOWED_HANDLING:
            fail(f"{identity_id} has invalid defaultHandling {handling}")
        if handling == "protected" and category != "system":
            fail(f"{identity_id} may not configure protected handling outside system category")
        if category == "system" and identity_id in {"windows-system", "windows-service-host"} and handling != "protected":
            fail(f"{identity_id} must remain protected")
        if not str(entry.get("documentationKey", "")).strip():
            fail(f"{identity_id} requires documentationKey")

        requires_context = bool(entry.get("requiresContext", False))
        for executable in entry.get("executableNames", []):
            if executable != executable.lower() or "/" in executable or "\\" in executable:
                fail(f"{identity_id} has a non-normalized executable name: {executable}")
            previous = executable_owners.get(executable)
            if previous and not previous[1] and not requires_context:
                fail(f"strong executable {executable} conflicts between {previous[0]} and {identity_id}")
            executable_owners.setdefault(executable, (identity_id, requires_context))
        for alias in entry.get("aliases", []):
            normalized = str(alias).strip().lower()
            if not normalized or normalized in aliases:
                fail(f"alias {normalized!r} conflicts between {aliases.get(normalized)} and {identity_id}")
            aliases[normalized] = identity_id
        for port in [*entry.get("commonPorts", []), *entry.get("strongPorts", [])]:
            if not isinstance(port, int) or not 1 <= port <= 65535:
                fail(f"{identity_id} has invalid port {port!r}")
        for field in ("pathPatterns", "commandLinePatterns"):
            for pattern in entry.get(field, []):
                if not str(pattern).strip() or any(character in str(pattern) for character in "\r\n"):
                    fail(f"{identity_id} has an unbounded/invalid {field} value")

    required_ids = {
        "windows-service-host", "windows-system", "postgresql", "mysql", "mariadb",
        "sql-server", "mongodb", "redis", "java-runtime", "spring-boot", "tomcat",
        "node-runtime", "vite", "python-runtime", "uvicorn-fastapi", "web-server",
        "dotnet-development", "go-development", "rust-development", "docker-container",
        "virtualization", "ide-development-tool", "android-debug-bridge",
    }
    missing = required_ids - ids
    if missing:
        fail(f"required identity families are missing: {sorted(missing)}")
    print(f"process identity catalog check passed: {len(entries)} entries, {len(aliases)} aliases")


if __name__ == "__main__":
    main()

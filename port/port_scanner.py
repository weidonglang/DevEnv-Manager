from __future__ import annotations

import socket
import re

import psutil

from port.port_models import PortRecord


def _format_address(address: tuple | object) -> tuple[str, int]:
    if not address:
        return "", 0
    try:
        host, port = address[0], address[1]
        return str(host), int(port)
    except (IndexError, TypeError, ValueError):
        return str(address), 0


def scan_ports() -> list[PortRecord]:
    records: list[PortRecord] = []
    process_cache: dict[int, tuple[str, str | None, str | None, str | None]] = {}
    for connection in psutil.net_connections(kind="inet"):
        protocol = "TCP" if connection.type == socket.SOCK_STREAM else "UDP"
        local_host, local_port = _format_address(connection.laddr)
        remote_host, remote_port = _format_address(connection.raddr)
        remote = f"{remote_host}:{remote_port}" if remote_host else ""
        pid = connection.pid
        name = "-"
        path = cmdline = username = None
        if pid is not None:
            if pid not in process_cache:
                try:
                    process = psutil.Process(pid)
                    try:
                        name = process.name()
                    except (psutil.AccessDenied, psutil.NoSuchProcess):
                        name = "权限不足"
                    try:
                        path = process.exe()
                    except (psutil.AccessDenied, psutil.NoSuchProcess):
                        path = None
                    try:
                        cmdline = " ".join(process.cmdline())
                    except (psutil.AccessDenied, psutil.NoSuchProcess):
                        cmdline = None
                    try:
                        username = process.username()
                    except (psutil.AccessDenied, psutil.NoSuchProcess):
                        username = None
                    process_cache[pid] = (name, path, cmdline, username)
                except (psutil.AccessDenied, psutil.NoSuchProcess):
                    process_cache[pid] = ("权限不足", None, None, None)
            name, path, cmdline, username = process_cache[pid]
        status = connection.status if protocol == "TCP" else "UDP"
        records.append(
            PortRecord(protocol, local_host, local_port, remote, status, pid, name, path, cmdline, username)
        )
    return sorted(records, key=lambda item: (item.local_port, item.protocol, item.pid or -1))


def filter_records(
    records: list[PortRecord],
    query: str = "",
    listening_only: bool = False,
    hide_system: bool = True,
    conflict_only: bool = False,
) -> list[PortRecord]:
    terms = _parse_query(query)
    conflict_keys = find_conflicting_keys(records) if conflict_only else set()
    result = []
    for record in records:
        if listening_only and record.status not in {"LISTEN", "UDP"}:
            continue
        if hide_system and record.pid in {0, 4}:
            continue
        if conflict_only and (record.protocol, record.local_port) not in conflict_keys:
            continue
        if terms and not all(_matches_term(record, field, value, negate) for field, value, negate in terms):
            continue
        result.append(record)
    return result


FIELD_ALIASES = {
    "port": "port",
    "端口": "port",
    "pid": "pid",
    "name": "name",
    "process": "name",
    "进程": "name",
    "proto": "protocol",
    "protocol": "protocol",
    "协议": "protocol",
    "status": "status",
    "状态": "status",
    "local": "local",
    "本地": "local",
    "remote": "remote",
    "远程": "remote",
    "user": "user",
    "用户": "user",
    "path": "path",
    "路径": "path",
    "service": "service",
    "服务": "service",
}


def _parse_query(query: str) -> list[tuple[str | None, str, bool]]:
    tokens = re.findall(r'(?:[^\s"]|"[^"]*")+', query.strip())
    terms = []
    for token in tokens:
        negate = token.startswith("-")
        if negate:
            token = token[1:]
        field = None
        value = token
        if ":" in token:
            candidate, value = token.split(":", 1)
            field = FIELD_ALIASES.get(candidate.casefold())
            if field is None:
                value = token
        value = value.strip('"').casefold()
        if value:
            terms.append((field, value, negate))
    return terms


def _matches_term(record: PortRecord, field: str | None, value: str, negate: bool) -> bool:
    if field == "port":
        if "-" in value:
            start, _, end = value.partition("-")
            matched = start.isdigit() and end.isdigit() and int(start) <= record.local_port <= int(end)
        else:
            matched = value.isdigit() and record.local_port == int(value)
    elif field == "pid":
        matched = value.isdigit() and record.pid == int(value)
    else:
        values = {
            None: record.searchable_text(),
            "name": record.process_name.casefold(),
            "protocol": record.protocol.casefold(),
            "status": record.status.casefold(),
            "local": record.local_address.casefold(),
            "remote": record.remote_address.casefold(),
            "user": (record.username or "").casefold(),
            "path": (record.process_path or "").casefold(),
            "service": record.service_name.casefold(),
        }
        matched = value in values.get(field, "")
    return not matched if negate else matched


def find_conflicting_keys(records: list[PortRecord]) -> set[tuple[str, int]]:
    owners: dict[tuple[str, int], set[int]] = {}
    for record in records:
        if record.pid is None or record.status not in {"LISTEN", "UDP"}:
            continue
        owners.setdefault((record.protocol, record.local_port), set()).add(record.pid)
    return {key for key, pids in owners.items() if len(pids) > 1}


def summarize_records(records: list[PortRecord]) -> dict[str, int]:
    return {
        "records": len(records),
        "ports": len({(item.protocol, item.local_port) for item in records}),
        "listeners": sum(item.status in {"LISTEN", "UDP"} for item in records),
        "processes": len({item.pid for item in records if item.pid is not None}),
        "conflicts": len(find_conflicting_keys(records)),
    }

from __future__ import annotations

from dataclasses import dataclass


KNOWN_PORTS = {
    21: "FTP",
    22: "SSH",
    25: "SMTP",
    53: "DNS",
    80: "HTTP / Nginx",
    443: "HTTPS",
    1433: "SQL Server",
    3000: "React / Web",
    3306: "MySQL",
    5173: "Vite / Vue",
    5432: "PostgreSQL",
    6379: "Redis",
    8000: "Web 开发服务",
    8080: "Spring / Web",
    27017: "MongoDB",
}


@dataclass(frozen=True)
class PortRecord:
    protocol: str
    local_address: str
    local_port: int
    remote_address: str
    status: str
    pid: int | None
    process_name: str
    process_path: str | None = None
    cmdline: str | None = None
    username: str | None = None

    def searchable_text(self) -> str:
        return " ".join(
            str(value)
            for value in (
                self.protocol,
                self.local_address,
                self.local_port,
                self.remote_address,
                self.status,
                self.pid or "",
                self.process_name,
                self.service_name,
                self.process_path or "",
                self.username or "",
            )
        ).casefold()

    def display_values(self) -> tuple[str, ...]:
        return (
            self.protocol,
            self.local_address,
            str(self.local_port),
            self.remote_address,
            self.status,
            str(self.pid) if self.pid is not None else "-",
            self.process_name,
            self.service_name,
        )

    @property
    def service_name(self) -> str:
        return KNOWN_PORTS.get(self.local_port, "")

    def details(self) -> str:
        return "\n".join(
            (
                f"协议：{self.protocol}",
                f"本地地址：{self.local_address}",
                f"端口：{self.local_port}",
                f"远程地址：{self.remote_address or '-'}",
                f"状态：{self.status}",
                f"PID：{self.pid if self.pid is not None else '-'}",
                f"进程名：{self.process_name}",
                f"常见用途：{self.service_name or '未知/动态端口'}",
                f"进程路径：{self.process_path or '-'}",
                f"命令行：{self.cmdline or '-'}",
                f"用户名：{self.username or '-'}",
            )
        )


def analyze_record(record: PortRecord, all_records: list[PortRecord]) -> str:
    notes = []
    if record.local_address in {"0.0.0.0", "::", "*"}:
        notes.append("监听所有网络接口，局域网或公网是否可访问取决于防火墙和路由配置")
    elif record.local_address in {"127.0.0.1", "::1"}:
        notes.append("仅绑定本机回环地址，通常不能被其他电脑直接访问")
    if record.local_port in {3306, 5432, 6379, 27017} and record.local_address in {"0.0.0.0", "::", "*"}:
        notes.append("数据库服务对外监听，建议确认认证和 Windows 防火墙规则")
    same_port = {
        item.pid
        for item in all_records
        if item.protocol == record.protocol
        and item.local_port == record.local_port
        and item.pid is not None
    }
    if len(same_port) > 1:
        notes.append(f"同一 {record.protocol} 端口关联 {len(same_port)} 个 PID，可能是共享端口或占用冲突")
    process_ports = {
        item.local_port for item in all_records
        if item.pid == record.pid and item.local_port
    }
    if record.pid is not None and len(process_ports) > 1:
        notes.append(f"该进程共关联 {len(process_ports)} 个本地端口")
    if not notes:
        notes.append("未发现明显异常")
    return "智能分析：" + "；".join(notes)

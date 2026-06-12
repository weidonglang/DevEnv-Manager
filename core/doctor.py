from __future__ import annotations

import os
import shutil
from dataclasses import dataclass
from pathlib import Path

from core.config_store import ConfigService
from core.env_var import MANAGED_PATHS, get_user_environment
from core.process_runner import run_command
from core.runtime_discovery import RuntimeInstallation, discover_all


@dataclass
class DiagnosticItem:
    name: str
    status: str
    message: str


def run_diagnostics(config: ConfigService) -> list[DiagnosticItem]:
    paths = config.paths
    environment = get_user_environment()
    items: list[DiagnosticItem] = []
    devenv_home = environment.get("DEVENV_HOME", "")
    java_home = environment.get("JAVA_HOME", "")
    user_path = environment.get("Path", environment.get("PATH", ""))
    items.append(_check("DEVENV_HOME", Path(devenv_home).resolve() == paths.root.resolve() if devenv_home else False, devenv_home or "未配置"))
    expected_java = r"%DEVENV_HOME%\current\jdk"
    items.append(_check("JAVA_HOME", java_home.casefold() == expected_java.casefold(), java_home or "未配置"))
    normalized_path = {part.strip().rstrip("\\/").casefold() for part in user_path.split(";")}
    for managed in MANAGED_PATHS:
        items.append(_check(f"PATH: {managed}", managed.casefold() in normalized_path, "已配置" if managed.casefold() in normalized_path else "缺失"))
    installations = discover_all(config)
    for kind, label in (("jdk", "JDK"), ("python", "Python"), ("node", "Node.js")):
        found = [item for item in installations if item.kind == kind]
        current = next((item for item in found if item.current), None)
        if current:
            items.append(
                DiagnosticItem(
                    f"当前 {label}",
                    "OK",
                    f"版本 {current.version}；位置：{current.path}",
                )
            )
            items.append(_validate_companion(kind, current))
        elif found:
            descriptions = "；".join(
                f"{item.version}（{item.source}，{item.path}）"
                for item in found[:6]
            )
            items.append(DiagnosticItem(f"已发现 {label}", "OK", descriptions))
            items.append(
                DiagnosticItem(
                    f"DevEnv 当前 {label}",
                    "WARNING",
                    "尚未激活受管版本；系统已有版本仍可使用，但不能通过 DevEnv 切换或卸载",
                )
            )
        else:
            items.append(DiagnosticItem(label, "WARNING", "未检测到可用版本"))
    return items


def _check(name: str, condition: bool, message: str) -> DiagnosticItem:
    return DiagnosticItem(name, "OK" if condition else "WARNING", message)


def _describe_system_fallback(name: str, command: str, args: list[str]) -> str:
    resolved = shutil.which(command)
    if resolved:
        result = run_command([resolved, *args], timeout=20)
        if result.success:
            detail = result.output.splitlines()[0] if result.output else "版本命令无输出"
            return f"DevEnv 未安装或未激活；检测到系统版本：{detail}（{resolved}）"
    if name.startswith("Python"):
        launcher = shutil.which("py")
        if launcher:
            launcher_args = ["-3", *args]
            result = run_command([launcher, *launcher_args], timeout=20)
            if result.success:
                detail = result.output.splitlines()[0] if result.output else "版本命令无输出"
                return f"DevEnv 未安装或未激活；检测到 Python Launcher：{detail}（{launcher}）"
    if resolved:
        return f"DevEnv 未安装或未激活；系统命令存在但不可执行（{resolved}）"
    return "DevEnv 未安装或未激活；系统 PATH 中也未检测到可用命令"


def _validate_companion(kind: str, installation: RuntimeInstallation) -> DiagnosticItem:
    checks = {
        "jdk": ("javac", installation.path / "bin/javac.exe", ["-version"]),
        "python": ("pip", installation.executable, ["-m", "pip", "--version"]),
        "node": ("npm", installation.path / "npm.cmd", ["-v"]),
    }
    name, executable, args = checks[kind]
    if not executable.exists():
        return DiagnosticItem(name, "ERROR", f"缺少文件：{executable}")
    result = run_command([str(executable), *args], timeout=20)
    return DiagnosticItem(name, "OK" if result.success else "ERROR", result.output or str(executable))


def format_report(items: list[DiagnosticItem]) -> str:
    return "\n".join(f"[{item.status}] {item.name}: {item.message}" for item in items)

export function envReliabilityIntro() {
  return [
    "当前进程环境来自 DevEnv Manager 启动时；用户环境是新终端通常会读取的注册表值。",
    "修改环境变量后，已经打开的终端、IDE、服务、Nacos、Maven Daemon 和 Gradle Daemon 可能需要重启。",
    "JAVA_HOME 将写入真实绝对路径，不写入 %DEVENV_HOME% 这类间接引用。",
  ];
}

export function riskClass(risk: string) {
  return `risk-chip risk-${risk || "info"}`;
}

export const disclaimerTitle = "使用前请阅读";

export const defaultDisclaimer =
  "DevEnv Manager 会提供环境诊断、运行时切换、用户级环境变量修改、端口管理、缓存清理、空间搬家和部分高级系统操作入口。默认诊断不会修改系统；执行修改类操作前会展示计划和确认提示。涉及数据、服务、Junction、分区或数据库的操作仍然存在风险，建议先备份重要数据。";

export const bannedWords = [
  "绝对安全",
  "一键修复所有问题",
  "一键加速",
  "深度优化",
  "彻底清理",
  "无风险扩容",
  "自动修复系统",
  "永久解决",
  "保证成功",
  "100% 恢复",
];

export const riskTextMap: Record<string, string> = {
  info: "只读说明",
  low: "低风险",
  medium: "中风险",
  high: "高风险",
  critical: "极高风险",
};

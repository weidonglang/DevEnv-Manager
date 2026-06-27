export function confirmRisk(message: string, risk: string) {
  if (risk === "critical") {
    if (!window.confirm(`${message}\n\n第一次确认：这是极高风险操作。`)) return false;
    if (!window.confirm("第二次确认：我已经备份重要数据。")) return false;
    return window.prompt("第三次确认：请输入 我已理解风险并确认执行") === "我已理解风险并确认执行";
  }
  if (risk === "high" || risk === "medium") {
    return window.confirm(`${message}\n\n该操作需要确认；请先确认已阅读风险说明。`);
  }
  return true;
}

import type {
  FileAssociationBackupSummary,
  FileAssociationAppSearchResult,
  FileAssociationPlan,
  FileAssociationRecord,
  FileAssociationReport,
  FileAssociationRisk,
} from "../../types";

export type FileAssociationUiState = {
  report: FileAssociationReport | null;
  backups: FileAssociationBackupSummary[];
  plan: FileAssociationPlan | null;
  activeTab: "overview" | "types" | "apps" | "backups" | "safety";
  filter: {
    keyword: string;
    risk: string;
    category: string;
    onlyMissingApp: boolean;
  };
  selectedExtensions: Set<string>;
  targetAppName: string;
  targetExecutable: string;
  appSearch: FileAssociationAppSearchResult | null;
  applyResultMessage: string;
};

type RenderHelpers = {
  escapeHtml: (value: string) => string;
};

export const suggestedFileAssociationApps = [
  "Visual Studio Code",
  "Notepad++",
  "Microsoft Edge",
  "Adobe Reader",
  "7-Zip",
  "PotPlayer",
  "VLC",
  "系统照片",
  "Windows 记事本",
];

export function riskLabel(risk: FileAssociationRisk) {
  return (
    {
      normal: "正常",
      missingApp: "程序缺失",
      protected: "系统保护",
      highRisk: "高风险",
      unknown: "未知",
    } as Record<FileAssociationRisk, string>
  )[risk];
}

export function sourceLabel(source: string) {
  return (
    {
      userChoice: "UserChoice",
      hkcu: "HKCU",
      hklm: "HKLM",
      unknown: "Unknown",
    } as Record<string, string>
  )[source] || source;
}

export function renderFileAssociationPanel(state: FileAssociationUiState, helpers: RenderHelpers) {
  const { escapeHtml } = helpers;
  return `
    <section class="panel file-assoc-panel">
      <div class="panel-head">
        <div class="panel-title"><h2>文件打开方式管理器</h2></div>
        <div class="toolbar compact">
          <button id="scan-file-associations">扫描</button>
          <button id="open-default-apps-settings">默认应用设置</button>
          <button id="export-file-association-report">导出报告</button>
        </div>
      </div>
      <div class="advanced-warning"><span><strong>安全边界：</strong>扫描只读；执行前先生成计划和备份；受 Windows UserChoice 保护的关联只跳转系统设置，不直接伪造写入。</span></div>
      <div class="tabbar file-assoc-tabs">
        ${["overview", "types", "apps", "backups", "safety"]
          .map((tab) => `<button data-file-assoc-tab="${tab}" class="${state.activeTab === tab ? "active" : ""}">${tabName(tab)}</button>`)
          .join("")}
      </div>
      ${renderActiveTab(state, escapeHtml)}
    </section>
  `;
}

function renderActiveTab(state: FileAssociationUiState, escapeHtml: (value: string) => string) {
  if (state.activeTab === "overview") return renderOverview(state, escapeHtml);
  if (state.activeTab === "types") return renderTypes(state, escapeHtml);
  if (state.activeTab === "apps") return renderApps(state, escapeHtml);
  if (state.activeTab === "backups") return renderBackups(state, escapeHtml);
  return renderSafety();
}

function renderOverview(state: FileAssociationUiState, escapeHtml: (value: string) => string) {
  const report = state.report;
  if (!report) {
    return `<div class="empty">点击“扫描”后查看常见扩展名、当前默认应用、来源、风险和可管理状态。</div>`;
  }
  const metrics = [
    ["扫描时间", report.scannedAt],
    ["当前用户", report.currentUser],
    ["Windows", report.windowsVersion],
    ["已识别扩展名", String(report.totalExtensions)],
    ["可安全管理", String(report.manageableExtensions)],
    ["需系统确认", String(report.requiresSystemSettings)],
    ["异常关联", String(report.abnormalCount)],
    ["默认程序缺失", String(report.missingAppCount)],
    ["高风险类型", String(report.highRiskCount)],
  ];
  return `
    <div class="file-assoc-metrics">
      ${metrics.map(([label, value]) => `<article><span>${label}</span><strong>${escapeHtml(value)}</strong></article>`).join("")}
    </div>
    <div class="small-note">风险说明：正常表示可解析；程序缺失表示打开命令中的程序不存在；系统保护表示 Windows UserChoice 控制；高风险包括 exe、msi、reg、bat、cmd、ps1、vbs、scr。</div>
  `;
}

function renderTypes(state: FileAssociationUiState, escapeHtml: (value: string) => string) {
  if (!state.report) return `<div class="empty">请先扫描文件关联。</div>`;
  const categories = Array.from(new Set(state.report.records.map((item) => item.category)));
  const records = filteredRecords(state);
  return `
    <div class="file-assoc-filters">
      <input id="file-assoc-filter-keyword" value="${escapeHtml(state.filter.keyword)}" placeholder="搜索扩展名、应用、命令" />
      <select id="file-assoc-filter-risk">
        ${["", "normal", "missingApp", "protected", "highRisk", "unknown"].map((risk) => `<option value="${risk}" ${state.filter.risk === risk ? "selected" : ""}>${risk ? riskLabel(risk as FileAssociationRisk) : "全部风险"}</option>`).join("")}
      </select>
      <select id="file-assoc-filter-category">
        <option value="">全部类别</option>
        ${categories.map((category) => `<option value="${escapeHtml(category)}" ${state.filter.category === category ? "selected" : ""}>${escapeHtml(category)}</option>`).join("")}
      </select>
      <label class="toggle-row"><input id="file-assoc-filter-missing" type="checkbox" ${state.filter.onlyMissingApp ? "checked" : ""} /><span>仅缺失程序</span></label>
    </div>
    <div class="file-assoc-table">
      <div class="file-assoc-row head"><span>选择</span><span>扩展名</span><span>类别</span><span>当前默认应用</span><span>ProgID / 来源</span><span>命令与路径</span><span>风险</span><span>操作</span></div>
      ${records.map((record) => renderRecordRow(record, state, escapeHtml)).join("") || `<div class="empty">没有匹配的扩展名</div>`}
    </div>
  `;
}

function renderRecordRow(record: FileAssociationRecord, state: FileAssociationUiState, escapeHtml: (value: string) => string) {
  const checked = state.selectedExtensions.has(record.extension) ? "checked" : "";
  return `
    <div class="file-assoc-row">
      <span><input type="checkbox" data-file-assoc-select="${escapeHtml(record.extension)}" ${checked} ${record.canSuggestChange ? "" : "disabled"} /></span>
      <span><strong>${escapeHtml(record.extension)}</strong><small>${escapeHtml(record.description)}</small></span>
      <span>${escapeHtml(record.category)}</span>
      <span>${escapeHtml(record.currentAppName || "未识别")}</span>
      <span><small>${escapeHtml(record.currentProgId || "无")}</small><small>${sourceLabel(record.source)}</small></span>
      <span><small>${escapeHtml(record.currentCommand || "没有打开命令")}</small><small>${record.executablePath ? escapeHtml(record.executablePath) : "未解析程序路径"} · ${record.executableExists ? "存在" : "不存在/未知"}</small></span>
      <span><mark class="risk-${record.risk}">${riskLabel(record.risk)}</mark></span>
      <span class="file-assoc-actions">
        <button data-action="copy-text" data-copy="${escapeHtml(record.currentCommand || "")}" ${record.currentCommand ? "" : "disabled"}>复制命令</button>
        <button data-file-assoc-plan-one="${escapeHtml(record.extension)}" ${record.canSuggestChange ? "" : "disabled"}>计划</button>
      </span>
    </div>
    ${record.notes.length ? `<div class="file-assoc-notes">${record.notes.map((note) => `<span>${escapeHtml(note)}</span>`).join("")}</div>` : ""}
  `;
}

function renderApps(state: FileAssociationUiState, escapeHtml: (value: string) => string) {
  const selected = Array.from(state.selectedExtensions);
  return `
    <div class="file-assoc-app-grid">
      <section>
        <h3>按应用批量生成计划</h3>
        <div class="small-note">选择目标应用和扩展名后只生成计划；不会立即修改。受保护项会标记为“打开系统设置确认”。</div>
        <div class="form-row">
          <input id="file-assoc-target-name" list="file-assoc-app-list" value="${escapeHtml(state.targetAppName)}" placeholder="目标应用名称，例如 VS Code" />
          <datalist id="file-assoc-app-list">${suggestedFileAssociationApps.map((name) => `<option value="${escapeHtml(name)}"></option>`).join("")}</datalist>
          <button id="search-file-assoc-app">搜索本机应用</button>
          <input id="file-assoc-target-exe" value="${escapeHtml(state.targetExecutable)}" placeholder="目标 exe 完整路径" />
          <button id="pick-file-assoc-target">选择 exe</button>
        </div>
        ${renderAppSearchResult(state, escapeHtml)}
        <div class="form-row">
          <input id="file-assoc-extension-input" value="${escapeHtml(selected.join(", "))}" placeholder=".txt, .md, .json" />
          <label class="toggle-row"><input id="file-assoc-advanced-risk" type="checkbox" /><span>高级高风险单项计划</span></label>
          <button id="create-file-assoc-plan">生成修改计划</button>
        </div>
      </section>
      <section>
        <h3>计划预览</h3>
        ${renderPlan(state.plan, escapeHtml)}
      </section>
    </div>
    ${state.applyResultMessage ? `<div class="operation-result">${escapeHtml(state.applyResultMessage)}</div>` : ""}
  `;
}

function renderAppSearchResult(state: FileAssociationUiState, escapeHtml: (value: string) => string) {
  const result = state.appSearch;
  if (!result) return "";
  if (!result.candidates.length) {
    return `<div class="empty">${escapeHtml(result.message)}</div>`;
  }
  return `
    <div class="runtime-list compact-list">
      ${result.candidates
        .slice(0, 6)
        .map((candidate) => `<article class="runtime"><div><strong>${escapeHtml(candidate.displayName)}</strong><span>${candidate.confidence}% · ${escapeHtml(candidate.source)}</span></div><small>${escapeHtml(candidate.executablePath)}</small><small>${escapeHtml(candidate.recommendedCommandTemplate)}</small><button data-file-assoc-use-candidate="${escapeHtml(candidate.executablePath)}" data-file-assoc-candidate-name="${escapeHtml(candidate.displayName)}" ${candidate.exists ? "" : "disabled"}>使用此 exe</button></article>`)
        .join("")}
    </div>
    <div class="small-note">${escapeHtml(result.message)}</div>
  `;
}

function renderPlan(plan: FileAssociationPlan | null, escapeHtml: (value: string) => string) {
  if (!plan) return `<div class="empty">还没有修改计划。</div>`;
  return `
    <div class="file-assoc-plan">
      <strong>${escapeHtml(plan.targetAppName)} · ${plan.changes.length} 项</strong>
      <small>备份路径：${escapeHtml(plan.backupPath)}</small>
      <small>指纹：${escapeHtml(plan.planFingerprint)}</small>
      ${plan.warnings.length ? `<ul>${plan.warnings.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
      <div class="runtime-list">
        ${plan.changes
          .map((change) => `<article class="runtime"><div><strong>${escapeHtml(change.extension)}</strong><span>${escapeHtml(change.applyMode)}</span></div><small>${escapeHtml(change.before.currentAppName || "未识别")} -> ${escapeHtml(change.after.appName)}</small><small>${escapeHtml(change.after.command)}</small>${change.warnings.map((item) => `<small>${escapeHtml(item)}</small>`).join("")}</article>`)
          .join("")}
      </div>
      <div class="toolbar compact">
        <button id="apply-file-assoc-plan" class="primary">备份并执行计划</button>
        <button id="open-file-type-settings">打开文件类型设置</button>
      </div>
    </div>
  `;
}

function renderBackups(state: FileAssociationUiState, escapeHtml: (value: string) => string) {
  return `
    <div class="toolbar compact">
      <button id="load-file-assoc-backups">刷新备份</button>
      <button id="open-file-assoc-backup-dir">打开备份目录</button>
    </div>
    <div class="runtime-list">
      ${state.backups
        .map((backup) => `<article class="runtime"><div><strong>${escapeHtml(backup.createdAt)}</strong><span>${backup.changeCount} 项</span></div><small>${escapeHtml(backup.targetAppName)} · ${escapeHtml(backup.extensions.join(", "))}</small><small>${escapeHtml(backup.backupPath)}</small><button data-file-assoc-rollback="${escapeHtml(backup.backupId)}" ${backup.rollbackAvailable ? "" : "disabled"}>生成确认并回滚</button></article>`)
        .join("") || `<div class="empty">暂无文件关联备份。</div>`}
    </div>
  `;
}

function renderSafety() {
  return `
    <div class="safety-copy">
      <p>扫描只读取扩展名、ProgID、打开命令和目标程序是否存在，不修改注册表。</p>
      <p>自动执行只写当前用户级 HKCU\\Software\\Classes 下的扩展名和 DevEnvManager 专属 ProgID，不写 HKLM，不删除系统 ProgID。</p>
      <p>Windows 现代默认应用由 UserChoice 保护。应用可以读取并展示它，但不会直接写 UserChoice 后宣称成功；这类项目会引导到 Windows 默认应用设置。</p>
      <p>每次执行前必须写入 JSON 备份，备份失败会拒绝执行。回滚会恢复可恢复的当前用户级关联；UserChoice 项仍需要在系统设置中确认。</p>
      <p>exe、msi、reg、bat、cmd、ps1、vbs、scr 属于高风险类型，默认只读，不能批量静默修改。</p>
    </div>
  `;
}

function filteredRecords(state: FileAssociationUiState) {
  if (!state.report) return [];
  const keyword = state.filter.keyword.trim().toLowerCase();
  return state.report.records.filter((record) => {
    if (state.filter.risk && record.risk !== state.filter.risk) return false;
    if (state.filter.category && record.category !== state.filter.category) return false;
    if (state.filter.onlyMissingApp && record.risk !== "missingApp") return false;
    if (!keyword) return true;
    return [record.extension, record.category, record.description, record.currentAppName || "", record.currentProgId || "", record.currentCommand || ""]
      .join(" ")
      .toLowerCase()
      .includes(keyword);
  });
}

function tabName(tab: string) {
  return (
    {
      overview: "总览",
      types: "文件类型",
      apps: "按应用设置",
      backups: "备份与回滚",
      safety: "安全说明",
    } as Record<string, string>
  )[tab];
}

import { getActiveLocale, t } from "../core/i18n";

export type FeatureGuideId =
  | "dashboard"
  | "runtimes"
  | "environment"
  | "projects"
  | "ports"
  | "fileAssociations"
  | "cleanup"
  | "toolchains"
  | "profiles"
  | "reports"
  | "settings";

type LocalizedText = {
  en: string;
  zh: string;
};

type Guide = {
  title: LocalizedText;
  risk: "info" | "low" | "medium" | "high" | "critical";
  does: LocalizedText[];
  notDo: LocalizedText[];
  how: LocalizedText;
  changes: LocalizedText;
  noChanges: LocalizedText;
  admin: LocalizedText;
  backup: LocalizedText;
  recovery: LocalizedText;
  useWhen: LocalizedText;
  avoidWhen: LocalizedText;
};

const guides: Record<FeatureGuideId, Guide> = {
  dashboard: guide(
    "Dashboard guide",
    "仪表盘使用指南",
    "info",
    ["Summarizes root, runtime, PATH, PowerShell, update, and shortcut status.", "汇总根目录、运行时、PATH、PowerShell、更新和快捷入口状态。"],
    ["Does not modify files, services, environment variables, or ports.", "不会修改文件、服务、环境变量或端口。"],
    ["Loads independent safe summaries; a failed source only affects its own card.", "独立加载安全摘要，单个数据源失败只影响自己的卡片。"],
    ["No system state is changed.", "不会改变系统状态。"],
    ["It does not run full port scans during default load.", "默认加载不会执行完整端口扫描。"],
    ["Not required.", "不需要。"],
    ["No backup required for read-only display.", "只读展示不需要备份。"],
    ["Retry the failed card or open the related page.", "重试失败卡片或进入对应页面。"],
    ["Use it for a quick environment health overview.", "适合快速查看环境健康状态。"],
    ["Do not treat it as proof that every subsystem has been scanned.", "不要把它当作所有子系统都已完整扫描的证明。"],
  ),
  runtimes: guide(
    "Runtimes guide",
    "运行时使用指南",
    "high",
    ["Discovers and manages JDK, Python, Node, Go, Maven, and Gradle.", "发现并管理 JDK、Python、Node、Go、Maven 和 Gradle。"],
    ["Does not delete external package-manager or IDE-bundled runtimes.", "不会删除外部包管理器或 IDE 内置运行时。"],
    ["Managed installs live under the DevEnv root; switching uses plan and token gates.", "受管安装位于 DevEnv 根目录下，切换走计划和令牌确认。"],
    ["Managed current pointers and user-level environment entries may change.", "可能改变受管 current 指针和用户级环境条目。"],
    ["System-wide runtime installations are not taken over.", "不会接管系统级运行时安装。"],
    ["Usually not required for user-level managed runtimes.", "用户级受管运行时通常不需要。"],
    ["Environment backups are created before risky switches or removals.", "高风险切换或移除前会创建环境备份。"],
    ["Use backups or switch back to the previous managed version.", "可用备份或切回先前受管版本恢复。"],
    ["Use it when versions are unclear or need managed switching.", "适合版本不清晰或需要受管切换时使用。"],
    ["Avoid it when enterprise IT owns the runtime layout.", "企业 IT 统一管理运行时时不适合直接使用。"],
  ),
  environment: guide(
    "Environment guide",
    "环境使用指南",
    "high",
    ["Inspects JAVA_HOME, PATH, backups, and repair plans.", "检查 JAVA_HOME、PATH、备份和修复计划。"],
    ["Does not write system-level environment variables.", "不会写入系统级环境变量。"],
    ["Compares process and user environment, then produces explicit repair plans.", "对比进程环境和用户环境，再生成明确修复计划。"],
    ["User-level JAVA_HOME, PATH, or DevEnv entries may change after confirmation.", "确认后可能改变用户级 JAVA_HOME、PATH 或 DevEnv 条目。"],
    ["Unknown user PATH entries are preserved unless the plan says otherwise.", "未明确列入计划的未知用户 PATH 条目会保留。"],
    ["Not required for user environment writes.", "用户环境写入不需要。"],
    ["Environment backups are stored before writes and restores.", "写入和恢复前会保存环境备份。"],
    ["Restore the latest backup and reopen terminals, IDEs, or services.", "恢复最近备份，并重新打开终端、IDE 或服务。"],
    ["Use it when Java/Python/Node commands disagree with settings.", "适合命令行版本和设置不一致时使用。"],
    ["Avoid it during active builds or service deployments.", "正在构建或部署服务时不适合操作。"],
  ),
  projects: guide(
    "Projects guide",
    "项目使用指南",
    "medium",
    ["Analyzes VS Code, IDEA, Nacos, Maven, Gradle, Java, and port settings.", "分析 VS Code、IDEA、Nacos、Maven、Gradle、Java 和端口设置。"],
    ["Does not rewrite arbitrary project files.", "不会重写任意项目文件。"],
    ["Only allowlisted config files can be previewed and changed.", "只有白名单配置文件可预览和修改。"],
    ["Selected editor configs or project ports may change after confirmation.", "确认后可能改变选中的编辑器配置或项目端口。"],
    ["Source code and dependency files are not edited by default.", "默认不编辑源码和依赖文件。"],
    ["Not required for normal project config writes.", "普通项目配置写入不需要。"],
    ["Target files are backed up before write operations.", "写入前会备份目标文件。"],
    ["Restore project backup files or revert the generated preview.", "恢复项目备份文件或撤销生成的预览。"],
    ["Use it before opening a project with an unknown runtime setup.", "适合打开运行时配置不明的项目前使用。"],
    ["Avoid it for untrusted projects until you inspect paths manually.", "未手工检查路径前不适合处理不可信项目。"],
  ),
  ports: guide(
    "Ports & Services guide",
    "端口与服务使用指南",
    "high",
    ["Scans port owners, local services, identities, confidence, and resolution plans.", "扫描端口占用、本地服务、身份、置信度和解决计划。"],
    ["Does not stop processes without a token-gated plan.", "没有令牌确认计划时不会停止进程。"],
    ["Uses port evidence and service metadata before recommending action.", "先结合端口证据和服务元数据，再给出建议。"],
    ["Selected services or processes may be stopped after confirmation.", "确认后可能停止选中的服务或进程。"],
    ["System-critical processes are blocked from direct stop actions.", "系统关键进程不会提供直接停止入口。"],
    ["May be required by Windows for service control.", "控制服务时可能需要 Windows 权限。"],
    ["Service/process actions rely on receipts and verification rather than file backup.", "服务/进程操作依赖回执和验证，不依赖文件备份。"],
    ["Restart the service or application if the result is wrong.", "结果不正确时重新启动服务或应用。"],
    ["Use it when a development port is occupied or ambiguous.", "适合开发端口被占用或身份不清时使用。"],
    ["Avoid stopping unknown production or enterprise services.", "不适合停止未知生产或企业服务。"],
  ),
  fileAssociations: guide(
    "File Associations guide",
    "文件关联使用指南",
    "high",
    ["Scans extensions, searches app candidates, creates plans, and rolls back backups.", "扫描扩展名、搜索应用候选、创建计划并回滚备份。"],
    ["Does not bypass Windows UserChoice protection.", "不会绕过 Windows UserChoice 保护。"],
    ["Plans decide whether registry write or Windows Settings is appropriate.", "计划会判断适合注册表写入还是打开系统设置。"],
    ["User-level file associations may change after confirmation.", "确认后可能改变用户级文件关联。"],
    ["High-risk extensions default to guidance rather than forced writes.", "高风险扩展名默认提供引导，不强制写入。"],
    ["Normally not required for user-level association changes.", "用户级关联变更通常不需要。"],
    ["Backups are created before supported writes.", "支持写入的操作前会创建备份。"],
    ["Use rollback backup or Windows Default Apps settings.", "使用回滚备份或 Windows 默认应用设置恢复。"],
    ["Use it when common extensions open with the wrong app.", "适合常见扩展名打开方式错误时使用。"],
    ["Avoid it for security-sensitive executable script extensions.", "不适合直接处理安全敏感脚本/可执行扩展名。"],
  ),
  cleanup: guide(
    "Cleanup guide",
    "清理使用指南",
    "critical",
    ["Analyzes storage, cleanup targets, move plans, Junctions, and expansion checks.", "分析空间占用、清理目标、搬家计划、Junction 和扩容检测。"],
    ["Does not delete personal data from scan results by default.", "默认不会删除扫描结果中的个人数据。"],
    ["Read-only analysis comes first; destructive plans are separately gated.", "先做只读分析，破坏性计划单独确认。"],
    ["Selected cache, moved files, Junctions, or expansion plans may affect storage layout.", "选中的缓存、搬家文件、Junction 或扩容计划可能影响存储布局。"],
    ["Protected paths and credential data are excluded.", "受保护路径和凭据数据会被排除。"],
    ["May be required for some filesystem or partition actions.", "部分文件系统或分区动作可能需要。"],
    ["Move and cleanup operations record rollback information when supported.", "搬家和清理操作会在支持时记录回滚信息。"],
    ["Use rollback records and verify original app paths.", "使用回滚记录并验证原应用路径。"],
    ["Use it when disk usage is unclear and you need evidence.", "适合磁盘占用不清、需要证据时使用。"],
    ["Avoid it without a fresh backup for important data.", "重要数据没有新备份时不适合操作。"],
  ),
  toolchains: guide(
    "Toolchains guide",
    "工具链使用指南",
    "high",
    ["Inspects Git, npm, pip, GOPROXY, Maven, Gradle, chsrc, services, and MySQL repair.", "检查 Git、npm、pip、GOPROXY、Maven、Gradle、chsrc、服务和 MySQL 修复。"],
    ["Does not run package-manager changes without confirmation.", "没有确认时不会执行包管理器变更。"],
    ["Combines diagnostics with explicit repair plans for risky actions.", "诊断结果与高风险修复计划分离。"],
    ["Registries, mirrors, services, or MySQL repair targets may change after confirmation.", "确认后可能改变源、镜像、服务或 MySQL 修复目标。"],
    ["Database content is not read for ordinary diagnosis.", "普通诊断不会读取数据库业务内容。"],
    ["May be required for service or database repair.", "服务或数据库修复可能需要。"],
    ["MySQL repair requires backup manifests for critical paths.", "MySQL 关键修复需要备份清单。"],
    ["Restore service config, mirror config, or database backup manifest.", "恢复服务配置、镜像配置或数据库备份清单。"],
    ["Use it when tooling sources or services behave inconsistently.", "适合工具源或服务行为不一致时使用。"],
    ["Avoid it on shared production databases or managed company hosts.", "不适合共享生产数据库或公司托管主机。"],
  ),
  profiles: guide(
    "Profiles guide",
    "配置档案使用指南",
    "high",
    ["Saves, imports, exports, previews, and applies environment profiles.", "保存、导入、导出、预览并应用环境配置档案。"],
    ["Does not silently install or switch missing runtimes.", "不会静默安装或切换缺失运行时。"],
    ["Profile application creates a plan for runtime switches and environment writes.", "应用配置档案会生成运行时切换和环境写入计划。"],
    ["Current runtime pointers and user environment may change after confirmation.", "确认后可能改变当前运行时指针和用户环境。"],
    ["Profiles do not replace source control or project config management.", "配置档案不替代版本控制或项目配置管理。"],
    ["Usually not required.", "通常不需要。"],
    ["Current environment is backed up before profile apply.", "应用配置档案前会备份当前环境。"],
    ["Restore the pre-apply environment backup or reapply another profile.", "恢复应用前备份或重新应用其他配置档案。"],
    ["Use it to switch between known development stacks.", "适合在已知开发栈之间切换。"],
    ["Avoid it when the target profile comes from an untrusted source.", "目标配置档案来源不可信时不适合使用。"],
  ),
  reports: guide(
    "Reports guide",
    "报告使用指南",
    "info",
    ["Runs Doctor diagnostics and exports environment, Python, file association, cleanup, and other reports.", "运行环境医生并导出环境、Python、文件关联、清理等报告。"],
    ["Does not fix issues directly from report export.", "导出报告不会直接修复问题。"],
    ["Collects structured diagnostics and redacts sensitive values.", "收集结构化诊断并脱敏敏感值。"],
    ["Report files may be written when exporting.", "导出时可能写入报告文件。"],
    ["System settings are not changed by report generation.", "生成报告不会改变系统设置。"],
    ["Not required.", "不需要。"],
    ["No backup is required for read-only diagnostics.", "只读诊断不需要备份。"],
    ["Delete exported reports if they are no longer needed.", "不再需要时删除导出的报告。"],
    ["Use it before asking for help or comparing before/after state.", "适合求助或比较修复前后状态时使用。"],
    ["Avoid sharing reports without reviewing redaction first.", "未检查脱敏效果前不适合分享报告。"],
  ),
  settings: guide(
    "Settings guide",
    "设置使用指南",
    "medium",
    ["Manages root directory, auto update, theme, language, safety notice, config directory, and update status.", "管理根目录、自动更新、主题、语言、安全声明、配置目录和更新状态。"],
    ["Does not delete managed runtimes or project data.", "不会删除受管运行时或项目数据。"],
    ["Writes local app settings and uses update manifests for release checks.", "写入本机应用设置，并用更新清单检查发布版本。"],
    ["Root directory, UI preferences, language, or update settings may change.", "可能改变根目录、界面偏好、语言或更新设置。"],
    ["Installed runtime records are preserved by UI reset.", "重置界面不会删除已安装运行时记录。"],
    ["Not required.", "不需要。"],
    ["Root changes keep runtime data in the selected managed root.", "根目录变更会使用选中的受管根目录保存运行时数据。"],
    ["Reopen settings or restore previous root path if needed.", "必要时重新打开设置或恢复原根目录。"],
    ["Use it to configure the app before running repairs.", "适合在执行修复前配置应用。"],
    ["Avoid changing root during active installs or repairs.", "正在安装或修复时不适合切换根目录。"],
  ),
};

export function renderFeatureGuide(id: FeatureGuideId): string {
  const item = guides[id];
  return `<details class="feature-help-card">
    <summary><span>${text(item.title)}</span><span class="risk-chip risk-${item.risk}">${riskSummary(item)}</span></summary>
    <div class="feature-help-card__body">
      ${section("guide.whatDoes", item.does)}
      ${section("guide.whatNot", item.notDo)}
      ${row("guide.how", item.how)}
      ${row("guide.changes", item.changes)}
      ${row("guide.noChanges", item.noChanges)}
      ${row("guide.admin", item.admin)}
      ${row("guide.backup", item.backup)}
      ${row("guide.recovery", item.recovery)}
      ${row("guide.useWhen", item.useWhen)}
      ${row("guide.avoidWhen", item.avoidWhen)}
    </div>
  </details>`;
}

export function renderRiskLevelGuide(): string {
  return `<details class="feature-help-card">
    <summary><span>${t("guide.riskLevels")}</span><span class="risk-chip risk-info">Info</span></summary>
    <div class="feature-help-card__body">
      <ul>
        <li>${t("guide.riskInfo")}</li>
        <li>${t("guide.riskLow")}</li>
        <li>${t("guide.riskMedium")}</li>
        <li>${t("guide.riskHigh")}</li>
        <li>${t("guide.riskCritical")}</li>
      </ul>
    </div>
  </details>`;
}

function guide(
  titleEn: string,
  titleZh: string,
  risk: Guide["risk"],
  does: [string, string],
  notDo: [string, string],
  how: [string, string],
  changes: [string, string],
  noChanges: [string, string],
  admin: [string, string],
  backup: [string, string],
  recovery: [string, string],
  useWhen: [string, string],
  avoidWhen: [string, string],
): Guide {
  return {
    title: localized(titleEn, titleZh),
    risk,
    does: [localized(does[0], does[1])],
    notDo: [localized(notDo[0], notDo[1])],
    how: localized(how[0], how[1]),
    changes: localized(changes[0], changes[1]),
    noChanges: localized(noChanges[0], noChanges[1]),
    admin: localized(admin[0], admin[1]),
    backup: localized(backup[0], backup[1]),
    recovery: localized(recovery[0], recovery[1]),
    useWhen: localized(useWhen[0], useWhen[1]),
    avoidWhen: localized(avoidWhen[0], avoidWhen[1]),
  };
}

function localized(en: string, zh: string): LocalizedText {
  return { en, zh };
}

function text(value: LocalizedText): string {
  return escapeHtml(getActiveLocale() === "zh-CN" ? value.zh : value.en);
}

function riskSummary(item: Guide): string {
  const zh = getActiveLocale() === "zh-CN";
  const labels: Record<Guide["risk"], string> = zh
    ? {
        info: "信息风险 / 只读 / 无需备份 / 无需管理员 / 删除导出文件即可恢复",
        low: "低风险 / 单步确认 / 通常无需备份 / 无需管理员 / 可回退设置",
        medium: "中风险 / 明确确认 / 建议备份 / 通常无需管理员 / 按回执恢复",
        high: "高风险 / Token 确认 / 需要备份 / 可能需要管理员 / 用备份或反向操作恢复",
        critical: "关键风险 / 多重确认 / 必须备份 / 可能需要管理员 / 需按恢复计划处理",
      }
    : {
        info: "Info risk / read-only / no backup / no admin / delete exports to recover",
        low: "Low risk / single confirmation / usually no backup / no admin / reversible settings",
        medium: "Medium risk / explicit confirmation / backup recommended / usually no admin / receipt-based recovery",
        high: "High risk / token confirmation / backup required / admin may be needed / restore backup or reverse action",
        critical: "Critical risk / multi-step confirmation / backup required / admin may be needed / recovery plan required",
      };
  return escapeHtml(labels[item.risk]);
}

function section(titleKey: Parameters<typeof t>[0], items: LocalizedText[]): string {
  return `<strong>${t(titleKey)}</strong><ul>${items.map((item) => `<li>${text(item)}</li>`).join("")}</ul>`;
}

function row(titleKey: Parameters<typeof t>[0], item: LocalizedText): string {
  return `<strong>${t(titleKey)}</strong><p>${text(item)}</p>`;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] || char);
}

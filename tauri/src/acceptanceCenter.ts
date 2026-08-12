import { invoke } from "./api/tauri";
import type {
  FeatureAcceptanceCase,
  FeatureAcceptanceResult,
  FeatureAcceptanceSuite,
} from "./types";

let cases: FeatureAcceptanceCase[] = [];
let currentSuite: FeatureAcceptanceSuite | null = null;

export function mountFeatureAcceptanceCenter(root: Document) {
  const host = root.querySelector<HTMLElement>("#view-toolbox");
  if (!host || root.querySelector("#feature-acceptance-center")) return;

  const section = document.createElement("section");
  section.id = "feature-acceptance-center";
  section.className = "panel acceptance-center";
  section.dataset.testid = "feature-acceptance-center";
  section.innerHTML = `
    <div class="panel-head acceptance-head">
      <div class="panel-title">
        <div>
          <h2>功能验收中心</h2>
          <p class="small-note">只运行只读、静态或安全探测；危险操作保留为人工项，不会自动修改系统。</p>
        </div>
      </div>
      <div class="toolbar compact">
        <select id="feature-acceptance-page" data-testid="feature-acceptance-page" aria-label="验收页面筛选">
          <option value="all">全部页面</option>
        </select>
        <button id="refresh-feature-acceptance" type="button" data-testid="refresh-feature-acceptance">刷新清单</button>
        <button id="run-feature-acceptance" class="primary" type="button" data-testid="run-feature-acceptance">运行安全验收</button>
      </div>
    </div>
    <div id="feature-acceptance-summary" class="acceptance-summary" data-testid="feature-acceptance-summary">
      <div><span>用例</span><strong>--</strong></div>
      <div><span>通过</span><strong>--</strong></div>
      <div><span>失败</span><strong>--</strong></div>
      <div><span>人工</span><strong>--</strong></div>
    </div>
    <div class="toolbar compact acceptance-export-actions">
      <button id="export-feature-acceptance-markdown" type="button" data-testid="export-feature-acceptance-markdown" disabled>导出 Markdown</button>
      <button id="export-feature-acceptance-json" type="button" data-testid="export-feature-acceptance-json" disabled>导出 JSON</button>
    </div>
    <div id="feature-acceptance-status" class="operation-result hidden" data-testid="feature-acceptance-status" aria-live="polite"></div>
    <div id="feature-acceptance-results" class="acceptance-results" data-testid="feature-acceptance-results">
      <div class="empty">加载清单后可运行安全验收。</div>
    </div>
  `;
  host.append(section);

  root.querySelector("#refresh-feature-acceptance")?.addEventListener("click", () => void loadCases(root));
  root.querySelector("#run-feature-acceptance")?.addEventListener("click", () => void runSuite(root));
  root.querySelector("#export-feature-acceptance-markdown")?.addEventListener("click", () => void exportReport(root, "markdown"));
  root.querySelector("#export-feature-acceptance-json")?.addEventListener("click", () => void exportReport(root, "json"));
  void loadCases(root);
}

async function loadCases(root: Document) {
  setBusy(root, true);
  setStatus(root, "正在读取内置功能清单…");
  try {
    cases = await invoke<FeatureAcceptanceCase[]>("list_feature_acceptance_cases");
    renderPageOptions(root);
    renderCaseInventory(root);
    setStatus(root, `已加载 ${cases.length} 个验收用例。`);
  } catch (error) {
    setStatus(root, readableError(error), true);
  } finally {
    setBusy(root, false);
  }
}

async function runSuite(root: Document) {
  setBusy(root, true);
  setStatus(root, "正在运行安全验收；不会执行清理、结束进程或修改环境…");
  try {
    if (!cases.length) cases = await invoke<FeatureAcceptanceCase[]>("list_feature_acceptance_cases");
    const page = root.querySelector<HTMLSelectElement>("#feature-acceptance-page")?.value || "all";
    const backendSuite = await invoke<FeatureAcceptanceSuite>("run_feature_acceptance_suite", {
      page: page === "all" ? null : page,
    });
    currentSuite = applyFrontendChecks(root, backendSuite);
    renderSuite(root, currentSuite);
    setStatus(
      root,
      currentSuite.failed
        ? `验收完成：${currentSuite.failed} 项失败，请查看下方持久结果。`
        : `验收完成：${currentSuite.passed} 项通过，${currentSuite.manual} 项保留人工确认。`,
      currentSuite.failed > 0,
    );
    setExportEnabled(root, true);
  } catch (error) {
    setStatus(root, readableError(error), true);
  } finally {
    setBusy(root, false);
  }
}

async function exportReport(root: Document, format: "markdown" | "json") {
  if (!currentSuite) {
    setStatus(root, "请先运行一次安全验收，再导出报告。", true);
    return;
  }
  setBusy(root, true);
  setStatus(root, `正在导出 ${format === "json" ? "JSON" : "Markdown"} 报告…`);
  try {
    const path = await invoke<string>("export_feature_acceptance_report", {
      format,
      suite: currentSuite,
    });
    setStatus(root, `验收报告已导出：${path}`);
  } catch (error) {
    setStatus(root, readableError(error), true);
  } finally {
    setBusy(root, false);
  }
}

function applyFrontendChecks(root: Document, suite: FeatureAcceptanceSuite): FeatureAcceptanceSuite {
  const caseById = new Map(cases.map((item) => [item.caseId, item]));
  const results = suite.results.map((result) => {
    const acceptanceCase = caseById.get(result.caseId);
    if (!acceptanceCase) {
      return failResult(result, "前端未找到对应的功能清单用例。", false);
    }
    const missing = acceptanceCase.selectors.filter((selector) => !root.querySelector(selector));
    if (missing.length) {
      return failResult(result, `缺少前端入口或结果区：${missing.join("、")}`, false);
    }
    return { ...result, resultPanelFound: true };
  });
  return summarize({ ...suite, results });
}

function failResult(result: FeatureAcceptanceResult, reason: string, resultPanelFound: boolean) {
  return {
    ...result,
    status: "failed",
    reason: result.reason ? `${result.reason}；${reason}` : reason,
    resultPanelFound,
  };
}

function summarize(suite: FeatureAcceptanceSuite): FeatureAcceptanceSuite {
  return {
    ...suite,
    total: suite.results.length,
    passed: suite.results.filter((item) => item.status === "passed").length,
    failed: suite.results.filter((item) => item.status === "failed").length,
    skipped: suite.results.filter((item) => item.status === "skipped").length,
    manual: suite.results.filter((item) => item.status === "manual").length,
  };
}

function renderPageOptions(root: Document) {
  const select = root.querySelector<HTMLSelectElement>("#feature-acceptance-page");
  if (!select) return;
  const selected = select.value;
  const pages = new Map(cases.map((item) => [item.page, item.pageName]));
  select.innerHTML = `<option value="all">全部页面</option>${Array.from(pages)
    .map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`)
    .join("")}`;
  if (Array.from(pages.keys()).includes(selected)) select.value = selected;
}

function renderCaseInventory(root: Document) {
  const results = root.querySelector<HTMLElement>("#feature-acceptance-results");
  if (!results) return;
  results.innerHTML = `
    <div class="acceptance-inventory">
      ${cases.map((item) => `
        <div class="acceptance-case">
          <span class="acceptance-priority">${escapeHtml(item.priority)}</span>
          <strong>${escapeHtml(item.featureName)}</strong>
          <small>${escapeHtml(item.pageName)} · ${escapeHtml(modeLabel(item.mode))}</small>
        </div>
      `).join("")}
    </div>
  `;
  renderSummary(root, cases.length, 0, 0, cases.filter((item) => item.manualOnlyReason).length);
}

function renderSuite(root: Document, suite: FeatureAcceptanceSuite) {
  renderSummary(root, suite.total, suite.passed, suite.failed, suite.manual);
  const results = root.querySelector<HTMLElement>("#feature-acceptance-results");
  if (!results) return;
  results.innerHTML = `
    <div class="table-wrap">
      <table class="acceptance-table">
        <thead><tr><th>优先级</th><th>页面 / 功能</th><th>状态</th><th>结果</th><th>耗时</th></tr></thead>
        <tbody>
          ${suite.results.map((item) => {
            const feature = cases.find((candidate) => candidate.caseId === item.caseId);
            return `<tr data-testid="feature-acceptance-result-row" data-status="${escapeHtml(item.status)}">
              <td>${escapeHtml(item.priority)}</td>
              <td><strong>${escapeHtml(feature?.featureName || item.featureId)}</strong><small>${escapeHtml(feature?.pageName || item.page)}</small></td>
              <td><span class="acceptance-status ${escapeHtml(item.status)}">${escapeHtml(statusLabel(item.status))}</span></td>
              <td>${escapeHtml(item.reason)}</td>
              <td>${item.durationMs} ms</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderSummary(root: Document, total: number, passed: number, failed: number, manual: number) {
  const summary = root.querySelector<HTMLElement>("#feature-acceptance-summary");
  if (!summary) return;
  const values = [total, passed, failed, manual];
  summary.querySelectorAll("strong").forEach((element, index) => {
    element.textContent = String(values[index] ?? 0);
  });
}

function setStatus(root: Document, message: string, error = false) {
  const status = root.querySelector<HTMLElement>("#feature-acceptance-status");
  if (!status) return;
  status.classList.remove("hidden", "error");
  if (error) status.classList.add("error");
  status.textContent = message;
}

function setBusy(root: Document, busy: boolean) {
  root.querySelectorAll<HTMLButtonElement>("#feature-acceptance-center button").forEach((button) => {
    button.disabled = busy || (button.id.startsWith("export-feature") && !currentSuite);
  });
}

function setExportEnabled(root: Document, enabled: boolean) {
  root.querySelectorAll<HTMLButtonElement>("#feature-acceptance-center button[id^='export-feature']")
    .forEach((button) => { button.disabled = !enabled; });
}

function statusLabel(status: string) {
  return ({ passed: "通过", failed: "失败", skipped: "跳过", manual: "人工" } as Record<string, string>)[status] || status;
}

function modeLabel(mode: string) {
  return ({ readOnly: "只读", static: "静态", dryRun: "预演", manual: "人工" } as Record<string, string>)[mode] || mode;
}

function readableError(error: unknown) {
  return error instanceof Error ? error.message : String(error || "未知错误");
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] || character);
}

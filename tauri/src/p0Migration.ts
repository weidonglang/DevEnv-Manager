export function enhancePortPanel(root: Document, fileIcon: string) {
  const head = root.querySelector<HTMLElement>("#view-ports .panel-head");
  if (head && !root.querySelector("#export-port-report-markdown")) {
    const actions = document.createElement("div");
    actions.className = "toolbar compact";
    actions.append(
      migrationButton("export-port-report-markdown", "导出报告", fileIcon),
      migrationButton("export-port-report-json", "导出 JSON", fileIcon),
    );
    const scan = head.querySelector("#scan-ports");
    if (scan) actions.append(scan);
    head.append(actions);
  }
  const workbench = root.querySelector<HTMLElement>("#view-ports .port-workbench");
  if (workbench && !root.querySelector("#port-operation-result")) {
    const result = document.createElement("div");
    result.id = "port-operation-result";
    result.className = "operation-result hidden";
    result.dataset.testid = "port-operation-result";
    result.setAttribute("aria-live", "polite");
    workbench.insertAdjacentElement("afterend", result);
  }
}

export function enhanceRuntimePanel(root: Document, fileIcon: string, restoreIcon: string) {
  const strongResult = root.querySelector<HTMLElement>("#runtime-strong-result");
  if (!strongResult || root.querySelector("#runtime-migration-tools")) return;

  const tools = document.createElement("section");
  tools.id = "runtime-migration-tools";
  tools.className = "runtime-migration-tools";
  tools.innerHTML = `
    <div class="panel-head compact-title">
      <div class="panel-title"><strong>验证报告与切换恢复</strong></div>
      <div class="toolbar compact">
        ${migrationButtonHtml("export-runtime-report-markdown", "导出报告", fileIcon)}
        ${migrationButtonHtml("export-runtime-report-json", "导出 JSON", fileIcon)}
        ${migrationButtonHtml("load-runtime-switch-backups", "刷新恢复点", restoreIcon)}
      </div>
    </div>
    <div id="runtime-migration-result" class="operation-result hidden" data-testid="runtime-operation-result" aria-live="polite"></div>
    <div id="runtime-switch-backups" class="runtime-list"><div class="empty">切换受管运行时后会在这里显示可验证恢复点。</div></div>
  `;
  strongResult.insertAdjacentElement("afterend", tools);
}

export function enhanceBuildToolVersionSelectors(root: Document) {
  const maven = root.querySelector<HTMLButtonElement>("#install-maven");
  const gradle = root.querySelector<HTMLButtonElement>("#install-gradle");
  if (maven && !root.querySelector("#maven-version")) {
    maven.insertAdjacentElement(
      "beforebegin",
      versionSelect("maven-version", ["latest", "3.9.16", "3.9.15", "3.9.14", "3.9.12", "3.9.11"]),
    );
    maven.querySelector("span")!.textContent = "安装 Maven";
  }
  if (gradle && !root.querySelector("#gradle-version")) {
    gradle.insertAdjacentElement(
      "beforebegin",
      versionSelect("gradle-version", ["latest", "9.6.1", "9.5.0", "9.4.0", "8.14.3"]),
    );
    gradle.querySelector("span")!.textContent = "安装 Gradle";
  }
}

export function setMigrationResult(selector: string, message: string, error = false) {
  const element = document.querySelector<HTMLElement>(selector);
  if (!element) return;
  element.classList.remove("hidden", "error");
  if (error) element.classList.add("error");
  element.textContent = message;
}

function migrationButton(id: string, label: string, icon: string) {
  const template = document.createElement("template");
  template.innerHTML = migrationButtonHtml(id, label, icon).trim();
  return template.content.firstElementChild as HTMLButtonElement;
}

function migrationButtonHtml(id: string, label: string, icon: string) {
  return `<button id="${id}" type="button">${icon}<span>${label}</span></button>`;
}

function versionSelect(id: string, versions: string[]) {
  const select = document.createElement("select");
  select.id = id;
  select.dataset.testid = `runtime-${id}`;
  for (const version of versions) {
    const option = document.createElement("option");
    option.value = version;
    option.textContent = version === "latest" ? "最新版" : version;
    select.append(option);
  }
  return select;
}

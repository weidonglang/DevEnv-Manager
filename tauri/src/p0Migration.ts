import type { RuntimeInfo } from "./types";

export function installLegacySafetyCopyAdapter(root: Document) {
  const replaceText = (text: Text) => {
    const value = text.textContent || "";
    if (!/confirmation token|\btoken\b/i.test(value)) return;
    text.textContent = value
      .replace(/confirmation token/gi, "计划校验")
      .replace(/\btoken\b/gi, "计划校验");
  };
  const replaceLegacyCopy = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      replaceText(node as Text);
      return;
    }
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    let current = walker.nextNode();
    while (current) {
      replaceText(current as Text);
      current = walker.nextNode();
    }
  };
  replaceLegacyCopy(root.body);
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach(replaceLegacyCopy);
    }
  }).observe(root.body, { childList: true, subtree: true });
}

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

export function renderGroupedRuntimeDiscovery(
  root: Document,
  runtimes: RuntimeInfo[],
  renderRuntime: (runtime: RuntimeInfo) => string,
) {
  const container = root.querySelector<HTMLElement>("#runtime-list");
  if (!container) return;
  const groups = [
    { id: "java", label: "Java / JDK", kinds: ["java", "jdk"] },
    { id: "python", label: "Python", kinds: ["python", "pip"] },
    { id: "node", label: "Node.js", kinds: ["node", "npm", "npx", "pnpm", "yarn"] },
    { id: "go", label: "Go", kinds: ["go"] },
    { id: "maven", label: "Maven", kinds: ["maven"] },
    { id: "gradle", label: "Gradle", kinds: ["gradle"] },
    { id: "rust", label: "Rust / Cargo / rustup", kinds: ["rust", "cargo", "rustup"] },
    { id: "dotnet", label: ".NET SDK", kinds: [".net", "dotnet"] },
  ];
  const assigned = new Set<RuntimeInfo>();
  const sections = groups.map((group) => {
    const items = runtimes.filter((runtime) => {
      const kind = runtime.kind.toLowerCase();
      const matches = group.kinds.some((candidate) => kind.includes(candidate));
      if (matches) assigned.add(runtime);
      return matches;
    });
    return runtimeDiscoveryGroup(group.id, group.label, items, renderRuntime);
  });
  const other = runtimes.filter((runtime) => !assigned.has(runtime));
  if (other.length) sections.push(runtimeDiscoveryGroup("other", "其他工具", other, renderRuntime));
  container.innerHTML = runtimes.length
    ? `<div id="runtime-discovery-groups" class="runtime-discovery-groups">${sections.join("")}</div>`
    : `<div class="empty">还没有发现开发工具</div>`;
}

function runtimeDiscoveryGroup(
  id: string,
  label: string,
  items: RuntimeInfo[],
  renderRuntime: (runtime: RuntimeInfo) => string,
) {
  const managed = items.filter((runtime) => runtime.source.toLowerCase().includes("devenv"));
  const external = items.filter((runtime) => !runtime.source.toLowerCase().includes("devenv"));
  return `
    <section class="runtime-discovery-group" data-runtime-group="${id}">
      <div class="runtime-discovery-heading">
        <h3>${label}</h3>
        <span>${items.length ? `${items.length} 个发现` : "未发现"}</span>
      </div>
      <div class="runtime-source-groups">
        <div>
          <h4>受管版本</h4>
          ${managed.length ? managed.map(renderRuntime).join("") : `<div class="empty compact-empty">未发现受管版本</div>`}
        </div>
        <div>
          <h4>外部发现版本</h4>
          ${external.length ? external.map(renderRuntime).join("") : `<div class="empty compact-empty">未发现外部版本</div>`}
        </div>
      </div>
    </section>
  `;
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

export function enhanceToolchainPanel(root: Document) {
  const firstPanel = root.querySelector<HTMLElement>("#view-toolchains > .panel");
  if (!firstPanel || root.querySelector("#toolchain-operation-result")) return;
  const result = document.createElement("div");
  result.id = "toolchain-operation-result";
  result.className = "operation-result hidden";
  result.dataset.testid = "toolchain-operation-result";
  result.setAttribute("aria-live", "polite");
  firstPanel.insertAdjacentElement("afterend", result);
}

export function enhanceSettingsControls(root: Document, folderIcon: string) {
  const rootInput = root.querySelector<HTMLInputElement>("#root-dir");
  if (rootInput && !root.querySelector("#pick-root-dir")) {
    const picker = migrationButton("pick-root-dir", "选择文件夹", folderIcon);
    picker.dataset.pickDirectory = "root-dir";
    rootInput.insertAdjacentElement("afterend", picker);
  }
  const detail = root.querySelector<HTMLElement>("#root-detail");
  if (detail && !root.querySelector("#root-operation-result")) {
    const result = document.createElement("div");
    result.id = "root-operation-result";
    result.className = "operation-result hidden";
    result.dataset.testid = "root-operation-result";
    result.setAttribute("aria-live", "polite");
    detail.insertAdjacentElement("afterend", result);
  }
}

export function enhanceDurableOperationPanels(root: Document) {
  const panels = [
    ["doctor-operation-result", "#doctor-score"],
    ["environment-operation-result", "#env-reliability-result"],
    ["maintenance-operation-result", ".maintenance-hero"],
    ["toolbox-operation-result", "#view-toolbox > .grid.two"],
    ["settings-operation-result", "#update-result"],
  ] as const;
  for (const [id, anchorSelector] of panels) {
    if (root.querySelector(`#${id}`)) continue;
    const anchor = root.querySelector<HTMLElement>(anchorSelector);
    if (!anchor) continue;
    const result = document.createElement("div");
    result.id = id;
    result.className = "operation-result hidden";
    result.dataset.testid = id;
    result.setAttribute("aria-live", "polite");
    anchor.insertAdjacentElement("afterend", result);
  }
}

export function enforcePickerBackedPathInputs(root: Document) {
  root.querySelectorAll<HTMLButtonElement>("button[data-pick-directory]").forEach((button) => {
    const target = button.dataset.pickDirectory;
    if (!target) return;
    const input = root.querySelector<HTMLInputElement>(`#${target}`);
    if (!input) return;
    input.readOnly = true;
    input.dataset.pickerBacked = "true";
    input.title = "请使用旁边的选择按钮";
  });
  const profilePath = root.querySelector<HTMLInputElement>("#profile-file-path");
  if (profilePath && root.querySelector("#pick-profile-file")) {
    profilePath.readOnly = true;
    profilePath.dataset.pickerBacked = "true";
    profilePath.title = "请使用旁边的选择文件按钮";
  }
}

export function enhancePlatformPanel(root: Document) {
  const firstPanel = root.querySelector<HTMLElement>("#view-platforms > .panel");
  if (!firstPanel || root.querySelector("#platform-operation-result")) return;
  const result = document.createElement("div");
  result.id = "platform-operation-result";
  result.className = "operation-result hidden";
  result.dataset.testid = "platform-operation-result";
  result.setAttribute("aria-live", "polite");
  firstPanel.insertAdjacentElement("afterend", result);

  const rustPanel = root.querySelector<HTMLElement>("#rust-platform")?.closest<HTMLElement>(".platform-section");
  if (rustPanel && !root.querySelector("#rust-provider-controls")) {
    root.querySelector("#rust-stable")?.remove();
    root.querySelector("#rust-update")?.remove();
    const controls = document.createElement("div");
    controls.id = "rust-provider-controls";
    controls.className = "provider-controls";
    controls.dataset.testid = "rust-provider-controls";
    controls.innerHTML = `
      <label for="rust-toolchain-channel">rustup 工具链</label>
      <select id="rust-toolchain-channel" data-testid="rust-toolchain-channel">
        <option value="stable">stable</option>
        <option value="beta">beta</option>
        <option value="nightly">nightly</option>
      </select>
      <button id="rust-install-toolchain" data-testid="rust-install-toolchain">安装</button>
      <button id="rust-set-default-toolchain" data-testid="rust-set-default-toolchain">设为默认</button>
      <button id="rust-update-toolchain" data-testid="rust-update-toolchain">更新所选</button>
      <button id="rust-uninstall-toolchain" data-testid="rust-uninstall-toolchain">卸载所选</button>`;
    root.querySelector("#rust-platform")?.insertAdjacentElement("afterend", controls);
  }

  const dotnetPanel = root.querySelector<HTMLElement>("#dotnet-platform")?.closest<HTMLElement>(".platform-section");
  if (dotnetPanel && !root.querySelector("#dotnet-provider-controls")) {
    const controls = document.createElement("div");
    controls.id = "dotnet-provider-controls";
    controls.className = "provider-controls";
    controls.dataset.testid = "dotnet-provider-controls";
    controls.innerHTML = `
      <label for="dotnet-sdk-major">WinGet SDK</label>
      <select id="dotnet-sdk-major" data-testid="dotnet-sdk-major">
        <option value="8">.NET SDK 8</option>
        <option value="9">.NET SDK 9</option>
        <option value="10" selected>.NET SDK 10</option>
      </select>
      <button id="dotnet-install-sdk" data-testid="dotnet-install-sdk">安装</button>
      <button id="dotnet-update-sdk" data-testid="dotnet-update-sdk">更新</button>
      <button id="dotnet-uninstall-sdk" data-testid="dotnet-uninstall-sdk">卸载</button>`;
    root.querySelector("#dotnet-platform")?.insertAdjacentElement("afterend", controls);
  }
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

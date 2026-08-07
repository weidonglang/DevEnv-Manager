import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const tauriDirectory = resolve(scriptDirectory, "..");
const repositoryDirectory = resolve(tauriDirectory, "..");
const artifactDirectory = join(repositoryDirectory, "artifacts", "visual-acceptance");
const screenshotDirectory = join(artifactDirectory, "screenshots");
const baselinePath = join(repositoryDirectory, "acceptance", "visual-baseline.v1.9.1.json");
const updateBaseline = process.argv.includes("--update-baseline");
const maximumHashDistance = 120;

const allCases = [
  visualCase("cleanup-light-wide-en", "cleanup", "light", "en-US", "default", 1366, 768, 1),
  visualCase("cleanup-dark-wide-zh", "cleanup", "dark", "zh-CN", "default", 1366, 768, 1),
  visualCase("cleanup-hc-wide-zh", "cleanup", "high-contrast", "zh-CN", "default", 1366, 768, 1),
  visualCase("cleanup-hc-compact-zh", "cleanup", "high-contrast", "zh-CN", "default", 980, 640, 1),
  visualCase("cleanup-dark-125-en", "cleanup", "dark", "en-US", "planned", 1093, 640, 1.25),
  visualCase("cleanup-dark-folder-en", "cleanup", "dark", "en-US", "archive-folder", 1366, 768, 1),
  visualCase("cleanup-hc-plan-en", "cleanup", "high-contrast", "en-US", "planned", 1366, 768, 1),
  visualCase("cleanup-light-result-en", "cleanup", "light", "en-US", "result", 1366, 768, 1),
  visualCase("cleanup-hc-advanced-zh", "cleanup", "high-contrast", "zh-CN", "advanced", 1180, 760, 1.25),
  visualCase("ports-light-wide-en", "ports", "light", "en-US", "default", 1366, 768, 1),
  visualCase("ports-dark-wide-zh", "ports", "dark", "zh-CN", "default", 1366, 768, 1),
  visualCase("ports-hc-wide-en", "ports", "high-contrast", "en-US", "default", 1366, 768, 1),
  visualCase("ports-hc-compact-zh", "ports", "high-contrast", "zh-CN", "default", 980, 640, 1.25),
  visualCase("runtimes-dark-wide-en", "runtimes", "dark", "en-US", "default", 1366, 768, 1),
  visualCase("runtimes-hc-compact-zh", "runtimes", "high-contrast", "zh-CN", "default", 980, 640, 1.5),
  visualCase("associations-dark-wide-en", "fileAssociations", "dark", "en-US", "default", 1366, 768, 1),
  visualCase("associations-hc-compact-zh", "fileAssociations", "high-contrast", "zh-CN", "default", 980, 640, 1.25),
  visualCase("toolchains-hc-wide-en", "toolchains", "high-contrast", "en-US", "default", 1366, 768, 1),
  visualCase("toolchains-dark-compact-zh", "toolchains", "dark", "zh-CN", "default", 980, 640, 1.25),
  visualCase("dashboard-dark-wide-en", "dashboard", "dark", "en-US", "default", 1600, 900, 1),
  visualCase("dashboard-hc-compact-zh", "dashboard", "high-contrast", "zh-CN", "default", 980, 640, 1.5),
  visualCase("dashboard-system-large-en", "dashboard", "system", "en-US", "default", 1920, 1080, 1),
  visualCase("environment-dark-wide-en", "environment", "dark", "en-US", "default", 1366, 768, 1),
  visualCase("environment-hc-compact-zh", "environment", "high-contrast", "zh-CN", "default", 980, 640, 1.5),
  visualCase("projects-dark-wide-en", "projects", "dark", "en-US", "default", 1366, 768, 1),
  visualCase("projects-hc-standard-zh", "projects", "high-contrast", "zh-CN", "default", 1180, 760, 1.25),
  visualCase("profiles-dark-standard-en", "profiles", "dark", "en-US", "default", 1180, 760, 1),
  visualCase("profiles-hc-compact-zh", "profiles", "high-contrast", "zh-CN", "default", 980, 640, 1.25),
  visualCase("settings-dark-wide-en", "settings", "dark", "en-US", "default", 1366, 768, 1),
  visualCase("settings-hc-compact-zh", "settings", "high-contrast", "zh-CN", "default", 980, 640, 1.5),
  visualCase("settings-system-large-en", "settings", "system", "en-US", "default", 1920, 1080, 1),
  visualCase("onboarding-light-wide-en", "dashboard", "light", "en-US", "onboarding", 1366, 768, 1),
  visualCase("onboarding-dark-wide-zh", "dashboard", "dark", "zh-CN", "onboarding", 1366, 768, 1),
  visualCase("onboarding-hc-compact-zh", "dashboard", "high-contrast", "zh-CN", "onboarding", 980, 640, 1.25),
];
const requestedCase = process.argv.find((argument) => argument.startsWith("--case="))?.slice("--case=".length);
const cases = requestedCase ? allCases.filter((testCase) => testCase.id === requestedCase) : allCases;
if (!cases.length) throw new Error(`Unknown visual acceptance case: ${requestedCase}`);

let viteProcess;
let edgeProcess;
let client;
let edgeProfile;
const serverLog = [];
const edgeLog = [];

async function main() {
  try {
    await mkdir(screenshotDirectory, { recursive: true });
    const vitePort = await availablePort();
    viteProcess = startVite(vitePort);
    await waitForHttp(`http://127.0.0.1:${vitePort}/acceptance.html`, viteProcess, serverLog);

    const edgePort = await availablePort();
    edgeProfile = await mkdtemp(join(tmpdir(), "devenv-visual-edge-"));
    edgeProcess = startEdge(edgePort, edgeProfile);
    const pageTarget = await waitForEdgePage(edgePort, edgeProcess);
    client = await CdpClient.connect(pageTarget.webSocketDebuggerUrl);
    await client.send("Runtime.enable");
    await client.send("Page.enable");

    const results = [];
    for (const testCase of cases) {
      const result = await runCase(client, vitePort, testCase);
      results.push(result);
      printCaseResult(result);
    }

    if (updateBaseline) {
      if (cases.length !== allCases.length) throw new Error("A visual baseline can only be updated with the complete case matrix");
      if (results.some((result) => result.failures.length)) throw new Error("Refusing to update a visual baseline while browser assertions are failing");
      await writeVisualBaseline(results);
    } else {
      await compareVisualBaseline(results);
    }

    const report = buildReport(results);
    await writeFile(join(artifactDirectory, "visual-acceptance-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
    await writeFile(join(artifactDirectory, "visual-acceptance-report.md"), markdownReport(report), "utf8");
    printSummary(report);
    if (report.failed > 0) process.exitCode = 1;
  } catch (error) {
    const message = error instanceof Error ? error.stack || error.message : String(error);
    const edgeStatus = edgeProcess
      ? `\nEdge exitCode=${edgeProcess.exitCode ?? "running"} signal=${edgeProcess.signalCode ?? "none"}\n${edgeLog.join("")}`
      : "";
    console.error(`${message}${edgeStatus}`);
    process.exitCode = 1;
  } finally {
    if (client) {
      try {
        if (!client.closed) await client.send("Browser.close", {}, 3000);
      } catch {
        // Edge may have exited between the final case and cleanup.
      } finally {
        client.close();
      }
    }
    await stopProcess(edgeProcess);
    await stopProcess(viteProcess);
    if (edgeProfile && edgeProfile.startsWith(tmpdir())) {
      await rm(edgeProfile, { recursive: true, force: true, maxRetries: 4, retryDelay: 200 });
    }
  }
}

function visualCase(id, page, theme, locale, variant, width, height, deviceScaleFactor) {
  return { id, page, theme, locale, variant, width, height, deviceScaleFactor };
}

async function runCase(cdp, vitePort, testCase) {
  const url = new URL(`http://127.0.0.1:${vitePort}/acceptance.html`);
  for (const [key, value] of Object.entries(testCase)) {
    if (!["id", "width", "height", "deviceScaleFactor"].includes(key)) url.searchParams.set(key, String(value));
  }
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: testCase.width,
    height: testCase.height,
    deviceScaleFactor: testCase.deviceScaleFactor,
    mobile: false,
  });
  await cdp.send("Page.navigate", { url: url.toString() });
  await waitForReady(cdp);
  await cdp.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
  await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });

  const evaluation = await cdp.send("Runtime.evaluate", {
    expression: `(${browserAudit.toString()})(${JSON.stringify(testCase)})`,
    returnByValue: true,
    awaitPromise: true,
  });
  if (evaluation.exceptionDetails) {
    throw new Error(`${testCase.id}: browser audit threw ${evaluation.exceptionDetails.text}`);
  }
  const audit = evaluation.result?.value;
  if (!audit || !Array.isArray(audit.failures)) throw new Error(`${testCase.id}: browser audit returned invalid data`);

  const layout = await cdp.send("Page.getLayoutMetrics");
  const content = layout.cssContentSize || layout.contentSize;
  const screenshot = await cdp.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
    fromSurface: true,
    clip: {
      x: 0,
      y: 0,
      width: Math.max(testCase.width, Math.ceil(content.width)),
      height: Math.max(testCase.height, Math.ceil(content.height)),
      scale: 1,
    },
  });
  const screenshotName = `${testCase.id}.png`;
  await writeFile(join(screenshotDirectory, screenshotName), Buffer.from(screenshot.data, "base64"));
  const screenshotHash = await perceptualHash(cdp, screenshot.data);

  const result = {
    ...testCase,
    status: audit.failures.length ? "failed" : "passed",
    failures: audit.failures,
    observations: audit.observations,
    screenshot: `screenshots/${screenshotName}`,
    screenshotHash,
    contentSize: { width: Math.ceil(content.width), height: Math.ceil(content.height) },
  };
  return result;
}

function printCaseResult(result) {
  console.log(`[visual] ${result.status.toUpperCase()} ${result.id}${result.failures.length ? ` - ${result.failures.join("; ")}` : ""}`);
}

async function perceptualHash(cdp, pngBase64) {
  const evaluation = await cdp.send("Runtime.evaluate", {
    expression: `new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 33;
        canvas.height = 32;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        let bits = "";
        for (let y = 0; y < 32; y += 1) {
          for (let x = 0; x < 32; x += 1) {
            const left = (y * 33 + x) * 4;
            const right = left + 4;
            const leftGray = pixels[left] * 0.299 + pixels[left + 1] * 0.587 + pixels[left + 2] * 0.114;
            const rightGray = pixels[right] * 0.299 + pixels[right + 1] * 0.587 + pixels[right + 2] * 0.114;
            bits += leftGray > rightGray ? "1" : "0";
          }
        }
        let hash = "";
        for (let index = 0; index < bits.length; index += 4) hash += Number.parseInt(bits.slice(index, index + 4), 2).toString(16);
        resolve(hash);
      };
      image.onerror = () => reject(new Error("Unable to decode captured screenshot"));
      image.src = "data:image/png;base64,${pngBase64}";
    })`,
    returnByValue: true,
    awaitPromise: true,
  });
  if (evaluation.exceptionDetails || typeof evaluation.result?.value !== "string") throw new Error("Unable to calculate screenshot perceptual hash");
  return evaluation.result.value;
}

async function writeVisualBaseline(results) {
  const baseline = {
    version: "1.9.1",
    algorithm: "dHash-32x32",
    maximumHashDistance,
    generatedAt: new Date().toISOString(),
    cases: Object.fromEntries(results.map((result) => [result.id, {
      hash: result.screenshotHash,
      contentSize: result.contentSize,
      viewport: { width: result.width, height: result.height, deviceScaleFactor: result.deviceScaleFactor },
    }])),
  };
  await writeFile(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`, "utf8");
  console.log(`[visual] baseline updated: ${baselinePath}`);
}

async function compareVisualBaseline(results) {
  let baseline;
  try {
    baseline = JSON.parse(await readFile(baselinePath, "utf8"));
  } catch (error) {
    throw new Error(`Visual baseline is missing or invalid at ${baselinePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
  for (const result of results) {
    const expected = baseline.cases?.[result.id];
    if (!expected) {
      result.failures.push("visual baseline case is missing");
    } else {
      const distance = hashDistance(result.screenshotHash, expected.hash);
      result.observations.push(`screenshot hash distance: ${distance}/${result.screenshotHash.length * 4}`);
      if (distance > (baseline.maximumHashDistance ?? maximumHashDistance)) {
        result.failures.push(`screenshot difference ${distance} exceeds baseline threshold ${baseline.maximumHashDistance ?? maximumHashDistance}`);
      }
      const widthDelta = relativeDelta(result.contentSize.width, expected.contentSize?.width);
      const heightDelta = relativeDelta(result.contentSize.height, expected.contentSize?.height);
      if (widthDelta > 0.05 || heightDelta > 0.05) {
        result.failures.push(`page geometry changed beyond 5% (width ${(widthDelta * 100).toFixed(1)}%, height ${(heightDelta * 100).toFixed(1)}%)`);
      }
    }
    result.status = result.failures.length ? "failed" : "passed";
  }
}

function hashDistance(left, right) {
  if (typeof left !== "string" || typeof right !== "string" || left.length !== right.length) return Number.POSITIVE_INFINITY;
  let distance = 0;
  for (let index = 0; index < left.length; index += 1) {
    let value = Number.parseInt(left[index], 16) ^ Number.parseInt(right[index], 16);
    while (value) {
      distance += value & 1;
      value >>>= 1;
    }
  }
  return distance;
}

function relativeDelta(actual, expected) {
  if (!Number.isFinite(expected) || expected <= 0) return 1;
  return Math.abs(actual - expected) / expected;
}

function browserAudit(testCase) {
  const failures = [];
  const observations = [];
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const visible = (element) => {
    if (!(element instanceof HTMLElement)) return false;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && Number.parseFloat(style.opacity || "1") > 0.01 && rect.width > 0 && rect.height > 0;
  };
  const requireVisible = (selector) => {
    const element = $(selector);
    if (!element) failures.push(`missing selector ${selector}`);
    else if (!visible(element)) failures.push(`selector is not visible ${selector}`);
    return element;
  };

  requireVisible("[data-testid='visual-acceptance-shell']");
  requireVisible("#feature-root");

  const html = document.documentElement;
  if (html.scrollWidth > html.clientWidth + 1) {
    failures.push(`document horizontal overflow ${html.scrollWidth}px > ${html.clientWidth}px`);
  }

  const ids = new Map();
  for (const element of $$("[id]")) {
    const id = element.id;
    ids.set(id, (ids.get(id) || 0) + 1);
  }
  for (const [id, count] of ids) {
    if (count > 1) failures.push(`duplicate DOM id ${id} (${count})`);
  }

  const rootText = testCase.variant === "onboarding" ? document.body.innerText : $("#feature-root")?.innerText || "";
  for (const artifact of ["undefined", "[object Object]"]) {
    if (rootText.includes(artifact)) failures.push(`user-visible serialization artifact: ${artifact}`);
  }
  if (/(^|\s)null(\s|$)/i.test(rootText)) failures.push("user-visible null value");
  if (testCase.locale === "en-US" && /[\u3400-\u9fff]/u.test(rootText)) {
    const excerpts = rootText.split(/\r?\n/).map((line) => line.trim()).filter((line) => /[\u3400-\u9fff]/u.test(line)).slice(0, 5);
    failures.push(`English fixture contains unexpected CJK text: ${excerpts.join(" | ")}`);
  }
  if (testCase.locale === "zh-CN" && !/[\u3400-\u9fff]/u.test(rootText)) {
    failures.push("Chinese fixture contains no localized CJK text");
  }

  const toast = $("#toast");
  if (toast && visible(toast) && !(toast.textContent || "").trim()) failures.push("blank toast is visible");

  const pageSelectors = {
    dashboard: ["[data-testid='dashboard-summary-section']"],
    cleanup: ["[data-testid='cleanup-page']"],
    environment: ["[data-testid='environment-page']", "[data-testid='environment-result-panel']", "[data-testid='environment-operation-result']"],
    projects: ["[data-testid='projects-analysis-section']", "[data-testid='projects-result']", "[data-testid='projects-apply-result']"],
    ports: ["[data-testid='ports-table-section']"],
    profiles: ["[data-testid='profiles-list']", "[data-testid='profiles-result']"],
    runtimes: ["[data-testid='runtime-installed-list']", "[data-testid='runtime-operation-result']"],
    fileAssociations: ["[data-testid='file-associations-search-input']", "[data-testid='file-associations-records-table']", "[data-testid='file-associations-plan-preview']"],
    settings: ["[data-testid='settings-theme-section']", "[data-testid='settings-update-section']", "[data-testid='settings-about-section']", "[data-testid='settings-about-version']"],
    toolchains: ["[data-testid='toolchains-page']", "[data-testid='toolchains-result']"],
  };
  for (const selector of pageSelectors[testCase.page] || []) requireVisible(selector);
  if (testCase.variant === "onboarding") {
    requireVisible("[data-testid='onboarding-dialog']");
    requireVisible("[data-testid='onboarding-step-1']");
    requireVisible("[data-testid='onboarding-skip']");
    requireVisible("[data-testid='onboarding-next']");
    if ($$(".onboarding-progress span").length !== 4) failures.push("onboarding progress does not contain four steps");
    $("[data-testid='onboarding-next']")?.click();
    requireVisible("[data-testid='onboarding-step-2']");
    $("[data-testid='onboarding-back']")?.click();
    requireVisible("[data-testid='onboarding-step-1']");
  }

  const interactive = $$(testCase.variant === "onboarding"
    ? ".onboarding-dialog button, .onboarding-dialog input, .onboarding-dialog select, .onboarding-dialog textarea, .onboarding-dialog a[href]"
    : "#feature-root button, #feature-root input, #feature-root select, #feature-root textarea, #feature-root a[href]");
  for (const element of interactive) {
    const style = getComputedStyle(element);
    if (!visible(element) && element.tabIndex >= 0 && style.display !== "none" && style.visibility !== "hidden") {
      failures.push(`focusable control is not visible: ${element.id || element.getAttribute("data-testid") || element.tagName}`);
    }
    if (visible(element) && element.tabIndex < 0 && !(element instanceof HTMLInputElement && element.disabled) && !(element instanceof HTMLButtonElement && element.disabled)) {
      failures.push(`visible control is not keyboard focusable: ${element.id || element.getAttribute("data-testid") || element.tagName}`);
    }
  }
  const focusTarget = interactive.find((element) => visible(element) && !(element instanceof HTMLInputElement && element.disabled) && !(element instanceof HTMLButtonElement && element.disabled));
  if (focusTarget instanceof HTMLElement) {
    focusTarget.focus({ preventScroll: true });
    const focusStyle = getComputedStyle(focusTarget);
    const outlineWidth = Number.parseFloat(focusStyle.outlineWidth || "0");
    if (document.activeElement !== focusTarget) failures.push("first interactive control cannot receive focus");
    if ((focusStyle.outlineStyle === "none" || outlineWidth < 1) && focusStyle.boxShadow === "none") failures.push("focused control has no visible outline or focus shadow");
  }

  for (const button of $$("button")) {
    if (!visible(button)) continue;
    if (button.scrollWidth > button.clientWidth + 2 || button.scrollHeight > button.clientHeight + 2) {
      failures.push(`button content clipped: ${(button.textContent || button.getAttribute("aria-label") || "unnamed").trim().slice(0, 80)}`);
    }
  }

  if (testCase.page === "cleanup") auditCleanup(testCase, failures, observations, requireVisible, visible, $, $$);
  if (testCase.page === "ports") auditPorts(failures, observations, requireVisible, $$);

  const contrastScopes = testCase.variant === "onboarding"
    ? [".onboarding-dialog", ".onboarding-content article", ".onboarding-actions"]
    : testCase.page === "cleanup"
    ? [".topbar", "#feature-root .panel", ".folder-overview", ".folder-usage-card", ".folder-usage-summary", ".disk-volume-card", ".archive-target-picker", ".recycle-bin-volume-card"]
    : [".topbar", "#feature-root .panel"];
  const contrast = auditContrast(contrastScopes, visible);
  failures.push(...contrast.issues.slice(0, 30));
  if (contrast.issues.length > 30) failures.push(`${contrast.issues.length - 30} additional contrast failures`);
  observations.push(`contrast nodes checked: ${contrast.checked}`);

  return { failures: [...new Set(failures)], observations };

  function auditCleanup(currentCase, targetFailures, targetObservations, needVisible, isVisible, selectOne, selectAll) {
    needVisible("[data-testid='cleanup-page']");
    needVisible("[data-testid='cleanup-view-tabs']");
    const activeView = selectOne("[data-cleanup-view][aria-pressed='true']")?.getAttribute("data-cleanup-view") || "unknown";
    const diskGrid = activeView === "space" ? needVisible("[data-testid='cleanup-disk-card-grid']") : null;
    const diskCards = selectAll("[data-testid='cleanup-disk-card']");
    if (activeView === "space" && diskCards.length < 2) targetFailures.push(`expected at least 2 disk cards, found ${diskCards.length}`);
    if (diskGrid instanceof HTMLElement) {
      const gridRect = diskGrid.getBoundingClientRect();
      for (const card of diskCards) {
        const rect = card.getBoundingClientRect();
        if (rect.left < gridRect.left - 1 || rect.right > gridRect.right + 1) {
          targetFailures.push("disk card escapes disk grid bounds");
          break;
        }
      }
    }

    const pickerSelectors = [
      "[data-testid='cleanup-generic-archive-target-picker']",
      "[data-testid='cleanup-desktop-archive-target-picker']",
      "[data-testid='cleanup-downloads-archive-target-picker']",
    ];
    if (activeView === "space") for (const selector of pickerSelectors) needVisible(selector);
    for (const selector of [
      "[data-testid='cleanup-generic-archive-target-select']",
      "[data-testid='cleanup-desktop-archive-target-select']",
      "[data-testid='cleanup-downloads-archive-target-select']",
    ]) {
      if (activeView !== "space") continue;
      const target = needVisible(selector);
      if (target instanceof HTMLSelectElement) {
        if (!target.options.length) targetFailures.push(`${selector} has no selectable target`);
        const expected = currentCase.variant === "archive-folder" && selector.includes("desktop")
          ? "D:\\ReleaseLab\\ArchiveTarget"
          : "D:";
        if (target.value !== expected) targetFailures.push(`${selector} selected ${target.value || "nothing"} instead of ${expected}`);
      }
    }

    if (activeView === "quick") needVisible("[data-testid='cleanup-recycle-bin-section']");
    if (activeView === "quick" && (currentCase.variant === "planned" || currentCase.variant === "result")) {
      needVisible("[data-testid='cleanup-recycle-bin-preview']");
      needVisible("[data-testid='cleanup-recycle-bin-plan-preview']");
      needVisible("[data-testid='cleanup-recycle-bin-result']");
    }
    const checkboxes = selectAll("[data-recycle-bin-drive]");
    const checked = checkboxes.filter((element) => element instanceof HTMLInputElement && element.checked);
    const execute = selectOne("[data-action='execute-recycle-bin-cleanup-plan']");
    if (activeView === "quick" && !(execute instanceof HTMLButtonElement)) targetFailures.push("missing recycle bin execute button");
    if (activeView !== "quick") {
      // Recycle Bin controls belong to the quick-cleanup task view.
    } else if (currentCase.variant === "default" || currentCase.variant === "archive-folder") {
      if (checked.length !== 0) targetFailures.push("Recycle Bin selected a volume by default");
      if (execute instanceof HTMLButtonElement && !execute.disabled) targetFailures.push("Recycle Bin execute is enabled without a plan");
    } else if (currentCase.variant === "planned") {
      if (checked.length !== 1 || checked[0].value !== "D:") targetFailures.push("planned Recycle Bin scope is not exactly D:");
      if (execute instanceof HTMLButtonElement && execute.disabled) targetFailures.push("Recycle Bin execute remains disabled with a plan");
      if (!(selectOne("[data-testid='cleanup-recycle-bin-operation-status']") instanceof HTMLElement)) targetFailures.push("planned Recycle Bin operation status is missing");
    } else {
      if (!(selectOne("[data-testid='cleanup-recycle-bin-operation-status']") instanceof HTMLElement)) targetFailures.push("Recycle Bin result status is missing");
      const resultText = selectOne("[data-testid='cleanup-recycle-bin-result']")?.textContent || "";
      if (!/verified|\u5df2\u9a8c\u8bc1|fresh scan|\u91cd\u65b0\u626b\u63cf/iu.test(resultText)) targetFailures.push("Recycle Bin result lacks persistent verification evidence");
    }

    if (currentCase.theme === "dark" || currentCase.theme === "high-contrast") {
      const maxLuminance = currentCase.theme === "high-contrast" ? 0.08 : 0.24;
      for (const element of selectAll(".folder-overview, .folder-usage-card, .folder-usage-summary, .disk-volume-card, .recycle-bin-volume-card")) {
        if (!isVisible(element)) continue;
        const background = parseColor(getComputedStyle(element).backgroundColor);
        if (background && luminance(background) > maxLuminance) {
          targetFailures.push(`${element.classList[0] || element.tagName} uses a light surface in ${currentCase.theme}`);
        }
      }
    }
    targetObservations.push(`cleanup view: ${activeView}; disk cards: ${diskCards.length}; recycle scopes: ${checkboxes.length}`);
  }

  function auditPorts(targetFailures, targetObservations, needVisible, selectAll) {
    needVisible("[data-testid='ports-table-section']");
    needVisible("[data-testid='ports-plan-preview']");
    needVisible("[data-testid='ports-execute-result']");
    const rows = selectAll("[data-testid='ports-row']");
    const header = document.querySelector(".port-table .data-row.head");
    const headerColumns = header?.children.length || 0;
    if (headerColumns !== 12) targetFailures.push(`port header has ${headerColumns} columns instead of 12`);
    if (rows.some((row) => row.children.length !== headerColumns)) targetFailures.push("port row column count differs from the header");
    if (rows.length < 5) targetFailures.push(`expected at least 5 normalized port groups, found ${rows.length}`);
    const visualKeys = rows.map((row) => row.getAttribute("data-port-visual-key") || "");
    const groupIds = rows.map((row) => row.getAttribute("data-port-group-id") || "");
    if (new Set(visualKeys).size !== visualKeys.length) targetFailures.push("duplicate visible port operation key");
    if (groupIds.some((id) => !id)) targetFailures.push("port row missing group id");
    if (new Set(groupIds).size !== groupIds.length) targetFailures.push("duplicate rendered port group id");
    for (const expected of ["UDP:4500:7000:LISTENING", "TCP:5043:7100:LISTENING"]) {
      const count = visualKeys.filter((value) => value === expected).length;
      if (count !== 1) targetFailures.push(`${expected} rendered ${count} times`);
    }
    const reasons = selectAll("[data-testid='ports-row-closeability-reason']");
    if (reasons.length !== rows.length || reasons.some((element) => !(element.textContent || "").trim())) {
      targetFailures.push("one or more port rows lack a closeability reason");
    }
    targetObservations.push(`rendered port groups: ${rows.length}; unique visual keys: ${new Set(visualKeys).size}`);
  }

  function auditContrast(scopeSelectors, isVisible) {
    const issues = [];
    const checkedElements = new Set();
    let checked = 0;
    for (const selector of scopeSelectors) {
      for (const scope of $$(selector)) {
        for (const element of [scope, ...Array.from(scope.querySelectorAll("*"))]) {
          if (!(element instanceof HTMLElement) || checkedElements.has(element) || !isVisible(element)) continue;
          const directText = Array.from(element.childNodes)
            .filter((node) => node.nodeType === Node.TEXT_NODE)
            .map((node) => node.textContent || "")
            .join(" ")
            .trim();
          const label = directText || (element.matches("input, select, textarea") ? element.getAttribute("placeholder") || element.getAttribute("aria-label") || "" : "");
          if (!label) continue;
          checkedElements.add(element);
          checked += 1;
          const style = getComputedStyle(element);
          const foreground = parseColor(style.color);
          const background = effectiveBackground(element);
          if (!foreground || !background) continue;
          const ratio = contrastRatio(foreground, background);
          const fontSize = Number.parseFloat(style.fontSize || "16");
          const weight = Number.parseInt(style.fontWeight || "400", 10);
          const threshold = fontSize >= 24 || (fontSize >= 18.66 && weight >= 700) ? 3 : 4.5;
          if (ratio + 0.01 < threshold) {
            issues.push(`contrast ${ratio.toFixed(2)} < ${threshold.toFixed(1)} for "${label.replace(/\s+/g, " ").slice(0, 70)}"`);
          }
        }
      }
    }
    return { issues, checked };
  }

  function effectiveBackground(element) {
    let current = element;
    let color = { r: 255, g: 255, b: 255, a: 1 };
    const layers = [];
    while (current instanceof HTMLElement) {
      const parsed = parseColor(getComputedStyle(current).backgroundColor);
      if (parsed && parsed.a > 0) layers.push(parsed);
      current = current.parentElement;
    }
    for (let index = layers.length - 1; index >= 0; index -= 1) color = composite(layers[index], color);
    return color;
  }

  function parseColor(value) {
    const match = String(value).match(/rgba?\(\s*([\d.]+)[, ]+\s*([\d.]+)[, ]+\s*([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)/i);
    if (!match) return null;
    return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]), a: match[4] === undefined ? 1 : Number(match[4]) };
  }

  function composite(front, back) {
    const alpha = front.a + back.a * (1 - front.a);
    if (alpha <= 0) return { r: 255, g: 255, b: 255, a: 0 };
    return {
      r: (front.r * front.a + back.r * back.a * (1 - front.a)) / alpha,
      g: (front.g * front.a + back.g * back.a * (1 - front.a)) / alpha,
      b: (front.b * front.a + back.b * back.a * (1 - front.a)) / alpha,
      a: alpha,
    };
  }

  function luminance(color) {
    const channel = (value) => {
      const normalized = value / 255;
      return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
  }

  function contrastRatio(first, second) {
    const bright = Math.max(luminance(first), luminance(second));
    const dark = Math.min(luminance(first), luminance(second));
    return (bright + 0.05) / (dark + 0.05);
  }
}

function buildReport(results) {
  const passed = results.filter((result) => result.status === "passed").length;
  const failed = results.length - passed;
  return {
    generatedAt: new Date().toISOString(),
    runner: "Microsoft Edge headless through Chrome DevTools Protocol",
    total: results.length,
    passed,
    failed,
    releaseBlocking: failed > 0,
    results,
  };
}

function markdownReport(report) {
  const rows = report.results.map((result) => `| ${result.id} | ${result.page} | ${result.theme} | ${result.locale} | ${result.width}x${result.height}@${result.deviceScaleFactor} | ${result.status} | ${result.failures.join("<br>") || "-"} | [PNG](${result.screenshot}) |`).join("\n");
  return `# DevEnv Manager Visual Acceptance Report

## Summary

- Runner: ${report.runner}
- Total: ${report.total}
- Passed: ${report.passed}
- Failed: ${report.failed}
- Release blocking: ${report.releaseBlocking ? "yes" : "no"}

## Cases

| Case | Page | Theme | Locale | Viewport | Status | Failures | Screenshot |
|---|---|---|---|---|---|---|---|
${rows}
`;
}

function printSummary(report) {
  console.log(`[visual] total=${report.total} passed=${report.passed} failed=${report.failed} releaseBlocking=${report.releaseBlocking}`);
  console.log(`[visual] report=${join(artifactDirectory, "visual-acceptance-report.md")}`);
}

function startVite(port) {
  const viteEntry = resolve(tauriDirectory, "node_modules", "vite", "bin", "vite.js");
  const child = spawn(process.execPath, [viteEntry, "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
    cwd: tauriDirectory,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => serverLog.push(String(chunk)));
  child.stderr.on("data", (chunk) => serverLog.push(String(chunk)));
  return child;
}

function startEdge(port, userDataDirectory) {
  const executable = findEdge();
  const child = spawn(executable, [
    "--headless=new",
    "--disable-gpu",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-default-apps",
    "--disable-extensions",
    "--disable-sync",
    "--metrics-recording-only",
    "--no-first-run",
    "--no-default-browser-check",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDirectory}`,
    "about:blank",
  ], {
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => edgeLog.push(String(chunk)));
  child.stderr.on("data", (chunk) => edgeLog.push(String(chunk)));
  return child;
}

function findEdge() {
  const candidates = [
    process.env["PROGRAMFILES(X86)"] && join(process.env["PROGRAMFILES(X86)"], "Microsoft", "Edge", "Application", "msedge.exe"),
    process.env.PROGRAMFILES && join(process.env.PROGRAMFILES, "Microsoft", "Edge", "Application", "msedge.exe"),
    process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "Microsoft", "Edge", "Application", "msedge.exe"),
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  const where = spawnSync("where.exe", ["msedge.exe"], { windowsHide: true, encoding: "utf8", timeout: 5000 });
  const found = where.status === 0 ? where.stdout.split(/\r?\n/).find(Boolean) : "";
  if (found) return found.trim();
  throw new Error("Microsoft Edge was not found; visual acceptance cannot run");
}

async function waitForEdgePage(port, child) {
  const endpoint = `http://127.0.0.1:${port}/json/list`;
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Microsoft Edge exited early with code ${child.exitCode}`);
    try {
      const response = await fetch(endpoint, { signal: AbortSignal.timeout(3000) });
      if (response.ok) {
        const targets = await response.json();
        const page = targets.find((target) => target.type === "page" && target.webSocketDebuggerUrl);
        if (page) return page;
      }
    } catch {
      // Edge has not opened the debugging endpoint yet.
    }
    await delay(150);
  }
  throw new Error("Timed out waiting for Microsoft Edge DevTools endpoint");
}

async function waitForReady(cdp) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    const response = await cdp.send("Runtime.evaluate", {
      expression: "window.__DEVENV_VISUAL_READY__ === true",
      returnByValue: true,
    });
    if (response.result?.value === true) return;
    await delay(100);
  }
  throw new Error("Timed out waiting for visual fixture render");
}

async function waitForHttp(url, child, logs) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Vite exited early with code ${child.exitCode}\n${logs.join("")}`);
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (response.ok) return;
    } catch {
      // Vite is still starting.
    }
    await delay(150);
  }
  throw new Error(`Timed out waiting for Vite\n${logs.join("")}`);
}

async function availablePort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close((error) => error ? reject(error) : resolvePort(port));
    });
  });
}

async function stopProcess(child) {
  if (!child || child.exitCode !== null) return;
  child.kill();
  const deadline = Date.now() + 5000;
  while (child.exitCode === null && Date.now() < deadline) await delay(50);
  if (child.exitCode === null) child.kill("SIGKILL");
}

function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

class CdpClient {
  constructor(socket) {
    this.socket = socket;
    this.closed = socket.readyState !== WebSocket.OPEN;
    this.nextId = 1;
    this.pending = new Map();
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data));
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      clearTimeout(pending.timeout);
      if (message.error) pending.reject(new Error(`${pending.method}: ${message.error.message}`));
      else pending.resolve(message.result || {});
    });
    socket.addEventListener("close", () => {
      this.closed = true;
      this.rejectPending(new Error("CDP connection closed"));
    });
    socket.addEventListener("error", () => {
      this.rejectPending(new Error("CDP connection error"));
    });
  }

  static async connect(url, timeoutMs = 15000) {
    const socket = new WebSocket(url);
    await new Promise((resolveOpen, reject) => {
      const timeout = setTimeout(() => {
        socket.close();
        reject(new Error(`Timed out connecting to Edge DevTools after ${timeoutMs} ms`));
      }, timeoutMs);
      socket.addEventListener("open", () => {
        clearTimeout(timeout);
        resolveOpen();
      }, { once: true });
      socket.addEventListener("error", () => {
        clearTimeout(timeout);
        reject(new Error("Unable to connect to Edge DevTools"));
      }, { once: true });
    });
    return new CdpClient(socket);
  }

  send(method, params = {}, timeoutMs = 30000) {
    if (this.closed || this.socket.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error(`${method}: CDP connection is not open`));
    }
    const id = this.nextId++;
    return new Promise((resolveResult, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`${method}: CDP command timed out after ${timeoutMs} ms`));
      }, timeoutMs);
      this.pending.set(id, { resolve: resolveResult, reject, method, timeout });
      try {
        this.socket.send(JSON.stringify({ id, method, params }));
      } catch (error) {
        clearTimeout(timeout);
        this.pending.delete(id);
        reject(error);
      }
    });
  }

  close() {
    this.closed = true;
    this.rejectPending(new Error("CDP client closed"));
    if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) {
      this.socket.close();
    }
  }

  rejectPending(error) {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeout);
      pending.reject(error);
    }
    this.pending.clear();
  }
}

await main();

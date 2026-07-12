import type { FeatureContext } from "../../app/featureContext";
import { open } from "../../api/tauri";
import { t } from "../../core/i18n";
import { bindAction } from "../sharedView";
import { discoverRuntimes, getJdkDistributions, inspectRuntimeStrongVerification, installRuntime, openAppsFeatures, openRuntimeDirectory, switchRuntime, uninstallRuntime, verifyExternalJdk } from "./api";
import { renderRuntimeWorkbench } from "./render";
import type { RuntimeWorkbenchState } from "./state";

export function bindRuntimeEvents(context: FeatureContext, state: RuntimeWorkbenchState): void {
  bindAction(context.root, "refresh-runtimes", () => refreshRuntimes(context, state));
  context.root.querySelector<HTMLSelectElement>("#external-jdk-candidate")?.addEventListener("change", (event) => {
    state.externalJdkPath = (event.currentTarget as HTMLSelectElement).value;
    state.externalJdkChecks = [];
    state.externalJdkResult = "";
    state.externalJdkError = "";
    renderAndBind(context, state);
  });
  bindAction(context.root, "choose-external-jdk", async () => {
    const selected = await open({ directory: true, multiple: false });
    if (!selected || Array.isArray(selected)) return;
    state.externalJdkPath = normalizeJdkRoot(selected);
    state.externalJdkChecks = [];
    state.externalJdkResult = "";
    state.externalJdkError = "";
    renderAndBind(context, state);
  });
  bindAction(context.root, "verify-external-jdk", async () => {
    state.externalJdkChecks = [];
    state.externalJdkResult = "";
    state.externalJdkError = "";
    if (!state.externalJdkPath) {
      state.externalJdkError = "Select or choose an external JDK root first.";
      renderAndBind(context, state);
      return;
    }
    context.progress.start("Verifying external JDK");
    try {
      state.externalJdkChecks = await verifyExternalJdk(state.externalJdkPath);
      const requiredPassed = state.externalJdkChecks.filter((check) => check.required).every((check) => check.success);
      state.externalJdkResult = requiredPassed
        ? `External JDK verified. JAVA_HOME can point to ${state.externalJdkPath}.`
        : "External Java verification completed with missing or failed required tools.";
      context.progress.done("External JDK verification completed");
    } catch (error) {
      state.externalJdkError = errorMessage(error);
      context.progress.fail(state.externalJdkError);
    }
    renderAndBind(context, state);
  });
  bindAction(context.root, "install-jdk", async () => {
    const version = context.root.querySelector<HTMLSelectElement>("#jdk-version")?.value || "21";
    const distribution = context.root.querySelector<HTMLSelectElement>("#jdk-distribution")?.value || "temurin";
    state.operationResult = "";
    state.operationError = "";
    try {
      const result = await context.risk.run({
        command: "install_jdk",
        planId: `install_jdk:${version}:${distribution}`,
        riskLevel: "high",
        backupRequired: false,
        title: t("feature.runtimes.installJdkTitle", { version }),
        summary: t("feature.runtimes.installJdkSummary", { version }),
        before: [
          { label: t("feature.runtimes.distribution"), value: distribution },
          { label: t("feature.runtimes.version"), value: version },
        ],
        warnings: [
          t("feature.runtimes.installJdkWhy"),
          t("feature.runtimes.installJdkBackup"),
          t("feature.runtimes.installJdkVerify"),
        ],
        execute: (confirmationToken) => installRuntime("install_jdk", { version, distribution, switchAfterInstall: false, confirmationToken }),
      });
      state.operationResult = resultMessage(result, t("feature.runtimes.installJdk"));
    } catch (error) {
      state.operationError = errorMessage(error);
    }
    renderAndBind(context, state);
  });
  bindAction(context.root, "install-node", () => installWithRisk(context, state, "install_node", context.root.querySelector<HTMLSelectElement>("#node-version")?.value || "22"));
  bindAction(context.root, "install-python", () => installWithRisk(context, state, "install_python", context.root.querySelector<HTMLSelectElement>("#python-version")?.value || "3.12"));
  bindAction(context.root, "install-go", () => installWithRisk(context, state, "install_go", context.root.querySelector<HTMLSelectElement>("#go-version")?.value || "1.25"));
  bindAction(context.root, "install-maven", () => installLatestWithRisk(context, state, "install_maven_latest", "Maven"));
  bindAction(context.root, "install-gradle", () => installLatestWithRisk(context, state, "install_gradle_latest", "Gradle"));
  bindAction(context.root, "verify-runtimes", async () => {
    context.progress.start(t("feature.runtimes.healthCheck"));
    state.operationResult = "";
    state.operationError = "";
    try {
      state.strongVerification = await inspectRuntimeStrongVerification();
      state.operationResult = t("feature.runtimes.healthCheckDone");
      if (!context.isCurrent()) return;
      context.progress.done(t("feature.runtimes.healthCheckDone"));
    } catch (error) {
      state.operationError = errorMessage(error);
      context.progress.fail(state.operationError);
    }
    renderAndBind(context, state);
  });
  context.root.querySelectorAll<HTMLButtonElement>("[data-runtime-action]").forEach((button) => {
    button.addEventListener("click", () => runRuntimeRowAction(context, state, button));
  });
  context.root.querySelectorAll<HTMLButtonElement>("[data-page-action]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.pageAction === "runtimes:prev") state.page = Math.max(1, state.page - 1);
      if (button.dataset.pageAction === "runtimes:next") state.page += 1;
      if (!context.isCurrent()) return;
      context.root.innerHTML = renderRuntimeWorkbench(state);
      bindRuntimeEvents(context, state);
    });
  });
}

export async function refreshRuntimes(context: FeatureContext, state: RuntimeWorkbenchState): Promise<void> {
  const [runtimes, distributions, strongVerification] = await Promise.all([
    discoverRuntimes(),
    getJdkDistributions(),
    inspectRuntimeStrongVerification(),
  ]);
  if (!context.isCurrent()) return;
  state.runtimes = runtimes;
  state.distributions = distributions;
  state.strongVerification = strongVerification;
  state.page = 1;
  context.root.innerHTML = renderRuntimeWorkbench(state);
  bindRuntimeEvents(context, state);
}

async function installWithRisk(context: FeatureContext, state: RuntimeWorkbenchState, command: "install_node" | "install_python" | "install_go", version: string) {
  state.operationResult = "";
  state.operationError = "";
  try {
    const result = await context.risk.run({
      command,
      planId: `${command}:${version}`,
      riskLevel: "high",
      title: t("feature.runtimes.installGenericTitle", { name: runtimeName(command), version }),
      summary: t("feature.runtimes.installGenericSummary"),
      warnings: [t("feature.runtimes.installGenericWarning")],
      execute: (confirmationToken) => installRuntime(command, { version, confirmationToken }),
    });
    state.operationResult = resultMessage(result, t("feature.runtimes.installGenericTitle", { name: runtimeName(command), version }));
  } catch (error) {
    state.operationError = errorMessage(error);
  }
  renderAndBind(context, state);
}

async function installLatestWithRisk(context: FeatureContext, state: RuntimeWorkbenchState, command: "install_maven_latest" | "install_gradle_latest", label: string) {
  state.operationResult = "";
  state.operationError = "";
  try {
    const result = await context.risk.run({
      command,
      planId: `${command}:latest`,
      riskLevel: "high",
      title: t("feature.runtimes.installGenericTitle", { name: label, version: "latest" }),
      summary: t("feature.runtimes.installGenericSummary"),
      before: [{ label: t("feature.runtimes.version"), value: t("feature.runtimes.latest") }],
      warnings: [t("feature.runtimes.installGenericWarning")],
      execute: (confirmationToken) => installRuntime(command, { confirmationToken }),
    });
    state.operationResult = resultMessage(result, t("feature.runtimes.installGenericTitle", { name: label, version: "latest" }));
  } catch (error) {
    state.operationError = errorMessage(error);
  }
  renderAndBind(context, state);
}

async function runRuntimeRowAction(context: FeatureContext, state: RuntimeWorkbenchState, button: HTMLButtonElement): Promise<void> {
  const action = button.dataset.runtimeAction;
  const kind = button.dataset.runtimeKind || "";
  const label = button.dataset.runtimeLabel || kind;
  const version = button.dataset.runtimeVersion || "";
  const path = button.dataset.runtimePath || "";
  const executable = button.dataset.runtimeExecutable || path;

  if (action === "details") {
    const rows = Array.from(context.root.querySelectorAll<HTMLElement>("[data-runtime-row]"));
    state.selectedRuntimeId = rows.find((row) => row.contains(button))?.dataset.runtimeRow ?? null;
    if (!context.isCurrent()) return;
    context.root.innerHTML = renderRuntimeWorkbench(state);
    bindRuntimeEvents(context, state);
    return;
  }

  if (action === "copy") {
    try {
      await navigator.clipboard.writeText(executable);
      state.operationResult = `${t("toast.runtimePathCopied")}: ${executable}`;
      state.operationError = "";
      context.toast(t("toast.runtimePathCopied"));
    } catch (error) {
      state.operationResult = "";
      state.operationError = errorMessage(error);
      context.toast(state.operationError, true);
    }
    renderAndBind(context, state);
    return;
  }

  if (action === "open") {
    try {
      const result = await openRuntimeDirectory(path || executable);
      state.operationResult = result.message || t("toast.runtimeOpened");
      state.operationError = "";
      context.toast(result.message || t("toast.runtimeOpened"));
    } catch (error) {
      state.operationResult = "";
      state.operationError = errorMessage(error);
      context.toast(state.operationError, true);
    }
    renderAndBind(context, state);
    return;
  }

  if (action === "health") {
    context.progress.start(t("feature.runtimes.healthCheck"));
    try {
      const report = await inspectRuntimeStrongVerification();
      if (!context.isCurrent()) return;
      state.strongVerification = report;
      state.operationResult = t("feature.runtimes.healthCheckDone");
      state.operationError = "";
      context.progress.done(t("feature.runtimes.healthCheckDone"));
    } catch (error) {
      state.operationResult = "";
      state.operationError = errorMessage(error);
      context.progress.fail(state.operationError);
    }
    renderAndBind(context, state);
    return;
  }

  if (action === "system") {
    try {
      await navigator.clipboard.writeText(`${label} ${version}\n${executable}`);
      const result = await openAppsFeatures();
      state.operationResult = result.message || t("feature.runtimes.externalSystemUninstallHint");
      state.operationError = "";
      context.toast(result.message || t("feature.runtimes.externalSystemUninstallHint"));
    } catch (error) {
      state.operationResult = "";
      state.operationError = errorMessage(error);
      context.toast(state.operationError, true);
    }
    renderAndBind(context, state);
    return;
  }

  if (action === "switch") {
    state.operationResult = "";
    state.operationError = "";
    try {
      const result = await context.risk.run({
        command: "switch_runtime",
        planId: `${kind}:${version}:${path}`,
        riskLevel: "medium",
        title: t("feature.runtimes.switchTitle", { name: label, version }),
        summary: t("feature.runtimes.switchSummary"),
        warnings: [t("feature.runtimes.switchWarning")],
        execute: (confirmationToken) => switchRuntime(kind, version, path, confirmationToken),
      });
      state.operationResult = resultMessage(result, t("feature.runtimes.switchTitle", { name: label, version }));
    } catch (error) {
      state.operationError = errorMessage(error);
    }
    renderAndBind(context, state);
    return;
  }

  if (action === "uninstall") {
    state.operationResult = "";
    state.operationError = "";
    try {
      const result = await context.risk.run({
        command: "uninstall_runtime",
        planId: `${kind}:${version}:${path}`,
        riskLevel: "high",
        title: t("feature.runtimes.uninstallTitle", { name: label, version }),
        summary: t("feature.runtimes.uninstallSummary"),
        warnings: [t("feature.runtimes.uninstallWarning")],
        execute: (confirmationToken) => uninstallRuntime(kind, version, path, confirmationToken),
      });
      state.operationResult = resultMessage(result, t("feature.runtimes.uninstallTitle", { name: label, version }));
    } catch (error) {
      state.operationError = errorMessage(error);
    }
    renderAndBind(context, state);
  }
}

function runtimeName(command: "install_node" | "install_python" | "install_go"): string {
  if (command === "install_node") return "Node.js";
  if (command === "install_python") return "Python";
  return "Go";
}

function normalizeJdkRoot(path: string): string {
  const normalized = path.replace(/\//g, "\\").replace(/\\+$/, "");
  return normalized.toLowerCase().endsWith("\\bin") ? normalized.slice(0, -4) : normalized;
}

function renderAndBind(context: FeatureContext, state: RuntimeWorkbenchState): void {
  if (!context.isCurrent()) return;
  context.root.innerHTML = renderRuntimeWorkbench(state);
  bindRuntimeEvents(context, state);
}

function resultMessage(result: unknown, fallback: string): string {
  if (result && typeof result === "object" && "message" in result) return String((result as { message?: unknown }).message || fallback);
  return fallback;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

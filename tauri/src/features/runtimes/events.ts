import type { FeatureContext } from "../../app/featureContext";
import { t } from "../../core/i18n";
import { bindAction } from "../sharedView";
import { discoverRuntimes, getJdkDistributions, inspectRuntimeStrongVerification, installRuntime, openAppsFeatures, openRuntimeDirectory, switchRuntime, uninstallRuntime } from "./api";
import { renderRuntimeWorkbench } from "./render";
import type { RuntimeWorkbenchState } from "./state";

export function bindRuntimeEvents(context: FeatureContext, state: RuntimeWorkbenchState): void {
  bindAction(context.root, "refresh-runtimes", () => refreshRuntimes(context, state));
  bindAction(context.root, "install-jdk", () => {
    const version = context.root.querySelector<HTMLSelectElement>("#jdk-version")?.value || "21";
    const distribution = context.root.querySelector<HTMLSelectElement>("#jdk-distribution")?.value || "temurin";
    return context.risk.run({
      command: "install_jdk",
      planId: `install_jdk:${version}:${distribution}`,
      riskLevel: "high",
      backupRequired: false,
      title: t("feature.runtimes.installJdkTitle", { version }),
      summary: t("feature.runtimes.installJdkSummary", { version }),
      before: [
        { label: "Distribution", value: distribution },
        { label: "Version", value: version },
      ],
      warnings: [
        t("feature.runtimes.installJdkWhy"),
        t("feature.runtimes.installJdkBackup"),
        t("feature.runtimes.installJdkVerify"),
      ],
      execute: (confirmationToken) => installRuntime("install_jdk", { version, distribution, switchAfterInstall: false, confirmationToken }),
    });
  });
  bindAction(context.root, "install-node", () => installWithRisk(context, "install_node", context.root.querySelector<HTMLSelectElement>("#node-version")?.value || "22"));
  bindAction(context.root, "install-python", () => installWithRisk(context, "install_python", context.root.querySelector<HTMLSelectElement>("#python-version")?.value || "3.12"));
  bindAction(context.root, "install-go", () => installWithRisk(context, "install_go", context.root.querySelector<HTMLSelectElement>("#go-version")?.value || "1.25"));
  bindAction(context.root, "install-maven", () => installLatestWithRisk(context, "install_maven_latest", "Maven"));
  bindAction(context.root, "install-gradle", () => installLatestWithRisk(context, "install_gradle_latest", "Gradle"));
  bindAction(context.root, "verify-runtimes", async () => {
    context.progress.start(t("feature.runtimes.healthCheck"));
    state.strongVerification = await inspectRuntimeStrongVerification();
    if (!context.isCurrent()) return;
    context.progress.done(t("feature.runtimes.healthCheckDone"));
    context.root.innerHTML = renderRuntimeWorkbench(state);
    bindRuntimeEvents(context, state);
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

function installWithRisk(context: FeatureContext, command: "install_node" | "install_python" | "install_go", version: string) {
  return context.risk.run({
    command,
    planId: `${command}:${version}`,
    riskLevel: "high",
    title: t("feature.runtimes.installGenericTitle", { name: runtimeName(command), version }),
    summary: t("feature.runtimes.installGenericSummary"),
    warnings: [t("feature.runtimes.installGenericWarning")],
    execute: (confirmationToken) => installRuntime(command, { version, confirmationToken }),
  });
}

function installLatestWithRisk(context: FeatureContext, command: "install_maven_latest" | "install_gradle_latest", label: string) {
  return context.risk.run({
    command,
    planId: `${command}:latest`,
    riskLevel: "high",
    title: t("feature.runtimes.installGenericTitle", { name: label, version: "latest" }),
    summary: t("feature.runtimes.installGenericSummary"),
    before: [{ label: "Version", value: "latest" }],
    warnings: [t("feature.runtimes.installGenericWarning")],
    execute: (confirmationToken) => installRuntime(command, { confirmationToken }),
  });
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
    await navigator.clipboard.writeText(executable);
    context.toast(t("toast.runtimePathCopied"));
    return;
  }

  if (action === "open") {
    const result = await openRuntimeDirectory(path || executable);
    context.toast(result.message || t("toast.runtimeOpened"));
    return;
  }

  if (action === "health") {
    context.progress.start(t("feature.runtimes.healthCheck"));
    const report = await inspectRuntimeStrongVerification();
    if (!context.isCurrent()) return;
    state.strongVerification = report;
    context.progress.done(t("feature.runtimes.healthCheckDone"));
    context.root.innerHTML = renderRuntimeWorkbench(state);
    bindRuntimeEvents(context, state);
    return;
  }

  if (action === "system") {
    await navigator.clipboard.writeText(`${label} ${version}\n${executable}`);
    const result = await openAppsFeatures();
    context.toast(result.message || t("feature.runtimes.externalSystemUninstallHint"));
    return;
  }

  if (action === "switch") {
    await context.risk.run({
      command: "switch_runtime",
      planId: `${kind}:${version}:${path}`,
      riskLevel: "medium",
      title: `Switch ${label}`,
      summary: "Switches a DevEnv managed runtime through the backend token gate.",
      warnings: ["Only DevEnv managed runtimes can be switched from this list."],
      execute: (confirmationToken) => switchRuntime(kind, version, path, confirmationToken),
    });
    return;
  }

  if (action === "uninstall") {
    await context.risk.run({
      command: "uninstall_runtime",
      planId: `${kind}:${version}:${path}`,
      riskLevel: "high",
      title: `Uninstall ${label}`,
      summary: "Removes a DevEnv managed runtime through the backend token gate.",
      warnings: ["External runtimes are read-only and cannot be uninstalled here."],
      execute: (confirmationToken) => uninstallRuntime(kind, version, path, confirmationToken),
    });
  }
}

function runtimeName(command: "install_node" | "install_python" | "install_go"): string {
  if (command === "install_node") return "Node.js";
  if (command === "install_python") return "Python";
  return "Go";
}

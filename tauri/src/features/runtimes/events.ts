import type { FeatureContext } from "../../app/featureContext";
import { bindAction } from "../sharedView";
import { discoverRuntimes, getJdkDistributions, inspectRuntimeStrongVerification, installRuntime } from "./api";
import { renderRuntimeWorkbench } from "./render";
import type { RuntimeWorkbenchState } from "./state";

export function bindRuntimeEvents(context: FeatureContext, state: RuntimeWorkbenchState): void {
  bindAction(context.root, "refresh-runtimes", () => refreshRuntimes(context, state));
  bindAction(context.root, "install-jdk", () =>
    context.risk.run({
      command: "install_jdk",
      planId: "install_jdk:17",
      riskLevel: "high",
      title: "Install JDK",
      summary: "Downloads and installs a managed JDK. Switch after install remains controlled by the install options.",
      warnings: ["Review the selected version before execution."],
      execute: (confirmationToken) => installRuntime("install_jdk", { version: "17", distribution: "temurin", switchAfterInstall: false, confirmationToken }),
    }),
  );
  bindAction(context.root, "install-node", () => installWithRisk(context, "install_node", "22"));
  bindAction(context.root, "install-python", () => installWithRisk(context, "install_python", "3.12"));
  bindAction(context.root, "install-go", () => installWithRisk(context, "install_go", "1.25"));
  bindAction(context.root, "switch-runtime", () => context.toast("Select a runtime row in the detailed migration pass before switching.", true));
  bindAction(context.root, "uninstall-runtime", () => context.toast("Select a runtime row in the detailed migration pass before uninstalling.", true));
}

export async function refreshRuntimes(context: FeatureContext, state: RuntimeWorkbenchState): Promise<void> {
  const [runtimes, distributions, strongVerification] = await Promise.all([
    discoverRuntimes(),
    getJdkDistributions(),
    inspectRuntimeStrongVerification(),
  ]);
  state.runtimes = runtimes;
  state.distributions = distributions;
  state.strongVerification = strongVerification;
  context.root.innerHTML = renderRuntimeWorkbench(state);
  bindRuntimeEvents(context, state);
}

function installWithRisk(context: FeatureContext, command: "install_node" | "install_python" | "install_go", version: string) {
  return context.risk.run({
    command,
    planId: `${command}:${version}`,
    riskLevel: "high",
    title: `Install ${version}`,
    summary: "Downloads and installs a managed runtime through the backend token gate.",
    warnings: ["This can write managed runtime files and update active runtime pointers."],
    execute: (confirmationToken) => installRuntime(command, { version, confirmationToken }),
  });
}

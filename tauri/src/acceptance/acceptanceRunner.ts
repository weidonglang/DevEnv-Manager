import { renderCleanupWorkbench } from "../features/cleanup/render";
import { renderFileAssociations } from "../features/fileAssociations/render";
import { renderPortsWorkbench } from "../features/ports/render";
import { renderRuntimeWorkbench } from "../features/runtimes/render";
import { renderToolchainWorkbench } from "../features/toolchains/render";
import { acceptanceFixtures } from "./fixtures";
import { acceptanceSelectors } from "./selectors";

export type FrontendAcceptanceResult = {
  caseId: string;
  passed: boolean;
  reason: string;
};

const pageHtml = {
  cleanup: () => renderCleanupWorkbench(acceptanceFixtures.cleanup),
  ports: () => renderPortsWorkbench(acceptanceFixtures.ports),
  runtimes: () => renderRuntimeWorkbench(acceptanceFixtures.runtimes),
  fileAssociations: () => renderFileAssociations(acceptanceFixtures.fileAssociations),
  toolchains: () => renderToolchainWorkbench(acceptanceFixtures.toolchains),
};

export function renderAcceptancePage(pageId: keyof typeof pageHtml): string {
  return pageHtml[pageId]();
}

export function runFrontendAcceptanceSnapshot(): FrontendAcceptanceResult[] {
  const checks: FrontendAcceptanceResult[] = [];
  const portsHtml = renderAcceptancePage("ports");
  checks.push(hasSelector("ports.row.closeabilityReason", portsHtml, acceptanceSelectors.ports.rowCloseabilityReason));
  checks.push(hasSelector("ports.plan.visible", portsHtml, acceptanceSelectors.ports.planPreview));
  checks.push(hasSelector("ports.execute.result", portsHtml, acceptanceSelectors.ports.executeResult));
  checks.push(hasSelector("ports.scan.status", portsHtml, acceptanceSelectors.ports.scanStatus));
  checks.push(hasSelector("ports.scan.scope", portsHtml, acceptanceSelectors.ports.scanScope));

  const runtimeHtml = renderAcceptancePage("runtimes");
  checks.push(hasSelector("runtime.install.jdk", runtimeHtml, acceptanceSelectors.runtime.installJdkGroup));
  checks.push(hasSelector("runtime.install.node", runtimeHtml, acceptanceSelectors.runtime.installNodeGroup));

  const fileAssocHtml = renderAcceptancePage("fileAssociations");
  checks.push(hasSelector("fileAssociations.search", fileAssocHtml, acceptanceSelectors.fileAssociations.searchInput));
  checks.push(hasSelector("fileAssociations.planPreview", fileAssocHtml, acceptanceSelectors.fileAssociations.planPreview));

  const cleanupHtml = renderAcceptancePage("cleanup");
  checks.push(hasSelector("cleanup.diskOverview", cleanupHtml, acceptanceSelectors.cleanup.diskOverviewSection));
  checks.push(hasSelector("cleanup.operationResult", cleanupHtml, acceptanceSelectors.cleanup.operationResult));
  checks.push(hasSelector("cleanup.diskCardGrid", cleanupHtml, acceptanceSelectors.cleanup.diskCardGrid));
  checks.push(hasSelector("cleanup.desktopCandidates", cleanupHtml, acceptanceSelectors.cleanup.desktopCandidateTable));
  checks.push(hasSelector("cleanup.desktopRecyclePlan", cleanupHtml, acceptanceSelectors.cleanup.desktopRecyclePlan));
  checks.push(hasSelector("cleanup.desktopRecycleResult", cleanupHtml, acceptanceSelectors.cleanup.desktopRecycleResult));
  checks.push(hasSelector("cleanup.desktopArchive.targetPicker", cleanupHtml, acceptanceSelectors.cleanup.desktopArchiveTargetPicker));
  checks.push(hasSelector("cleanup.desktopArchive.targetSelect", cleanupHtml, acceptanceSelectors.cleanup.desktopArchiveTargetSelect));
  checks.push(hasSelector("cleanup.downloadsArchive.targetPicker", cleanupHtml, acceptanceSelectors.cleanup.downloadsArchiveTargetPicker));
  checks.push(hasSelector("cleanup.genericArchive.targetPicker", cleanupHtml, acceptanceSelectors.cleanup.genericArchiveTargetPicker));
  checks.push(hasSelector("cleanup.recycleBin.section", cleanupHtml, acceptanceSelectors.cleanup.recycleBinSection));
  checks.push(hasSelector("cleanup.recycleBin.refresh", cleanupHtml, acceptanceSelectors.cleanup.recycleBinRefresh));
  checks.push(hasSelector("cleanup.recycleBin.createPlan", cleanupHtml, acceptanceSelectors.cleanup.recycleBinCreatePlan));
  checks.push(hasSelector("cleanup.recycleBin.executePlan", cleanupHtml, acceptanceSelectors.cleanup.recycleBinExecutePlan));
  checks.push(hasSelector("cleanup.recycleBin.summary", cleanupHtml, acceptanceSelectors.cleanup.recycleBinSummary));
  checks.push(hasSelector("cleanup.recycleBin.volumeScope", cleanupHtml, acceptanceSelectors.cleanup.recycleBinVolumeScope));
  checks.push(hasSelector("cleanup.recycleBin.preview", cleanupHtml, acceptanceSelectors.cleanup.recycleBinPreview));
  checks.push(hasSelector("cleanup.recycleBin.planPreview", cleanupHtml, acceptanceSelectors.cleanup.recycleBinPlanPreview));
  checks.push(hasSelector("cleanup.recycleBin.result", cleanupHtml, acceptanceSelectors.cleanup.recycleBinResult));
  checks.push(hasSelector("cleanup.recycleBin.table", cleanupHtml, acceptanceSelectors.cleanup.recycleBinTable));

  const toolchainsHtml = renderAcceptancePage("toolchains");
  for (const [name, selector] of Object.entries(acceptanceSelectors.toolchains)) {
    checks.push(hasSelector(`toolchains.${name}`, toolchainsHtml, selector));
  }

  return checks;
}

function hasSelector(caseId: string, html: string, testId: string): FrontendAcceptanceResult {
  const token = `data-testid="${testId}"`;
  return {
    caseId,
    passed: html.includes(token),
    reason: html.includes(token) ? `Found ${token}` : `Missing ${token}`,
  };
}

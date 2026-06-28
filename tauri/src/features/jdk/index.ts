export function projectConfigurationPlanId(projectPath: string, enabled: number, switchCount: number) {
  return `${projectPath.trim().replace(/\//g, "\\").toLowerCase()}:${enabled}:${switchCount}`;
}

import type { CommandArgs, InvokeClient } from "../core/invoke";
import { acceptanceFixtures } from "./fixtures";

export type MockInvokeMap = Record<string, unknown | ((args?: CommandArgs) => unknown | Promise<unknown>)>;

export function createMockInvokeClient(overrides: MockInvokeMap = {}): InvokeClient {
  const commands: MockInvokeMap = {
    scan_ports: acceptanceFixtures.ports.records,
    create_port_resolution_plan: acceptanceFixtures.ports.plan,
    execute_port_resolution_plan: acceptanceFixtures.ports.executionResult,
    scan_file_associations: acceptanceFixtures.fileAssociations.report,
    create_file_association_plan: acceptanceFixtures.fileAssociations.plan,
    scan_cleanup_targets: acceptanceFixtures.cleanup.scan,
    inspect_maintenance_overview: acceptanceFixtures.cleanup.overview,
    discover_runtimes: acceptanceFixtures.runtimes.runtimes,
    inspect_system_platforms: acceptanceFixtures.toolchains.system,
    inspect_local_services: acceptanceFixtures.toolchains.services,
    open_docker_desktop: { success: true, message: "Docker Desktop fixture launched." },
    manage_system_platform: { success: true, message: "Platform fixture action completed." },
    open_local_service_directory: { success: true, message: "Service directory fixture opened." },
    local_service_logs: "Fixture Windows Application event log entry.",
    manage_local_service: { success: true, message: "Service fixture action completed." },
    ...overrides,
  };

  return {
    async invoke<T = unknown>(command: string, args?: CommandArgs): Promise<T> {
      if (!(command in commands)) {
        throw new Error(`Mock invoke command is not registered: ${command}`);
      }
      const value = commands[command];
      return (typeof value === "function" ? await value(args) : value) as T;
    },
  };
}

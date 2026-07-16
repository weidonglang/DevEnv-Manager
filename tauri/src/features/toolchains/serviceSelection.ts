export type ServiceSelectionLike = {
  id: string;
  installed: boolean;
  serviceName: string;
  serviceState: string;
  pid: number;
  installDirectory: string;
  pathStatus: string;
};

export type ServiceSelectionResult<T extends ServiceSelectionLike> = {
  selectedId: string;
  selected: T | undefined;
  selectionLost: boolean;
};

export function reconcileServiceSelection<T extends ServiceSelectionLike>(services: T[], selectedId: string): ServiceSelectionResult<T> {
  const selected = services.find((service) => service.id === selectedId);
  return {
    selectedId: selected ? selectedId : "",
    selected,
    selectionLost: Boolean(selectedId && !selected),
  };
}

export function serviceManagementError(service: ServiceSelectionLike | undefined): string {
  if (!service) return "Select a service row before creating a management operation.";
  if (!service.installed || !service.serviceName) return "The selected database service is not installed and cannot be managed.";
  return "";
}

export function serviceDirectoryError(service: ServiceSelectionLike | undefined): string {
  if (!service) return "Select a service row before using its installation directory.";
  if (!service.installDirectory) return service.pathStatus || "The backend did not return a verified installation directory.";
  return "";
}

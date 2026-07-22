import type { DiskVolumeInfo } from "../../types";

export type ArchiveTargetAssessment = {
  eligible: boolean;
  reason: string;
  volume: DiskVolumeInfo | null;
};

export function eligibleArchiveTargets(volumes: DiskVolumeInfo[]): DiskVolumeInfo[] {
  return volumes
    .filter((volume) => volume.archiveTargetEligible)
    .sort((left, right) => right.freeBytes - left.freeBytes || left.drive.localeCompare(right.drive));
}

export function recommendedArchiveTarget(volumes: DiskVolumeInfo[]): string {
  return eligibleArchiveTargets(volumes)[0]?.drive.replace(/[\\/]+$/, "") ?? "";
}

export function targetMatchesVolume(target: string, volume: DiskVolumeInfo): boolean {
  return driveRoot(target) === driveRoot(volume.drive);
}

export function assessArchiveTarget(target: string, volumes: DiskVolumeInfo[]): ArchiveTargetAssessment {
  const root = driveRoot(target);
  if (!root) return { eligible: false, reason: "invalid-path", volume: null };
  const volume = volumes.find((item) => driveRoot(item.drive) === root);
  if (!volume) return { eligible: false, reason: "unknown-volume", volume: null };
  return {
    eligible: volume.archiveTargetEligible,
    reason: volume.archiveTargetEligible ? "eligible" : volume.archiveTargetReason,
    volume,
  };
}

export function isDriveRootSelection(value: string): boolean {
  return /^[a-z]:[\\/]*$/i.test(value.trim());
}

export function driveRoot(value: string): string {
  const match = value.trim().match(/^([a-z]):(?:[\\/]|$)/i);
  return match ? `${match[1].toUpperCase()}:` : "";
}

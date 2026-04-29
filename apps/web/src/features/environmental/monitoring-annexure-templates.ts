import type {
  MonitoringSpatialAnnexureBinding,
  ProjectEnvironmentalMonitoringAnnexure,
  MonitoringSheetTemplateSourceKind,
} from './environmental-monitoring-types';
import { coerceMonitoringAnnexureTemplateSnapshot } from './environmental-monitoring-types';
import { formatGenericRootSheetTemplateLabel } from '@/features/templates/sheet-display-labels';

export const BUILT_IN_MONITORING_REPORT_TEMPLATE_ID = 'builtin-monitoring-report-a4-portrait';

export type MonitoringSpatialAnnexureTemplateDisplaySpec = {
  description: string;
  label: string;
  orientation: 'landscape' | 'portrait';
  paperSize: 'a0' | 'a1' | 'a2' | 'a3' | 'a4';
  sourceKind: 'root_sheet_template' | 'built_in_sheet_template';
  templateId: string;
  versionId: string;
};

export function resolveMonitoringSpatialAnnexureTemplateDisplaySpec(args: {
  bindingJson: MonitoringSpatialAnnexureBinding | null | undefined;
  templateReferenceId: string | null | undefined;
  templateSnapshotJson: Record<string, unknown> | null | undefined;
  templateSourceKind: MonitoringSheetTemplateSourceKind | null | undefined;
}): MonitoringSpatialAnnexureTemplateDisplaySpec {
  // Report Annexure titles can stay report-specific.
  // The Root Sheet Template label shown here stays generic and reusable.
  const rootSheetTemplateSnapshot = args.bindingJson?.rootSheetTemplateSnapshot ?? null;
  if (rootSheetTemplateSnapshot) {
    return {
      description: `Root Sheet Template · ${rootSheetTemplateSnapshot.templateDocument.paperSize.toUpperCase()} ${rootSheetTemplateSnapshot.templateDocument.orientation}`,
      label: formatGenericRootSheetTemplateLabel(rootSheetTemplateSnapshot.label),
      orientation: rootSheetTemplateSnapshot.templateDocument.orientation,
      paperSize: rootSheetTemplateSnapshot.templateDocument.paperSize,
      sourceKind: 'root_sheet_template',
      templateId: rootSheetTemplateSnapshot.id,
      versionId: rootSheetTemplateSnapshot.versionId,
    };
  }

  const normalizedTemplateSnapshot = coerceMonitoringAnnexureTemplateSnapshot(
    args.templateSnapshotJson,
  );
  if (normalizedTemplateSnapshot) {
    return {
      description: `Root Sheet Template snapshot · ${normalizedTemplateSnapshot.paperSize.toUpperCase()} ${normalizedTemplateSnapshot.orientation}`,
      label: formatGenericRootSheetTemplateLabel(normalizedTemplateSnapshot.name),
      orientation: normalizedTemplateSnapshot.orientation,
      paperSize: normalizedTemplateSnapshot.paperSize,
      sourceKind:
        args.templateSourceKind === 'root_sheet_template'
          ? 'root_sheet_template'
          : 'built_in_sheet_template',
      templateId: args.templateReferenceId ?? normalizedTemplateSnapshot.id,
      versionId: 'snapshot',
    };
  }

  return {
    description: 'Saved Root Sheet Template snapshot unavailable',
    label: 'Unknown Root Sheet Template',
    orientation: 'landscape',
    paperSize: 'a4',
    sourceKind:
      args.templateSourceKind === 'root_sheet_template'
        ? 'root_sheet_template'
        : 'built_in_sheet_template',
    templateId: args.templateReferenceId ?? 'unknown-root-sheet-template',
    versionId: 'unknown',
  };
}

export function isMonitoringSpatialAnnexure(
  annexure: ProjectEnvironmentalMonitoringAnnexure,
): boolean {
  return annexure.annexureType === 'spatial_sheet';
}

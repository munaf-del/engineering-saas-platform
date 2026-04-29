'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  Project,
  ProjectSpatialFeature,
  ProjectSpatialFeatureType,
  ProjectSpatialGeometryType,
} from '@eng/shared';
import { PROJECT_SPATIAL_FEATURE_TYPES } from '@eng/shared';
import { useProjectSpatialFeatures } from '@/hooks/use-project-spatial';
import { extractProjectSpecifics } from '@/features/projects/project-specifics-adapter';
import {
  ProjectSpatialMap,
  type ProjectSpatialBasemap,
  type ProjectSpatialMapExportApi,
  type ProjectSpatialMapSnapshot,
} from '@/features/spatial/project-spatial-map';
import { type ProjectSpatialLegendFeatureEntry } from '@/features/spatial/project-spatial-legend';
import { getProjectSpatialFeatureSymbology } from '@/features/spatial/project-spatial-utils';
import { ProjectSpatialSheet } from '@/features/spatial/project-spatial-sheet';
import { createGenericTemplateDetailRows } from '@/features/templates/core/generic-template-document';
import {
  formatGenericRootSheetTemplateLabel,
  formatOperatorFacingSheetLabel,
} from '@/features/templates/sheet-display-labels';
import {
  coerceMonitoringSpatialAnnexureBinding,
  coerceMonitoringAnnexureTemplateSnapshot,
  type MonitoringPackageProjectIdentitySnapshot,
  type ProjectEnvironmentalMonitoringAnnexure,
  type ProjectEnvironmentalMonitoringReport,
  type ProjectEnvironmentalMonitoringReportRecord,
} from './environmental-monitoring-types';

export function MonitoringSpatialAnnexureSheet({
  annexure,
  annexureCode,
  project,
  projectId,
  projectIdentityOverride,
  report,
}: {
  annexure: ProjectEnvironmentalMonitoringAnnexure;
  annexureCode: string;
  project: Project;
  projectId: string;
  projectIdentityOverride?: MonitoringPackageProjectIdentitySnapshot | null;
  report: ProjectEnvironmentalMonitoringReport | ProjectEnvironmentalMonitoringReportRecord;
}) {
  const { data: features = [] } = useProjectSpatialFeatures(projectId);
  const [snapshot, setSnapshot] = useState<ProjectSpatialMapSnapshot | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const exportApiRef = useRef<ProjectSpatialMapExportApi | null>(null);

  // Report Annexure preview reads from the persisted imported snapshot stored on the report record.
  // It does not depend on the original Project Spatial View id after import.
  const persistedViewSnapshot = coerceMonitoringSpatialAnnexureBinding(annexure.bindingJson);
  const normalizedTemplateSnapshot = coerceMonitoringAnnexureTemplateSnapshot(
    annexure.templateSnapshotJson,
  );
  const rootSheetTemplateSnapshot =
    persistedViewSnapshot?.rootSheetTemplateSnapshot?.templateDocument ??
    normalizedTemplateSnapshot;
  const rootSheetTemplateLabel = rootSheetTemplateSnapshot
    ? formatGenericRootSheetTemplateLabel(
        persistedViewSnapshot?.rootSheetTemplateSnapshot?.label ?? rootSheetTemplateSnapshot.name,
      )
    : formatOperatorFacingSheetLabel('Unknown Root Sheet Template');
  const projectSpecifics = useMemo(() => extractProjectSpecifics(project), [project]);
  const projectIdentity = projectIdentityOverride ?? {
    projectNumber: projectSpecifics.identity.projectNumber || project.code || '',
    projectName: projectSpecifics.identity.projectName || project.name,
    client: projectSpecifics.identity.client || '',
    address: projectSpecifics.identity.address || '',
  };
  const projectAddress = projectIdentity.address || null;
  const visibleFeatures = useMemo(
    () =>
      persistedViewSnapshot
        ? features.filter((feature) =>
            persistedViewSnapshot.visibleFeatureTypes.includes(feature.featureType),
          )
        : features,
    [features, persistedViewSnapshot],
  );
  const legendEntries = useMemo(() => buildLegendEntries(visibleFeatures), [visibleFeatures]);
  const annexureNotes = useMemo(
    () =>
      buildAnnexureNotes(
        annexure,
        report,
        persistedViewSnapshot?.activeBasemap ?? 'osm',
        rootSheetTemplateLabel,
      ),
    [annexure, persistedViewSnapshot?.activeBasemap, report, rootSheetTemplateLabel],
  );
  const annexureDetailsBlockRows = useMemo(
    () =>
      buildAnnexureDetailsRows(
        rootSheetTemplateSnapshot?.paperSize ?? 'a4',
        rootSheetTemplateSnapshot?.orientation ?? 'landscape',
      ),
    [rootSheetTemplateSnapshot?.orientation, rootSheetTemplateSnapshot?.paperSize],
  );
  const snapshotKey = JSON.stringify({
    activeBasemap: persistedViewSnapshot?.activeBasemap ?? null,
    featureCount: features.length,
    showGeologyOverlay: persistedViewSnapshot?.showGeologyOverlay ?? null,
    viewState: persistedViewSnapshot?.viewState ?? null,
  });

  useEffect(() => {
    if (!persistedViewSnapshot) {
      setSnapshot(null);
      return;
    }

    let cancelled = false;
    let retryTimeoutId: number | null = null;
    setCaptureError(null);

    async function captureWhenReady(attempt = 0) {
      const exportApi = exportApiRef.current;
      if (!exportApi) {
        if (attempt < 20) {
          retryTimeoutId = window.setTimeout(() => {
            void captureWhenReady(attempt + 1);
          }, 100);
        }
        return;
      }

      try {
        await new Promise((resolve) => window.setTimeout(resolve, 150));
        exportApi.updateSize();
        const nextSnapshot = await exportApi.captureSnapshot();
        if (!nextSnapshot) {
          if (attempt < 20) {
            retryTimeoutId = window.setTimeout(() => {
              void captureWhenReady(attempt + 1);
            }, 100);
          }
          return;
        }
        if (!cancelled) {
          setSnapshot(nextSnapshot);
        }
      } catch {
        if (!cancelled) {
          setCaptureError('Failed to capture the spatial annexure snapshot.');
          setSnapshot(null);
        }
      }
    }

    void captureWhenReady();

    return () => {
      cancelled = true;
      if (retryTimeoutId !== null) {
        window.clearTimeout(retryTimeoutId);
      }
    };
  }, [persistedViewSnapshot, snapshotKey]);

  const handleExportApiReady = useCallback((nextApi: ProjectSpatialMapExportApi | null) => {
    exportApiRef.current = nextApi;
  }, []);

  if (!persistedViewSnapshot) {
    return (
      <div className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
        This Report Annexure does not have a saved Project Spatial View snapshot yet. Import one
        from the Project Spatial Views workspace to render the page.
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="pointer-events-none fixed -left-[10000px] top-0 h-[720px] w-[1040px] overflow-hidden opacity-0 print:hidden">
        <ProjectSpatialMap
          projectId={projectId}
          className="h-full w-full"
          features={visibleFeatures}
          initialFeatures={features}
          initialAddress={projectAddress}
          draftOverlay={null}
          selectedPersistedFeatureId={null}
          focusedPersistedFeatureId={null}
          focusRequestToken={0}
          selectionSyncToken={0}
          activeBasemap={persistedViewSnapshot.activeBasemap}
          showGeologyOverlay={persistedViewSnapshot.showGeologyOverlay}
          lockedViewState={persistedViewSnapshot.viewState}
          exportRequestToken={0}
          mode="select"
          onFeatureSelect={() => {}}
          onGeologyIdentifyStateChange={() => {}}
          onExportApiReady={handleExportApiReady}
          onDrawComplete={() => {}}
          onPersistedFeatureGeometryChange={() => {}}
          onDraftGeometryChange={() => {}}
        />
      </div>

      {snapshot ? (
        <ProjectSpatialSheet
          activeBasemapLabel={labelForBasemap(persistedViewSnapshot.activeBasemap)}
          checkedBy={report.checkedBy ?? ''}
          detailsBlockRows={annexureDetailsBlockRows}
          generatedAtLabel={formatDate(report.issueDate || report.updatedAt)}
          geologyQueryLocation={null}
          layoutMode={rootSheetTemplateSnapshot?.presetId ?? 'as1100_inspired'}
          legendEntries={legendEntries}
          mapFrameSavedViewLabel={annexure.sourceLabel}
          mapImageDataUrl={snapshot.dataUrl}
          mapImageHeight={snapshot.height}
          mapImageWidth={snapshot.width}
          notes={annexureNotes}
          notesBody={annexureNotes}
          orientation={rootSheetTemplateSnapshot?.orientation ?? 'landscape'}
          paperSize={rootSheetTemplateSnapshot?.paperSize ?? 'a4'}
          preparedBy={report.preparedBy ?? ''}
          projectAddress={projectAddress}
          projectCode={projectIdentity.projectNumber || project.code || ''}
          projectName={projectIdentity.projectName || project.name}
          revision={report.revision ?? ''}
          rootSheetTemplate={rootSheetTemplateSnapshot ?? null}
          scaleBar={snapshot.scaleBar}
          sheetNumber={annexureCode}
          sheetTitle={annexure.title}
          showDesignerChrome={false}
          showGeologyOverlay={persistedViewSnapshot.showGeologyOverlay}
          subtitle={buildMonitoringAnnexureSubtitle(report)}
        />
      ) : (
        <div className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
          {captureError ?? 'Preparing spatial annexure snapshot...'}
        </div>
      )}
    </div>
  );
}

function buildLegendEntries(features: ProjectSpatialFeature[]): ProjectSpatialLegendFeatureEntry[] {
  const groupedEntries = new Map<
    string,
    {
      count: number;
      featureType: ProjectSpatialFeatureType;
      geometryType: ProjectSpatialGeometryType;
    }
  >();

  for (const feature of features) {
    const key = `${feature.featureType}:${feature.geometryType}`;
    const existing = groupedEntries.get(key);
    if (existing) {
      existing.count += 1;
      continue;
    }

    groupedEntries.set(key, {
      count: 1,
      featureType: feature.featureType,
      geometryType: feature.geometryType,
    });
  }

  return Array.from(groupedEntries.values())
    .sort((left, right) => {
      const featureTypeOrder =
        PROJECT_SPATIAL_FEATURE_TYPES.indexOf(left.featureType) -
        PROJECT_SPATIAL_FEATURE_TYPES.indexOf(right.featureType);
      if (featureTypeOrder !== 0) {
        return featureTypeOrder;
      }

      return left.geometryType.localeCompare(right.geometryType);
    })
    .map((entry) => {
      const symbology = getProjectSpatialFeatureSymbology(entry.featureType);

      return {
        ...entry,
        label: symbology.label,
        symbology,
      };
    });
}

function buildAnnexureNotes(
  annexure: ProjectEnvironmentalMonitoringAnnexure,
  report: ProjectEnvironmentalMonitoringReport | ProjectEnvironmentalMonitoringReportRecord,
  activeBasemap: ProjectSpatialBasemap,
  rootSheetTemplateLabel: string,
) {
  return [
    `Template: ${rootSheetTemplateLabel}`,
    annexure.sourceLabel ? `View: ${formatOperatorFacingSheetLabel(annexure.sourceLabel)}` : null,
    `Report: ${displayMonitoringReportTitle(report)}`,
    `Basemap: ${labelForBasemap(activeBasemap)}`,
    report.monitoringDate ? `Monitoring date: ${formatDate(report.monitoringDate)}` : null,
    report.purpose?.trim() ? `Purpose: ${report.purpose.trim()}` : null,
    report.weatherConditions?.trim() ? `Weather: ${report.weatherConditions.trim()}` : null,
  ]
    .filter((value): value is string => Boolean(value))
    .join('\n');
}

function buildAnnexureDetailsRows(
  paperSize: 'a0' | 'a1' | 'a2' | 'a3' | 'a4',
  orientation: 'landscape' | 'portrait',
) {
  return createGenericTemplateDetailRows([
    {
      label: 'Sheet',
      value: 'Map Sheet',
    },
    {
      label: 'Paper',
      value: `${paperSize.toUpperCase()} ${titleCase(orientation)}`,
    },
    {
      label: 'Scale',
      value: 'As shown',
    },
  ]);
}

function labelForBasemap(value: ProjectSpatialBasemap) {
  switch (value) {
    case 'nsw_aerial_imagery':
      return 'NSW Aerial Imagery';
    case 'nsw_topographic':
      return 'NSW Topographic';
    case 'osm':
    default:
      return 'OpenStreetMap';
  }
}

function displayMonitoringReportTitle(
  report: ProjectEnvironmentalMonitoringReport | ProjectEnvironmentalMonitoringReportRecord,
) {
  if (report.title?.trim()) {
    return report.title.trim();
  }

  return report.reportType === 'noise_monitoring'
    ? 'Noise Monitoring Report'
    : 'Vibration Monitoring Report';
}

function buildMonitoringAnnexureSubtitle(
  report: ProjectEnvironmentalMonitoringReport | ProjectEnvironmentalMonitoringReportRecord,
) {
  return displayMonitoringReportTitle(report);
}

function titleCase(value: string) {
  return value ? value[0]?.toUpperCase() + value.slice(1) : value;
}

function formatDate(value: string | null) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString();
}

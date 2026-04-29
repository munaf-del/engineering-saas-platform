export type ProjectSpatialViewRecord = {
  annotationsJson: Record<string, unknown> | null;
  basemap: 'osm' | 'nsw_aerial_imagery' | 'nsw_topographic';
  capturedAt: string;
  createdAt: string;
  createdBy: string | null;
  description: string | null;
  filtersJson: Record<string, unknown> | null;
  id: string;
  labelsOrStyleJson: Record<string, unknown> | null;
  name: string;
  projectId: string;
  updatedAt: string;
  viewStateJson: Record<string, unknown>;
  visibleLayersJson: Record<string, unknown>;
};

export type ProjectSpatialViewInput = {
  annotationsJson?: Record<string, unknown> | null;
  basemap: 'osm' | 'nsw_aerial_imagery' | 'nsw_topographic';
  capturedAt?: string | null;
  description?: string | null;
  filtersJson?: Record<string, unknown> | null;
  labelsOrStyleJson?: Record<string, unknown> | null;
  name: string;
  viewStateJson: Record<string, unknown>;
  visibleLayersJson: Record<string, unknown>;
};

export type ProjectSpatialSheetTemplateSourceKind = 'root_sheet_template';

export type ProjectSpatialSheetRecordApi = {
  assignedViewId: string | null;
  assignedViewSnapshotJson: Record<string, unknown> | null;
  bindingSnapshotJson: Record<string, unknown> | null;
  createdAt: string;
  createdBy: string | null;
  id: string;
  name: string;
  orientation: 'portrait' | 'landscape';
  paperSize: 'a0' | 'a1' | 'a2' | 'a3' | 'a4';
  projectId: string;
  rootSheetTemplateId: string | null;
  rootSheetTemplateVersionId: string | null;
  templateReferenceId: string | null;
  templateSnapshotJson: Record<string, unknown> | null;
  templateSourceKind: ProjectSpatialSheetTemplateSourceKind;
  updatedAt: string;
};

export type ProjectSpatialSheetInput = {
  assignedViewId?: string | null;
  assignedViewSnapshotJson?: Record<string, unknown> | null;
  bindingSnapshotJson?: Record<string, unknown> | null;
  name: string;
  orientation: 'portrait' | 'landscape';
  paperSize: 'a0' | 'a1' | 'a2' | 'a3' | 'a4';
  rootSheetTemplateId?: string | null;
  rootSheetTemplateVersionId?: string | null;
  templateReferenceId?: string | null;
  templateSnapshotJson?: Record<string, unknown> | null;
  templateSourceKind: ProjectSpatialSheetTemplateSourceKind;
};

'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
  type RefObject,
} from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { flushSync } from 'react-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Download,
  Lock,
  Loader2,
  Map as MapIcon,
  MapPin,
  MousePointer2,
  Move,
  Pentagon,
  Route,
  Save,
  Trash2,
  Unlock,
  X,
} from 'lucide-react';
import type {
  Project,
  ProjectSpatialFeature,
  ProjectSpatialFeatureInput,
  ProjectSpatialFeatureType,
  ProjectSpatialFeatureProperties,
  ProjectSpatialGeometryJson,
  ProjectSpatialGeometryType,
  ProjectSpatialLinkedDeliverableType,
  ProjectSpatialSourceType,
} from '@eng/shared';
import { PROJECT_SPATIAL_FEATURE_TYPES } from '@eng/shared';
import { PageHeader } from '@/components/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { extractProjectSpecifics } from '@/features/projects/project-specifics-adapter';
import { cn } from '@/lib/utils';
import {
  createGenericTemplateDetailRows,
  normalizeGenericTemplateDocument,
  type GenericTemplateDocument,
} from '@/features/templates/core/generic-template-document';
import {
  createBrowserTemplateLibraryStorageKey,
  createLegacyProjectTemplateMetadataStorageKey,
  createProjectTemplateStoreStorageKey,
  mergeTemplateLibraries,
  parseStoredTemplateLibrary,
} from '@/features/templates/persistence/template-library';
import {
  resolveSpatialSheetTemplateOption,
  useSpatialSheetTemplateCatalog,
  type SpatialSheetTemplateSourceKind,
} from '@/features/templates/spatial-sheet-template-catalog';
import {
  getSpatialSheetCapabilityBadgeLabel,
  getSpatialSheetCapabilityBadgeVariant,
} from '@/features/templates/root-sheet-template-suitability';
import { formatOperatorFacingSheetLabel } from '@/features/templates/sheet-display-labels';
import {
  formatSpatialLabel,
  canClassifyProjectSpatialFeatureAsService,
  getProjectSpatialMetadataFields,
  getProjectSpatialFeatureSymbology,
  getProjectSpatialServiceGeometryType,
  isProjectSpatialServiceFeatureType,
  PROJECT_SPATIAL_FEATURE_TYPE_OPTIONS,
  PROJECT_SPATIAL_LINKED_DELIVERABLE_TYPE_OPTIONS,
  PROJECT_SPATIAL_SOURCE_TYPE_OPTIONS,
  usesProjectSpatialFallbackMetadata,
  type ProjectSpatialServiceFeatureType,
} from './project-spatial-utils';
import {
  useCreateProjectSpatialFeature,
  useDeleteProjectSpatialFeature,
  useProjectSpatialFeatures,
  useProjectSpatialSheets,
  useProjectSpatialViews,
  useUpdateProjectSpatialFeature,
} from '@/hooks/use-project-spatial';
import { api, ApiError } from '@/lib/api-client';
import { toast } from 'sonner';
import {
  formatGeologyLocation,
  ProjectSpatialLegend,
  type ProjectSpatialLegendFeatureEntry,
} from './project-spatial-legend';
import type {
  ProjectSpatialSheetInput,
  ProjectSpatialSheetRecordApi,
  ProjectSpatialViewInput,
  ProjectSpatialViewRecord,
} from './project-spatial-record-types';
import {
  getProjectSpatialSheetPageLayout,
  getProjectSpatialSheetLayoutPreset,
  PROJECT_SPATIAL_MAP_ALIGNMENT_OPTIONS,
  PROJECT_SPATIAL_PAPER_SIZE_OPTIONS,
  PROJECT_SPATIAL_SHEET_MODE_OPTIONS,
  PROJECT_SPATIAL_SHEET_ORIENTATION_OPTIONS,
  PROJECT_SPATIAL_TITLE_BLOCK_POSITION_OPTIONS,
  type ProjectSpatialMapAlignment,
  type ProjectSpatialPaperSize,
  type ProjectSpatialSheetLayoutControls,
  type ProjectSpatialSheetMode,
  type ProjectSpatialSheetOrientation,
  type ProjectSpatialTitleBlockPosition,
} from './project-spatial-sheet-config';
import {
  autoArrangeProjectSpatialSheetObjects,
  autoSizeProjectSpatialSheetObjects,
  clampProjectSpatialSheetObject,
  createDefaultProjectSpatialSheetObjects,
  createProjectSpatialSheetTemplate,
  getProjectSpatialSheetSafeArea,
  getProjectSpatialSheetObjectSizeConstraint,
  getProjectSpatialSheetObjectLabel,
  normalizeProjectSpatialSheetObject,
  normalizeProjectSpatialSheetObjects,
  normalizeProjectSpatialSheetTemplate,
  remapProjectSpatialSheetObjectsToPage,
  resetProjectSpatialSheetObjectToDefault,
  type ProjectSpatialSheetContentMetrics,
  type ProjectSpatialSheetMapFitMode,
  type ProjectSpatialSheetObject,
  type ProjectSpatialSheetTemplate,
} from './project-spatial-sheet-layout';
import { ProjectSpatialSheet } from './project-spatial-sheet';
import type {
  ProjectSpatialBasemap,
  ProjectSpatialDraftOverlay,
  ProjectSpatialMapExportApi,
  ProjectSpatialMapSnapshot,
  ProjectSpatialGeologyIdentifyState,
  ProjectSpatialGeologyInfo,
  ProjectSpatialToolMode,
  ProjectSpatialMapViewState,
} from './project-spatial-map';

const ProjectSpatialMap = dynamic(
  () => import('./project-spatial-map').then((module) => module.ProjectSpatialMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[640px] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-100 text-sm text-muted-foreground">
        Loading spatial map…
      </div>
    ),
  },
);

const NONE_VALUE = '__none__';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PROJECT_SPATIAL_BASEMAP_OPTIONS: Array<{
  value: ProjectSpatialBasemap;
  label: string;
}> = [
  { value: 'osm', label: 'OSM' },
  { value: 'nsw_aerial_imagery', label: 'NSW Aerial Imagery' },
  { value: 'nsw_topographic', label: 'NSW Topographic' },
];

type EditableProjectSpatialFeature = {
  key: string;
  persistedId: string | null;
  label: string;
  featureType: ProjectSpatialFeatureType | '';
  geometryType: ProjectSpatialGeometryType;
  description: string;
  geometryJson: ProjectSpatialGeometryJson;
  status: string;
  sourceType: ProjectSpatialSourceType | '';
  sourceReference: string;
  linkedProjectReferenceId: string;
  linkedAiDocumentId: string;
  linkedDeliverableType: ProjectSpatialLinkedDeliverableType | '';
  linkedDeliverableId: string;
  propertiesJson: ProjectSpatialFeatureProperties | null;
  sortOrder?: number;
  createdAt: string | null;
  updatedAt: string | null;
  isNew: boolean;
};

type ProjectSpatialWorkspaceProps = {
  entryIntent?: 'monitoring-annexure' | null;
  mode?: 'designer' | 'map' | 'sheets' | 'views';
  projectId: string;
  project: Project;
  returnToHref?: string | null;
};

type ProjectSpatialSheetExportState = {
  activeBasemapLabel: string;
  generatedAtLabel: string;
  geologyQueryLocation: [number, number] | null;
  legendEntries: ProjectSpatialLegendFeatureEntry[];
  mapFrameSavedViewLabel: string | null;
  mapSnapshot: ProjectSpatialMapSnapshot;
  metadata: ProjectSpatialSheetMetadata;
  objects: ProjectSpatialSheetObject[];
  rootSheetTemplateSnapshot: GenericTemplateDocument | null;
  showGeologyOverlay: boolean;
};

type ProjectSpatialSheetMetadata = ProjectSpatialSheetLayoutControls & {
  address: string;
  checkedBy: string;
  notes: string;
  orientation: ProjectSpatialSheetOrientation;
  paperSize: ProjectSpatialPaperSize;
  preparedBy: string;
  projectCode: string;
  revision: string;
  sheetNumber: string;
  sheetTitle: string;
  subtitle: string;
};

type ProjectSpatialView = {
  activeBasemap: ProjectSpatialBasemap;
  annotationFeatureIds: string[];
  capturedAt: string;
  description: string;
  id: string;
  label: string;
  labelMode: 'default';
  showGeologyOverlay: boolean;
  visibleFeatureTypes: ProjectSpatialFeatureType[];
  viewState: ProjectSpatialMapViewState;
};

type ProjectSpatialSheetRecord = {
  assignedSavedViewId: string | null;
  createdAt: string;
  id: string;
  metadata: ProjectSpatialSheetMetadata;
  name: string;
  objects: ProjectSpatialSheetObject[];
  rootSheetTemplateSnapshot: GenericTemplateDocument | null;
  templateDefinitionId: string | null;
  templateSourceKind: SpatialSheetTemplateSourceKind;
  templateVersionId: string | null;
  updatedAt: string;
  useLabel: string;
};

type ProjectSpatialSheetStore = {
  selectedSheetId: string | null;
  sheets: ProjectSpatialSheetRecord[];
  templates: ProjectSpatialSheetTemplate[];
  views: ProjectSpatialView[];
};

type ProjectSpatialSheetPreflightSeverity = 'blocking' | 'warning';

type ProjectSpatialSheetPreflightIssue = {
  id: string;
  message: string;
  severity: ProjectSpatialSheetPreflightSeverity;
};

type ProjectSpatialSheetPreflightResult = {
  issues: ProjectSpatialSheetPreflightIssue[];
  objects: ProjectSpatialSheetObject[];
};

type ProjectSpatialSheetDesignerSectionId =
  | 'sheets'
  | 'savedViews'
  | 'objects'
  | 'objectInspector'
  | 'sourceMap';

const EMPTY_PROJECT_SPATIAL_SHEET_METADATA: ProjectSpatialSheetMetadata = {
  ...getProjectSpatialSheetLayoutPreset('as1100_inspired'),
  address: '',
  checkedBy: '',
  notes: '',
  orientation: 'landscape',
  paperSize: 'a4',
  preparedBy: '',
  projectCode: '',
  revision: '',
  sheetNumber: '',
  sheetTitle: '',
  subtitle: '',
};

export function ProjectSpatialWorkspace({
  entryIntent = null,
  mode = 'map',
  projectId,
  project,
  returnToHref = null,
}: ProjectSpatialWorkspaceProps) {
  const projectSpecifics = useMemo(() => extractProjectSpecifics(project), [project]);
  const projectName = projectSpecifics.identity.projectName || project.name;
  const isMapMode = mode === 'map';
  const isViewsMode = mode === 'views';
  const isSheetsMode = mode === 'sheets';
  const isSheetDesignerMode = mode === 'designer';
  const isSheetWorkspaceMode = isSheetsMode || isSheetDesignerMode;
  const canCaptureProjectViewState = isViewsMode || isSheetWorkspaceMode;
  const designerEntrySection: ProjectSpatialSheetDesignerSectionId =
    entryIntent === 'monitoring-annexure' ? 'savedViews' : 'sheets';
  const shouldStartDesignerTrayOpen = isSheetDesignerMode && entryIntent === 'monitoring-annexure';
  const {
    data: features = [],
    isLoading,
    error: featureLoadError,
  } = useProjectSpatialFeatures(projectId);
  const projectSpatialViewsQuery = useProjectSpatialViews(projectId);
  const projectSpatialSheetsQuery = useProjectSpatialSheets(projectId);
  const createFeature = useCreateProjectSpatialFeature(projectId);
  const deleteFeature = useDeleteProjectSpatialFeature(projectId);
  const [toolMode, setToolMode] = useState<ProjectSpatialToolMode>('select');
  const [activeBasemap, setActiveBasemap] = useState<ProjectSpatialBasemap>('osm');
  const [showGeologyOverlay, setShowGeologyOverlay] = useState(false);
  const [geologyIdentifyState, setGeologyIdentifyState] =
    useState<ProjectSpatialGeologyIdentifyState>({ status: 'idle' });
  const [exportRequestToken, setExportRequestToken] = useState(0);
  const [sheetStore, setSheetStore] = useState<ProjectSpatialSheetStore>({
    selectedSheetId: null,
    sheets: [],
    templates: [],
    views: [],
  });
  const [templateLibrary, setTemplateLibrary] = useState<ProjectSpatialSheetTemplate[]>([]);
  const {
    generalTemplateCount,
    refreshTemplateOptions,
    selectableTemplateOptions,
    templateOptions,
  } = useSpatialSheetTemplateCatalog();
  const [sheetPreviewSnapshot, setSheetPreviewSnapshot] =
    useState<ProjectSpatialMapSnapshot | null>(null);
  const [designerZoom, setDesignerZoom] = useState<number | null>(null);
  const [isDesignerBottomTrayCollapsed, setIsDesignerBottomTrayCollapsed] = useState(
    !shouldStartDesignerTrayOpen,
  );
  const [activeDesignerSection, setActiveDesignerSection] =
    useState<ProjectSpatialSheetDesignerSectionId>(designerEntrySection);
  const [isMapFocusMode, setIsMapFocusMode] = useState(false);
  const [isMapLeftPanelCollapsed, setIsMapLeftPanelCollapsed] = useState(false);
  const [isMapRightPanelCollapsed, setIsMapRightPanelCollapsed] = useState(false);
  const [selectedSheetObjectId, setSelectedSheetObjectId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [newSheetTemplateDefinitionId, setNewSheetTemplateDefinitionId] = useState<string>('');
  const [sheetManagerCurrentViewState, setSheetManagerCurrentViewState] =
    useState<ProjectSpatialMapViewState | null>(null);
  const [isSourceMapReady, setIsSourceMapReady] = useState(false);
  const [sourceMapReadyStateLabel, setSourceMapReadyStateLabel] = useState(
    'Map loading / map not ready yet.',
  );
  const [isRefreshingSheetPreview, setIsRefreshingSheetPreview] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [lockedViewState, setLockedViewState] = useState<ProjectSpatialMapViewState | null>(null);
  const [sheetExportState, setSheetExportState] = useState<ProjectSpatialSheetExportState | null>(
    null,
  );
  const [localSpatialImportStore, setLocalSpatialImportStore] =
    useState<ProjectSpatialSheetStore | null>(null);
  const [isImportingLocalSpatialRecords, setIsImportingLocalSpatialRecords] = useState(false);
  const [sheetStoreRecoveryNotice, setSheetStoreRecoveryNotice] = useState<string | null>(null);
  const [visibleFeatureTypes, setVisibleFeatureTypes] = useState<Set<ProjectSpatialFeatureType>>(
    () => new Set(PROJECT_SPATIAL_FEATURE_TYPES),
  );
  const [pendingServiceSourceType, setPendingServiceSourceType] =
    useState<ProjectSpatialServiceFeatureType | null>(null);
  const [draft, setDraft] = useState<EditableProjectSpatialFeature | null>(null);
  const [focusedPersistedFeatureId, setFocusedPersistedFeatureId] = useState<string | null>(null);
  const [focusRequestToken, setFocusRequestToken] = useState(0);
  const [draftBaseline, setDraftBaseline] = useState<string | null>(null);
  const [selectionSyncToken, setSelectionSyncToken] = useState(0);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);
  const geologySectionRef = useRef<HTMLDivElement | null>(null);
  const designerViewportRef = useRef<HTMLDivElement | null>(null);
  const mapExportApiRef = useRef<ProjectSpatialMapExportApi | null>(null);
  const hasPrimedSheetPreviewRef = useRef(false);
  const isWorkspaceMountedRef = useRef(false);
  const previewRequestSequenceRef = useRef(0);
  const sheetCaptureRef = useRef<HTMLDivElement | null>(null);
  const projectSpatialSheetPersistTimeoutRef = useRef<number | null>(null);
  const lastPersistedSheetPayloadsRef = useRef<Record<string, string>>({});
  const updateFeature = useUpdateProjectSpatialFeature(projectId, draft?.persistedId ?? '');
  const projectAddress = useMemo(
    () =>
      resolveProjectSpatialAddress(
        project,
        projectSpecifics.identity.address,
        projectSpecifics.identity.mapAddress,
      ),
    [project, projectSpecifics.identity.address, projectSpecifics.identity.mapAddress],
  );

  const visibleFeatures = useMemo(
    () => features.filter((feature) => visibleFeatureTypes.has(feature.featureType)),
    [features, visibleFeatureTypes],
  );
  const projectServiceSources = useMemo(
    () =>
      features.filter(
        (feature) =>
          feature.featureType === 'service_run' || feature.featureType === 'service_crossing',
      ),
    [features],
  );

  const filterCounts = useMemo(() => {
    const counts = new Map<ProjectSpatialFeatureType, number>();
    for (const featureType of PROJECT_SPATIAL_FEATURE_TYPES) {
      counts.set(featureType, 0);
    }
    for (const feature of features) {
      counts.set(feature.featureType, (counts.get(feature.featureType) ?? 0) + 1);
    }
    return counts;
  }, [features]);

  const hasUnsavedChanges = useMemo(() => {
    if (!draft) {
      return false;
    }
    if (draft.isNew) {
      return true;
    }
    return snapshotDraft(draft) !== draftBaseline;
  }, [draft, draftBaseline]);

  const draftOverlay = useMemo<ProjectSpatialDraftOverlay | null>(
    () =>
      draft
        ? {
            key: draft.key,
            persistedId: draft.persistedId,
            featureType: draft.featureType,
            geometryType: draft.geometryType,
            geometryJson: draft.geometryJson,
          }
        : null,
    [draft],
  );

  const legendFeatureEntries = useMemo<ProjectSpatialLegendFeatureEntry[]>(
    () =>
      buildProjectSpatialLegendEntries({
        draftOverlay,
        features: visibleFeatures,
      }),
    [draftOverlay, visibleFeatures],
  );

  const geologyQueryLocation = useMemo(
    () => resolveGeologyQueryLocation(geologyIdentifyState),
    [geologyIdentifyState],
  );
  const isViewLocked = lockedViewState !== null;
  const defaultSheetMetadata = useMemo<ProjectSpatialSheetMetadata>(
    () => ({
      ...EMPTY_PROJECT_SPATIAL_SHEET_METADATA,
      address: projectAddress ?? '',
      projectCode: project.code ?? '',
      sheetTitle: 'Project Spatial Sheet',
    }),
    [project.code, projectAddress],
  );
  const activeSheet = useMemo(
    () =>
      sheetStore.sheets.find((sheet) => sheet.id === sheetStore.selectedSheetId) ??
      sheetStore.sheets[0] ??
      null,
    [sheetStore.selectedSheetId, sheetStore.sheets],
  );
  const activeSheetId = activeSheet?.id ?? null;
  const activeSheetSavedViews = useMemo(() => sheetStore.views, [sheetStore.views]);
  const activeSheetSavedView = useMemo(
    () =>
      activeSheetSavedViews.find(
        (savedView) => savedView.id === activeSheet?.assignedSavedViewId,
      ) ?? null,
    [activeSheet?.assignedSavedViewId, activeSheetSavedViews],
  );
  const doesCurrentMapMatchAssignedView = useMemo(() => {
    if (!activeSheetSavedView || !sheetManagerCurrentViewState) {
      return null;
    }

    return (
      activeBasemap === activeSheetSavedView.activeBasemap &&
      showGeologyOverlay === activeSheetSavedView.showGeologyOverlay &&
      areProjectSpatialFeatureTypeSetsEqual(
        visibleFeatureTypes,
        new Set(activeSheetSavedView.visibleFeatureTypes),
      ) &&
      areProjectSpatialViewStatesEqual(sheetManagerCurrentViewState, activeSheetSavedView.viewState)
    );
  }, [
    activeBasemap,
    activeSheetSavedView,
    sheetManagerCurrentViewState,
    showGeologyOverlay,
    visibleFeatureTypes,
  ]);
  const selectedTemplate = useMemo(
    () =>
      selectedTemplateId
        ? (templateLibrary.find((template) => template.id === selectedTemplateId) ?? null)
        : null,
    [selectedTemplateId, templateLibrary],
  );
  const normalizedSheetMetadata = useMemo(
    () => normalizeProjectSpatialSheetMetadata(activeSheet?.metadata, defaultSheetMetadata),
    [activeSheet?.metadata, defaultSheetMetadata],
  );
  const sheetContentMetrics = useMemo<ProjectSpatialSheetContentMetrics>(
    () =>
      buildProjectSpatialSheetContentMetrics({
        address: normalizedSheetMetadata.address || projectAddress || '',
        legendEntries: legendFeatureEntries.map((entry) => entry.label),
        notes: normalizedSheetMetadata.notes,
        projectName,
        sheetTitle: normalizedSheetMetadata.sheetTitle,
        showGeologyOverlay: activeSheetSavedView?.showGeologyOverlay ?? showGeologyOverlay,
        subtitle: normalizedSheetMetadata.subtitle,
      }),
    [
      activeSheetSavedView?.showGeologyOverlay,
      legendFeatureEntries,
      normalizedSheetMetadata.address,
      normalizedSheetMetadata.notes,
      normalizedSheetMetadata.sheetTitle,
      normalizedSheetMetadata.subtitle,
      projectAddress,
      projectName,
      showGeologyOverlay,
    ],
  );
  const activeSheetObjects = useMemo(
    () =>
      activeSheet
        ? normalizeProjectSpatialSheetObjects(
            activeSheet.objects,
            normalizedSheetMetadata.paperSize,
            normalizedSheetMetadata.orientation,
          )
        : [],
    [activeSheet, normalizedSheetMetadata.orientation, normalizedSheetMetadata.paperSize],
  );
  const activeSheetMapFrameObject = useMemo(
    () => activeSheetObjects.find((object) => object.type === 'mapFrame') ?? null,
    [activeSheetObjects],
  );
  const activeSheetMapFrameSavedView = useMemo(() => {
    const linkedSavedViewId =
      activeSheetMapFrameObject?.linkedSavedViewId ?? activeSheet?.assignedSavedViewId ?? null;
    if (!linkedSavedViewId) {
      return null;
    }

    return activeSheetSavedViews.find((savedView) => savedView.id === linkedSavedViewId) ?? null;
  }, [activeSheet?.assignedSavedViewId, activeSheetMapFrameObject, activeSheetSavedViews]);
  const sheetVisibleFeatureTypes = useMemo(
    () =>
      new Set<ProjectSpatialFeatureType>(
        activeSheetMapFrameSavedView?.visibleFeatureTypes?.length
          ? activeSheetMapFrameSavedView.visibleFeatureTypes
          : Array.from(visibleFeatureTypes),
      ),
    [activeSheetMapFrameSavedView?.visibleFeatureTypes, visibleFeatureTypes],
  );
  const sheetVisibleFeatures = useMemo(
    () => features.filter((feature) => sheetVisibleFeatureTypes.has(feature.featureType)),
    [features, sheetVisibleFeatureTypes],
  );
  const sheetLegendFeatureEntries = useMemo<ProjectSpatialLegendFeatureEntry[]>(
    () =>
      buildProjectSpatialLegendEntries({
        draftOverlay,
        features: sheetVisibleFeatures,
      }),
    [draftOverlay, sheetVisibleFeatures],
  );
  const previewSheetBasemap = activeSheetMapFrameSavedView?.activeBasemap ?? activeBasemap;
  const previewSheetBasemapLabel = useMemo(
    () =>
      PROJECT_SPATIAL_BASEMAP_OPTIONS.find((option) => option.value === previewSheetBasemap)
        ?.label ?? formatSpatialLabel(previewSheetBasemap),
    [previewSheetBasemap],
  );
  const previewSheetShowGeologyOverlay =
    activeSheetMapFrameSavedView?.showGeologyOverlay ?? showGeologyOverlay;
  const activeSheetDetailsBlockRows = useMemo(
    () =>
      buildProjectSpatialSheetDetailsBlockRows({
        activeBasemapLabel: previewSheetBasemapLabel,
        metadata: normalizedSheetMetadata,
        savedView: activeSheetMapFrameSavedView,
        showGeologyOverlay: previewSheetShowGeologyOverlay,
      }),
    [
      activeSheetMapFrameSavedView,
      normalizedSheetMetadata,
      previewSheetBasemapLabel,
      previewSheetShowGeologyOverlay,
    ],
  );
  const activeSheetNotesBody = useMemo(
    () =>
      buildProjectSpatialSheetNotesBody({
        activeBasemapLabel: previewSheetBasemapLabel,
        metadata: normalizedSheetMetadata,
        savedView: activeSheetMapFrameSavedView,
        showGeologyOverlay: previewSheetShowGeologyOverlay,
      }),
    [
      activeSheetMapFrameSavedView,
      normalizedSheetMetadata,
      previewSheetBasemapLabel,
      previewSheetShowGeologyOverlay,
    ],
  );
  const selectedSheetObject = useMemo(
    () =>
      activeSheetObjects.find((object) => object.id === selectedSheetObjectId) ??
      activeSheetObjects[0] ??
      null,
    [activeSheetObjects, selectedSheetObjectId],
  );
  const selectedObjectSizeConstraint = useMemo(
    () =>
      selectedSheetObject
        ? getProjectSpatialSheetObjectSizeConstraint(
            selectedSheetObject.type,
            normalizedSheetMetadata.paperSize,
            normalizedSheetMetadata.orientation,
          )
        : null,
    [normalizedSheetMetadata.orientation, normalizedSheetMetadata.paperSize, selectedSheetObject],
  );
  const sheetPreflight = useMemo<ProjectSpatialSheetPreflightResult | null>(
    () =>
      activeSheet
        ? activeSheet.templateSourceKind === 'root_sheet_template' &&
          activeSheet.rootSheetTemplateSnapshot !== null
          ? {
              issues: [],
              objects: activeSheetObjects,
            }
          : buildProjectSpatialSheetPreflight({
              assignedSavedViewId: activeSheet.assignedSavedViewId,
              contentMetrics: sheetContentMetrics,
              objects: activeSheetObjects,
              orientation: normalizedSheetMetadata.orientation,
              paperSize: normalizedSheetMetadata.paperSize,
              savedViews: activeSheetSavedViews,
            })
        : null,
    [
      activeSheet,
      activeSheetObjects,
      activeSheetSavedViews,
      normalizedSheetMetadata.orientation,
      normalizedSheetMetadata.paperSize,
      sheetContentMetrics,
    ],
  );
  const designerViewportSize = useElementSize(designerViewportRef, isSheetDesignerMode);
  const previewPageLayout = useMemo(
    () =>
      getProjectSpatialSheetPageLayout(
        normalizedSheetMetadata.paperSize,
        normalizedSheetMetadata.orientation,
      ),
    [normalizedSheetMetadata.orientation, normalizedSheetMetadata.paperSize],
  );
  const fitPreviewScale = useMemo(() => {
    if (designerViewportSize.width <= 0 || designerViewportSize.height <= 0) {
      return clamp(
        Math.min(960 / previewPageLayout.widthPx, 820 / previewPageLayout.heightPx),
        0.32,
        2.6,
      );
    }

    return clamp(
      Math.min(
        (designerViewportSize.width - 48) / previewPageLayout.widthPx,
        (designerViewportSize.height - 48) / previewPageLayout.heightPx,
      ),
      0.32,
      2.6,
    );
  }, [
    designerViewportSize.height,
    designerViewportSize.width,
    previewPageLayout.heightPx,
    previewPageLayout.widthPx,
  ]);
  const previewScale = designerZoom ?? fitPreviewScale;
  const previewRefreshKey = useMemo(
    () =>
      JSON.stringify({
        activeBasemap: activeSheetMapFrameSavedView ? null : activeBasemap,
        assignedSavedView: activeSheetMapFrameSavedView
          ? {
              activeBasemap: activeSheetMapFrameSavedView.activeBasemap,
              capturedAt: activeSheetMapFrameSavedView.capturedAt,
              id: activeSheetMapFrameSavedView.id,
              showGeologyOverlay: activeSheetMapFrameSavedView.showGeologyOverlay,
            }
          : null,
        draft: draftOverlay
          ? {
              featureType: draftOverlay.featureType,
              geometryType: draftOverlay.geometryType,
              key: draftOverlay.key,
            }
          : null,
        geologyQueryLocation,
        projectId,
        showGeologyOverlay: activeSheetMapFrameSavedView ? null : showGeologyOverlay,
        visibleFeatures: visibleFeatures.map((feature) => ({
          featureType: feature.featureType,
          geometryType: feature.geometryType,
          id: feature.id,
          updatedAt: feature.updatedAt,
        })),
      }),
    [
      activeBasemap,
      activeSheetMapFrameSavedView,
      draftOverlay,
      geologyQueryLocation,
      projectId,
      showGeologyOverlay,
      visibleFeatures,
    ],
  );
  const effectiveSheetPreviewSnapshot = sheetPreviewSnapshot;
  const sheetStoreStorageKey = createProjectTemplateStoreStorageKey(
    'project-spatial-sheets',
    projectId,
  );
  const legacySheetMetadataStorageKey = createLegacyProjectTemplateMetadataStorageKey(
    'project-spatial-sheet-metadata',
    projectId,
  );
  const sheetTemplateLibraryStorageKey = createBrowserTemplateLibraryStorageKey(
    'project-spatial-sheet-template-library',
  );

  const linkedAiDocumentIdError =
    draft?.linkedAiDocumentId.trim() && !UUID_PATTERN.test(draft.linkedAiDocumentId.trim())
      ? 'AI document ID must be a valid UUID.'
      : null;
  const returnToLabel = useMemo(
    () => resolveProjectSpatialWorkspaceReturnLabel(returnToHref),
    [returnToHref],
  );
  const spatialFeatureLoadErrorMessage = useMemo(
    () => (featureLoadError ? extractProjectSpatialLoadErrorMessage(featureLoadError) : null),
    [featureLoadError],
  );
  const refetchProjectSpatialRecords = useCallback(async () => {
    await Promise.all([projectSpatialViewsQuery.refetch(), projectSpatialSheetsQuery.refetch()]);
  }, [projectSpatialSheetsQuery, projectSpatialViewsQuery]);

  const persistProjectSpatialSheetRecord = useCallback(
    async (sheetId: string, payload: Partial<ProjectSpatialSheetInput>) => {
      const result = await api<ProjectSpatialSheetRecordApi>(
        `/projects/${projectId}/spatial/sheets/${sheetId}`,
        {
          method: 'PATCH',
          body: payload,
        },
      );
      return result;
    },
    [projectId],
  );
  const queueProjectSpatialSheetPersistence = useCallback(
    (sheet: ProjectSpatialSheetRecord) => {
      if (typeof window === 'undefined') {
        return;
      }

      const payload = buildProjectSpatialSheetInput(sheet);
      const serializedPayload = JSON.stringify(payload);
      if (lastPersistedSheetPayloadsRef.current[sheet.id] === serializedPayload) {
        return;
      }

      if (projectSpatialSheetPersistTimeoutRef.current !== null) {
        window.clearTimeout(projectSpatialSheetPersistTimeoutRef.current);
      }

      projectSpatialSheetPersistTimeoutRef.current = window.setTimeout(() => {
        void persistProjectSpatialSheetRecord(sheet.id, payload)
          .then(() => {
            lastPersistedSheetPayloadsRef.current[sheet.id] = serializedPayload;
          })
          .catch((error) => {
            console.error('Failed to persist Project Spatial Sheet', error);
            toast.error('Failed to save Project Spatial Sheet');
          });
      }, 450);
    },
    [persistProjectSpatialSheetRecord],
  );

  useEffect(() => {
    isWorkspaceMountedRef.current = true;

    return () => {
      isWorkspaceMountedRef.current = false;
      if (projectSpatialSheetPersistTimeoutRef.current !== null) {
        window.clearTimeout(projectSpatialSheetPersistTimeoutRef.current);
        projectSpatialSheetPersistTimeoutRef.current = null;
      }
      previewRequestSequenceRef.current += 1;
      mapExportApiRef.current = null;
      hasPrimedSheetPreviewRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!draft?.persistedId || hasUnsavedChanges) {
      return;
    }

    const latest = features.find((feature) => feature.id === draft.persistedId);
    if (!latest) {
      setDraft(null);
      setDraftBaseline(null);
      return;
    }

    const nextDraft = editableDraftFromFeature(latest);
    const nextSnapshot = snapshotDraft(nextDraft);
    if (nextSnapshot !== draftBaseline) {
      setDraft(nextDraft);
      setDraftBaseline(nextSnapshot);
    }
  }, [draft, draftBaseline, features, hasUnsavedChanges]);

  useEffect(() => {
    if (showGeologyOverlay) {
      return;
    }

    setGeologyIdentifyState({ status: 'idle' });
  }, [showGeologyOverlay]);

  useEffect(() => {
    setGeologyIdentifyState({ status: 'idle' });
  }, [projectId]);

  useEffect(() => {
    setLockedViewState(null);
  }, [projectId]);

  useEffect(() => {
    hasPrimedSheetPreviewRef.current = false;
    setSheetPreviewSnapshot(null);
    setIsDesignerBottomTrayCollapsed(!shouldStartDesignerTrayOpen);
    setActiveDesignerSection(designerEntrySection);
    setIsMapFocusMode(false);
    setIsMapLeftPanelCollapsed(false);
    setIsMapRightPanelCollapsed(false);
    setSelectedSheetObjectId(null);
    setSelectedTemplateId(null);
    setDesignerZoom(null);
  }, [designerEntrySection, isSheetDesignerMode, projectId, shouldStartDesignerTrayOpen]);

  useEffect(() => {
    setSelectedSheetObjectId((current) =>
      activeSheetObjects.some((object) => object.id === current)
        ? current
        : (activeSheetObjects[0]?.id ?? null),
    );
  }, [activeSheetId, activeSheetObjects]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const storedSheetStore = window.localStorage.getItem(sheetStoreStorageKey);
    const parsedStoredSheetStore = storedSheetStore
      ? parseStoredSheetStore(storedSheetStore)
      : null;
    const storedLegacySheetMetadata = parsedStoredSheetStore
      ? null
      : window.localStorage.getItem(legacySheetMetadataStorageKey);
    const parsedLegacySheetMetadata = storedLegacySheetMetadata
      ? parseStoredSheetMetadata(storedLegacySheetMetadata)
      : null;
    const recoveredFromInvalidLocalState =
      (storedSheetStore !== null && parsedStoredSheetStore === null) ||
      (storedLegacySheetMetadata !== null && parsedLegacySheetMetadata === null);
    const initialStore =
      parsedStoredSheetStore ??
      (parsedLegacySheetMetadata
        ? {
            selectedSheetId: null,
            sheets: [
              createProjectSpatialSheetRecord(defaultSheetMetadata, projectName, [], {
                metadata: parsedLegacySheetMetadata,
                name: 'General Site Plan',
              }),
            ],
          }
        : null);
    const normalizedImportStore = normalizeProjectSpatialSheetStore(
      initialStore,
      defaultSheetMetadata,
      projectName,
    );
    const storedTemplateLibrary = window.localStorage.getItem(sheetTemplateLibraryStorageKey);
    const parsedTemplateLibrary = storedTemplateLibrary
      ? parseStoredTemplateLibrary(storedTemplateLibrary, normalizeProjectSpatialSheetTemplate)
      : [];

    setSheetStore((current) => ({
      ...current,
      selectedSheetId: null,
      sheets: [],
      views: [],
    }));
    setTemplateLibrary(
      mergeTemplateLibraries(
        normalizeProjectSpatialSheetTemplate,
        parsedTemplateLibrary,
        normalizedImportStore.templates,
      ),
    );
    const markedImported = window.localStorage.getItem(buildLocalSpatialImportMarkerKey(projectId));
    setLocalSpatialImportStore(
      markedImported
        ? null
        : hasLegacySpatialRecordsForImport(normalizedImportStore)
          ? normalizedImportStore
          : null,
    );
    setSheetStoreRecoveryNotice(
      recoveredFromInvalidLocalState
        ? 'Recovered unreadable browser-local Spatial state. Durable Project Spatial Views and Project Spatial Sheets now load from the server.'
        : null,
    );
  }, [
    defaultSheetMetadata,
    legacySheetMetadataStorageKey,
    projectId,
    projectName,
    sheetStoreStorageKey,
    sheetTemplateLibraryStorageKey,
  ]);

  useEffect(() => {
    if (!projectSpatialViewsQuery.data || !projectSpatialSheetsQuery.data) {
      return;
    }

    const nextViews = projectSpatialViewsQuery.data.map((view) =>
      coerceProjectSpatialViewRecord(view),
    );
    const nextSheets = projectSpatialSheetsQuery.data.map((sheet) =>
      coerceProjectSpatialSheetRecordFromApi(sheet, defaultSheetMetadata, projectName, nextViews),
    );

    lastPersistedSheetPayloadsRef.current = Object.fromEntries(
      nextSheets.map((sheet) => [sheet.id, JSON.stringify(buildProjectSpatialSheetInput(sheet))]),
    );

    setSheetStore((current) => ({
      ...current,
      selectedSheetId: nextSheets.some((sheet) => sheet.id === current.selectedSheetId)
        ? current.selectedSheetId
        : (nextSheets[0]?.id ?? null),
      sheets: nextSheets,
      views: nextViews,
    }));
  }, [
    defaultSheetMetadata,
    projectName,
    projectSpatialSheetsQuery.data,
    projectSpatialViewsQuery.data,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(sheetTemplateLibraryStorageKey, JSON.stringify(templateLibrary));
  }, [sheetTemplateLibraryStorageKey, templateLibrary]);

  useEffect(() => {
    if (!showGeologyOverlay || !geologySectionRef.current) {
      return;
    }

    const frameId = requestAnimationFrame(() => {
      geologySectionRef.current?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [geologyIdentifyState, showGeologyOverlay]);

  const refreshSheetPreviewSnapshot = useCallback(
    async (api: ProjectSpatialMapExportApi) => {
      const requestId = previewRequestSequenceRef.current + 1;
      previewRequestSequenceRef.current = requestId;
      setIsRefreshingSheetPreview(true);

      try {
        api.updateSize();
        await waitForNextAnimationFrame();
        const currentViewState = api.getViewState();
        if (!currentViewState) {
          return;
        }
        const currentBasemap = activeBasemap;
        const currentGeologyOverlayState = showGeologyOverlay;
        const currentVisibleFeatureTypes = Array.from(visibleFeatureTypes);
        const previewSavedView = activeSheetMapFrameSavedView;
        let snapshot: ProjectSpatialMapSnapshot;

        if (previewSavedView) {
          const shouldSwapBasemap =
            currentBasemap !== previewSavedView.activeBasemap ||
            currentGeologyOverlayState !== previewSavedView.showGeologyOverlay;
          const shouldSwapVisibleFeatureTypes = !areProjectSpatialFeatureTypeSetsEqual(
            visibleFeatureTypes,
            new Set(previewSavedView.visibleFeatureTypes),
          );

          try {
            if (shouldSwapBasemap || shouldSwapVisibleFeatureTypes) {
              flushSync(() => {
                if (shouldSwapBasemap) {
                  setActiveBasemap(previewSavedView.activeBasemap);
                  setShowGeologyOverlay(previewSavedView.showGeologyOverlay);
                }
                if (shouldSwapVisibleFeatureTypes) {
                  setVisibleFeatureTypes(new Set(previewSavedView.visibleFeatureTypes));
                }
              });
              await waitForNextAnimationFrame();
            }

            api.setViewState(previewSavedView.viewState);
            await waitForNextAnimationFrame();
            const nextSnapshot = await api.captureSnapshot();
            if (!nextSnapshot) {
              return;
            }
            snapshot = nextSnapshot;
          } finally {
            if (shouldSwapBasemap || shouldSwapVisibleFeatureTypes) {
              flushSync(() => {
                if (shouldSwapBasemap) {
                  setActiveBasemap(currentBasemap);
                  setShowGeologyOverlay(currentGeologyOverlayState);
                }
                if (shouldSwapVisibleFeatureTypes) {
                  setVisibleFeatureTypes(new Set(currentVisibleFeatureTypes));
                }
              });
              await waitForNextAnimationFrame();
            }

            api.setViewState(currentViewState);
            await waitForNextAnimationFrame();
          }
        } else {
          const nextSnapshot = await api.captureSnapshot();
          if (!nextSnapshot) {
            return;
          }
          snapshot = nextSnapshot;
        }

        if (
          isWorkspaceMountedRef.current &&
          requestId === previewRequestSequenceRef.current &&
          (!previewSavedView || isSheetWorkspaceMode)
        ) {
          setSheetPreviewSnapshot(snapshot);
        }
      } catch (error) {
        console.error('Failed to refresh spatial sheet preview snapshot', error);
      } finally {
        if (isWorkspaceMountedRef.current && requestId === previewRequestSequenceRef.current) {
          setIsRefreshingSheetPreview(false);
        }
      }
    },
    [
      activeBasemap,
      activeSheetMapFrameSavedView,
      isSheetWorkspaceMode,
      showGeologyOverlay,
      visibleFeatureTypes,
    ],
  );

  useEffect(() => {
    const exportApi = mapExportApiRef.current;
    if (!exportApi || typeof window === 'undefined' || !isSheetWorkspaceMode) {
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      if (cancelled) {
        return;
      }

      void refreshSheetPreviewSnapshot(exportApi);
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [isSheetWorkspaceMode, previewRefreshKey, refreshSheetPreviewSnapshot]);

  useEffect(() => {
    if (!isSheetWorkspaceMode) {
      previewRequestSequenceRef.current += 1;
      hasPrimedSheetPreviewRef.current = false;
      mapExportApiRef.current = null;
      setSheetPreviewSnapshot(null);
      setSheetExportState(null);
      setSheetManagerCurrentViewState(null);
      return;
    }

    const exportApi = mapExportApiRef.current;
    if (!exportApi) {
      return;
    }

    hasPrimedSheetPreviewRef.current = true;
    void refreshSheetPreviewSnapshot(exportApi);
  }, [isSheetWorkspaceMode, refreshSheetPreviewSnapshot]);

  useEffect(() => {
    if (!canCaptureProjectViewState) {
      setIsSourceMapReady(false);
      setSourceMapReadyStateLabel('Map loading / map not ready yet.');
      return;
    }

    const exportApi = mapExportApiRef.current;
    if (!exportApi || typeof window === 'undefined') {
      return;
    }

    const syncViewState = () => {
      try {
        const nextViewState = exportApi.getViewState();
        const nextIsReady = exportApi.isReady();
        setIsSourceMapReady(nextIsReady);
        setSourceMapReadyStateLabel(exportApi.readyStateLabel());
        if (!nextViewState) {
          return;
        }
        setSheetManagerCurrentViewState((current) =>
          current && areProjectSpatialViewStatesEqual(current, nextViewState)
            ? current
            : nextViewState,
        );
      } catch (error) {
        console.error('Failed to read spatial map view state for sheet manager', error);
      }
    };

    syncViewState();
    const intervalId = window.setInterval(syncViewState, 500);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [canCaptureProjectViewState]);

  useEffect(() => {
    if (!isSheetDesignerMode || typeof document === 'undefined') {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isSheetDesignerMode]);

  useEffect(() => {
    if (!isSheetDesignerMode) {
      return;
    }

    setDesignerZoom(null);
  }, [isSheetDesignerMode, normalizedSheetMetadata.orientation, normalizedSheetMetadata.paperSize]);

  function runWithUnsavedChangesGuard(action: () => void) {
    if (!hasUnsavedChanges) {
      action();
      return;
    }

    pendingActionRef.current = action;
    setSelectionSyncToken((current) => current + 1);
    setShowDiscardDialog(true);
  }

  function applyPendingDiscardAction() {
    setShowDiscardDialog(false);
    const pendingAction = pendingActionRef.current;
    pendingActionRef.current = null;
    pendingAction?.();
  }

  function clearDraft() {
    setDraft(null);
    setDraftBaseline(null);
    setPendingServiceSourceType(null);
    setToolMode('select');
  }

  function openFeatureDraft(feature: ProjectSpatialFeature) {
    const nextDraft = editableDraftFromFeature(feature);
    setDraft(nextDraft);
    setDraftBaseline(snapshotDraft(nextDraft));
    if (!isMapFocusMode) {
      setIsMapRightPanelCollapsed(false);
    }
  }

  function handleFeatureSelection(featureId: string | null) {
    runWithUnsavedChangesGuard(() => {
      if (!featureId) {
        clearDraft();
        return;
      }

      const feature = features.find((item) => item.id === featureId);
      if (feature) {
        openFeatureDraft(feature);
      }
    });
  }

  function handleFeatureListSelection(featureId: string) {
    runWithUnsavedChangesGuard(() => {
      const feature = features.find((item) => item.id === featureId);
      if (!feature) {
        return;
      }

      openFeatureDraft(feature);
      setFocusedPersistedFeatureId(feature.id);
      setFocusRequestToken((current) => current + 1);
    });
  }

  function handleDrawComplete(
    geometryType: ProjectSpatialGeometryType,
    geometryJson: ProjectSpatialGeometryJson,
  ) {
    runWithUnsavedChangesGuard(() => {
      const serviceFeatureType =
        pendingServiceSourceType &&
        canClassifyProjectSpatialFeatureAsService(geometryType, pendingServiceSourceType)
          ? pendingServiceSourceType
          : '';

      setDraft({
        key: `draft-${Date.now()}`,
        persistedId: null,
        label: '',
        featureType: serviceFeatureType,
        geometryType,
        description: '',
        geometryJson,
        status: '',
        sourceType: serviceFeatureType ? 'manual' : '',
        sourceReference: '',
        linkedProjectReferenceId: '',
        linkedAiDocumentId: '',
        linkedDeliverableType: '',
        linkedDeliverableId: '',
        propertiesJson: null,
        createdAt: null,
        updatedAt: null,
        isNew: true,
      });
      setDraftBaseline(null);
      setPendingServiceSourceType(null);
      setToolMode('select');
      if (!isMapFocusMode) {
        setIsMapRightPanelCollapsed(false);
      }
    });
  }

  function startServiceSourceDraft(featureType: ProjectSpatialServiceFeatureType) {
    runWithUnsavedChangesGuard(() => {
      setPendingServiceSourceType(featureType);
      setToolMode(
        getProjectSpatialServiceGeometryType(featureType) === 'line_string'
          ? 'draw_line_string'
          : 'draw_point',
      );
      setIsMapRightPanelCollapsed(false);
      toast.info(
        featureType === 'service_run'
          ? 'Draw a service run line, then complete the source fields.'
          : 'Place a crossing point, then complete the source fields.',
      );
    });
  }

  function classifyDraftAsServiceSource(featureType: ProjectSpatialServiceFeatureType) {
    if (!draft) {
      return;
    }

    if (!canClassifyProjectSpatialFeatureAsService(draft.geometryType, featureType)) {
      toast.error(
        featureType === 'service_run'
          ? 'A service run must use line geometry.'
          : 'A service crossing must use point geometry.',
      );
      return;
    }

    setDraft((current) =>
      current
        ? {
            ...current,
            featureType,
            sourceType: current.sourceType || 'manual',
          }
        : current,
    );
    setVisibleFeatureTypes((current) => new Set(current).add(featureType));
  }

  function handlePersistedFeatureGeometryChange(
    featureId: string,
    geometryJson: ProjectSpatialGeometryJson,
    geometryType: ProjectSpatialGeometryType,
  ) {
    setDraft((current) => {
      if (current?.persistedId !== featureId) {
        const feature = features.find((item) => item.id === featureId);
        if (!feature) {
          return current;
        }

        return {
          ...editableDraftFromFeature(feature),
          geometryJson,
          geometryType,
        };
      }

      return current
        ? {
            ...current,
            geometryJson,
            geometryType,
          }
        : current;
    });
  }

  function handleDraftGeometryChange(
    geometryJson: ProjectSpatialGeometryJson,
    geometryType: ProjectSpatialGeometryType,
  ) {
    setDraft((current) =>
      current
        ? {
            ...current,
            geometryJson,
            geometryType,
          }
        : current,
    );
  }

  function updateDraftField<K extends keyof EditableProjectSpatialFeature>(
    key: K,
    value: EditableProjectSpatialFeature[K],
  ) {
    setDraft((current) =>
      current
        ? {
            ...current,
            [key]: value,
          }
        : current,
    );
  }

  function updateDraftProperty(key: string, value: string | boolean) {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      const nextProperties = { ...asRecord(current.propertiesJson) };

      if (typeof value === 'string') {
        if (value.trim()) {
          nextProperties[key] = value;
        } else {
          delete nextProperties[key];
        }
      } else {
        nextProperties[key] = value;
      }

      return {
        ...current,
        propertiesJson: Object.keys(nextProperties).length > 0 ? nextProperties : null,
      };
    });
  }

  function updateActiveSheet(
    updater: (sheet: ProjectSpatialSheetRecord) => ProjectSpatialSheetRecord,
  ) {
    if (!activeSheetId) {
      return;
    }

    let nextActiveSheet: ProjectSpatialSheetRecord | null = null;
    setSheetStore((current) => ({
      ...current,
      selectedSheetId: current.selectedSheetId ?? activeSheetId,
      sheets: current.sheets.map((sheet) =>
        sheet.id === activeSheetId
          ? (() => {
              nextActiveSheet = {
                ...updater(sheet),
                updatedAt: new Date().toISOString(),
              };
              return nextActiveSheet;
            })()
          : sheet,
      ),
    }));

    if (nextActiveSheet) {
      queueProjectSpatialSheetPersistence(nextActiveSheet);
    }
  }

  function updateProjectViews(updater: (views: ProjectSpatialView[]) => ProjectSpatialView[]) {
    setSheetStore((current) => ({
      ...current,
      views: updater(current.views),
    }));
  }

  function buildAutoArrangedObjects(
    objects: ProjectSpatialSheetObject[],
    paperSize: ProjectSpatialPaperSize,
    orientation: ProjectSpatialSheetOrientation,
    assignedSavedViewId: string | null,
    titleBlockPosition: ProjectSpatialTitleBlockPosition,
  ) {
    return autoArrangeProjectSpatialSheetObjects({
      assignedSavedViewId,
      contentMetrics: sheetContentMetrics,
      objects,
      orientation,
      paperSize,
      titleBlockPosition,
    });
  }

  function selectSheet(sheetId: string) {
    setSheetStore((current) => ({
      ...current,
      selectedSheetId: sheetId,
    }));
  }

  async function createSheet(templateDefinitionId = newSheetTemplateDefinitionId) {
    const templateDefinition = resolveSpatialSheetTemplateOption(
      templateDefinitionId,
      rootSheetTemplateOptions,
    );
    if (!templateDefinition) {
      toast.error('Choose a saved Root Sheet Template first.');
      return;
    }
    const nextSheetNumber = sheetStore.sheets.length + 1;
    const suggestedSheetDefaults = buildProjectSpatialSheetTemplateDefaults({
      nextSheetNumber,
      projectName,
      templateOption: templateDefinition,
    });
    const nextMetadata = {
      ...defaultSheetMetadata,
      mode: 'as1100_inspired' as const,
      orientation: templateDefinition.orientation,
      paperSize: templateDefinition.paperSize,
      notes: suggestedSheetDefaults.notes,
      sheetNumber: suggestedSheetDefaults.sheetNumber,
      sheetTitle: suggestedSheetDefaults.sheetTitle,
      subtitle: suggestedSheetDefaults.subtitle,
    };
    const sheet = createProjectSpatialSheetRecord(
      defaultSheetMetadata,
      projectName,
      activeSheetSavedViews,
      {
        metadata: nextMetadata,
        name: suggestedSheetDefaults.sheetName,
        objects: [],
        rootSheetTemplateSnapshot: templateDefinition.rootSheetTemplate,
        templateDefinitionId: templateDefinition.templateId,
        templateSourceKind: templateDefinition.sourceKind,
        templateVersionId: templateDefinition.templateVersionId,
      },
    );
    const initialObjects = buildAutoArrangedObjects(
      sheet.objects,
      nextMetadata.paperSize,
      nextMetadata.orientation,
      sheet.assignedSavedViewId,
      nextMetadata.titleBlockPosition,
    );

    try {
      const createdSheet = await api<ProjectSpatialSheetRecordApi>(
        `/projects/${projectId}/spatial/sheets`,
        {
          method: 'POST',
          body: buildProjectSpatialSheetInput({ ...sheet, objects: initialObjects }),
        },
      );
      setSheetStore((current) => ({
        ...current,
        selectedSheetId: createdSheet.id,
      }));
      await projectSpatialSheetsQuery.refetch();
      toast.success('Project Spatial Sheet created from Root Sheet Template');
    } catch (error) {
      console.error('Failed to create Project Spatial Sheet', error);
      toast.error('Failed to create Project Spatial Sheet');
    }
  }

  async function duplicateActiveSheet() {
    if (!activeSheet) {
      toast.error('Select a sheet to duplicate.');
      return;
    }

    const duplicatedSheet = createProjectSpatialSheetRecord(
      defaultSheetMetadata,
      projectName,
      activeSheetSavedViews,
      {
        assignedSavedViewId: activeSheet.assignedSavedViewId,
        metadata: activeSheet.metadata,
        name: `${activeSheet.name} Copy`,
        objects: activeSheet.objects,
        rootSheetTemplateSnapshot: activeSheet.rootSheetTemplateSnapshot,
        templateDefinitionId: activeSheet.templateDefinitionId,
        templateSourceKind: activeSheet.templateSourceKind,
        templateVersionId: activeSheet.templateVersionId,
        useLabel: activeSheet.useLabel,
      },
    );

    try {
      const createdSheet = await api<ProjectSpatialSheetRecordApi>(
        `/projects/${projectId}/spatial/sheets`,
        {
          method: 'POST',
          body: buildProjectSpatialSheetInput(duplicatedSheet),
        },
      );
      setSheetStore((current) => ({
        ...current,
        selectedSheetId: createdSheet.id,
      }));
      await projectSpatialSheetsQuery.refetch();
      toast.success('Project Spatial Sheet duplicated');
    } catch (error) {
      console.error('Failed to duplicate Project Spatial Sheet', error);
      toast.error('Failed to duplicate Project Spatial Sheet');
    }
  }

  function nudgeDesignerZoom(direction: 'in' | 'out') {
    setDesignerZoom((current) => {
      const nextValue = (current ?? fitPreviewScale) + (direction === 'in' ? 0.15 : -0.15);
      return clamp(nextValue, 0.25, 4);
    });
  }

  async function deleteActiveSheet() {
    if (!activeSheetId || sheetStore.sheets.length <= 1) {
      toast.error('Keep at least one sheet in the workspace.');
      return;
    }

    try {
      await api<{ id: string; deleted: boolean }>(
        `/projects/${projectId}/spatial/sheets/${activeSheetId}`,
        {
          method: 'DELETE',
        },
      );
      await projectSpatialSheetsQuery.refetch();
      toast.success('Project Spatial Sheet deleted');
    } catch (error) {
      console.error('Failed to delete Project Spatial Sheet', error);
      toast.error('Failed to delete Project Spatial Sheet');
    }
  }

  function updateActiveSheetRecordField<K extends 'name' | 'useLabel'>(
    key: K,
    value: ProjectSpatialSheetRecord[K],
  ) {
    updateActiveSheet((sheet) => ({
      ...sheet,
      [key]: value,
    }));
  }

  function updateActiveSheetMetadataField<K extends keyof ProjectSpatialSheetMetadata>(
    key: K,
    value: ProjectSpatialSheetMetadata[K],
  ) {
    updateActiveSheet((sheet) => ({
      ...sheet,
      metadata: {
        ...sheet.metadata,
        [key]: value,
      },
    }));
  }

  function updateActiveSheetPaperSetup(
    nextPaperSize: ProjectSpatialPaperSize,
    nextOrientation: ProjectSpatialSheetOrientation,
  ) {
    updateActiveSheet((sheet) => {
      const currentMetadata = normalizeProjectSpatialSheetMetadata(
        sheet.metadata,
        defaultSheetMetadata,
      );
      const currentObjects =
        sheet.objects.length > 0
          ? normalizeProjectSpatialSheetObjects(
              sheet.objects,
              currentMetadata.paperSize,
              currentMetadata.orientation,
            )
          : createDefaultProjectSpatialSheetObjects({
              assignedSavedViewId: sheet.assignedSavedViewId,
              orientation: currentMetadata.orientation,
              paperSize: currentMetadata.paperSize,
              showLegend: currentMetadata.showLegend,
              showNotes: currentMetadata.showNotes,
              showSheetContext: currentMetadata.showSheetContext,
              titleBlockPosition: currentMetadata.titleBlockPosition,
            });

      return {
        ...sheet,
        metadata: {
          ...sheet.metadata,
          orientation: nextOrientation,
          paperSize: nextPaperSize,
        },
        objects: remapProjectSpatialSheetObjectsToPage(
          currentObjects,
          currentMetadata.paperSize,
          currentMetadata.orientation,
          nextPaperSize,
          nextOrientation,
          sheetContentMetrics,
        ),
      };
    });
  }

  function applyActiveSheetLayoutPreset(nextMode: ProjectSpatialSheetMode) {
    updateActiveSheet((sheet) => {
      if (nextMode === 'custom') {
        return {
          ...sheet,
          metadata: {
            ...sheet.metadata,
            mode: 'custom',
          },
        };
      }

      return {
        ...sheet,
        metadata: {
          ...sheet.metadata,
          ...getProjectSpatialSheetLayoutPreset(nextMode),
        },
      };
    });
  }

  function captureCurrentSheetSavedView(label: string, existingView?: ProjectSpatialView | null) {
    const exportApi = mapExportApiRef.current;
    if (!exportApi) {
      return null;
    }

    const currentViewState = exportApi.getViewState();
    if (!currentViewState) {
      return null;
    }

    return {
      activeBasemap,
      capturedAt: new Date().toISOString(),
      description: existingView?.description ?? '',
      id: existingView?.id ?? createProjectSpatialSavedViewId(),
      label: label.trim() || existingView?.label || 'View',
      labelMode: existingView?.labelMode ?? 'default',
      showGeologyOverlay,
      annotationFeatureIds: existingView?.annotationFeatureIds ?? [],
      visibleFeatureTypes: Array.from(visibleFeatureTypes),
      viewState: currentViewState,
    } satisfies ProjectSpatialView;
  }

  function promptForSavedViewName(initialName: string) {
    if (typeof window === 'undefined') {
      return null;
    }

    const nextName = window.prompt('View name', initialName);
    if (!nextName) {
      return null;
    }

    const trimmedName = nextName.trim();
    return trimmedName || null;
  }

  async function createSavedViewFromCurrentMap(options?: {
    assignToSheet?: boolean;
    initialName?: string;
  }) {
    try {
      const nextIndex = activeSheetSavedViews.length + 1;
      const proposedName = promptForSavedViewName(
        options?.initialName ??
          buildSuggestedProjectSpatialViewName({
            activeSheetName: activeSheet?.name ?? null,
            entryIntent,
            nextIndex,
            templateLabel: activeSheetTemplateDefinition?.label ?? null,
          }),
      );
      if (!proposedName) {
        return null;
      }

      const savedView = captureCurrentSheetSavedView(proposedName);
      if (!savedView) {
        toast.error('Spatial map is still loading. Try saving the view again in a moment.');
        return null;
      }

      const createdView = await api<ProjectSpatialViewRecord>(
        `/projects/${projectId}/spatial/views`,
        {
          method: 'POST',
          body: buildProjectSpatialViewInput(savedView),
        },
      );
      const durableView = coerceProjectSpatialViewRecord(createdView);
      await projectSpatialViewsQuery.refetch();

      if (options?.assignToSheet) {
        updateActiveSheet((sheet) => ({
          ...sheet,
          assignedSavedViewId: durableView.id,
          objects: sheet.objects.map((object) =>
            object.type === 'mapFrame'
              ? {
                  ...object,
                  linkedSavedViewId: durableView.id,
                }
              : object,
          ),
        }));
      }

      toast.success(
        options?.assignToSheet
          ? 'Project Spatial View created and assigned to the sheet'
          : 'Project Spatial View created from the current map',
      );
      return durableView;
    } catch (error) {
      console.error('Failed to save spatial view', error);
      toast.error('Unable to save the current map view right now.');
      return null;
    }
  }

  async function promptRenameSavedView(savedViewId: string) {
    const savedView =
      activeSheetSavedViews.find((candidate) => candidate.id === savedViewId) ?? null;
    if (!savedView) {
      toast.error('View not found.');
      return;
    }

    const nextName = promptForSavedViewName(savedView.label);
    if (!nextName || nextName === savedView.label) {
      return;
    }

    try {
      await api<ProjectSpatialViewRecord>(`/projects/${projectId}/spatial/views/${savedViewId}`, {
        method: 'PATCH',
        body: { name: nextName },
      });
      await projectSpatialViewsQuery.refetch();
      toast.success('Project Spatial View renamed');
    } catch (error) {
      console.error('Failed to rename Project Spatial View', error);
      toast.error('Failed to rename Project Spatial View');
    }
  }

  async function promptSavedViewDescription(savedViewId: string) {
    const savedView =
      activeSheetSavedViews.find((candidate) => candidate.id === savedViewId) ?? null;
    if (!savedView || typeof window === 'undefined') {
      return;
    }

    const nextDescription = window.prompt('View note', savedView.description ?? '');
    if (nextDescription === null) {
      return;
    }

    try {
      await api<ProjectSpatialViewRecord>(`/projects/${projectId}/spatial/views/${savedViewId}`, {
        method: 'PATCH',
        body: { description: nextDescription.trim() },
      });
      await projectSpatialViewsQuery.refetch();
      toast.success('Project Spatial View note updated');
    } catch (error) {
      console.error('Failed to update Project Spatial View note', error);
      toast.error('Failed to update Project Spatial View note');
    }
  }

  async function updateSavedViewFromCurrentMap(savedViewId: string) {
    const existingView =
      activeSheetSavedViews.find((savedView) => savedView.id === savedViewId) ?? null;
    if (!existingView) {
      toast.error('View not found.');
      return;
    }

    const updatedView = captureCurrentSheetSavedView(existingView.label, existingView);
    if (!updatedView) {
      toast.error('Spatial map is still loading. Try updating the view again in a moment.');
      return;
    }

    try {
      await api<ProjectSpatialViewRecord>(`/projects/${projectId}/spatial/views/${savedViewId}`, {
        method: 'PATCH',
        body: buildProjectSpatialViewInput(updatedView),
      });
      await projectSpatialViewsQuery.refetch();
      toast.success('Project Spatial View updated from the current map');
    } catch (error) {
      console.error('Failed to update Project Spatial View', error);
      toast.error('Failed to update Project Spatial View');
    }
  }

  async function duplicateSavedView(savedViewId: string) {
    const existingView =
      activeSheetSavedViews.find((savedView) => savedView.id === savedViewId) ?? null;
    if (!existingView) {
      toast.error('View not found.');
      return;
    }

    const duplicatedView = {
      ...existingView,
      capturedAt: new Date().toISOString(),
      id: createProjectSpatialSavedViewId(),
      label: `${existingView.label} Copy`,
    } satisfies ProjectSpatialView;

    try {
      await api<ProjectSpatialViewRecord>(`/projects/${projectId}/spatial/views`, {
        method: 'POST',
        body: buildProjectSpatialViewInput(duplicatedView),
      });
      await projectSpatialViewsQuery.refetch();
      toast.success('Project Spatial View duplicated');
    } catch (error) {
      console.error('Failed to duplicate Project Spatial View', error);
      toast.error('Failed to duplicate Project Spatial View');
    }
  }

  async function deleteSavedView(savedViewId: string) {
    try {
      await api<{ id: string; deleted: boolean }>(
        `/projects/${projectId}/spatial/views/${savedViewId}`,
        {
          method: 'DELETE',
        },
      );
      await refetchProjectSpatialRecords();
      toast.success('Project Spatial View deleted');
    } catch (error) {
      console.error('Failed to delete Project Spatial View', error);
      toast.error('Failed to delete Project Spatial View');
    }
  }

  async function importLocalSpatialRecords() {
    if (!localSpatialImportStore || typeof window === 'undefined') {
      return;
    }

    setIsImportingLocalSpatialRecords(true);

    try {
      const existingViewNames = new Set(
        (projectSpatialViewsQuery.data ?? []).map((view) => view.name.toLowerCase()),
      );
      const viewIdMap = new Map<string, string>();
      let importedViewCount = 0;

      for (const localView of localSpatialImportStore.views) {
        const nextName = createImportedRecordName(existingViewNames, localView.label);
        existingViewNames.add(nextName.toLowerCase());
        const createdView = await api<ProjectSpatialViewRecord>(
          `/projects/${projectId}/spatial/views`,
          {
            method: 'POST',
            body: buildProjectSpatialViewInput({
              ...localView,
              label: nextName,
            }),
          },
        );
        viewIdMap.set(localView.id, createdView.id);
        importedViewCount += 1;
      }

      const existingSheetNames = new Set(
        (projectSpatialSheetsQuery.data ?? []).map((sheet) => sheet.name.toLowerCase()),
      );
      let importedSheetCount = 0;

      for (const localSheet of localSpatialImportStore.sheets) {
        const nextName = createImportedRecordName(existingSheetNames, localSheet.name);
        existingSheetNames.add(nextName.toLowerCase());
        const localizedSheet = remapProjectSpatialSheetViewIds(localSheet, viewIdMap);

        await api<ProjectSpatialSheetRecordApi>(`/projects/${projectId}/spatial/sheets`, {
          method: 'POST',
          body: {
            ...buildProjectSpatialSheetInput(localizedSheet),
            name: nextName,
          },
        });
        importedSheetCount += 1;
      }

      window.localStorage.setItem(buildLocalSpatialImportMarkerKey(projectId), 'imported');
      setLocalSpatialImportStore(null);
      await refetchProjectSpatialRecords();
      toast.success(
        `Imported ${importedViewCount} Project Spatial View${importedViewCount === 1 ? '' : 's'} and ${importedSheetCount} Project Spatial Sheet${importedSheetCount === 1 ? '' : 's'}.`,
      );
    } catch (error) {
      console.error('Failed to import browser-local Spatial records', error);
      toast.error('Failed to import browser-local Spatial records');
    } finally {
      setIsImportingLocalSpatialRecords(false);
    }
  }

  function applySavedViewToMap(
    savedViewId = activeSheetMapFrameSavedView?.id ?? activeSheetSavedView?.id ?? null,
  ) {
    const exportApi = mapExportApiRef.current;
    if (!exportApi || !savedViewId) {
      toast.error('Select a view first.');
      return;
    }

    const savedView = activeSheetSavedViews.find((view) => view.id === savedViewId) ?? null;
    if (!savedView) {
      toast.error('View not found.');
      return;
    }

    try {
      flushSync(() => {
        setActiveBasemap(savedView.activeBasemap);
        setShowGeologyOverlay(savedView.showGeologyOverlay);
        setVisibleFeatureTypes(new Set(savedView.visibleFeatureTypes));
        if (lockedViewState) {
          setLockedViewState(savedView.viewState);
        }
      });
      const applied = exportApi.setViewState(savedView.viewState);
      if (!applied) {
        toast.error(exportApi.readyStateLabel());
        return;
      }
      toast.success('View applied to the map');
    } catch (error) {
      console.error('Failed to apply spatial view', error);
      toast.error('Unable to apply the view right now.');
    }
  }

  function updateActiveSheetObject(
    objectId: string,
    updater: (object: ProjectSpatialSheetObject) => ProjectSpatialSheetObject,
  ) {
    updateActiveSheet((sheet) => {
      const metadata = normalizeProjectSpatialSheetMetadata(sheet.metadata, defaultSheetMetadata);
      return {
        ...sheet,
        objects: sheet.objects.map((object) =>
          object.id === objectId
            ? clampProjectSpatialSheetObject(
                updater(object),
                metadata.paperSize,
                metadata.orientation,
              )
            : object,
        ),
      };
    });
  }

  function updateSheetObjectGeometry(
    objectId: string,
    geometry: Pick<ProjectSpatialSheetObject, 'height' | 'width' | 'x' | 'y'>,
  ) {
    updateActiveSheetObject(objectId, (object) => ({
      ...object,
      ...geometry,
    }));
  }

  function updateSelectedSheetObjectField<
    K extends 'x' | 'y' | 'width' | 'height' | 'order' | 'name',
  >(key: K, value: ProjectSpatialSheetObject[K]) {
    if (!selectedSheetObject) {
      return;
    }

    updateActiveSheetObject(selectedSheetObject.id, (object) => ({
      ...object,
      [key]: value,
    }));
  }

  function updateSelectedSheetObjectBoolean<K extends 'visible' | 'locked'>(
    key: K,
    value: ProjectSpatialSheetObject[K],
  ) {
    if (!selectedSheetObject) {
      return;
    }

    updateActiveSheetObject(selectedSheetObject.id, (object) => ({
      ...object,
      [key]: value,
    }));
  }

  function updateSelectedSheetObjectSetting<
    K extends
      | 'contentScale'
      | 'density'
      | 'legendColumns'
      | 'legendShowMapContext'
      | 'mapFitMode'
      | 'paddingScale'
      | 'scaleBarShowLabel'
      | 'symbolScale',
  >(key: K, value: ProjectSpatialSheetObject[K]) {
    if (!selectedSheetObject) {
      return;
    }

    updateActiveSheetObject(selectedSheetObject.id, (object) => ({
      ...object,
      [key]: value,
    }));
  }

  function updateSelectedSheetContextRowVisibility(
    rowKey: keyof NonNullable<ProjectSpatialSheetObject['sheetContextRowsVisibility']>,
    value: boolean,
  ) {
    if (!selectedSheetObject || selectedSheetObject.type !== 'sheetContext') {
      return;
    }

    updateActiveSheetObject(selectedSheetObject.id, (object) => ({
      ...object,
      sheetContextRowsVisibility: {
        basemap: true,
        generated: true,
        geoQuery: true,
        geology: true,
        layout: true,
        paper: true,
        purpose: true,
        ...object.sheetContextRowsVisibility,
        [rowKey]: value,
      },
    }));
  }

  function autoSizeContentBlocks() {
    if (!activeSheet) {
      return;
    }

    updateActiveSheet((sheet) => ({
      ...sheet,
      objects: autoSizeProjectSpatialSheetObjects(
        normalizeProjectSpatialSheetObjects(
          sheet.objects,
          normalizedSheetMetadata.paperSize,
          normalizedSheetMetadata.orientation,
        ),
        normalizedSheetMetadata.paperSize,
        normalizedSheetMetadata.orientation,
        sheetContentMetrics,
      ),
    }));
    toast.success('Content blocks auto-sized');
  }

  function autoArrangeActiveSheet() {
    if (!activeSheet) {
      return;
    }

    updateActiveSheet((sheet) => ({
      ...sheet,
      objects: buildAutoArrangedObjects(
        normalizeProjectSpatialSheetObjects(
          sheet.objects,
          normalizedSheetMetadata.paperSize,
          normalizedSheetMetadata.orientation,
        ),
        normalizedSheetMetadata.paperSize,
        normalizedSheetMetadata.orientation,
        sheet.assignedSavedViewId,
        normalizedSheetMetadata.titleBlockPosition,
      ),
    }));
    toast.success('Sheet layout auto-arranged');
  }

  function resetSelectedSheetObject() {
    if (!activeSheet || !selectedSheetObject) {
      return;
    }

    updateActiveSheetObject(selectedSheetObject.id, () =>
      resetProjectSpatialSheetObjectToDefault({
        assignedSavedViewId: activeSheet.assignedSavedViewId,
        contentMetrics: sheetContentMetrics,
        object: selectedSheetObject,
        objects: activeSheetObjects,
        orientation: normalizedSheetMetadata.orientation,
        paperSize: normalizedSheetMetadata.paperSize,
        titleBlockPosition: normalizedSheetMetadata.titleBlockPosition,
      }),
    );
    toast.success('Selected object reset');
  }

  function refreshSelectedSheetPreview() {
    const exportApi = mapExportApiRef.current;
    if (!exportApi) {
      toast.error(
        'Source map is still loading. Try refreshing the sheet preview again in a moment.',
      );
      return;
    }
    if (!exportApi.isReady()) {
      toast.error(exportApi.readyStateLabel());
      return;
    }

    void refreshSheetPreviewSnapshot(exportApi);
  }

  function updateSelectedMapFrameFitMode(nextFitMode: ProjectSpatialSheetMapFitMode) {
    if (!selectedSheetObject || selectedSheetObject.type !== 'mapFrame') {
      return;
    }

    updateActiveSheetObject(selectedSheetObject.id, (object) => ({
      ...object,
      mapFitMode: nextFitMode,
    }));
  }

  function alignSelectedSheetObject(
    alignment: 'bottom' | 'center_horizontally' | 'center_vertically' | 'left' | 'right' | 'top',
  ) {
    if (!selectedSheetObject || selectedSheetObject.locked) {
      return;
    }

    const safeArea = getProjectSpatialSheetSafeArea(
      normalizedSheetMetadata.paperSize,
      normalizedSheetMetadata.orientation,
    );

    updateActiveSheetObject(selectedSheetObject.id, (object) => {
      switch (alignment) {
        case 'left':
          return { ...object, x: safeArea.x };
        case 'right':
          return { ...object, x: safeArea.x + safeArea.width - object.width };
        case 'top':
          return { ...object, y: safeArea.y };
        case 'bottom':
          return { ...object, y: safeArea.y + safeArea.height - object.height };
        case 'center_horizontally':
          return { ...object, x: safeArea.x + (safeArea.width - object.width) / 2 };
        case 'center_vertically':
          return { ...object, y: safeArea.y + (safeArea.height - object.height) / 2 };
        default:
          return object;
      }
    });
  }

  function fitSelectedSheetObjectToSafeDimension(dimension: 'height' | 'width') {
    if (!selectedSheetObject || selectedSheetObject.locked) {
      return;
    }

    const safeArea = getProjectSpatialSheetSafeArea(
      normalizedSheetMetadata.paperSize,
      normalizedSheetMetadata.orientation,
    );
    const constraint = getProjectSpatialSheetObjectSizeConstraint(
      selectedSheetObject.type,
      normalizedSheetMetadata.paperSize,
      normalizedSheetMetadata.orientation,
    );

    updateActiveSheetObject(selectedSheetObject.id, (object) => {
      if (dimension === 'width') {
        const width = constraint.maxWidth;
        return {
          ...object,
          width,
          x: clamp(
            object.x + object.width / 2 - width / 2,
            safeArea.x,
            safeArea.x + safeArea.width - width,
          ),
        };
      }

      const height = constraint.maxHeight;
      return {
        ...object,
        height,
        y: clamp(
          object.y + object.height / 2 - height / 2,
          safeArea.y,
          safeArea.y + safeArea.height - height,
        ),
      };
    });
  }

  function shiftSelectedSheetObjectOrder(direction: 'backward' | 'forward') {
    if (!selectedSheetObject) {
      return;
    }

    updateActiveSheet((sheet) => ({
      ...sheet,
      objects: reorderProjectSpatialSheetObjects(
        normalizeProjectSpatialSheetObjects(
          sheet.objects,
          normalizedSheetMetadata.paperSize,
          normalizedSheetMetadata.orientation,
        ),
        selectedSheetObject.id,
        direction,
      ),
    }));
  }

  function assignSavedViewToSheet(savedViewId: string | null) {
    updateActiveSheet((sheet) => {
      const savedView =
        savedViewId !== null
          ? (activeSheetSavedViews.find((candidate) => candidate.id === savedViewId) ?? null)
          : null;
      const templateOption = sheet.templateDefinitionId
        ? resolveSpatialSheetTemplateOption(sheet.templateDefinitionId, templateOptions)
        : null;
      const nextMetadata = savedView
        ? buildProjectSpatialSheetMetadataForAssignedView({
            currentMetadata: normalizeProjectSpatialSheetMetadata(
              sheet.metadata,
              defaultSheetMetadata,
            ),
            savedView,
            templateOption,
          })
        : sheet.metadata;

      return {
        ...sheet,
        assignedSavedViewId: savedViewId,
        metadata: nextMetadata,
        name: savedView
          ? buildProjectSpatialSheetNameForAssignedView(sheet.name, nextMetadata.sheetTitle)
          : sheet.name,
        objects: sheet.objects.map((object) =>
          object.type === 'mapFrame'
            ? {
                ...object,
                linkedSavedViewId: savedViewId,
              }
            : object,
        ),
      };
    });
  }

  function applyRootSheetTemplateToActiveSheet(templateDefinitionId: string) {
    const templateDefinition = resolveSpatialSheetTemplateOption(
      templateDefinitionId,
      rootSheetTemplateOptions,
    );
    if (!templateDefinition) {
      toast.error('Root Sheet Template not found.');
      return;
    }
    const suggestedSheetDefaults = buildProjectSpatialSheetTemplateDefaults({
      nextSheetNumber: Math.max(
        1,
        sheetStore.sheets.findIndex((sheet) => sheet.id === activeSheet?.id) + 1,
      ),
      projectName,
      templateOption: templateDefinition,
    });

    updateActiveSheet((sheet) => ({
      ...sheet,
      metadata: {
        ...sheet.metadata,
        mode: 'as1100_inspired',
        orientation: templateDefinition.orientation,
        paperSize: templateDefinition.paperSize,
        notes: shouldReplaceProjectSpatialNotes(sheet.metadata.notes)
          ? suggestedSheetDefaults.notes
          : sheet.metadata.notes,
        sheetNumber: sheet.metadata.sheetNumber || suggestedSheetDefaults.sheetNumber,
        sheetTitle: shouldReplaceProjectSpatialSheetTitle(sheet.metadata.sheetTitle)
          ? suggestedSheetDefaults.sheetTitle
          : sheet.metadata.sheetTitle,
        subtitle: shouldReplaceProjectSpatialSheetSubtitle(sheet.metadata.subtitle)
          ? suggestedSheetDefaults.subtitle
          : sheet.metadata.subtitle,
      },
      name: buildProjectSpatialSheetNameForAssignedView(
        sheet.name,
        shouldReplaceProjectSpatialSheetTitle(sheet.metadata.sheetTitle)
          ? suggestedSheetDefaults.sheetTitle
          : sheet.metadata.sheetTitle,
      ),
      objects: [],
      rootSheetTemplateSnapshot: templateDefinition.rootSheetTemplate,
      templateDefinitionId: templateDefinition.templateId,
      templateSourceKind: templateDefinition.sourceKind,
      templateVersionId: templateDefinition.templateVersionId,
    }));
    toast.success('Root Sheet Template applied');
  }

  function saveCurrentLayoutAsTemplate() {
    if (!activeSheet) {
      return;
    }

    const templateName = window.prompt('Template name', `${activeSheet.name} Template`);
    if (!templateName?.trim()) {
      return;
    }

    const template = createProjectSpatialSheetTemplate({
      mode: normalizedSheetMetadata.mode,
      name: templateName.trim(),
      objects: activeSheetObjects,
      orientation: normalizedSheetMetadata.orientation,
      paperSize: normalizedSheetMetadata.paperSize,
    });

    setTemplateLibrary((current) =>
      mergeTemplateLibraries(normalizeProjectSpatialSheetTemplate, current, [template]),
    );
    setSelectedTemplateId(template.id);
    toast.success('Sheet layout template saved');
  }

  function applyTemplateToActiveSheet(templateId: string) {
    const template = templateLibrary.find((candidate) => candidate.id === templateId);
    if (!template) {
      toast.error('Template not found.');
      return;
    }

    updateActiveSheet((sheet) => ({
      ...sheet,
      metadata: {
        ...sheet.metadata,
        mode: template.mode,
        orientation: template.orientation,
        paperSize: template.paperSize,
      },
      objects: autoSizeProjectSpatialSheetObjects(
        template.objects.map((object) =>
          normalizeProjectSpatialSheetObject(
            {
              ...object,
              id: object.id,
              linkedSavedViewId: object.type === 'mapFrame' ? sheet.assignedSavedViewId : undefined,
            },
            template.paperSize,
            template.orientation,
            object.type,
          ),
        ),
        template.paperSize,
        template.orientation,
        sheetContentMetrics,
      ),
    }));
    toast.success('Sheet layout template applied');
  }

  function renameTemplate(templateId: string) {
    const template = templateLibrary.find((candidate) => candidate.id === templateId) ?? null;
    if (!template || typeof window === 'undefined') {
      return;
    }

    const nextName = window.prompt('Template name', template.name);
    if (!nextName?.trim() || nextName.trim() === template.name) {
      return;
    }

    setTemplateLibrary((current) =>
      current.map((candidate) =>
        candidate.id === templateId
          ? {
              ...candidate,
              name: nextName.trim(),
              updatedAt: new Date().toISOString(),
            }
          : candidate,
      ),
    );
    toast.success('Template renamed');
  }

  function deleteTemplate(templateId: string) {
    setTemplateLibrary((current) => current.filter((template) => template.id !== templateId));
    setSelectedTemplateId((current) => (current === templateId ? null : current));
    toast.success('Template deleted');
  }

  function resetActiveSheetLayoutToSystemDefault() {
    if (!activeSheet) {
      return;
    }

    const objects = buildAutoArrangedObjects(
      createDefaultProjectSpatialSheetObjects({
        assignedSavedViewId: activeSheet.assignedSavedViewId,
        orientation: normalizedSheetMetadata.orientation,
        paperSize: normalizedSheetMetadata.paperSize,
        showLegend: true,
        showNotes: true,
        showSheetContext: true,
        titleBlockPosition: normalizedSheetMetadata.titleBlockPosition,
      }),
      normalizedSheetMetadata.paperSize,
      normalizedSheetMetadata.orientation,
      activeSheet.assignedSavedViewId,
      normalizedSheetMetadata.titleBlockPosition,
    );

    updateActiveSheet((sheet) => ({
      ...sheet,
      metadata: {
        ...sheet.metadata,
        mode: 'system_default',
      },
      objects,
    }));
  }

  function toggleLockedView() {
    const exportApi = mapExportApiRef.current;

    if (lockedViewState) {
      setLockedViewState(null);
      toast.success('Spatial map view unlocked');
      return;
    }

    if (!exportApi) {
      toast.error('Spatial map is still loading. Try locking the view again in a moment.');
      return;
    }

    try {
      const currentViewState = exportApi.getViewState();
      if (!currentViewState) {
        toast.error(exportApi.readyStateLabel());
        return;
      }

      setLockedViewState(currentViewState);
      toast.success('Spatial map view locked for export');
    } catch (error) {
      console.error('Failed to lock spatial map view', error);
      toast.error('Unable to lock the current map view right now.');
    }
  }

  function toggleFeatureType(featureType: ProjectSpatialFeatureType) {
    const isCurrentlyVisible = visibleFeatureTypes.has(featureType);
    const applyToggle = () => {
      setVisibleFeatureTypes((current) => {
        const next = new Set(current);
        if (isCurrentlyVisible) {
          next.delete(featureType);
        } else {
          next.add(featureType);
        }
        return next;
      });
    };

    const selectedFeatureType = draft?.featureType || null;
    if (isCurrentlyVisible && selectedFeatureType === featureType) {
      runWithUnsavedChangesGuard(() => {
        applyToggle();
        clearDraft();
      });
      return;
    }

    applyToggle();
  }

  async function handleSave() {
    if (!draft) {
      return;
    }

    if (linkedAiDocumentIdError) {
      toast.error(linkedAiDocumentIdError);
      return;
    }

    const payload = buildFeaturePayload(draft);
    if (!payload) {
      toast.error('Label and feature type are required before saving.');
      return;
    }

    try {
      const saved = draft.isNew
        ? await createFeature.mutateAsync(payload)
        : await updateFeature.mutateAsync(payload);

      const nextDraft = editableDraftFromFeature(saved);
      setDraft(nextDraft);
      setDraftBaseline(snapshotDraft(nextDraft));
      toast.success(draft.isNew ? 'Spatial feature saved' : 'Spatial feature updated');
    } catch (error) {
      console.error('Full error:', error);
      toast.error(extractSpatialErrorMessage(error));
    }
  }

  async function handleDelete(featureId: string) {
    if (!window.confirm('Delete this spatial feature?')) {
      return;
    }

    try {
      await deleteFeature.mutateAsync(featureId);
      if (draft?.persistedId === featureId) {
        clearDraft();
      }
      toast.success('Spatial feature deleted');
    } catch {
      toast.error('Failed to delete spatial feature');
    }
  }

  async function handlePdfExport() {
    const exportApi = mapExportApiRef.current;
    if (!exportApi) {
      toast.error('Spatial map is still loading. Try PDF export again in a moment.');
      return;
    }
    if (!exportApi.isReady()) {
      toast.error(exportApi.readyStateLabel());
      return;
    }
    if (!activeSheet) {
      toast.error('Create or select a sheet before exporting.');
      return;
    }

    setIsGeneratingPdf(true);

    const preflight = sheetPreflight;
    const blockingIssues = preflight?.issues.filter((issue) => issue.severity === 'blocking') ?? [];
    if (blockingIssues.length > 0) {
      setIsDesignerBottomTrayCollapsed(false);
      setActiveDesignerSection('objects');
      setIsGeneratingPdf(false);
      toast.error(blockingIssues[0]?.message ?? 'Resolve the sheet warnings before exporting.');
      return;
    }

    const exportObjects = preflight?.objects ?? activeSheetObjects;
    if (
      activeSheetId &&
      !areProjectSpatialSheetObjectCollectionsEqual(activeSheetObjects, exportObjects)
    ) {
      flushSync(() => {
        setSheetStore((current) => ({
          ...current,
          sheets: current.sheets.map((sheet) =>
            sheet.id === activeSheetId
              ? {
                  ...sheet,
                  objects: exportObjects,
                  updatedAt: new Date().toISOString(),
                }
              : sheet,
          ),
        }));
      });
      toast.success('Sheet objects were adjusted to keep the export inside the paper safe area.');
    }

    const currentViewState = exportApi.getViewState();
    if (!currentViewState) {
      setIsGeneratingPdf(false);
      toast.error(exportApi.readyStateLabel());
      return;
    }
    const currentBasemap = activeBasemap;
    const currentGeologyOverlayState = showGeologyOverlay;
    const currentVisibleFeatureTypes = Array.from(visibleFeatureTypes);
    const mapFrameObject = exportObjects.find((object) => object.type === 'mapFrame') ?? null;
    const sheetSavedView =
      activeSheetSavedViews.find(
        (savedView) =>
          savedView.id === mapFrameObject?.linkedSavedViewId ||
          savedView.id === activeSheet.assignedSavedViewId,
      ) ?? null;
    let effectiveBasemap = activeBasemap;
    let effectiveGeologyOverlayState = showGeologyOverlay;

    try {
      if (sheetSavedView) {
        effectiveBasemap = sheetSavedView.activeBasemap;
        effectiveGeologyOverlayState = sheetSavedView.showGeologyOverlay;

        flushSync(() => {
          setActiveBasemap(sheetSavedView.activeBasemap);
          setShowGeologyOverlay(sheetSavedView.showGeologyOverlay);
          setVisibleFeatureTypes(new Set(sheetSavedView.visibleFeatureTypes));
        });
        await waitForNextAnimationFrame();

        exportApi.setViewState(sheetSavedView.viewState);
        await waitForNextAnimationFrame();
      } else if (lockedViewState) {
        exportApi.setViewState(lockedViewState);
        await waitForNextAnimationFrame();
      }

      const pageLayout = getProjectSpatialSheetPageLayout(
        normalizedSheetMetadata.paperSize,
        normalizedSheetMetadata.orientation,
      );
      const mapSnapshot = await exportApi.captureSnapshot();
      if (!mapSnapshot) {
        toast.error(exportApi.readyStateLabel());
        return;
      }
      const nextSheetExportState: ProjectSpatialSheetExportState = {
        activeBasemapLabel:
          PROJECT_SPATIAL_BASEMAP_OPTIONS.find((option) => option.value === effectiveBasemap)
            ?.label ?? formatSpatialLabel(effectiveBasemap),
        generatedAtLabel: formatSheetGeneratedAt(new Date()),
        geologyQueryLocation,
        legendEntries: sheetLegendFeatureEntries,
        mapFrameSavedViewLabel: sheetSavedView?.label ?? null,
        mapSnapshot,
        metadata: normalizedSheetMetadata,
        objects: exportObjects,
        rootSheetTemplateSnapshot: activeSheet.rootSheetTemplateSnapshot,
        showGeologyOverlay: effectiveGeologyOverlayState,
      };

      flushSync(() => {
        setSheetExportState(nextSheetExportState);
      });

      await waitForNextAnimationFrame();

      const sheetElement = sheetCaptureRef.current;
      if (!sheetElement) {
        console.warn('Spatial map sheet layout was not ready for PDF export.');
        toast.error('Map sheet layout is not available yet. Please try again.');
        return;
      }

      await waitForImagesToLoad(sheetElement);

      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      const sheetCanvas = await html2canvas(sheetElement, {
        backgroundColor: '#ffffff',
        logging: false,
        scale: 2,
        useCORS: true,
      });

      const pdf = new jsPDF({
        compress: true,
        format: [pageLayout.widthMm, pageLayout.heightMm],
        orientation: normalizedSheetMetadata.orientation,
        unit: 'mm',
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const marginMm = normalizedSheetMetadata.paperSize === 'a4' ? 6 : 10;
      const availableWidth = pageWidth - marginMm * 2;
      const availableHeight = pageHeight - marginMm * 2;
      const sheetAspectRatio = sheetCanvas.width / sheetCanvas.height;

      let renderWidth = availableWidth;
      let renderHeight = renderWidth / sheetAspectRatio;
      if (renderHeight > availableHeight) {
        renderHeight = availableHeight;
        renderWidth = renderHeight * sheetAspectRatio;
      }

      pdf.addImage(
        sheetCanvas.toDataURL('image/png'),
        'PNG',
        (pageWidth - renderWidth) / 2,
        (pageHeight - renderHeight) / 2,
        renderWidth,
        renderHeight,
        undefined,
        'FAST',
      );

      pdf.save(
        buildSpatialSheetFilename(
          normalizedSheetMetadata.projectCode || project.code || projectId,
          normalizedSheetMetadata.sheetTitle,
        ),
      );
      toast.success('Spatial map sheet PDF exported');
    } catch (error) {
      console.error('Failed to export spatial sheet PDF', error);
      toast.error('Failed to export spatial sheet PDF');
    } finally {
      if (sheetSavedView) {
        flushSync(() => {
          setActiveBasemap(currentBasemap);
          setShowGeologyOverlay(currentGeologyOverlayState);
          setVisibleFeatureTypes(new Set(currentVisibleFeatureTypes));
        });
        await waitForNextAnimationFrame();

        exportApi.setViewState(currentViewState);
        await waitForNextAnimationFrame();
      }

      setIsGeneratingPdf(false);
    }
  }

  const isSaving = createFeature.isPending || updateFeature.isPending;

  const designerZoomPercentage = Math.round(previewScale * 100);
  const designerSectionOptions: Array<{
    id: ProjectSpatialSheetDesignerSectionId;
    label: string;
  }> = [
    { id: 'sheets', label: 'Legacy Sheets' },
    { id: 'savedViews', label: 'Views' },
    { id: 'objects', label: 'Legacy Objects' },
    { id: 'objectInspector', label: 'Legacy Inspector' },
    { id: 'sourceMap', label: 'Map' },
  ];
  const activeDesignerSectionLabel =
    designerSectionOptions.find((option) => option.id === activeDesignerSection)?.label ??
    'Legacy Sheets';
  const isSourceMapVisibleInTray =
    !isDesignerBottomTrayCollapsed && activeDesignerSection === 'sourceMap';
  const isMapLeftPanelVisible = !isMapFocusMode && !isMapLeftPanelCollapsed;
  const isMapRightPanelVisible = !isMapFocusMode && !isMapRightPanelCollapsed;
  const mapWorkspaceGridClassName = isViewsMode
    ? 'xl:grid-cols-[280px_minmax(0,1fr)_360px]'
    : isSheetsMode
      ? 'xl:grid-cols-[320px_minmax(0,1fr)_420px]'
      : isMapLeftPanelVisible
        ? isMapRightPanelVisible
          ? 'xl:grid-cols-[256px_minmax(0,1fr)_336px]'
          : 'xl:grid-cols-[256px_minmax(0,1fr)]'
        : isMapRightPanelVisible
          ? 'xl:grid-cols-[minmax(0,1fr)_336px]'
          : 'grid-cols-1';
  const selectableSheetTemplateOptions = selectableTemplateOptions;
  const rootSheetTemplateOptions = useMemo(
    () =>
      selectableSheetTemplateOptions.filter(
        (templateOption) => templateOption.sourceKind === 'root_sheet_template',
      ),
    [selectableSheetTemplateOptions],
  );
  const newSheetTemplateDefinition = useMemo(
    () => resolveSpatialSheetTemplateOption(newSheetTemplateDefinitionId, rootSheetTemplateOptions),
    [newSheetTemplateDefinitionId, rootSheetTemplateOptions],
  );
  const activeSheetTemplateDefinition = useMemo(
    () =>
      activeSheet?.templateDefinitionId
        ? resolveSpatialSheetTemplateOption(activeSheet.templateDefinitionId, templateOptions)
        : null,
    [activeSheet?.templateDefinitionId, templateOptions],
  );
  const activeSheetUsesRootSheetTemplate =
    activeSheet?.templateSourceKind === 'root_sheet_template' &&
    activeSheet.rootSheetTemplateSnapshot !== null;
  useEffect(() => {
    refreshTemplateOptions();
  }, [refreshTemplateOptions]);

  useEffect(() => {
    if (rootSheetTemplateOptions.length === 0) {
      return;
    }

    setNewSheetTemplateDefinitionId((current) =>
      rootSheetTemplateOptions.some((option) => option.value === current)
        ? current
        : (rootSheetTemplateOptions[0]?.value ?? current),
    );
  }, [rootSheetTemplateOptions]);
  const spatialQueryString = useMemo(() => {
    const params = new URLSearchParams();
    if (entryIntent) {
      params.set('source', entryIntent);
    }
    if (returnToHref) {
      params.set('returnTo', returnToHref);
    }
    return params.toString();
  }, [entryIntent, returnToHref]);
  const spatialMapHref = `/projects/${projectId}/spatial${spatialQueryString ? `?${spatialQueryString}` : ''}`;
  const spatialViewsHref = `/projects/${projectId}/spatial/views${spatialQueryString ? `?${spatialQueryString}` : ''}`;
  const spatialSheetsHref = `/projects/${projectId}/spatial/sheets${spatialQueryString ? `?${spatialQueryString}` : ''}`;
  const mapLoadingNotice = !isSourceMapReady ? (
    <Alert>
      <MapIcon className="h-4 w-4" />
      <AlertTitle>Map loading / map not ready yet</AlertTitle>
      <AlertDescription>
        {sourceMapReadyStateLabel} Actions that depend on the source map state stay disabled until
        the map is ready.
      </AlertDescription>
    </Alert>
  ) : null;
  const sourceMapActionDisabled = !isSourceMapReady;
  const spatialPageTitle = isViewsMode
    ? 'Spatial / Views'
    : isSheetsMode
      ? 'Spatial / Sheets'
      : 'Spatial / Map';
  const spatialPageDescription = isViewsMode
    ? `${project.code} · Reusable named map views with basemap, extent, visible layers, and view state`
    : isSheetsMode
      ? `${project.code} · Template-backed printable sheets that bind project views into map frames`
      : `${project.code} · Project master map, boundaries, monitoring locations, boreholes, wells, and reusable spatial features`;

  useEffect(() => {
    if (!isSheetDesignerMode || !isSourceMapVisibleInTray) {
      return;
    }

    const exportApi = mapExportApiRef.current;
    if (!exportApi || typeof window === 'undefined') {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      exportApi.updateSize();
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [isSheetDesignerMode, isSourceMapVisibleInTray]);

  const handleSheetObjectSelection = (objectId: string | null) => {
    setSelectedSheetObjectId(objectId);
    if (objectId) {
      setActiveDesignerSection('objectInspector');
      setIsDesignerBottomTrayCollapsed(false);
    }
  };
  const sourceMapSection = (
    <SheetDesignerTraySection
      title="View Editor"
      description="Large source map editor for view capture, map-frame assignment, and preview refresh."
      className="h-full"
    >
      <div className="space-y-3">
        <div className="grid gap-2 lg:grid-cols-[minmax(0,180px)_minmax(0,180px)_minmax(0,220px)_minmax(0,160px)]">
          <div className="space-y-1">
            <Label
              htmlFor="designer-basemap"
              className="text-[11px] uppercase tracking-[0.16em] text-slate-500"
            >
              Basemap
            </Label>
            <Select
              value={activeBasemap}
              onValueChange={(value) => setActiveBasemap(value as ProjectSpatialBasemap)}
            >
              <SelectTrigger id="designer-basemap" className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_SPATIAL_BASEMAP_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-white px-2 text-xs">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-slate-300"
              checked={showGeologyOverlay}
              onChange={(event) => setShowGeologyOverlay(event.target.checked)}
            />
            <span>Geology Overlay</span>
          </label>
          <div className="space-y-1">
            <Label
              htmlFor="designer-map-frame-assigned-view"
              className="text-[11px] uppercase tracking-[0.16em] text-slate-500"
            >
              Map Frame View
            </Label>
            <Select
              value={
                activeSheetMapFrameObject?.linkedSavedViewId ??
                activeSheet?.assignedSavedViewId ??
                NONE_VALUE
              }
              onValueChange={(value) => assignSavedViewToSheet(value === NONE_VALUE ? null : value)}
            >
              <SelectTrigger id="designer-map-frame-assigned-view" className="h-8 text-xs">
                <SelectValue placeholder="Select map-frame view" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>Current / no assigned view</SelectItem>
                {activeSheetSavedViews.map((savedView) => (
                  <SelectItem key={savedView.id} value={savedView.id}>
                    {formatOperatorFacingSheetLabel(savedView.label)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label
              htmlFor="designer-map-frame-render-mode"
              className="text-[11px] uppercase tracking-[0.16em] text-slate-500"
            >
              Render Mode
            </Label>
            <Select
              value={activeSheetMapFrameObject?.mapFitMode ?? 'fit'}
              onValueChange={(value) => {
                if (!activeSheetMapFrameObject) {
                  return;
                }
                updateActiveSheetObject(activeSheetMapFrameObject.id, (object) => ({
                  ...object,
                  mapFitMode: value as ProjectSpatialSheetMapFitMode,
                }));
              }}
            >
              <SelectTrigger id="designer-map-frame-render-mode" className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fit">Fit / contain</SelectItem>
                <SelectItem value="fill">Fill / crop</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 px-2.5 text-xs"
            onClick={() => createSavedViewFromCurrentMap()}
          >
            Save Current as View
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 px-2.5 text-xs"
            onClick={() =>
              createSavedViewFromCurrentMap({
                assignToSheet: true,
                initialName:
                  activeSheetMapFrameSavedView?.label ?? `${activeSheet?.name ?? 'Sheet'} View`,
              })
            }
          >
            Capture and Assign
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 px-2.5 text-xs"
            disabled={!activeSheetMapFrameSavedView}
            onClick={() => {
              if (activeSheetMapFrameSavedView) {
                updateSavedViewFromCurrentMap(activeSheetMapFrameSavedView.id);
              }
            }}
          >
            Update Assigned View
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 px-2.5 text-xs"
            disabled={!activeSheetMapFrameSavedView}
            onClick={() => applySavedViewToMap(activeSheetMapFrameSavedView?.id ?? null)}
          >
            Apply Assigned to Map
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 px-2.5 text-xs"
            onClick={refreshSelectedSheetPreview}
          >
            Refresh Map Frame Preview
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 px-2.5 text-xs"
            onClick={toggleLockedView}
          >
            {isViewLocked ? 'Unlock View' : 'Lock View'}
          </Button>
        </div>
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_280px]">
          <ProjectSpatialMap
            key={`sheet-source-map-${projectId}`}
            projectId={projectId}
            features={visibleFeatures}
            initialFeatures={features}
            initialAddress={projectAddress}
            draftOverlay={null}
            selectedPersistedFeatureId={null}
            focusedPersistedFeatureId={null}
            focusRequestToken={0}
            selectionSyncToken={0}
            activeBasemap={activeBasemap}
            showGeologyOverlay={showGeologyOverlay}
            lockedViewState={lockedViewState}
            exportRequestToken={exportRequestToken}
            mode="select"
            className="h-[min(68vh,760px)]"
            onFeatureSelect={() => {}}
            onGeologyIdentifyStateChange={setGeologyIdentifyState}
            onExportApiReady={(api) => {
              mapExportApiRef.current = api;
              setIsSourceMapReady(Boolean(api?.isReady()));
              setSourceMapReadyStateLabel(
                api?.readyStateLabel() ?? 'Map loading / map not ready yet.',
              );
              if (!api || hasPrimedSheetPreviewRef.current || !isSheetWorkspaceMode) {
                return;
              }

              hasPrimedSheetPreviewRef.current = true;
              void refreshSheetPreviewSnapshot(api);
            }}
            onDrawComplete={() => {}}
            onPersistedFeatureGeometryChange={() => {}}
            onDraftGeometryChange={() => {}}
          />
          <div className="space-y-2">
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-muted-foreground">
              <div className="font-semibold text-slate-900">Current Source Map</div>
              <div className="mt-1">
                {sheetManagerCurrentViewState
                  ? formatSavedViewStateSummary(sheetManagerCurrentViewState)
                  : 'Loading current map view…'}
              </div>
              <div className="mt-1">
                {PROJECT_SPATIAL_BASEMAP_OPTIONS.find((option) => option.value === activeBasemap)
                  ?.label ?? formatSpatialLabel(activeBasemap)}
                {' · '}
                {showGeologyOverlay ? 'Geology On' : 'Geology Off'}
              </div>
            </div>
            <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-[11px] text-muted-foreground">
              <div className="font-semibold text-slate-900">Map Frame Export View</div>
              <div className="mt-1">
                {activeSheetMapFrameSavedView
                  ? `${activeSheetMapFrameSavedView.label} · ${formatSavedViewStateSummary(activeSheetMapFrameSavedView.viewState)}`
                  : 'No view assigned. The map frame falls back to the current source map.'}
              </div>
              <div className="mt-1">
                Render mode:{' '}
                {activeSheetMapFrameObject?.mapFitMode === 'fill' ? 'Fill / Crop' : 'Fit / Contain'}
              </div>
              {activeSheetMapFrameSavedView?.description ? (
                <div className="mt-1 whitespace-pre-wrap text-slate-600">
                  {activeSheetMapFrameSavedView.description}
                </div>
              ) : null}
            </div>
            <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-[11px] text-muted-foreground">
              <div className="font-semibold text-slate-900">Preview Sync</div>
              <div className="mt-1">
                The sheet preview snapshots the assigned map-frame view before PDF export, then
                restores the live source map so your editing context stays intact.
              </div>
            </div>
          </div>
        </div>
      </div>
    </SheetDesignerTraySection>
  );

  let designerBottomSectionContent: ReactNode = null;

  if (activeDesignerSection === 'sheets') {
    designerBottomSectionContent = activeSheet ? (
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <SheetDesignerTraySection
          title="Sheet Settings"
          description="Sheet identity, page setup, and notes."
        >
          <div className="space-y-2.5">
            <div className="grid gap-2 lg:grid-cols-2">
              <div className="space-y-1">
                <Label
                  htmlFor="spatial-sheet-name"
                  className="text-[11px] uppercase tracking-[0.16em] text-slate-500"
                >
                  Sheet Name
                </Label>
                <Input
                  id="spatial-sheet-name"
                  className="h-8 text-xs"
                  value={activeSheet.name}
                  onChange={(event) => updateActiveSheetRecordField('name', event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label
                  htmlFor="spatial-sheet-use-label"
                  className="text-[11px] uppercase tracking-[0.16em] text-slate-500"
                >
                  Output Purpose
                </Label>
                <Input
                  id="spatial-sheet-use-label"
                  className="h-8 text-xs"
                  value={activeSheet.useLabel}
                  onChange={(event) => updateActiveSheetRecordField('useLabel', event.target.value)}
                  placeholder="Report figure or drawing issue"
                />
              </div>
              <div className="space-y-1">
                <Label
                  htmlFor="spatial-sheet-title"
                  className="text-[11px] uppercase tracking-[0.16em] text-slate-500"
                >
                  Sheet Title
                </Label>
                <Input
                  id="spatial-sheet-title"
                  className="h-8 text-xs"
                  value={normalizedSheetMetadata.sheetTitle}
                  onChange={(event) =>
                    updateActiveSheetMetadataField('sheetTitle', event.target.value)
                  }
                />
              </div>
              <div className="space-y-1">
                <Label
                  htmlFor="spatial-sheet-subtitle"
                  className="text-[11px] uppercase tracking-[0.16em] text-slate-500"
                >
                  Subtitle / Purpose
                </Label>
                <Input
                  id="spatial-sheet-subtitle"
                  className="h-8 text-xs"
                  value={normalizedSheetMetadata.subtitle}
                  onChange={(event) =>
                    updateActiveSheetMetadataField('subtitle', event.target.value)
                  }
                />
              </div>
            </div>
            <div className="grid gap-2 lg:grid-cols-3">
              <div className="space-y-1">
                <Label
                  htmlFor="spatial-sheet-paper-size"
                  className="text-[11px] uppercase tracking-[0.16em] text-slate-500"
                >
                  Paper Size
                </Label>
                <Select
                  value={normalizedSheetMetadata.paperSize}
                  onValueChange={(value) =>
                    updateActiveSheetPaperSetup(
                      value as ProjectSpatialPaperSize,
                      normalizedSheetMetadata.orientation,
                    )
                  }
                >
                  <SelectTrigger id="spatial-sheet-paper-size" className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_SPATIAL_PAPER_SIZE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label
                  htmlFor="spatial-sheet-orientation"
                  className="text-[11px] uppercase tracking-[0.16em] text-slate-500"
                >
                  Orientation
                </Label>
                <Select
                  value={normalizedSheetMetadata.orientation}
                  onValueChange={(value) =>
                    updateActiveSheetPaperSetup(
                      normalizedSheetMetadata.paperSize,
                      value as ProjectSpatialSheetOrientation,
                    )
                  }
                >
                  <SelectTrigger id="spatial-sheet-orientation" className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_SPATIAL_SHEET_ORIENTATION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label
                  htmlFor="spatial-sheet-mode"
                  className="text-[11px] uppercase tracking-[0.16em] text-slate-500"
                >
                  Layout Mode
                </Label>
                <Select
                  value={normalizedSheetMetadata.mode}
                  onValueChange={(value) =>
                    applyActiveSheetLayoutPreset(value as ProjectSpatialSheetMode)
                  }
                >
                  <SelectTrigger id="spatial-sheet-mode" className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_SPATIAL_SHEET_MODE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label
                htmlFor="spatial-sheet-notes"
                className="text-[11px] uppercase tracking-[0.16em] text-slate-500"
              >
                Notes
              </Label>
              <Textarea
                id="spatial-sheet-notes"
                value={normalizedSheetMetadata.notes}
                onChange={(event) => updateActiveSheetMetadataField('notes', event.target.value)}
                className="min-h-[84px] text-xs"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 px-2.5 text-xs"
                onClick={() => createSheet()}
              >
                Create Sheet
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 px-2.5 text-xs"
                onClick={resetActiveSheetLayoutToSystemDefault}
              >
                Reset Layout
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="h-8 px-2.5 text-xs"
                disabled={sheetStore.sheets.length <= 1}
                onClick={() => {
                  if (window.confirm('Delete the selected sheet?')) {
                    deleteActiveSheet();
                  }
                }}
              >
                Delete Sheet
              </Button>
            </div>
          </div>
        </SheetDesignerTraySection>

        <SheetDesignerTraySection
          title="Title Block Metadata"
          description="Drawing identification fields for the export sheet."
        >
          <div className="grid gap-2 lg:grid-cols-2">
            <div className="space-y-1">
              <Label
                htmlFor="spatial-sheet-project-code"
                className="text-[11px] uppercase tracking-[0.16em] text-slate-500"
              >
                Project Code
              </Label>
              <Input
                id="spatial-sheet-project-code"
                className="h-8 text-xs"
                value={normalizedSheetMetadata.projectCode}
                onChange={(event) =>
                  updateActiveSheetMetadataField('projectCode', event.target.value)
                }
              />
            </div>
            <div className="space-y-1">
              <Label
                htmlFor="spatial-sheet-number"
                className="text-[11px] uppercase tracking-[0.16em] text-slate-500"
              >
                Sheet Number
              </Label>
              <Input
                id="spatial-sheet-number"
                className="h-8 text-xs"
                value={normalizedSheetMetadata.sheetNumber}
                onChange={(event) =>
                  updateActiveSheetMetadataField('sheetNumber', event.target.value)
                }
              />
            </div>
            <div className="space-y-1">
              <Label
                htmlFor="spatial-sheet-revision"
                className="text-[11px] uppercase tracking-[0.16em] text-slate-500"
              >
                Revision
              </Label>
              <Input
                id="spatial-sheet-revision"
                className="h-8 text-xs"
                value={normalizedSheetMetadata.revision}
                onChange={(event) => updateActiveSheetMetadataField('revision', event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label
                htmlFor="spatial-sheet-prepared-by"
                className="text-[11px] uppercase tracking-[0.16em] text-slate-500"
              >
                Prepared By
              </Label>
              <Input
                id="spatial-sheet-prepared-by"
                className="h-8 text-xs"
                value={normalizedSheetMetadata.preparedBy}
                onChange={(event) =>
                  updateActiveSheetMetadataField('preparedBy', event.target.value)
                }
              />
            </div>
            <div className="space-y-1">
              <Label
                htmlFor="spatial-sheet-checked-by"
                className="text-[11px] uppercase tracking-[0.16em] text-slate-500"
              >
                Checked By
              </Label>
              <Input
                id="spatial-sheet-checked-by"
                className="h-8 text-xs"
                value={normalizedSheetMetadata.checkedBy}
                onChange={(event) =>
                  updateActiveSheetMetadataField('checkedBy', event.target.value)
                }
              />
            </div>
            <div className="space-y-1 lg:col-span-2">
              <Label
                htmlFor="spatial-sheet-address"
                className="text-[11px] uppercase tracking-[0.16em] text-slate-500"
              >
                Address / Site Address
              </Label>
              <Textarea
                id="spatial-sheet-address"
                value={normalizedSheetMetadata.address}
                onChange={(event) => updateActiveSheetMetadataField('address', event.target.value)}
                className="min-h-[84px] text-xs"
              />
            </div>
          </div>
        </SheetDesignerTraySection>
      </div>
    ) : (
      <SheetDesignerTraySection
        title="Sheets"
        description="Select or create a sheet to configure its paper setup and title block."
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-sm text-muted-foreground">Select or create a sheet.</div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 px-2.5 text-xs"
            onClick={() => createSheet()}
          >
            Create Sheet
          </Button>
        </div>
      </SheetDesignerTraySection>
    );
  } else if (activeDesignerSection === 'savedViews') {
    designerBottomSectionContent = (
      <SheetDesignerTraySection
        title="Views"
        description="Reusable project views linked to the live source map."
      >
        <div className="space-y-2.5">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 px-2.5 text-xs"
              onClick={() => {
                createSavedViewFromCurrentMap();
              }}
            >
              Create View
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 px-2.5 text-xs"
              disabled={!activeSheetSavedView}
              onClick={() => {
                if (activeSheetSavedView) {
                  updateSavedViewFromCurrentMap(activeSheetSavedView.id);
                }
              }}
            >
              Update Assigned
            </Button>
          </div>
          <div className="grid gap-2 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
            <div className="space-y-1">
              <Label
                htmlFor="designer-assigned-view"
                className="text-[11px] uppercase tracking-[0.16em] text-slate-500"
              >
                Assigned View
              </Label>
              <Select
                value={activeSheet?.assignedSavedViewId ?? NONE_VALUE}
                onValueChange={(value) =>
                  assignSavedViewToSheet(value === NONE_VALUE ? null : value)
                }
              >
                <SelectTrigger id="designer-assigned-view" className="h-8 text-xs">
                  <SelectValue placeholder="Select assigned view" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>No assigned view</SelectItem>
                  {activeSheetSavedViews.map((savedView) => (
                    <SelectItem key={savedView.id} value={savedView.id}>
                      {formatOperatorFacingSheetLabel(savedView.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-muted-foreground">
              <div>
                {activeSheetSavedView
                  ? `Assigned view: ${formatOperatorFacingSheetLabel(activeSheetSavedView.label)}`
                  : 'No export view assigned yet. The map frame will fall back to the live source map.'}
              </div>
              <div className="mt-1">
                {activeSheetSavedView
                  ? doesCurrentMapMatchAssignedView === null
                    ? 'Current map comparison is not available yet.'
                    : doesCurrentMapMatchAssignedView
                      ? 'Current map matches the assigned export view.'
                      : 'Current map differs from the assigned export view.'
                  : 'Create and assign a view to drive the sheet map frame export.'}
              </div>
            </div>
          </div>
          {activeSheetSavedViews.length === 0 ? (
            <div className="rounded-md border border-dashed px-3 py-6 text-sm text-muted-foreground">
              No views yet.
            </div>
          ) : (
            <div className="grid gap-2 xl:grid-cols-2">
              {activeSheetSavedViews.map((savedView) => {
                const isAssigned = savedView.id === activeSheetSavedView?.id;
                return (
                  <div
                    key={savedView.id}
                    className="space-y-2 rounded-md border border-slate-200 bg-white px-3 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold text-slate-900">
                          {formatOperatorFacingSheetLabel(savedView.label)}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {formatDateTime(savedView.capturedAt)}
                        </div>
                      </div>
                      <Badge variant={isAssigned ? 'default' : 'outline'} className="text-[10px]">
                        {isAssigned ? 'Assigned' : 'Available'}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-[10px]">
                        {PROJECT_SPATIAL_BASEMAP_OPTIONS.find(
                          (option) => option.value === savedView.activeBasemap,
                        )?.label ?? formatSpatialLabel(savedView.activeBasemap)}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {savedView.showGeologyOverlay ? 'Geology On' : 'Geology Off'}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {formatSavedViewStateSummary(savedView.viewState)}
                    </div>
                    {savedView.description ? (
                      <div className="rounded-md border border-slate-100 bg-slate-50 px-2.5 py-2 text-[11px] text-slate-600">
                        {savedView.description}
                      </div>
                    ) : null}
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={isAssigned ? 'default' : 'outline'}
                        className="h-8 px-2.5 text-xs"
                        onClick={() => assignSavedViewToSheet(savedView.id)}
                      >
                        {isAssigned ? 'Assigned to Map Frame' : 'Assign to Map Frame'}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 px-2.5 text-xs"
                        onClick={() => applySavedViewToMap(savedView.id)}
                      >
                        Apply to Source Map
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 px-2.5 text-xs"
                        onClick={() => updateSavedViewFromCurrentMap(savedView.id)}
                      >
                        Update
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 px-2.5 text-xs"
                        onClick={() => promptRenameSavedView(savedView.id)}
                      >
                        Rename
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 px-2.5 text-xs"
                        onClick={() => promptSavedViewDescription(savedView.id)}
                      >
                        Edit Note
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 px-2.5 text-xs"
                        onClick={() => {
                          if (window.confirm('Delete this view?')) {
                            deleteSavedView(savedView.id);
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SheetDesignerTraySection>
    );
  } else if (activeDesignerSection === 'objects') {
    designerBottomSectionContent = (
      <SheetDesignerTraySection
        title="Legacy Layout Objects"
        description="Visible paper-space objects in the active sheet."
      >
        <div className="grid gap-2 xl:grid-cols-2">
          {activeSheetObjects.map((object) => (
            <button
              key={object.id}
              type="button"
              onClick={() => {
                setSelectedSheetObjectId(object.id);
                setActiveDesignerSection('objectInspector');
              }}
              className={`w-full rounded-md border px-2.5 py-2 text-left transition ${
                selectedSheetObject?.id === object.id
                  ? 'border-sky-500 bg-sky-50'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold">{object.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {getProjectSpatialSheetObjectLabel(object.type)}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-[10px]">
                    {object.visible ? 'Visible' : 'Hidden'}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {object.locked ? 'Locked' : 'Editable'}
                  </Badge>
                </div>
              </div>
            </button>
          ))}
        </div>
      </SheetDesignerTraySection>
    );
  } else if (activeDesignerSection === 'objectInspector') {
    designerBottomSectionContent = (
      <SheetDesignerTraySection
        title="Legacy Object Inspector"
        description="Compact numeric controls for the selected object."
      >
        {selectedSheetObject ? (
          <div className="space-y-2.5">
            <div className="grid gap-2 lg:grid-cols-[minmax(0,220px)_auto] lg:items-end">
              <div className="space-y-1">
                <Label
                  htmlFor="designer-object-name"
                  className="text-[11px] uppercase tracking-[0.16em] text-slate-500"
                >
                  Object Name
                </Label>
                <Input
                  id="designer-object-name"
                  className="h-8 text-xs"
                  value={selectedSheetObject.name}
                  onChange={(event) => updateSelectedSheetObjectField('name', event.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="text-[10px]">
                  {getProjectSpatialSheetObjectLabel(selectedSheetObject.type)}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  Order {Math.round(selectedSheetObject.order)}
                </Badge>
              </div>
            </div>
            {selectedObjectSizeConstraint ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] text-muted-foreground">
                X/Y and size values clamp to the sheet safe area.
                {` Min ${selectedObjectSizeConstraint.minWidth.toFixed(0)} x ${selectedObjectSizeConstraint.minHeight.toFixed(0)} mm`}
                {` · Max ${selectedObjectSizeConstraint.maxWidth.toFixed(0)} x ${selectedObjectSizeConstraint.maxHeight.toFixed(0)} mm`}
              </div>
            ) : null}
            <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-5">
              <ObjectNumberField
                disabled={selectedSheetObject.locked}
                id="designer-object-x"
                label="X"
                step={0.5}
                value={selectedSheetObject.x}
                onValueChange={(value) => updateSelectedSheetObjectField('x', value)}
              />
              <ObjectNumberField
                disabled={selectedSheetObject.locked}
                id="designer-object-y"
                label="Y"
                step={0.5}
                value={selectedSheetObject.y}
                onValueChange={(value) => updateSelectedSheetObjectField('y', value)}
              />
              <ObjectNumberField
                disabled={selectedSheetObject.locked}
                id="designer-object-width"
                label="Width"
                step={0.5}
                value={selectedSheetObject.width}
                onValueChange={(value) => updateSelectedSheetObjectField('width', value)}
              />
              <ObjectNumberField
                disabled={selectedSheetObject.locked}
                id="designer-object-height"
                label="Height"
                step={0.5}
                value={selectedSheetObject.height}
                onValueChange={(value) => updateSelectedSheetObjectField('height', value)}
              />
              <ObjectNumberField
                id="designer-object-order"
                label="Order"
                step={1}
                suffix=""
                value={selectedSheetObject.order}
                onValueChange={(value) =>
                  updateSelectedSheetObjectField('order', Math.round(value))
                }
              />
            </div>
            <div
              className={cn(
                'grid gap-2',
                selectedSheetObject.type === 'mapFrame'
                  ? 'sm:grid-cols-2 xl:grid-cols-[160px_160px_minmax(0,220px)_minmax(0,160px)]'
                  : 'sm:grid-cols-2 xl:grid-cols-[160px_160px_minmax(0,260px)]',
              )}
            >
              <label className="flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-white px-2 text-xs">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-slate-300"
                  checked={selectedSheetObject.visible}
                  onChange={(event) =>
                    updateSelectedSheetObjectBoolean('visible', event.target.checked)
                  }
                />
                <span>Visible</span>
              </label>
              <label className="flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-white px-2 text-xs">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-slate-300"
                  checked={selectedSheetObject.locked}
                  onChange={(event) =>
                    updateSelectedSheetObjectBoolean('locked', event.target.checked)
                  }
                />
                <span>Locked</span>
              </label>
              {selectedSheetObject.type === 'mapFrame' ? (
                <div className="space-y-1">
                  <Label
                    htmlFor="designer-map-frame-view"
                    className="text-[11px] uppercase tracking-[0.16em] text-slate-500"
                  >
                    Linked View
                  </Label>
                  <Select
                    value={selectedSheetObject.linkedSavedViewId ?? NONE_VALUE}
                    onValueChange={(value) =>
                      assignSavedViewToSheet(value === NONE_VALUE ? null : value)
                    }
                  >
                    <SelectTrigger id="designer-map-frame-view" className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>Current / no assigned view</SelectItem>
                      {activeSheetSavedViews.map((savedView) => (
                        <SelectItem key={savedView.id} value={savedView.id}>
                          {formatOperatorFacingSheetLabel(savedView.label)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              {selectedSheetObject.type === 'mapFrame' ? (
                <div className="space-y-1">
                  <Label
                    htmlFor="designer-map-frame-fit-mode"
                    className="text-[11px] uppercase tracking-[0.16em] text-slate-500"
                  >
                    Fit Mode
                  </Label>
                  <Select
                    value={selectedSheetObject.mapFitMode ?? 'fit'}
                    onValueChange={(value) =>
                      updateSelectedMapFrameFitMode(value as ProjectSpatialSheetMapFitMode)
                    }
                  >
                    <SelectTrigger id="designer-map-frame-fit-mode" className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fit">Fit / contain</SelectItem>
                      <SelectItem value="fill">Fill / crop</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>
            {selectedSheetObject.type === 'mapFrame' ? (
              <div className="space-y-2">
                <div className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] text-muted-foreground">
                  {activeSheetMapFrameSavedView
                    ? `Assigned view ${activeSheetMapFrameSavedView.label} · ${PROJECT_SPATIAL_BASEMAP_OPTIONS.find((option) => option.value === activeSheetMapFrameSavedView.activeBasemap)?.label ?? formatSpatialLabel(activeSheetMapFrameSavedView.activeBasemap)} · ${activeSheetMapFrameSavedView.showGeologyOverlay ? 'Geology On' : 'Geology Off'}`
                    : 'No view assigned. The map frame falls back to the current source map until you assign a view.'}
                  <div className="mt-1">
                    Frame aspect ratio:{' '}
                    {(selectedSheetObject.width / Math.max(selectedSheetObject.height, 1))
                      .toFixed(2)
                      .replace(/\.00$/, '')}
                    :1
                  </div>
                  <div className="mt-1">
                    View summary:{' '}
                    {activeSheetMapFrameSavedView
                      ? formatSavedViewStateSummary(activeSheetMapFrameSavedView.viewState)
                      : 'Current source map'}
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 px-2.5 text-xs"
                    disabled={!activeSheetMapFrameSavedView}
                    onClick={() => applySavedViewToMap(activeSheetMapFrameSavedView?.id ?? null)}
                  >
                    Apply View to Source Map
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 px-2.5 text-xs"
                    disabled={!activeSheetMapFrameSavedView}
                    onClick={() => {
                      if (activeSheetMapFrameSavedView) {
                        updateSavedViewFromCurrentMap(activeSheetMapFrameSavedView.id);
                      }
                    }}
                  >
                    Update from Source Map
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 px-2.5 text-xs"
                    onClick={() =>
                      createSavedViewFromCurrentMap({
                        assignToSheet: true,
                        initialName:
                          activeSheetMapFrameSavedView?.label ??
                          `${activeSheet?.name ?? 'Sheet'} View`,
                      })
                    }
                  >
                    Capture Current Map as View
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 px-2.5 text-xs"
                    onClick={refreshSelectedSheetPreview}
                  >
                    Refresh Map Frame Preview
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 px-2.5 text-xs"
                    onClick={() => {
                      setActiveDesignerSection('sourceMap');
                      setIsDesignerBottomTrayCollapsed(false);
                    }}
                  >
                    Open View Editor
                  </Button>
                </div>
              </div>
            ) : null}
            {selectedSheetObject.type === 'titleBlock' ? (
              <div className="grid gap-2 border-t border-slate-200 pt-2 lg:grid-cols-3">
                <ObjectNumberField
                  disabled={selectedSheetObject.locked}
                  id="inspector-title-block-content-scale"
                  label="Content Scale"
                  max={1.5}
                  min={0.8}
                  step={0.05}
                  suffix="x"
                  value={selectedSheetObject.contentScale ?? 1}
                  onValueChange={(value) => updateSelectedSheetObjectSetting('contentScale', value)}
                />
                <ObjectNumberField
                  disabled={selectedSheetObject.locked}
                  id="inspector-title-block-padding-scale"
                  label="Padding"
                  max={1.45}
                  min={0.75}
                  step={0.05}
                  suffix="x"
                  value={selectedSheetObject.paddingScale ?? 1}
                  onValueChange={(value) => updateSelectedSheetObjectSetting('paddingScale', value)}
                />
                <div className="space-y-1">
                  <Label
                    htmlFor="inspector-title-block-density"
                    className="text-[11px] uppercase tracking-[0.16em] text-slate-500"
                  >
                    Density
                  </Label>
                  <Select
                    value={selectedSheetObject.density ?? 'normal'}
                    onValueChange={(value) =>
                      updateSelectedSheetObjectSetting(
                        'density',
                        value as ProjectSpatialSheetObject['density'],
                      )
                    }
                  >
                    <SelectTrigger id="inspector-title-block-density" className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compact">Compact</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : null}
            {selectedSheetObject.type === 'legend' ? (
              <div className="grid gap-2 border-t border-slate-200 pt-2 lg:grid-cols-3">
                <ObjectNumberField
                  disabled={selectedSheetObject.locked}
                  id="inspector-legend-text-scale"
                  label="Text Scale"
                  max={1.5}
                  min={0.8}
                  step={0.05}
                  suffix="x"
                  value={selectedSheetObject.contentScale ?? 1}
                  onValueChange={(value) => updateSelectedSheetObjectSetting('contentScale', value)}
                />
                <ObjectNumberField
                  disabled={selectedSheetObject.locked}
                  id="inspector-legend-symbol-scale"
                  label="Symbol Scale"
                  max={1.5}
                  min={0.75}
                  step={0.05}
                  suffix="x"
                  value={selectedSheetObject.symbolScale ?? 1}
                  onValueChange={(value) => updateSelectedSheetObjectSetting('symbolScale', value)}
                />
                <ObjectNumberField
                  disabled={selectedSheetObject.locked}
                  id="inspector-legend-padding"
                  label="Padding"
                  max={1.45}
                  min={0.75}
                  step={0.05}
                  suffix="x"
                  value={selectedSheetObject.paddingScale ?? 1}
                  onValueChange={(value) => updateSelectedSheetObjectSetting('paddingScale', value)}
                />
                <div className="space-y-1">
                  <Label
                    htmlFor="inspector-legend-density"
                    className="text-[11px] uppercase tracking-[0.16em] text-slate-500"
                  >
                    Density
                  </Label>
                  <Select
                    value={selectedSheetObject.density ?? 'normal'}
                    onValueChange={(value) =>
                      updateSelectedSheetObjectSetting(
                        'density',
                        value as ProjectSpatialSheetObject['density'],
                      )
                    }
                  >
                    <SelectTrigger id="inspector-legend-density" className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compact">Compact</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label
                    htmlFor="inspector-legend-columns"
                    className="text-[11px] uppercase tracking-[0.16em] text-slate-500"
                  >
                    Columns
                  </Label>
                  <Select
                    value={String(selectedSheetObject.legendColumns ?? 1)}
                    onValueChange={(value) =>
                      updateSelectedSheetObjectSetting('legendColumns', Number(value))
                    }
                  >
                    <SelectTrigger id="inspector-legend-columns" className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Column</SelectItem>
                      <SelectItem value="2">2 Columns</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <label className="flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-white px-2 text-xs">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded border-slate-300"
                    checked={selectedSheetObject.legendShowMapContext ?? true}
                    onChange={(event) =>
                      updateSelectedSheetObjectSetting('legendShowMapContext', event.target.checked)
                    }
                  />
                  <span>Show Read-only Map Context</span>
                </label>
              </div>
            ) : null}
            {selectedSheetObject.type === 'notes' ? (
              <div className="grid gap-2 border-t border-slate-200 pt-2 lg:grid-cols-3">
                <ObjectNumberField
                  disabled={selectedSheetObject.locked}
                  id="inspector-notes-text-scale"
                  label="Text Scale"
                  max={1.5}
                  min={0.8}
                  step={0.05}
                  suffix="x"
                  value={selectedSheetObject.contentScale ?? 1}
                  onValueChange={(value) => updateSelectedSheetObjectSetting('contentScale', value)}
                />
                <ObjectNumberField
                  disabled={selectedSheetObject.locked}
                  id="inspector-notes-padding"
                  label="Padding"
                  max={1.45}
                  min={0.75}
                  step={0.05}
                  suffix="x"
                  value={selectedSheetObject.paddingScale ?? 1}
                  onValueChange={(value) => updateSelectedSheetObjectSetting('paddingScale', value)}
                />
                <div className="space-y-1">
                  <Label
                    htmlFor="inspector-notes-density"
                    className="text-[11px] uppercase tracking-[0.16em] text-slate-500"
                  >
                    Density
                  </Label>
                  <Select
                    value={selectedSheetObject.density ?? 'normal'}
                    onValueChange={(value) =>
                      updateSelectedSheetObjectSetting(
                        'density',
                        value as ProjectSpatialSheetObject['density'],
                      )
                    }
                  >
                    <SelectTrigger id="inspector-notes-density" className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compact">Compact</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : null}
            {selectedSheetObject.type === 'sheetContext' ? (
              <div className="space-y-2 border-t border-slate-200 pt-2">
                <div className="grid gap-2 lg:grid-cols-3">
                  <ObjectNumberField
                    disabled={selectedSheetObject.locked}
                    id="inspector-context-text-scale"
                    label="Text Scale"
                    max={1.5}
                    min={0.8}
                    step={0.05}
                    suffix="x"
                    value={selectedSheetObject.contentScale ?? 1}
                    onValueChange={(value) =>
                      updateSelectedSheetObjectSetting('contentScale', value)
                    }
                  />
                  <ObjectNumberField
                    disabled={selectedSheetObject.locked}
                    id="inspector-context-padding"
                    label="Padding"
                    max={1.45}
                    min={0.75}
                    step={0.05}
                    suffix="x"
                    value={selectedSheetObject.paddingScale ?? 1}
                    onValueChange={(value) =>
                      updateSelectedSheetObjectSetting('paddingScale', value)
                    }
                  />
                  <div className="space-y-1">
                    <Label
                      htmlFor="inspector-context-density"
                      className="text-[11px] uppercase tracking-[0.16em] text-slate-500"
                    >
                      Density
                    </Label>
                    <Select
                      value={selectedSheetObject.density ?? 'normal'}
                      onValueChange={(value) =>
                        updateSelectedSheetObjectSetting(
                          'density',
                          value as ProjectSpatialSheetObject['density'],
                        )
                      }
                    >
                      <SelectTrigger id="inspector-context-density" className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="compact">Compact</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                  {(
                    [
                      ['purpose', 'Purpose'],
                      ['layout', 'Layout'],
                      ['paper', 'Paper'],
                      ['basemap', 'Basemap'],
                      ['geology', 'Geology'],
                      ['geoQuery', 'Geo Query'],
                      ['generated', 'Generated'],
                    ] as const
                  ).map(([rowKey, label]) => (
                    <label
                      key={rowKey}
                      className="flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-white px-2 text-xs"
                    >
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-slate-300"
                        checked={selectedSheetObject.sheetContextRowsVisibility?.[rowKey] ?? true}
                        onChange={(event) =>
                          updateSelectedSheetContextRowVisibility(rowKey, event.target.checked)
                        }
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
            {selectedSheetObject.type === 'northArrow' ? (
              <div className="grid gap-2 border-t border-slate-200 pt-2 lg:grid-cols-3">
                <ObjectNumberField
                  disabled={selectedSheetObject.locked}
                  id="inspector-north-arrow-scale"
                  label="Symbol Scale"
                  max={1.5}
                  min={0.75}
                  step={0.05}
                  suffix="x"
                  value={selectedSheetObject.symbolScale ?? selectedSheetObject.contentScale ?? 1}
                  onValueChange={(value) => updateSelectedSheetObjectSetting('symbolScale', value)}
                />
              </div>
            ) : null}
            {selectedSheetObject.type === 'scaleBar' ? (
              <div className="grid gap-2 border-t border-slate-200 pt-2 lg:grid-cols-3">
                <ObjectNumberField
                  disabled={selectedSheetObject.locked}
                  id="inspector-scale-bar-scale"
                  label="Scale"
                  max={1.5}
                  min={0.75}
                  step={0.05}
                  suffix="x"
                  value={selectedSheetObject.symbolScale ?? selectedSheetObject.contentScale ?? 1}
                  onValueChange={(value) => updateSelectedSheetObjectSetting('symbolScale', value)}
                />
                <label className="flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-white px-2 text-xs">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded border-slate-300"
                    checked={selectedSheetObject.scaleBarShowLabel ?? true}
                    onChange={(event) =>
                      updateSelectedSheetObjectSetting('scaleBarShowLabel', event.target.checked)
                    }
                  />
                  <span>Show Label</span>
                </label>
              </div>
            ) : null}
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 px-2.5 text-xs"
                disabled={selectedSheetObject.locked}
                onClick={() => alignSelectedSheetObject('left')}
              >
                Align Left
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 px-2.5 text-xs"
                disabled={selectedSheetObject.locked}
                onClick={() => alignSelectedSheetObject('right')}
              >
                Align Right
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 px-2.5 text-xs"
                disabled={selectedSheetObject.locked}
                onClick={() => alignSelectedSheetObject('top')}
              >
                Align Top
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 px-2.5 text-xs"
                disabled={selectedSheetObject.locked}
                onClick={() => alignSelectedSheetObject('bottom')}
              >
                Align Bottom
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 px-2.5 text-xs"
                disabled={selectedSheetObject.locked}
                onClick={() => alignSelectedSheetObject('center_horizontally')}
              >
                Center Horizontally
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 px-2.5 text-xs"
                disabled={selectedSheetObject.locked}
                onClick={() => alignSelectedSheetObject('center_vertically')}
              >
                Center Vertically
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 px-2.5 text-xs"
                disabled={selectedSheetObject.locked}
                onClick={() => fitSelectedSheetObjectToSafeDimension('width')}
              >
                Fit to Safe Width
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 px-2.5 text-xs"
                disabled={selectedSheetObject.locked}
                onClick={() => fitSelectedSheetObjectToSafeDimension('height')}
              >
                Fit to Safe Height
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 px-2.5 text-xs"
                onClick={() => shiftSelectedSheetObjectOrder('forward')}
              >
                Bring Forward
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 px-2.5 text-xs"
                onClick={() => shiftSelectedSheetObjectOrder('backward')}
              >
                Send Backward
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 px-2.5 text-xs"
                onClick={resetSelectedSheetObject}
              >
                Reset Legacy Selection
              </Button>
              {selectedSheetObject.type === 'legend' ||
              selectedSheetObject.type === 'notes' ||
              selectedSheetObject.type === 'sheetContext' ||
              selectedSheetObject.type === 'titleBlock' ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 px-2.5 text-xs"
                  onClick={autoSizeContentBlocks}
                >
                  Experimental Auto Size
                </Button>
              ) : null}
            </div>
            {selectedSheetObject.locked ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                This object is locked. Unlock it to move or resize it on the sheet canvas.
              </div>
            ) : null}
            {selectedSheetObject.type === 'titleBlock' ? (
              <div className="grid gap-2 border-t border-slate-200 pt-2 lg:grid-cols-2">
                <div className="space-y-1">
                  <Label
                    htmlFor="inspector-title-block-sheet-title"
                    className="text-[11px] uppercase tracking-[0.16em] text-slate-500"
                  >
                    Drawing Title
                  </Label>
                  <Input
                    id="inspector-title-block-sheet-title"
                    className="h-8 text-xs"
                    value={normalizedSheetMetadata.sheetTitle}
                    onChange={(event) =>
                      updateActiveSheetMetadataField('sheetTitle', event.target.value)
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label
                    htmlFor="inspector-title-block-sheet-number"
                    className="text-[11px] uppercase tracking-[0.16em] text-slate-500"
                  >
                    Sheet Number
                  </Label>
                  <Input
                    id="inspector-title-block-sheet-number"
                    className="h-8 text-xs"
                    value={normalizedSheetMetadata.sheetNumber}
                    onChange={(event) =>
                      updateActiveSheetMetadataField('sheetNumber', event.target.value)
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label
                    htmlFor="inspector-title-block-revision"
                    className="text-[11px] uppercase tracking-[0.16em] text-slate-500"
                  >
                    Revision
                  </Label>
                  <Input
                    id="inspector-title-block-revision"
                    className="h-8 text-xs"
                    value={normalizedSheetMetadata.revision}
                    onChange={(event) =>
                      updateActiveSheetMetadataField('revision', event.target.value)
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label
                    htmlFor="inspector-title-block-project"
                    className="text-[11px] uppercase tracking-[0.16em] text-slate-500"
                  >
                    Project
                  </Label>
                  <Input
                    id="inspector-title-block-project"
                    className="h-8 text-xs"
                    value={projectName}
                    disabled
                  />
                </div>
                <div className="space-y-1">
                  <Label
                    htmlFor="inspector-title-block-project-code"
                    className="text-[11px] uppercase tracking-[0.16em] text-slate-500"
                  >
                    Project Code
                  </Label>
                  <Input
                    id="inspector-title-block-project-code"
                    className="h-8 text-xs"
                    value={normalizedSheetMetadata.projectCode}
                    onChange={(event) =>
                      updateActiveSheetMetadataField('projectCode', event.target.value)
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label
                    htmlFor="inspector-title-block-purpose"
                    className="text-[11px] uppercase tracking-[0.16em] text-slate-500"
                  >
                    Drawing Purpose
                  </Label>
                  <Input
                    id="inspector-title-block-purpose"
                    className="h-8 text-xs"
                    value={normalizedSheetMetadata.subtitle}
                    onChange={(event) =>
                      updateActiveSheetMetadataField('subtitle', event.target.value)
                    }
                  />
                </div>
                <div className="space-y-1 lg:col-span-2">
                  <Label
                    htmlFor="inspector-title-block-address"
                    className="text-[11px] uppercase tracking-[0.16em] text-slate-500"
                  >
                    Address / Site Address
                  </Label>
                  <Textarea
                    id="inspector-title-block-address"
                    className="min-h-[72px] text-xs"
                    value={normalizedSheetMetadata.address}
                    onChange={(event) =>
                      updateActiveSheetMetadataField('address', event.target.value)
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label
                    htmlFor="inspector-title-block-prepared-by"
                    className="text-[11px] uppercase tracking-[0.16em] text-slate-500"
                  >
                    Prepared By
                  </Label>
                  <Input
                    id="inspector-title-block-prepared-by"
                    className="h-8 text-xs"
                    value={normalizedSheetMetadata.preparedBy}
                    onChange={(event) =>
                      updateActiveSheetMetadataField('preparedBy', event.target.value)
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label
                    htmlFor="inspector-title-block-checked-by"
                    className="text-[11px] uppercase tracking-[0.16em] text-slate-500"
                  >
                    Checked By
                  </Label>
                  <Input
                    id="inspector-title-block-checked-by"
                    className="h-8 text-xs"
                    value={normalizedSheetMetadata.checkedBy}
                    onChange={(event) =>
                      updateActiveSheetMetadataField('checkedBy', event.target.value)
                    }
                  />
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-md border border-dashed px-3 py-6 text-sm text-muted-foreground">
            Select an object from the preview or open the Objects tab.
          </div>
        )}
      </SheetDesignerTraySection>
    );
  }

  const designerWorkspace = (
    <div className="fixed inset-0 z-[80] flex min-h-screen flex-col gap-3 overflow-hidden bg-slate-100 p-3 sm:p-4">
      <div className="flex shrink-0 flex-col gap-2 rounded-xl border border-slate-200 bg-background/95 px-3 py-2.5 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {returnToHref ? (
              <Link
                href={returnToHref}
                className={buttonVariants({ size: 'sm' }) + ' h-8 px-2.5 text-xs'}
              >
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                {returnToLabel}
              </Link>
            ) : null}
            <Link
              href={`/projects/${projectId}/spatial`}
              className={buttonVariants({ size: 'sm', variant: 'outline' }) + ' h-8 px-2.5 text-xs'}
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Back to Map
            </Link>
            <div className="truncate text-sm font-semibold text-slate-900">
              Deprecated Sheet Editor
            </div>
            {activeSheet ? (
              <Badge variant="outline" className="text-[10px]">
                {formatOperatorFacingSheetLabel(activeSheet.name)}
              </Badge>
            ) : null}
            <Badge variant="secondary" className="text-[10px]">
              Experimental / legacy
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {normalizedSheetMetadata.paperSize.toUpperCase()}{' '}
              {normalizedSheetMetadata.orientation}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {isLoading ? (
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading source map
                </span>
              ) : (
                `${features.length} feature${features.length === 1 ? '' : 's'}`
              )}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/projects/${projectId}/spatial`}
              className={buttonVariants({ size: 'sm', variant: 'ghost' }) + ' h-8 px-2.5 text-xs'}
            >
              Exit Advanced Editor
            </Link>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 px-2.5 text-xs"
              onClick={() => setIsDesignerBottomTrayCollapsed((current) => !current)}
            >
              {isDesignerBottomTrayCollapsed ? 'Show Controls' : 'Hide Controls'}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0 flex-1">
            <Tabs value={activeSheetId ?? NONE_VALUE} onValueChange={selectSheet}>
              <TabsList className="h-8 max-w-full flex-wrap justify-start gap-1 bg-slate-100 p-1">
                {sheetStore.sheets.map((sheet) => (
                  <TabsTrigger key={sheet.id} value={sheet.id} className="h-6 px-2 text-[11px]">
                    {formatOperatorFacingSheetLabel(sheet.name)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 px-2.5 text-xs"
              onClick={() => setDesignerZoom(null)}
            >
              Fit Sheet
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 px-2.5 text-xs"
              onClick={autoArrangeActiveSheet}
              disabled={!activeSheet}
            >
              Experimental Auto Arrange
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 px-2.5 text-xs"
              onClick={autoSizeContentBlocks}
              disabled={!activeSheet}
            >
              Experimental Auto Size
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 px-2.5 text-xs"
              onClick={resetSelectedSheetObject}
              disabled={!selectedSheetObject}
            >
              Reset Legacy Selection
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 px-2.5 text-xs"
              onClick={resetActiveSheetLayoutToSystemDefault}
              disabled={!activeSheet}
            >
              Reset Sheet Layout
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 w-8 px-0 text-xs"
              onClick={() => nudgeDesignerZoom('out')}
            >
              -
            </Button>
            <div className="flex h-8 min-w-[64px] items-center justify-center rounded-md border bg-white px-2 text-[11px] font-medium text-slate-700">
              {designerZoomPercentage}%
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 w-8 px-0 text-xs"
              onClick={() => nudgeDesignerZoom('in')}
            >
              +
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 px-2.5 text-xs"
              onClick={() => setDesignerZoom(1)}
            >
              100%
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 px-2.5 text-xs"
              disabled={
                isGeneratingPdf ||
                !activeSheet ||
                Boolean(sheetPreflight?.issues.some((issue) => issue.severity === 'blocking'))
              }
              onClick={() => void handlePdfExport()}
            >
              {isGeneratingPdf ? 'Preparing Browser PDF...' : 'Browser PDF Export'}
            </Button>
          </div>
        </div>
      </div>

      {entryIntent === 'monitoring-annexure' ? (
        <Alert className="shrink-0 border-sky-200 bg-sky-50 text-sky-950">
          <MapIcon className="h-4 w-4" />
          <AlertTitle>Monitoring annexure connection flow</AlertTitle>
          <AlertDescription>
            Create or update a Project Spatial View here, then use {returnToLabel.toLowerCase()} to
            import that view snapshot into the report annexure. Saving the annexure makes the report
            preview/print self-contained and no longer dependent on the original Project Spatial
            View id.
          </AlertDescription>
        </Alert>
      ) : null}

      {sheetStoreRecoveryNotice ? (
        <Alert className="shrink-0 border-amber-200 bg-amber-50 text-amber-950">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Local Spatial state was recovered</AlertTitle>
          <AlertDescription>{sheetStoreRecoveryNotice}</AlertDescription>
        </Alert>
      ) : null}

      {spatialFeatureLoadErrorMessage ? (
        <Alert variant="destructive" className="shrink-0">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Source map data could not be loaded</AlertTitle>
          <AlertDescription>
            {spatialFeatureLoadErrorMessage} You can still manage sheets and views, but the live map
            preview may be incomplete until the source map loads again.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="shrink-0 rounded-xl border border-slate-200 bg-background/95 px-3 py-2 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-slate-900">
                {sheetPreflight?.issues.some((issue) => issue.severity === 'blocking')
                  ? 'Export Blocked'
                  : sheetPreflight?.issues.length
                    ? 'Export Warnings'
                    : 'Ready to Export'}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {activeSheetMapFrameSavedView
                  ? `Preview and PDF are using ${activeSheetMapFrameSavedView.label}.`
                  : 'Preview and PDF fall back to the current source map until a view is assigned.'}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={sheetPreflight?.issues.length ? 'outline' : 'default'}
                className="text-[10px]"
              >
                {sheetPreflight?.issues.length
                  ? `${sheetPreflight.issues.length} issue${sheetPreflight.issues.length === 1 ? '' : 's'}`
                  : 'Ready to export'}
              </Badge>
              {sheetPreflight?.issues.length ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 px-2.5 text-[11px]"
                    onClick={autoArrangeActiveSheet}
                  >
                    Experimental Auto Arrange
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 px-2.5 text-[11px]"
                    onClick={autoSizeContentBlocks}
                  >
                    Experimental Auto Size
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 px-2.5 text-[11px]"
                    onClick={resetActiveSheetLayoutToSystemDefault}
                  >
                    Reset Sheet Layout
                  </Button>
                </>
              ) : null}
            </div>
          </div>
          {sheetPreflight?.issues.length ? (
            <div className="mt-2 grid gap-1">
              {sheetPreflight.issues.slice(0, 4).map((issue) => (
                <div key={issue.id} className="text-[11px] text-slate-600">
                  {issue.message}
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-2 text-[11px] text-muted-foreground">
              Visible objects are kept inside the sheet safe area before export, and content blocks
              are checked for readable minimum size.
            </div>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-1.5 text-[11px]">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="font-semibold text-slate-900">Sheet Canvas</span>
              <span>
                {isRefreshingSheetPreview
                  ? 'Refreshing assigned map-frame snapshot...'
                  : activeSheetMapFrameSavedView
                    ? `Previewing ${activeSheetMapFrameSavedView.label}`
                    : 'Previewing the current source map'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">
                {previewSheetBasemapLabel}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {normalizedSheetMetadata.paperSize.toUpperCase()}{' '}
                {normalizedSheetMetadata.orientation}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {designerZoomPercentage}% view
              </Badge>
            </div>
          </div>
          <div
            ref={designerViewportRef}
            className="min-h-0 flex-1 overflow-auto bg-slate-300/45 p-6 sm:p-8"
          >
            <div
              className="flex min-h-full min-w-full items-center justify-center"
              onClick={() => handleSheetObjectSelection(null)}
            >
              {activeSheet && effectiveSheetPreviewSnapshot ? (
                <div
                  style={{
                    height: `${previewPageLayout.heightPx * previewScale}px`,
                    width: `${previewPageLayout.widthPx * previewScale}px`,
                  }}
                >
                  <div
                    style={{
                      height: `${previewPageLayout.heightPx}px`,
                      transform: `scale(${previewScale})`,
                      transformOrigin: 'top left',
                      width: `${previewPageLayout.widthPx}px`,
                    }}
                  >
                    <ProjectSpatialSheet
                      activeBasemapLabel={previewSheetBasemapLabel}
                      checkedBy={normalizedSheetMetadata.checkedBy}
                      detailsBlockRows={activeSheetDetailsBlockRows}
                      generatedAtLabel={formatSheetGeneratedAt(new Date())}
                      geologyQueryLocation={geologyQueryLocation}
                      layoutMode={normalizedSheetMetadata.mode}
                      legendEntries={sheetLegendFeatureEntries}
                      mapFrameSavedViewLabel={activeSheetMapFrameSavedView?.label ?? null}
                      mapImageDataUrl={effectiveSheetPreviewSnapshot.dataUrl}
                      mapImageHeight={effectiveSheetPreviewSnapshot.height}
                      mapImageWidth={effectiveSheetPreviewSnapshot.width}
                      notes={normalizedSheetMetadata.notes}
                      notesBody={activeSheetNotesBody}
                      objects={activeSheetObjects}
                      onObjectGeometryChange={updateSheetObjectGeometry}
                      onSelectObject={handleSheetObjectSelection}
                      orientation={normalizedSheetMetadata.orientation}
                      paperSize={normalizedSheetMetadata.paperSize}
                      preparedBy={normalizedSheetMetadata.preparedBy}
                      projectAddress={normalizedSheetMetadata.address || projectAddress}
                      projectCode={normalizedSheetMetadata.projectCode || project.code}
                      projectName={projectName}
                      revision={normalizedSheetMetadata.revision}
                      rootSheetTemplate={activeSheet?.rootSheetTemplateSnapshot ?? null}
                      scaleBar={effectiveSheetPreviewSnapshot.scaleBar}
                      selectedObjectId={selectedSheetObject?.id ?? null}
                      sheetNumber={normalizedSheetMetadata.sheetNumber}
                      sheetTitle={normalizedSheetMetadata.sheetTitle}
                      showDesignerChrome
                      showGeologyOverlay={previewSheetShowGeologyOverlay}
                      subtitle={normalizedSheetMetadata.subtitle}
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-dashed bg-white px-6 py-10 text-sm text-muted-foreground">
                  Load the source map to generate a fit-to-sheet preview.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-background/95 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
            <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
              {designerSectionOptions.map((option) => (
                <Button
                  key={option.id}
                  type="button"
                  size="sm"
                  variant={activeDesignerSection === option.id ? 'default' : 'ghost'}
                  className="h-7 shrink-0 px-2.5 text-[11px]"
                  onClick={() => {
                    setActiveDesignerSection(option.id);
                    setIsDesignerBottomTrayCollapsed(false);
                  }}
                >
                  {option.label}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">
                {activeDesignerSectionLabel}
              </Badge>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 px-2.5 text-[11px]"
                onClick={() => setIsDesignerBottomTrayCollapsed((current) => !current)}
              >
                {isDesignerBottomTrayCollapsed ? 'Show Controls' : 'Hide Controls'}
              </Button>
            </div>
          </div>

          <div
            className={cn(
              'relative overflow-hidden bg-slate-50/80 transition-[height] duration-200 ease-out',
              isDesignerBottomTrayCollapsed
                ? 'h-0'
                : activeDesignerSection === 'sourceMap'
                  ? 'h-[min(72vh,760px)]'
                  : 'h-[min(24vh,220px)]',
            )}
          >
            {!isDesignerBottomTrayCollapsed && activeDesignerSection !== 'sourceMap' ? (
              <div className="h-full overflow-y-auto p-2.5">{designerBottomSectionContent}</div>
            ) : null}

            <div
              aria-hidden={!isSourceMapVisibleInTray}
              className={cn(
                isSourceMapVisibleInTray
                  ? 'relative h-full overflow-y-auto p-2.5'
                  : 'pointer-events-none fixed -left-[200vw] top-0 w-[760px] opacity-0',
              )}
            >
              {sourceMapSection}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const sheetExportCapturePortal = sheetExportState ? (
    <div aria-hidden="true" className="pointer-events-none fixed top-0" style={{ left: '-200vw' }}>
      <div ref={sheetCaptureRef}>
        <ProjectSpatialSheet
          layoutMode={sheetExportState.metadata.mode}
          paperSize={sheetExportState.metadata.paperSize}
          orientation={sheetExportState.metadata.orientation}
          projectCode={sheetExportState.metadata.projectCode || project.code}
          projectName={projectName}
          projectAddress={sheetExportState.metadata.address || projectAddress}
          sheetTitle={sheetExportState.metadata.sheetTitle}
          subtitle={sheetExportState.metadata.subtitle}
          preparedBy={sheetExportState.metadata.preparedBy}
          checkedBy={sheetExportState.metadata.checkedBy}
          revision={sheetExportState.metadata.revision}
          sheetNumber={sheetExportState.metadata.sheetNumber}
          generatedAtLabel={sheetExportState.generatedAtLabel}
          activeBasemapLabel={sheetExportState.activeBasemapLabel}
          showGeologyOverlay={sheetExportState.showGeologyOverlay}
          geologyQueryLocation={sheetExportState.geologyQueryLocation}
          mapFrameSavedViewLabel={sheetExportState.mapFrameSavedViewLabel}
          mapImageDataUrl={sheetExportState.mapSnapshot.dataUrl}
          mapImageHeight={sheetExportState.mapSnapshot.height}
          mapImageWidth={sheetExportState.mapSnapshot.width}
          scaleBar={sheetExportState.mapSnapshot.scaleBar}
          legendEntries={sheetExportState.legendEntries}
          notes={sheetExportState.metadata.notes}
          objects={sheetExportState.objects}
          rootSheetTemplate={sheetExportState.rootSheetTemplateSnapshot}
        />
      </div>
    </div>
  ) : null;

  if (isSheetDesignerMode) {
    if (activeSheetUsesRootSheetTemplate) {
      return (
        <>
          {sheetExportCapturePortal}
          <div className="space-y-4 p-4">
            <div>
              <Link
                href={spatialSheetsHref}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Sheets
              </Link>
            </div>
            <PageHeader
              title="Deprecated Sheet Editor"
              description="Legacy sheet-layout controls are no longer part of the normal product path. Root Sheet Templates are edited at /templates."
              badges={
                <>
                  <Badge variant="outline">{projectName}</Badge>
                  <Badge variant="outline">
                    {formatOperatorFacingSheetLabel(
                      activeSheetTemplateDefinition?.label ?? 'Root Sheet Template',
                    )}
                  </Badge>
                  <Badge variant="secondary">Experimental / legacy</Badge>
                </>
              }
            />
            <Alert className="border-amber-200 bg-amber-50 text-amber-950">
              <MapIcon className="h-4 w-4" />
              <AlertTitle>Deprecated editor blocked for Root Sheet Template sheets</AlertTitle>
              <AlertDescription>
                This Project Spatial Sheet is driven by a Root Sheet Template from `/templates`. The
                deprecated legacy-layout controls stay blocked so we do not mix them into the normal
                product path.
              </AlertDescription>
            </Alert>
            <div className="flex flex-wrap gap-2">
              <Link href={spatialSheetsHref} className={buttonVariants({ size: 'sm' })}>
                Return to Sheets
              </Link>
              <Link
                href="/templates"
                className={buttonVariants({ size: 'sm', variant: 'outline' })}
              >
                Open Root Sheet Templates
              </Link>
            </div>
          </div>
        </>
      );
    }

    return (
      <>
        {sheetExportCapturePortal}
        {designerWorkspace}
      </>
    );
  }

  if (isViewsMode) {
    return (
      <div className="space-y-4 p-4">
        <div>
          <Link
            href={returnToHref ?? `/projects/${projectId}`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {returnToHref ? returnToLabel : 'Back to project'}
          </Link>
        </div>

        <PageHeader
          title={spatialPageTitle}
          description={spatialPageDescription}
          badges={
            <>
              <Badge variant="outline">{projectName}</Badge>
              <Badge variant="outline">{activeSheetSavedViews.length} views</Badge>
              <Badge variant="outline">{visibleFeatures.length} visible features</Badge>
            </>
          }
          actions={
            <>
              <Link
                href={spatialMapHref}
                className={buttonVariants({ size: 'sm', variant: 'outline' })}
              >
                Map
              </Link>
              <Link href={spatialViewsHref} className={buttonVariants({ size: 'sm' })}>
                Views
              </Link>
              <Link
                href={spatialSheetsHref}
                className={buttonVariants({ size: 'sm', variant: 'outline' })}
              >
                Sheets
              </Link>
            </>
          }
        />

        <Alert>
          <MapIcon className="h-4 w-4" />
          <AlertTitle>Views are the reusable spatial content object</AlertTitle>
          <AlertDescription>
            Each view stores map extent, zoom, rotation, basemap, geology state, and visible layers.
            Filters live inside views here instead of becoming a separate top-level object.
          </AlertDescription>
        </Alert>

        {entryIntent === 'monitoring-annexure' ? (
          <Alert className="border-sky-200 bg-sky-50 text-sky-950">
            <MapIcon className="h-4 w-4" />
            <AlertTitle>Monitoring annexure flow</AlertTitle>
            <AlertDescription>
              Create or update a view here, then use {returnToLabel.toLowerCase()} to import that
              view snapshot into the report annexure.
            </AlertDescription>
          </Alert>
        ) : null}

        {localSpatialImportStore ? (
          <Alert className="border-amber-200 bg-amber-50 text-amber-950">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Import browser-local Spatial records</AlertTitle>
            <AlertDescription className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <span>
                Import {localSpatialImportStore.views.length} browser-local view
                {localSpatialImportStore.views.length === 1 ? '' : 's'} and{' '}
                {localSpatialImportStore.sheets.length} browser-local sheet
                {localSpatialImportStore.sheets.length === 1 ? '' : 's'} into durable Project
                Spatial View and Project Spatial Sheet records.
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void importLocalSpatialRecords()}
                disabled={isImportingLocalSpatialRecords}
              >
                {isImportingLocalSpatialRecords ? 'Importing…' : 'Import Local Records'}
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {mapLoadingNotice}

        <div className={cn('grid gap-4', mapWorkspaceGridClassName)}>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Visible Layers</CardTitle>
                <CardDescription>
                  These layer toggles become part of the next view you create or update.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {PROJECT_SPATIAL_FEATURE_TYPE_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300"
                      checked={visibleFeatureTypes.has(option.value)}
                      onChange={() => toggleFeatureType(option.value)}
                    />
                    <span>{option.label}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {filterCounts.get(option.value) ?? 0}
                    </span>
                  </label>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Current Map State</CardTitle>
                <CardDescription>
                  Set up the map, then save it as a reusable project view.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="spatial-views-basemap">Basemap</Label>
                  <Select
                    value={activeBasemap}
                    onValueChange={(value) => setActiveBasemap(value as ProjectSpatialBasemap)}
                  >
                    <SelectTrigger id="spatial-views-basemap">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_SPATIAL_BASEMAP_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={showGeologyOverlay}
                    onChange={(event) => setShowGeologyOverlay(event.target.checked)}
                  />
                  <span>Geology Overlay</span>
                </label>
                <div className="grid gap-2">
                  <Button
                    type="button"
                    disabled={sourceMapActionDisabled}
                    onClick={() => createSavedViewFromCurrentMap()}
                  >
                    Create View
                  </Button>
                  <Link
                    href={spatialSheetsHref}
                    className={buttonVariants({ size: 'sm', variant: 'outline' })}
                  >
                    Open Sheets
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Map</CardTitle>
              <CardDescription>
                Pan, zoom, and toggle layer visibility before saving a view.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProjectSpatialMap
                key={`spatial-views-map-${projectId}`}
                projectId={projectId}
                features={visibleFeatures}
                initialFeatures={features}
                initialAddress={projectAddress}
                draftOverlay={null}
                selectedPersistedFeatureId={null}
                focusedPersistedFeatureId={null}
                focusRequestToken={0}
                selectionSyncToken={0}
                activeBasemap={activeBasemap}
                showGeologyOverlay={showGeologyOverlay}
                lockedViewState={lockedViewState}
                exportRequestToken={0}
                mode="select"
                className="h-[clamp(34rem,70vh,56rem)]"
                onFeatureSelect={() => {}}
                onGeologyIdentifyStateChange={setGeologyIdentifyState}
                onExportApiReady={(api) => {
                  mapExportApiRef.current = api;
                  setIsSourceMapReady(Boolean(api?.isReady()));
                  setSourceMapReadyStateLabel(
                    api?.readyStateLabel() ?? 'Map loading / map not ready yet.',
                  );
                }}
                onDrawComplete={() => {}}
                onPersistedFeatureGeometryChange={() => {}}
                onDraftGeometryChange={() => {}}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Views</CardTitle>
                  <CardDescription>
                    Project-level reusable views for reports, sheets, and future deliverables.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={sourceMapActionDisabled}
                  onClick={() => createSavedViewFromCurrentMap()}
                >
                  New View
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeSheetSavedViews.length === 0 ? (
                <div className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
                  No views yet. Set the map up on the left, then create your first reusable view.
                </div>
              ) : (
                activeSheetSavedViews.map((savedView) => {
                  const isCurrentMapMatch =
                    sheetManagerCurrentViewState &&
                    activeBasemap === savedView.activeBasemap &&
                    showGeologyOverlay === savedView.showGeologyOverlay &&
                    areProjectSpatialFeatureTypeSetsEqual(
                      visibleFeatureTypes,
                      new Set(savedView.visibleFeatureTypes),
                    ) &&
                    areProjectSpatialViewStatesEqual(
                      sheetManagerCurrentViewState,
                      savedView.viewState,
                    );

                  return (
                    <div key={savedView.id} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-medium">
                            {formatOperatorFacingSheetLabel(savedView.label)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDateTime(savedView.capturedAt)}
                          </div>
                        </div>
                        <Badge variant={isCurrentMapMatch ? 'default' : 'outline'}>
                          {isCurrentMapMatch ? 'Current Map' : 'Stored View'}
                        </Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline">
                          {PROJECT_SPATIAL_BASEMAP_OPTIONS.find(
                            (option) => option.value === savedView.activeBasemap,
                          )?.label ?? formatSpatialLabel(savedView.activeBasemap)}
                        </Badge>
                        <Badge variant="outline">
                          {savedView.visibleFeatureTypes.length} visible layer
                          {savedView.visibleFeatureTypes.length === 1 ? '' : 's'}
                        </Badge>
                        <Badge variant="outline">
                          {savedView.showGeologyOverlay ? 'Geology On' : 'Geology Off'}
                        </Badge>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        {formatSavedViewStateSummary(savedView.viewState)}
                      </div>
                      {savedView.description ? (
                        <div className="mt-2 rounded-md border bg-slate-50 px-2.5 py-2 text-xs text-slate-600">
                          {savedView.description}
                        </div>
                      ) : null}
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={sourceMapActionDisabled}
                          onClick={() => applySavedViewToMap(savedView.id)}
                        >
                          Apply View
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={sourceMapActionDisabled}
                          onClick={() => updateSavedViewFromCurrentMap(savedView.id)}
                        >
                          Update from Current Map
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => duplicateSavedView(savedView.id)}
                        >
                          Duplicate
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => promptRenameSavedView(savedView.id)}
                        >
                          Rename
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => promptSavedViewDescription(savedView.id)}
                        >
                          Edit Note
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (window.confirm('Delete this view?')) {
                              deleteSavedView(savedView.id);
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isSheetsMode) {
    return (
      <>
        {sheetExportCapturePortal}
        <div className="space-y-4 p-4">
          <div>
            <Link
              href={returnToHref ?? `/projects/${projectId}`}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {returnToHref ? returnToLabel : 'Back to project'}
            </Link>
          </div>

          <PageHeader
            title={spatialPageTitle}
            description={spatialPageDescription}
            badges={
              <>
                <Badge variant="outline">{projectName}</Badge>
                <Badge variant="outline">{sheetStore.sheets.length} sheets</Badge>
                <Badge variant="outline">{activeSheetSavedViews.length} views</Badge>
              </>
            }
            actions={
              <>
                <Link
                  href={spatialMapHref}
                  className={buttonVariants({ size: 'sm', variant: 'outline' })}
                >
                  Map
                </Link>
                <Link
                  href={spatialViewsHref}
                  className={buttonVariants({ size: 'sm', variant: 'outline' })}
                >
                  Views
                </Link>
                <Link href={spatialSheetsHref} className={buttonVariants({ size: 'sm' })}>
                  Sheets
                </Link>
              </>
            }
          />

          <Alert>
            <MapIcon className="h-4 w-4" />
            <AlertTitle>Project Spatial Sheets bind layouts to views</AlertTitle>
            <AlertDescription>
              A Project Spatial Sheet pairs a Project Spatial View with a generic Root Sheet
              Template. Root Sheet Templates stay reusable paper/layouts; report-specific titles and
              metadata bind later at sheet instance or Report Annexure time.
            </AlertDescription>
          </Alert>

          {entryIntent === 'monitoring-annexure' ? (
            <Alert className="border-sky-200 bg-sky-50 text-sky-950">
              <MapIcon className="h-4 w-4" />
              <AlertTitle>Monitoring annexure default flow</AlertTitle>
              <AlertDescription>
                Choose a Project Spatial View, choose a generic Root Sheet Template, review the
                result, then return to save the Report Annexure. Module Recommendation hints can
                guide the picker, but the selected Root Sheet Template stays generic.
              </AlertDescription>
            </Alert>
          ) : null}

          {localSpatialImportStore ? (
            <Alert className="border-amber-200 bg-amber-50 text-amber-950">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Import browser-local Spatial records</AlertTitle>
              <AlertDescription className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <span>
                  Import {localSpatialImportStore.views.length} browser-local view
                  {localSpatialImportStore.views.length === 1 ? '' : 's'} and{' '}
                  {localSpatialImportStore.sheets.length} browser-local sheet
                  {localSpatialImportStore.sheets.length === 1 ? '' : 's'} into durable Project
                  Spatial View and Project Spatial Sheet records.
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void importLocalSpatialRecords()}
                  disabled={isImportingLocalSpatialRecords}
                >
                  {isImportingLocalSpatialRecords ? 'Importing…' : 'Import Local Records'}
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}

          {mapLoadingNotice}

          <div className={cn('grid gap-4', mapWorkspaceGridClassName)}>
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Sheets</CardTitle>
                  <CardDescription>
                    Project sheets are saved printable outputs created from Root Sheet Templates.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="spatial-sheet-select">Selected Project Sheet</Label>
                    <Select
                      value={activeSheetId ?? NONE_VALUE}
                      onValueChange={(value) => {
                        if (value !== NONE_VALUE) {
                          selectSheet(value);
                        }
                      }}
                    >
                      <SelectTrigger id="spatial-sheet-select">
                        <SelectValue placeholder="No project sheets yet" />
                      </SelectTrigger>
                      <SelectContent>
                        {sheetStore.sheets.map((sheet) => (
                          <SelectItem key={sheet.id} value={sheet.id}>
                            {formatOperatorFacingSheetLabel(sheet.name)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-sheet-template">New Sheet from Template</Label>
                    <Select
                      value={newSheetTemplateDefinitionId}
                      onValueChange={setNewSheetTemplateDefinitionId}
                    >
                      <SelectTrigger id="new-sheet-template">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {rootSheetTemplateOptions.map((template) => (
                          <SelectItem key={template.value} value={template.value}>
                            <div className="flex flex-col">
                              <span>{formatOperatorFacingSheetLabel(template.label)}</span>
                              <span className="text-xs text-muted-foreground">
                                {getSpatialSheetCapabilityBadgeLabel(template.capability)} ·{' '}
                                {template.description}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="text-xs text-muted-foreground">
                      Root Sheet Templates come from `/templates`. Only spatial-ready templates
                      appear here.
                    </div>
                    {newSheetTemplateDefinition?.moduleRecommendations.length ? (
                      <div className="flex flex-wrap gap-2">
                        {newSheetTemplateDefinition.moduleRecommendations.map((recommendation) => (
                          <Badge key={recommendation.id} variant="outline">
                            {recommendation.label}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                    {generalTemplateCount > 0 ? (
                      <div className="text-xs text-muted-foreground">
                        {generalTemplateCount} general Root Sheet Template
                        {generalTemplateCount === 1 ? ' is' : 's are'} hidden here until a Map Frame
                        is added.
                      </div>
                    ) : null}
                    {rootSheetTemplateOptions.length === 0 ? (
                      <div className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
                        No spatial-ready Root Sheet Templates are available. Create one in
                        `/templates`, add a Map Frame, then return here.
                      </div>
                    ) : null}
                    <Button
                      type="button"
                      className="w-full"
                      onClick={() => createSheet()}
                      disabled={!newSheetTemplateDefinition}
                    >
                      New Sheet from Template
                    </Button>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={duplicateActiveSheet}
                      disabled={!activeSheet}
                    >
                      Duplicate Sheet
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={deleteActiveSheet}
                      disabled={!activeSheet}
                    >
                      Delete Sheet
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Sheet Setup</CardTitle>
                  <CardDescription>
                    Choose the view, template, and metadata that drive this printable sheet.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="active-sheet-template">Template</Label>
                    <Select
                      value={activeSheetTemplateDefinition?.value ?? NONE_VALUE}
                      onValueChange={(value) => {
                        if (value !== NONE_VALUE) {
                          applyRootSheetTemplateToActiveSheet(value);
                        }
                      }}
                    >
                      <SelectTrigger id="active-sheet-template">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {rootSheetTemplateOptions.map((template) => (
                          <SelectItem key={template.value} value={template.value}>
                            <div className="flex flex-col">
                              <span>{formatOperatorFacingSheetLabel(template.label)}</span>
                              <span className="text-xs text-muted-foreground">
                                {getSpatialSheetCapabilityBadgeLabel(template.capability)} ·{' '}
                                {template.description}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="text-xs text-muted-foreground">
                      {activeSheetTemplateDefinition?.description ??
                        'Choose a Root Sheet Template.'}
                    </div>
                    {activeSheetTemplateDefinition?.moduleRecommendations.length ? (
                      <div className="flex flex-wrap gap-2">
                        {activeSheetTemplateDefinition.moduleRecommendations.map(
                          (recommendation) => (
                            <Badge key={recommendation.id} variant="outline">
                              {recommendation.label}
                            </Badge>
                          ),
                        )}
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="active-sheet-view">Assigned View</Label>
                    <Select
                      value={activeSheet?.assignedSavedViewId ?? NONE_VALUE}
                      onValueChange={(value) =>
                        assignSavedViewToSheet(value === NONE_VALUE ? null : value)
                      }
                    >
                      <SelectTrigger id="active-sheet-view">
                        <SelectValue placeholder="Select a view" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE}>No view assigned</SelectItem>
                        {activeSheetSavedViews.map((savedView) => (
                          <SelectItem key={savedView.id} value={savedView.id}>
                            {formatOperatorFacingSheetLabel(savedView.label)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={spatialViewsHref}
                        className={buttonVariants({ size: 'sm', variant: 'outline' })}
                      >
                        Open Views
                      </Link>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!activeSheetMapFrameSavedView || sourceMapActionDisabled}
                        onClick={() =>
                          applySavedViewToMap(activeSheetMapFrameSavedView?.id ?? null)
                        }
                      >
                        Apply Assigned View
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="active-sheet-name">Sheet Name</Label>
                    <Input
                      id="active-sheet-name"
                      value={activeSheet?.name ?? ''}
                      onChange={(event) => updateActiveSheetRecordField('name', event.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="active-sheet-title">Sheet Title</Label>
                    <Input
                      id="active-sheet-title"
                      value={normalizedSheetMetadata.sheetTitle}
                      onChange={(event) =>
                        updateActiveSheetMetadataField('sheetTitle', event.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="active-sheet-purpose">Purpose / Subtitle</Label>
                    <Input
                      id="active-sheet-purpose"
                      value={normalizedSheetMetadata.subtitle}
                      onChange={(event) =>
                        updateActiveSheetMetadataField('subtitle', event.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="active-sheet-notes">Notes</Label>
                    <Textarea
                      id="active-sheet-notes"
                      className="min-h-[96px]"
                      value={normalizedSheetMetadata.notes}
                      onChange={(event) =>
                        updateActiveSheetMetadataField('notes', event.target.value)
                      }
                    />
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={sourceMapActionDisabled}
                      onClick={refreshSelectedSheetPreview}
                    >
                      Refresh Preview
                    </Button>
                    <Button
                      type="button"
                      disabled={
                        isGeneratingPdf ||
                        sourceMapActionDisabled ||
                        !activeSheet ||
                        Boolean(
                          sheetPreflight?.issues.some((issue) => issue.severity === 'blocking'),
                        )
                      }
                      onClick={() => void handlePdfExport()}
                    >
                      {isGeneratingPdf ? 'Preparing Browser PDF...' : 'Browser PDF Export'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Map Source</CardTitle>
                <CardDescription>
                  Views are created and updated from the live project map. Apply a view here before
                  refreshing preview if needed.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Select
                    value={activeBasemap}
                    onValueChange={(value) => setActiveBasemap(value as ProjectSpatialBasemap)}
                  >
                    <SelectTrigger className="w-[220px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_SPATIAL_BASEMAP_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300"
                      checked={showGeologyOverlay}
                      onChange={(event) => setShowGeologyOverlay(event.target.checked)}
                    />
                    <span>Geology Overlay</span>
                  </label>
                </div>
                <ProjectSpatialMap
                  key={`spatial-sheets-map-${projectId}`}
                  projectId={projectId}
                  features={visibleFeatures}
                  initialFeatures={features}
                  initialAddress={projectAddress}
                  draftOverlay={null}
                  selectedPersistedFeatureId={null}
                  focusedPersistedFeatureId={null}
                  focusRequestToken={0}
                  selectionSyncToken={0}
                  activeBasemap={activeBasemap}
                  showGeologyOverlay={showGeologyOverlay}
                  lockedViewState={lockedViewState}
                  exportRequestToken={0}
                  mode="select"
                  className="h-[clamp(30rem,64vh,48rem)]"
                  onFeatureSelect={() => {}}
                  onGeologyIdentifyStateChange={setGeologyIdentifyState}
                  onExportApiReady={(api) => {
                    mapExportApiRef.current = api;
                    setIsSourceMapReady(Boolean(api?.isReady()));
                    setSourceMapReadyStateLabel(
                      api?.readyStateLabel() ?? 'Map loading / map not ready yet.',
                    );
                    if (!api || hasPrimedSheetPreviewRef.current || !isSheetWorkspaceMode) {
                      return;
                    }

                    hasPrimedSheetPreviewRef.current = true;
                    void refreshSheetPreviewSnapshot(api);
                  }}
                  onDrawComplete={() => {}}
                  onPersistedFeatureGeometryChange={() => {}}
                  onDraftGeometryChange={() => {}}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Preview</CardTitle>
                <CardDescription>
                  Preview the selected Root Sheet Template with the assigned Project Spatial View.
                  Browser export is available from this screen.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">
                    {formatOperatorFacingSheetLabel(
                      activeSheetTemplateDefinition?.label ?? 'No Sheet Template selected',
                    )}
                  </Badge>
                  <Badge variant="outline">
                    {activeSheetMapFrameSavedView
                      ? formatOperatorFacingSheetLabel(activeSheetMapFrameSavedView.label)
                      : 'No view assigned'}
                  </Badge>
                  {activeSheetTemplateDefinition ? (
                    <Badge
                      variant={getSpatialSheetCapabilityBadgeVariant(
                        activeSheetTemplateDefinition.capability,
                      )}
                    >
                      {getSpatialSheetCapabilityBadgeLabel(
                        activeSheetTemplateDefinition.capability,
                      )}
                    </Badge>
                  ) : null}
                </div>
                {activeSheet && effectiveSheetPreviewSnapshot ? (
                  <div className="overflow-auto rounded-lg border bg-slate-100 p-4">
                    <div className="mx-auto w-fit">
                      <ProjectSpatialSheet
                        activeBasemapLabel={previewSheetBasemapLabel}
                        checkedBy={normalizedSheetMetadata.checkedBy}
                        detailsBlockRows={activeSheetDetailsBlockRows}
                        generatedAtLabel={formatSheetGeneratedAt(new Date())}
                        geologyQueryLocation={geologyQueryLocation}
                        layoutMode={normalizedSheetMetadata.mode}
                        legendEntries={sheetLegendFeatureEntries}
                        mapFrameSavedViewLabel={activeSheetMapFrameSavedView?.label ?? null}
                        mapImageDataUrl={effectiveSheetPreviewSnapshot.dataUrl}
                        mapImageHeight={effectiveSheetPreviewSnapshot.height}
                        mapImageWidth={effectiveSheetPreviewSnapshot.width}
                        notes={normalizedSheetMetadata.notes}
                        notesBody={activeSheetNotesBody}
                        objects={activeSheetObjects}
                        orientation={normalizedSheetMetadata.orientation}
                        paperSize={normalizedSheetMetadata.paperSize}
                        preparedBy={normalizedSheetMetadata.preparedBy}
                        projectAddress={normalizedSheetMetadata.address || projectAddress}
                        projectCode={normalizedSheetMetadata.projectCode || project.code}
                        projectName={projectName}
                        revision={normalizedSheetMetadata.revision}
                        rootSheetTemplate={activeSheet?.rootSheetTemplateSnapshot ?? null}
                        scaleBar={effectiveSheetPreviewSnapshot.scaleBar}
                        sheetNumber={normalizedSheetMetadata.sheetNumber}
                        sheetTitle={normalizedSheetMetadata.sheetTitle}
                        showGeologyOverlay={previewSheetShowGeologyOverlay}
                        subtitle={normalizedSheetMetadata.subtitle}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed px-4 py-8 text-sm text-muted-foreground">
                    Assign a view and refresh preview to render the printable sheet.
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  Project sheets stay template-driven here. Update the underlying Root Sheet
                  Template in `/templates` when you need to change the reusable paper/layout.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="space-y-4 p-4">
        <div>
          <Link
            href={`/projects/${projectId}`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to project
          </Link>
        </div>

        <PageHeader
          title={spatialPageTitle}
          description={spatialPageDescription}
          badges={
            <>
              <Badge variant="outline">{projectName}</Badge>
              <Badge variant="outline">
                {features.length} total feature{features.length === 1 ? '' : 's'}
              </Badge>
              <Badge variant="outline">{visibleFeatures.length} visible in workspace</Badge>
            </>
          }
          actions={
            <>
              <Link href={spatialMapHref} className={buttonVariants({ size: 'sm' })}>
                Map
              </Link>
              <Link
                href={spatialViewsHref}
                className={buttonVariants({ size: 'sm', variant: 'outline' })}
              >
                Views
              </Link>
              <Link
                href={spatialSheetsHref}
                className={buttonVariants({ size: 'sm', variant: 'outline' })}
              >
                Sheets
              </Link>
            </>
          }
        />

        <Alert>
          <MapIcon className="h-4 w-4" />
          <AlertTitle>Project-owned spatial workspace</AlertTitle>
          <AlertDescription>
            This master map is shared across Project Geotechnical, Foundations, Environmental,
            CNVMP, Monitoring Reports, and future inspections. It is the reusable source of truth
            for project spatial features.
          </AlertDescription>
        </Alert>

        {mapLoadingNotice}

        <div className={cn('grid gap-4', mapWorkspaceGridClassName)}>
          {isMapLeftPanelVisible ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Visible Layers</CardTitle>
                  <CardDescription>
                    Hide or show feature types for the current map. Views capture this layer
                    visibility.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {PROJECT_SPATIAL_FEATURE_TYPE_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300"
                        checked={visibleFeatureTypes.has(option.value)}
                        onChange={() => toggleFeatureType(option.value)}
                      />
                      <span>{option.label}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {filterCounts.get(option.value) ?? 0}
                      </span>
                    </label>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Legend</CardTitle>
                  <CardDescription>
                    Current symbols for the visible map presentation and read-only geology context.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ProjectSpatialLegend
                    entries={legendFeatureEntries}
                    showGeologyOverlay={showGeologyOverlay}
                    geologyQueryLocation={geologyQueryLocation}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">Views and Sheets</CardTitle>
                      <CardDescription>
                        Views store reusable map state. Sheets apply templates to those views for
                        printable output.
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={spatialViewsHref}
                        className={buttonVariants({ size: 'sm', variant: 'outline' })}
                      >
                        Open Views
                      </Link>
                      <Link href={spatialSheetsHref} className={buttonVariants({ size: 'sm' })}>
                        Open Sheets
                      </Link>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="spatial-active-sheet">Selected Project Sheet</Label>
                    <Select
                      value={activeSheetId ?? NONE_VALUE}
                      onValueChange={(value) => {
                        if (value === NONE_VALUE) {
                          return;
                        }
                        selectSheet(value);
                      }}
                    >
                      <SelectTrigger id="spatial-active-sheet">
                        <SelectValue placeholder="No project sheets yet" />
                      </SelectTrigger>
                      <SelectContent>
                        {sheetStore.sheets.map((sheet) => (
                          <SelectItem key={sheet.id} value={sheet.id}>
                            {formatOperatorFacingSheetLabel(sheet.name)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {activeSheet ? (
                    <div className="space-y-3 rounded-lg border p-3">
                      <div>
                        <div className="text-sm font-semibold">
                          {formatOperatorFacingSheetLabel(activeSheet.name)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {normalizedSheetMetadata.sheetTitle || 'Spatial Workspace Map Sheet'}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">
                          {normalizedSheetMetadata.paperSize.toUpperCase()}{' '}
                          {normalizedSheetMetadata.orientation}
                        </Badge>
                        <Badge variant="outline">
                          {PROJECT_SPATIAL_SHEET_MODE_OPTIONS.find(
                            (option) => option.value === normalizedSheetMetadata.mode,
                          )?.label ?? 'System Default'}
                        </Badge>
                        {activeSheet.useLabel.trim() ? (
                          <Badge variant="outline">{activeSheet.useLabel.trim()}</Badge>
                        ) : null}
                      </div>
                      <div className="rounded-md bg-slate-50 px-3 py-2 text-xs text-muted-foreground">
                        {activeSheetSavedView
                          ? `Assigned view: ${activeSheetSavedView.label} · ${formatDateTime(activeSheetSavedView.capturedAt)} · ${PROJECT_SPATIAL_BASEMAP_OPTIONS.find((option) => option.value === activeSheetSavedView.activeBasemap)?.label ?? formatSpatialLabel(activeSheetSavedView.activeBasemap)}`
                          : 'No view assigned yet. Open Views to create one, then bind it to a sheet.'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {activeSheetSavedViews.length} reusable view
                        {activeSheetSavedViews.length === 1 ? '' : 's'} in this project
                      </div>
                    </div>
                  ) : null}

                  <div className="grid gap-2">
                    <Button type="button" variant="outline" onClick={() => createSheet()}>
                      Create Sheet
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        createSavedViewFromCurrentMap();
                      }}
                    >
                      Create View
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!activeSheetSavedView}
                      onClick={() => applySavedViewToMap()}
                    >
                      Apply Assigned View
                    </Button>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    The safe sheet flow now lives under Spatial / Sheets. Advanced layout editing is
                    kept out of the default map workspace.
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Reuse Intent</CardTitle>
                  <CardDescription>
                    Features stored here are ready to be referenced by later report and module
                    workflows.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>Project Geotechnical</p>
                  <p>Foundations</p>
                  <p>Environmental and CNVMP</p>
                  <p>Monitoring Reports</p>
                  <p>Future inspections</p>
                </CardContent>
              </Card>
            </div>
          ) : null}

          <div className="space-y-4">
            <Card>
              <CardHeader className="space-y-4">
                <div>
                  <CardTitle className="text-base">Spatial Workspace</CardTitle>
                  <CardDescription>
                    OpenLayers editing map with switchable OSM and NSW basemaps.
                  </CardDescription>
                </div>

                <div className="flex flex-wrap gap-2">
                  <ToolbarButton
                    active={toolMode === 'select'}
                    label="Select"
                    icon={MousePointer2}
                    onClick={() => setToolMode('select')}
                  />
                  <ToolbarButton
                    active={toolMode === 'modify'}
                    label="Modify"
                    icon={Move}
                    onClick={() => setToolMode('modify')}
                  />
                  <ToolbarButton
                    active={toolMode === 'draw_point'}
                    label="Add Point"
                    icon={MapPin}
                    onClick={() => setToolMode('draw_point')}
                  />
                  <ToolbarButton
                    active={toolMode === 'draw_line_string'}
                    label="Add Line"
                    icon={Route}
                    onClick={() => setToolMode('draw_line_string')}
                  />
                  <ToolbarButton
                    active={toolMode === 'draw_polygon'}
                    label="Add Polygon"
                    icon={Pentagon}
                    onClick={() => setToolMode('draw_polygon')}
                  />
                  <Select
                    value={activeBasemap}
                    onValueChange={(value) => setActiveBasemap(value as ProjectSpatialBasemap)}
                  >
                    <SelectTrigger className="w-[200px]" aria-label="Basemap">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_SPATIAL_BASEMAP_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300"
                      checked={showGeologyOverlay}
                      onChange={(event) => setShowGeologyOverlay(event.target.checked)}
                    />
                    <span>Geology Overlay</span>
                  </label>
                  <Button
                    type="button"
                    variant={isViewLocked ? 'default' : 'outline'}
                    onClick={toggleLockedView}
                  >
                    {isViewLocked ? (
                      <Unlock className="mr-2 h-4 w-4" />
                    ) : (
                      <Lock className="mr-2 h-4 w-4" />
                    )}
                    {isViewLocked ? 'Unlock View' : 'Lock View'}
                  </Button>
                  {!isMapFocusMode ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsMapLeftPanelCollapsed((current) => !current)}
                      >
                        {isMapLeftPanelCollapsed ? 'Show Filters' : 'Hide Filters'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsMapRightPanelCollapsed((current) => !current)}
                      >
                        {isMapRightPanelCollapsed ? 'Show Details' : 'Hide Details'}
                      </Button>
                    </>
                  ) : null}
                  <Button
                    type="button"
                    variant={isMapFocusMode ? 'default' : 'outline'}
                    onClick={() => setIsMapFocusMode((current) => !current)}
                  >
                    {isMapFocusMode ? 'Exit Map Focus' : 'Focus Map'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isLoading}
                    onClick={() => setExportRequestToken((current) => current + 1)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export PNG
                  </Button>
                  <Button
                    type="button"
                    disabled={
                      isLoading ||
                      isGeneratingPdf ||
                      Boolean(sheetPreflight?.issues.some((issue) => issue.severity === 'blocking'))
                    }
                    onClick={() => void handlePdfExport()}
                  >
                    {isGeneratingPdf ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    {isGeneratingPdf ? 'Preparing Browser PDF...' : 'Browser PDF Export'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div
                    className={cn(
                      'flex items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground',
                      isMapFocusMode
                        ? 'h-[clamp(42rem,78vh,72rem)]'
                        : 'h-[clamp(36rem,68vh,60rem)]',
                    )}
                  >
                    Loading spatial features…
                  </div>
                ) : (
                  <ProjectSpatialMap
                    key={`workspace-map-${projectId}`}
                    projectId={projectId}
                    features={visibleFeatures}
                    initialFeatures={features}
                    initialAddress={projectAddress}
                    draftOverlay={draftOverlay}
                    selectedPersistedFeatureId={draft?.persistedId ?? null}
                    focusedPersistedFeatureId={focusedPersistedFeatureId}
                    focusRequestToken={focusRequestToken}
                    selectionSyncToken={selectionSyncToken}
                    activeBasemap={activeBasemap}
                    showGeologyOverlay={showGeologyOverlay}
                    lockedViewState={lockedViewState}
                    exportRequestToken={exportRequestToken}
                    mode={toolMode}
                    className={
                      isMapFocusMode ? 'h-[clamp(42rem,78vh,72rem)]' : 'h-[clamp(36rem,68vh,60rem)]'
                    }
                    onFeatureSelect={handleFeatureSelection}
                    onGeologyIdentifyStateChange={setGeologyIdentifyState}
                    onExportApiReady={(api) => {
                      mapExportApiRef.current = api;
                      setIsSourceMapReady(Boolean(api?.isReady()));
                      setSourceMapReadyStateLabel(
                        api?.readyStateLabel() ?? 'Map loading / map not ready yet.',
                      );
                      if (!api || hasPrimedSheetPreviewRef.current || !isSheetWorkspaceMode) {
                        return;
                      }

                      hasPrimedSheetPreviewRef.current = true;
                      void refreshSheetPreviewSnapshot(api);
                    }}
                    onDrawComplete={handleDrawComplete}
                    onPersistedFeatureGeometryChange={handlePersistedFeatureGeometryChange}
                    onDraftGeometryChange={handleDraftGeometryChange}
                  />
                )}
              </CardContent>
            </Card>

            {!isMapFocusMode ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Services / Utilities Source Data</CardTitle>
                    <CardDescription>
                      Project service source records are explicit Spatial features, separate from
                      Drafting sketch objects.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-lg border p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-semibold">Create Service Run</h3>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Draw a line/path and save it as project source data.
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => startServiceSourceDraft('service_run')}
                          >
                            <Route className="mr-2 h-4 w-4" />
                            Draw run
                          </Button>
                        </div>
                      </div>

                      <div className="rounded-lg border p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-semibold">Create Service Crossing</h3>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Place a point and save it as a project crossing source.
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => startServiceSourceDraft('service_crossing')}
                          >
                            <MapPin className="mr-2 h-4 w-4" />
                            Place crossing
                          </Button>
                        </div>
                      </div>
                    </div>

                    {draft &&
                    !draft.isNew &&
                    !isProjectSpatialServiceFeatureType(draft.featureType) ? (
                      <div className="rounded-lg border border-dashed p-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-semibold">Classify selected feature</h3>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Keep the existing geometry and mark this record as explicit project
                              service source data.
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={
                                !canClassifyProjectSpatialFeatureAsService(
                                  draft.geometryType,
                                  'service_run',
                                )
                              }
                              onClick={() => classifyDraftAsServiceSource('service_run')}
                            >
                              Mark as service run
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={
                                !canClassifyProjectSpatialFeatureAsService(
                                  draft.geometryType,
                                  'service_crossing',
                                )
                              }
                              onClick={() => classifyDraftAsServiceSource('service_crossing')}
                            >
                              Mark as service crossing
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {projectServiceSources.length === 0 ? (
                      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                        No project service/utility sources yet. Draw a line for a service run or a
                        point for a crossing, then set the feature type to Service Run or Service
                        Crossing.
                      </div>
                    ) : (
                      <div className="grid gap-2 md:grid-cols-2">
                        {projectServiceSources.map((feature) => (
                          <button
                            className="rounded-md border bg-background px-3 py-2 text-left text-sm hover:bg-accent"
                            key={feature.id}
                            onClick={() => handleFeatureListSelection(feature.id)}
                            type="button"
                          >
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="font-medium">{feature.label}</span>
                              <Badge variant="outline" className="text-[10px]">
                                {formatSpatialLabel(feature.featureType)}
                              </Badge>
                            </span>
                            <span className="mt-1 block text-xs text-muted-foreground">
                              {formatServiceSourceSummary(feature)}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Feature List</CardTitle>
                    <CardDescription>
                      Click a row to zoom to the feature and open its details.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Label</TableHead>
                          <TableHead>Feature Type</TableHead>
                          <TableHead>Geometry</TableHead>
                          <TableHead>Updated</TableHead>
                          <TableHead className="w-[56px]" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {visibleFeatures.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-sm text-muted-foreground">
                              No visible features yet. Use the toolbar to draw a point, line, or
                              polygon.
                            </TableCell>
                          </TableRow>
                        ) : (
                          visibleFeatures.map((feature) => (
                            <TableRow
                              key={feature.id}
                              data-state={
                                draft?.persistedId === feature.id ? 'selected' : undefined
                              }
                              className="cursor-pointer"
                              onClick={() => handleFeatureListSelection(feature.id)}
                            >
                              <TableCell className="font-medium">{feature.label}</TableCell>
                              <TableCell>{formatSpatialLabel(feature.featureType)}</TableCell>
                              <TableCell>{formatSpatialLabel(feature.geometryType)}</TableCell>
                              <TableCell>{formatDateTime(feature.updatedAt)}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  aria-label={`Delete ${feature.label}`}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void handleDelete(feature.id);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            ) : null}
          </div>

          {isMapRightPanelVisible ? (
            <Card className="h-fit">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="space-y-1">
                  <CardTitle className="text-base">Feature Details</CardTitle>
                  <CardDescription>
                    {draft
                      ? draft.isNew
                        ? 'New geometry stays temporary until you save it.'
                        : 'Edit metadata, linked deliverables, and reusable feature properties.'
                      : 'Select a feature on the map or in the list to edit it.'}
                  </CardDescription>
                </div>

                {draft ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => runWithUnsavedChangesGuard(clearDraft)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-5">
                {!draft ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    Draw a new point, line, or polygon, or select an existing feature to edit it
                    here.
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{formatSpatialLabel(draft.geometryType)}</Badge>
                      {draft.featureType ? (
                        <Badge variant="outline">{formatSpatialLabel(draft.featureType)}</Badge>
                      ) : (
                        <Badge variant="warning">Feature type required</Badge>
                      )}
                      {hasUnsavedChanges ? (
                        <Badge variant="warning">Unsaved changes</Badge>
                      ) : (
                        <Badge variant="success">Saved</Badge>
                      )}
                    </div>

                    {!isProjectSpatialServiceFeatureType(draft.featureType) ? (
                      <div className="rounded-lg border border-dashed p-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-semibold">Service / utility source</h3>
                            <p className="text-xs text-muted-foreground">
                              Mark this selected geometry as explicit project source data for
                              Drafting service tools.
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={
                                !canClassifyProjectSpatialFeatureAsService(
                                  draft.geometryType,
                                  'service_run',
                                )
                              }
                              onClick={() => classifyDraftAsServiceSource('service_run')}
                            >
                              Mark as service run
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={
                                !canClassifyProjectSpatialFeatureAsService(
                                  draft.geometryType,
                                  'service_crossing',
                                )
                              }
                              onClick={() => classifyDraftAsServiceSource('service_crossing')}
                            >
                              Mark as service crossing
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                        <div className="font-medium">Project service source</div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          This record is source data for Drafting linked service runs/crossings.
                          Complete only known utility fields; leave unknown values blank.
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="spatial-label">Label</Label>
                      <Input
                        id="spatial-label"
                        value={draft.label}
                        onChange={(event) => updateDraftField('label', event.target.value)}
                        placeholder="Feature label"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Feature Type</Label>
                      <Select
                        value={draft.featureType || NONE_VALUE}
                        onValueChange={(value) => {
                          const nextFeatureType =
                            value === NONE_VALUE ? '' : (value as ProjectSpatialFeatureType);
                          updateDraftField('featureType', nextFeatureType);
                          if (nextFeatureType) {
                            setVisibleFeatureTypes((current) =>
                              new Set(current).add(nextFeatureType),
                            );
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a feature type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE_VALUE}>Select feature type</SelectItem>
                          {PROJECT_SPATIAL_FEATURE_TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="spatial-description">Description</Label>
                      <Textarea
                        id="spatial-description"
                        value={draft.description}
                        onChange={(event) => updateDraftField('description', event.target.value)}
                        placeholder="Optional description"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="spatial-status">Status</Label>
                      <Input
                        id="spatial-status"
                        value={draft.status}
                        onChange={(event) => updateDraftField('status', event.target.value)}
                        placeholder="Optional status"
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Source Type</Label>
                        <Select
                          value={draft.sourceType || NONE_VALUE}
                          onValueChange={(value) =>
                            updateDraftField(
                              'sourceType',
                              value === NONE_VALUE ? '' : (value as ProjectSpatialSourceType),
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Optional source type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE_VALUE}>No source type</SelectItem>
                            {PROJECT_SPATIAL_SOURCE_TYPE_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="spatial-source-reference">Source Reference</Label>
                        <Input
                          id="spatial-source-reference"
                          value={draft.sourceReference}
                          onChange={(event) =>
                            updateDraftField('sourceReference', event.target.value)
                          }
                          placeholder="Optional source reference"
                        />
                      </div>
                    </div>

                    <div className="space-y-4 rounded-lg border p-4">
                      <div>
                        <h3 className="text-sm font-semibold">Linked Records</h3>
                        <p className="text-xs text-muted-foreground">
                          Keep reuse hooks ready for project references, AI reports, and
                          deliverables.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="spatial-project-reference">Project Reference ID</Label>
                        <Input
                          id="spatial-project-reference"
                          value={draft.linkedProjectReferenceId}
                          onChange={(event) =>
                            updateDraftField('linkedProjectReferenceId', event.target.value)
                          }
                          placeholder="Optional project reference ID"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="spatial-ai-document">AI Document ID</Label>
                        <Input
                          id="spatial-ai-document"
                          value={draft.linkedAiDocumentId}
                          onChange={(event) =>
                            updateDraftField('linkedAiDocumentId', event.target.value)
                          }
                          placeholder="Optional AI document UUID"
                        />
                        {linkedAiDocumentIdError ? (
                          <p className="text-xs text-destructive">{linkedAiDocumentIdError}</p>
                        ) : null}
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Linked Deliverable Type</Label>
                          <Select
                            value={draft.linkedDeliverableType || undefined}
                            onValueChange={(value) =>
                              updateDraftField(
                                'linkedDeliverableType',
                                value === NONE_VALUE
                                  ? ''
                                  : (value as ProjectSpatialLinkedDeliverableType),
                              )
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Optional deliverable type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NONE_VALUE}>No deliverable type</SelectItem>
                              {PROJECT_SPATIAL_LINKED_DELIVERABLE_TYPE_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="spatial-deliverable-id">Linked Deliverable ID</Label>
                          <Input
                            id="spatial-deliverable-id"
                            value={draft.linkedDeliverableId}
                            onChange={(event) =>
                              updateDraftField('linkedDeliverableId', event.target.value)
                            }
                            placeholder="Optional deliverable ID"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 rounded-lg border p-4">
                      <div>
                        <h3 className="text-sm font-semibold">Feature Metadata</h3>
                        <p className="text-xs text-muted-foreground">
                          Type-specific fields are saved into the reusable properties registry.
                        </p>
                      </div>

                      {getProjectSpatialMetadataFields(draft.featureType).map((field) => {
                        const currentValue = asRecord(draft.propertiesJson)[field.key];

                        if (field.kind === 'checkbox') {
                          return (
                            <label
                              key={field.key}
                              className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm"
                            >
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-slate-300"
                                checked={Boolean(currentValue)}
                                onChange={(event) =>
                                  updateDraftProperty(field.key, event.target.checked)
                                }
                              />
                              <span>{field.label}</span>
                            </label>
                          );
                        }

                        if (field.kind === 'select') {
                          return (
                            <div key={field.key} className="space-y-2">
                              <Label htmlFor={`spatial-property-${field.key}`}>{field.label}</Label>
                              <Select
                                value={typeof currentValue === 'string' ? currentValue : NONE_VALUE}
                                onValueChange={(value) =>
                                  updateDraftProperty(field.key, value === NONE_VALUE ? '' : value)
                                }
                              >
                                <SelectTrigger id={`spatial-property-${field.key}`}>
                                  <SelectValue
                                    placeholder={`Select ${field.label.toLowerCase()}`}
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={NONE_VALUE}>Not set</SelectItem>
                                  {(field.options ?? []).map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          );
                        }

                        return (
                          <div key={field.key} className="space-y-2">
                            <Label htmlFor={`spatial-property-${field.key}`}>{field.label}</Label>
                            {field.kind === 'textarea' ? (
                              <Textarea
                                id={`spatial-property-${field.key}`}
                                value={typeof currentValue === 'string' ? currentValue : ''}
                                onChange={(event) =>
                                  updateDraftProperty(field.key, event.target.value)
                                }
                              />
                            ) : (
                              <Input
                                id={`spatial-property-${field.key}`}
                                value={typeof currentValue === 'string' ? currentValue : ''}
                                onChange={(event) =>
                                  updateDraftProperty(field.key, event.target.value)
                                }
                              />
                            )}
                          </div>
                        );
                      })}

                      {usesProjectSpatialFallbackMetadata(draft.featureType) ? (
                        <div className="space-y-2">
                          <Label htmlFor="spatial-additional-properties">
                            Additional Properties
                          </Label>
                          <Textarea
                            id="spatial-additional-properties"
                            value={
                              typeof asRecord(draft.propertiesJson).additionalProperties ===
                              'string'
                                ? (asRecord(draft.propertiesJson).additionalProperties as string)
                                : ''
                            }
                            onChange={(event) =>
                              updateDraftProperty('additionalProperties', event.target.value)
                            }
                            placeholder="Additional feature notes or metadata"
                          />
                        </div>
                      ) : null}

                      {!draft.featureType ? (
                        <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                          Select a feature type to reveal the matching metadata fields.
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        onClick={() => void handleSave()}
                        disabled={
                          isSaving ||
                          !draft.label.trim() ||
                          !draft.featureType ||
                          Boolean(linkedAiDocumentIdError)
                        }
                      >
                        <Save className="mr-2 h-4 w-4" />
                        Save
                      </Button>

                      {draft.isNew ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => runWithUnsavedChangesGuard(clearDraft)}
                        >
                          Cancel
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={() => draft.persistedId && void handleDelete(draft.persistedId)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                {showGeologyOverlay ? (
                  <div ref={geologySectionRef}>
                    <GeologyIdentifySection
                      identifyState={geologyIdentifyState}
                      isSelectMode={toolMode === 'select'}
                    />
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      {sheetExportState ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed top-0"
          style={{ left: '-200vw' }}
        >
          <div ref={sheetCaptureRef}>
            <ProjectSpatialSheet
              layoutMode={sheetExportState.metadata.mode}
              paperSize={sheetExportState.metadata.paperSize}
              orientation={sheetExportState.metadata.orientation}
              projectCode={sheetExportState.metadata.projectCode || project.code}
              projectName={projectName}
              projectAddress={sheetExportState.metadata.address || projectAddress}
              sheetTitle={sheetExportState.metadata.sheetTitle}
              subtitle={sheetExportState.metadata.subtitle}
              preparedBy={sheetExportState.metadata.preparedBy}
              checkedBy={sheetExportState.metadata.checkedBy}
              revision={sheetExportState.metadata.revision}
              sheetNumber={sheetExportState.metadata.sheetNumber}
              generatedAtLabel={sheetExportState.generatedAtLabel}
              activeBasemapLabel={sheetExportState.activeBasemapLabel}
              showGeologyOverlay={sheetExportState.showGeologyOverlay}
              geologyQueryLocation={sheetExportState.geologyQueryLocation}
              mapFrameSavedViewLabel={sheetExportState.mapFrameSavedViewLabel}
              mapImageDataUrl={sheetExportState.mapSnapshot.dataUrl}
              mapImageHeight={sheetExportState.mapSnapshot.height}
              mapImageWidth={sheetExportState.mapSnapshot.width}
              scaleBar={sheetExportState.mapSnapshot.scaleBar}
              legendEntries={sheetExportState.legendEntries}
              notes={sheetExportState.metadata.notes}
              objects={sheetExportState.objects}
              rootSheetTemplate={sheetExportState.rootSheetTemplateSnapshot}
            />
          </div>
        </div>
      ) : null}

      <Dialog
        open={showDiscardDialog}
        onOpenChange={(open) => {
          setShowDiscardDialog(open);
          if (!open) {
            pendingActionRef.current = null;
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard unsaved spatial changes?</DialogTitle>
            <DialogDescription>
              The selected feature has unsaved edits. If you continue, those changes will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowDiscardDialog(false)}>
              Keep editing
            </Button>
            <Button type="button" variant="destructive" onClick={applyPendingDiscardAction}>
              Discard changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ToolbarButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button type="button" variant={active ? 'default' : 'outline'} onClick={onClick}>
      <Icon className="mr-2 h-4 w-4" />
      {label}
    </Button>
  );
}

function SheetDesignerTraySection({
  children,
  className,
  description,
  title,
}: {
  children: ReactNode;
  className?: string;
  description: string;
  title: string;
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border border-slate-200 bg-white/95 shadow-sm',
        className,
      )}
    >
      <div className="border-b border-slate-200 px-3 py-2">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <div className="text-[11px] text-muted-foreground">{description}</div>
      </div>
      <div className="px-3 py-2.5">{children}</div>
    </div>
  );
}

function useElementSize(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
): { height: number; width: number } {
  const [size, setSize] = useState({ height: 0, width: 0 });

  useEffect(() => {
    if (!enabled || typeof ResizeObserver === 'undefined') {
      return;
    }

    const element = ref.current;
    if (!element) {
      return;
    }

    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      setSize((current) =>
        Math.abs(current.width - rect.width) < 0.5 && Math.abs(current.height - rect.height) < 0.5
          ? current
          : {
              height: rect.height,
              width: rect.width,
            },
      );
    };

    updateSize();

    const observer = new ResizeObserver(() => {
      updateSize();
    });
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [enabled, ref]);

  return size;
}

function ObjectNumberField({
  disabled = false,
  id,
  label,
  max,
  min = 0,
  onValueChange,
  step = 1,
  suffix = 'mm',
  value,
}: {
  disabled?: boolean;
  id: string;
  label: string;
  max?: number;
  min?: number;
  onValueChange: (value: number) => void;
  step?: number;
  suffix?: string;
  value: number;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type="number"
          disabled={disabled}
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={Number.isFinite(value) ? value : ''}
          onChange={(event) => {
            const nextValue = Number.parseFloat(event.target.value);
            if (Number.isFinite(nextValue)) {
              onValueChange(nextValue);
            }
          }}
          className={suffix ? 'h-8 pr-10 text-right text-xs' : 'h-8 text-right text-xs'}
        />
        {suffix ? (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[11px] text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function GeologyIdentifySection({
  identifyState,
  isSelectMode,
}: {
  identifyState: ProjectSpatialGeologyIdentifyState;
  isSelectMode: boolean;
}) {
  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div>
        <h3 className="text-sm font-semibold">Geology at clicked location</h3>
        <p className="text-xs text-muted-foreground">
          Read-only NSW Seamless Geology context from the active overlay.
        </p>
      </div>

      {identifyState.status === 'idle' ? (
        <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          {isSelectMode
            ? 'Click the map to inspect geology at a location.'
            : 'Switch back to Select mode to inspect geology at a location.'}
        </div>
      ) : null}

      {identifyState.status === 'loading' ? (
        <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          Loading geology context for {formatGeologyLocation(identifyState.locationLonLat)}…
        </div>
      ) : null}

      {identifyState.status === 'empty' ? (
        <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          No geology data found at this location.
          <div className="mt-1 text-xs">
            Clicked location: {formatGeologyLocation(identifyState.locationLonLat)}
          </div>
        </div>
      ) : null}

      {identifyState.status === 'error' ? (
        <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          {identifyState.message}
          <div className="mt-1 text-xs">
            Clicked location: {formatGeologyLocation(identifyState.locationLonLat)}
          </div>
        </div>
      ) : null}

      {identifyState.status === 'success' ? (
        <GeologyIdentifyFields info={identifyState.info} />
      ) : null}
    </div>
  );
}

function GeologyIdentifyFields({ info }: { info: ProjectSpatialGeologyInfo }) {
  return (
    <div className="space-y-4 text-sm">
      <div className="grid gap-2 md:grid-cols-2">
        <ReadOnlyGeologyField label="Source" value={info.sourceLabel} />
        <ReadOnlyGeologyField label="Layer" value={info.layerName} />
        <ReadOnlyGeologyField
          label="Clicked location"
          value={formatGeologyLocation(info.locationLonLat)}
        />
      </div>

      <div className="grid gap-3">
        {info.fields.map((field) => (
          <ReadOnlyGeologyField key={field.key} label={field.label} value={field.value} />
        ))}
      </div>
    </div>
  );
}

function ReadOnlyGeologyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1 rounded-md border px-3 py-2">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="whitespace-pre-wrap break-words">{value}</div>
    </div>
  );
}

function formatServiceSourceSummary(feature: ProjectSpatialFeature) {
  const properties = asRecord(feature.propertiesJson);
  const summary = [
    typeof properties.serviceType === 'string' && properties.serviceType.trim()
      ? properties.serviceType.trim()
      : null,
    typeof properties.status === 'string' && properties.status.trim()
      ? properties.status.trim()
      : feature.status,
    typeof properties.diameterMm === 'string' && properties.diameterMm.trim()
      ? `${properties.diameterMm.trim()} mm`
      : null,
    typeof properties.depthM === 'string' && properties.depthM.trim()
      ? `depth ${properties.depthM.trim()} m`
      : null,
    typeof properties.clearanceMm === 'string' && properties.clearanceMm.trim()
      ? `clearance ${properties.clearanceMm.trim()} mm`
      : null,
    typeof properties.authority === 'string' && properties.authority.trim()
      ? properties.authority.trim()
      : null,
  ].filter(Boolean);

  return summary.length
    ? summary.join(' · ')
    : `${formatSpatialLabel(feature.geometryType)} geometry · metadata not yet set`;
}

function formatLegendGeometryLabel(geometryType: ProjectSpatialGeometryType) {
  if (geometryType === 'line_string') {
    return 'Line';
  }

  return formatSpatialLabel(geometryType);
}

function geometryLegendSortValue(geometryType: ProjectSpatialGeometryType) {
  if (geometryType === 'point') {
    return 0;
  }
  if (geometryType === 'line_string') {
    return 1;
  }
  return 2;
}

function buildProjectSpatialLegendEntries(args: {
  draftOverlay: ProjectSpatialDraftOverlay | null;
  features: ProjectSpatialFeature[];
}): ProjectSpatialLegendFeatureEntry[] {
  const renderedFeatures: Array<{
    persistedId: string | null;
    featureType: ProjectSpatialFeatureType;
    geometryType: ProjectSpatialGeometryType;
  }> = args.features.map((feature) => ({
    persistedId: feature.id,
    featureType: feature.featureType,
    geometryType: feature.geometryType,
  }));

  const mapVisibleFeatures =
    args.draftOverlay && args.draftOverlay.featureType
      ? args.draftOverlay.persistedId
        ? renderedFeatures
            .filter((feature) => feature.persistedId !== args.draftOverlay?.persistedId)
            .concat({
              persistedId: args.draftOverlay.persistedId,
              featureType: args.draftOverlay.featureType,
              geometryType: args.draftOverlay.geometryType,
            })
        : renderedFeatures.concat({
            persistedId: null,
            featureType: args.draftOverlay.featureType,
            geometryType: args.draftOverlay.geometryType,
          })
      : renderedFeatures;

  const groupedEntries = new Map<
    string,
    {
      count: number;
      featureType: ProjectSpatialFeatureType;
      geometryType: ProjectSpatialGeometryType;
    }
  >();
  const geometryVariantsByFeatureType = new Map<
    ProjectSpatialFeatureType,
    Set<ProjectSpatialGeometryType>
  >();

  for (const feature of mapVisibleFeatures) {
    const key = `${feature.featureType}:${feature.geometryType}`;
    const existingEntry = groupedEntries.get(key);
    if (existingEntry) {
      existingEntry.count += 1;
    } else {
      groupedEntries.set(key, {
        count: 1,
        featureType: feature.featureType,
        geometryType: feature.geometryType,
      });
    }

    const geometryVariants =
      geometryVariantsByFeatureType.get(feature.featureType) ??
      new Set<ProjectSpatialGeometryType>();
    geometryVariants.add(feature.geometryType);
    geometryVariantsByFeatureType.set(feature.featureType, geometryVariants);
  }

  return Array.from(groupedEntries.values())
    .sort((left, right) => {
      const featureTypeOrder =
        PROJECT_SPATIAL_FEATURE_TYPES.indexOf(left.featureType) -
        PROJECT_SPATIAL_FEATURE_TYPES.indexOf(right.featureType);
      if (featureTypeOrder !== 0) {
        return featureTypeOrder;
      }

      return (
        geometryLegendSortValue(left.geometryType) - geometryLegendSortValue(right.geometryType)
      );
    })
    .map((entry) => {
      const symbology = getProjectSpatialFeatureSymbology(entry.featureType);
      const multipleGeometryVariants =
        (geometryVariantsByFeatureType.get(entry.featureType)?.size ?? 0) > 1;

      return {
        ...entry,
        label: multipleGeometryVariants
          ? `${symbology.label} (${formatLegendGeometryLabel(entry.geometryType)})`
          : symbology.label,
        symbology,
      };
    });
}

function resolveGeologyQueryLocation(identifyState: ProjectSpatialGeologyIdentifyState) {
  if (identifyState.status === 'idle') {
    return null;
  }

  if (identifyState.status === 'success') {
    return identifyState.info.locationLonLat;
  }

  return identifyState.locationLonLat;
}

function editableDraftFromFeature(feature: ProjectSpatialFeature): EditableProjectSpatialFeature {
  return {
    key: feature.id,
    persistedId: feature.id,
    label: feature.label,
    featureType: feature.featureType,
    geometryType: feature.geometryType,
    description: feature.description ?? '',
    geometryJson: feature.geometryJson,
    status: feature.status ?? '',
    sourceType: feature.sourceType ?? '',
    sourceReference: feature.sourceReference ?? '',
    linkedProjectReferenceId: feature.linkedProjectReferenceId ?? '',
    linkedAiDocumentId: feature.linkedAiDocumentId ?? '',
    linkedDeliverableType: feature.linkedDeliverableType ?? '',
    linkedDeliverableId: feature.linkedDeliverableId ?? '',
    propertiesJson: feature.propertiesJson ?? null,
    sortOrder: feature.sortOrder,
    createdAt: feature.createdAt,
    updatedAt: feature.updatedAt,
    isNew: false,
  };
}

function buildFeaturePayload(
  draft: EditableProjectSpatialFeature,
): ProjectSpatialFeatureInput | null {
  if (!draft.featureType || !draft.label.trim()) {
    return null;
  }

  return {
    featureType: draft.featureType,
    geometryType: draft.geometryType,
    label: draft.label.trim(),
    description: normalizeNullableString(draft.description),
    geometryJson: draft.geometryJson,
    status: normalizeNullableString(draft.status),
    sourceType: draft.sourceType || null,
    sourceReference: normalizeNullableString(draft.sourceReference),
    linkedProjectReferenceId: normalizeNullableString(draft.linkedProjectReferenceId),
    linkedAiDocumentId: normalizeNullableString(draft.linkedAiDocumentId),
    linkedDeliverableType: draft.linkedDeliverableType || null,
    linkedDeliverableId: normalizeNullableString(draft.linkedDeliverableId),
    propertiesJson: normalizeProperties(draft.propertiesJson),
    sortOrder: draft.sortOrder,
  };
}

function normalizeNullableString(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeProperties(value: ProjectSpatialFeatureProperties | null) {
  const record = asRecord(value);
  const normalized: Record<string, unknown> = {};

  for (const [key, rawValue] of Object.entries(record)) {
    if (typeof rawValue === 'string') {
      const trimmed = rawValue.trim();
      if (trimmed) {
        normalized[key] = trimmed;
      }
      continue;
    }

    if (typeof rawValue === 'boolean') {
      normalized[key] = rawValue;
      continue;
    }

    if (rawValue !== null && rawValue !== undefined) {
      normalized[key] = rawValue;
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : null;
}

function snapshotDraft(draft: EditableProjectSpatialFeature) {
  return JSON.stringify({
    persistedId: draft.persistedId,
    label: draft.label.trim(),
    featureType: draft.featureType,
    geometryType: draft.geometryType,
    description: draft.description.trim(),
    geometryJson: draft.geometryJson,
    status: draft.status.trim(),
    sourceType: draft.sourceType,
    sourceReference: draft.sourceReference.trim(),
    linkedProjectReferenceId: draft.linkedProjectReferenceId.trim(),
    linkedAiDocumentId: draft.linkedAiDocumentId.trim(),
    linkedDeliverableType: draft.linkedDeliverableType,
    linkedDeliverableId: draft.linkedDeliverableId.trim(),
    propertiesJson: normalizeProperties(draft.propertiesJson),
    sortOrder: draft.sortOrder ?? null,
  });
}

function asRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function resolveProjectSpatialAddress(
  project: Project,
  fallbackAddress: string,
  fallbackMapAddress: string,
) {
  const projectWithAddress = project as Project & { address?: unknown };
  const directAddress =
    typeof projectWithAddress.address === 'string' ? projectWithAddress.address.trim() : '';

  return directAddress || fallbackAddress.trim() || fallbackMapAddress.trim() || null;
}

function buildProjectSpatialSheetContentMetrics(args: {
  address: string;
  legendEntries: string[];
  notes: string;
  projectName: string;
  sheetTitle: string;
  showGeologyOverlay: boolean;
  subtitle: string;
}): ProjectSpatialSheetContentMetrics {
  const legendLabels = args.legendEntries.slice();
  if (args.showGeologyOverlay) {
    legendLabels.push('Geology overlay');
  }

  const notesMetrics = estimateWrappedTextMetrics(args.notes, 42);
  const addressMetrics = estimateWrappedTextMetrics(args.address, 34);
  const titleMetrics = estimateWrappedTextMetrics(
    `${args.sheetTitle}\n${args.projectName}`.trim(),
    30,
  );
  const subtitleMetrics = estimateWrappedTextMetrics(args.subtitle, 32);
  const contextValues = [
    'Spatial workspace export',
    'System Default',
    'A1 Landscape',
    'NSW Aerial Imagery',
    args.showGeologyOverlay ? 'Visible' : 'Hidden',
    'Shown on map',
    '16 Apr 2026, 11:30',
  ];

  return {
    addressLineCount: addressMetrics.lineCount,
    addressMaxLineLength: addressMetrics.maxLineLength,
    contextMaxValueLength: Math.max(...contextValues.map((value) => value.length), 18),
    contextRowCount: contextValues.length,
    legendEntryCount: Math.max(legendLabels.length, 1),
    legendMaxLabelLength: Math.max(...legendLabels.map((label) => label.length), 14),
    notesLineCount: notesMetrics.lineCount,
    notesMaxLineLength: notesMetrics.maxLineLength,
    subtitleLineCount: subtitleMetrics.lineCount,
    subtitleMaxLineLength: subtitleMetrics.maxLineLength,
    titleLineCount: titleMetrics.lineCount,
    titleMaxLineLength: titleMetrics.maxLineLength,
  };
}

function estimateWrappedTextMetrics(value: string, charactersPerLine: number) {
  const normalized = value.trim();
  if (!normalized) {
    return {
      lineCount: 1,
      maxLineLength: 0,
    };
  }

  const rawLines = normalized.split(/\r?\n/);
  let lineCount = 0;
  let maxLineLength = 0;

  for (const rawLine of rawLines) {
    const line = rawLine.trimEnd();
    const safeLength = Math.max(1, line.length);
    lineCount += Math.max(1, Math.ceil(safeLength / Math.max(charactersPerLine, 1)));
    maxLineLength = Math.max(maxLineLength, line.length);
  }

  return {
    lineCount,
    maxLineLength,
  };
}

function buildSuggestedProjectSpatialViewName(args: {
  activeSheetName: string | null;
  entryIntent: ProjectSpatialWorkspaceProps['entryIntent'];
  nextIndex: number;
  templateLabel: string | null;
}) {
  const templateTitle = resolveProjectSpatialSheetBaseTitle(args.templateLabel);
  const preferredBaseName =
    templateTitle !== 'Project Spatial Sheet'
      ? `${templateTitle} View`
      : args.activeSheetName?.trim()
        ? `${formatOperatorFacingSheetLabel(args.activeSheetName)} View`
        : args.entryIntent === 'monitoring-annexure'
          ? 'Recommended Project Spatial View'
          : 'Project Spatial View';

  return args.nextIndex > 1 ? `${preferredBaseName} ${args.nextIndex}` : preferredBaseName;
}

function buildProjectSpatialSheetTemplateDefaults(args: {
  nextSheetNumber: number;
  projectName: string;
  templateOption: ReturnType<typeof resolveSpatialSheetTemplateOption>;
}) {
  const baseTitle = resolveProjectSpatialSheetBaseTitle(args.templateOption?.label ?? null);
  const sheetNumber = `S-${String(args.nextSheetNumber).padStart(3, '0')}`;

  return {
    notes: '',
    sheetName: args.nextSheetNumber > 1 ? `${baseTitle} ${args.nextSheetNumber}` : baseTitle,
    sheetNumber,
    sheetTitle: baseTitle,
    subtitle: `${args.projectName} · Printable sheet driven by a Project Spatial View.`,
  };
}

function buildProjectSpatialSheetMetadataForAssignedView(args: {
  currentMetadata: ProjectSpatialSheetMetadata;
  savedView: ProjectSpatialView;
  templateOption: ReturnType<typeof resolveSpatialSheetTemplateOption>;
}) {
  const nextTitle = shouldReplaceProjectSpatialSheetTitle(args.currentMetadata.sheetTitle)
    ? resolveProjectSpatialSheetBaseTitle(
        args.templateOption?.label ?? args.savedView.label ?? args.currentMetadata.sheetTitle,
      )
    : args.currentMetadata.sheetTitle;
  const cleanViewLabel = formatOperatorFacingSheetLabel(args.savedView.label, 'Assigned View');
  const nextNotes = shouldReplaceProjectSpatialNotes(args.currentMetadata.notes)
    ? buildProjectSpatialSheetNotesBody({
        activeBasemapLabel:
          PROJECT_SPATIAL_BASEMAP_OPTIONS.find(
            (option) => option.value === args.savedView.activeBasemap,
          )?.label ?? formatSpatialLabel(args.savedView.activeBasemap),
        metadata: args.currentMetadata,
        savedView: args.savedView,
        showGeologyOverlay: args.savedView.showGeologyOverlay,
      })
    : args.currentMetadata.notes;

  return {
    ...args.currentMetadata,
    notes: nextNotes,
    revision: args.currentMetadata.revision || 'Draft',
    sheetTitle: nextTitle,
    subtitle: shouldReplaceProjectSpatialSheetSubtitle(args.currentMetadata.subtitle)
      ? `${nextTitle} driven by Project Spatial View ${cleanViewLabel}.`
      : args.currentMetadata.subtitle,
  };
}

function buildProjectSpatialSheetNameForAssignedView(currentName: string, nextTitle: string) {
  return shouldReplaceProjectSpatialSheetName(currentName)
    ? formatOperatorFacingSheetLabel(nextTitle, 'Project Spatial Sheet')
    : currentName;
}

function buildProjectSpatialSheetDetailsBlockRows(args: {
  activeBasemapLabel: string;
  metadata: ProjectSpatialSheetMetadata;
  savedView: ProjectSpatialView | null;
  showGeologyOverlay: boolean;
}) {
  return createGenericTemplateDetailRows([
    {
      label: 'Sheet Type',
      value: formatOperatorFacingSheetLabel(args.metadata.sheetTitle, 'Project Spatial Sheet'),
    },
    {
      label: 'View Source',
      value: args.savedView
        ? formatOperatorFacingSheetLabel(args.savedView.label, 'Assigned View')
        : 'Live source map',
    },
    {
      label: 'Issue',
      value: args.metadata.revision.trim() || 'Draft',
    },
    {
      label: 'Basemap',
      value: args.showGeologyOverlay
        ? `${args.activeBasemapLabel} + Geology`
        : args.activeBasemapLabel,
    },
  ]);
}

function buildProjectSpatialSheetNotesBody(args: {
  activeBasemapLabel: string;
  metadata: ProjectSpatialSheetMetadata;
  savedView: ProjectSpatialView | null;
  showGeologyOverlay: boolean;
}) {
  const manualNotes = args.metadata.notes.trim();
  if (manualNotes) {
    return manualNotes;
  }

  const lines = [
    args.savedView
      ? `Project Spatial View: ${formatOperatorFacingSheetLabel(args.savedView.label, 'Assigned View')}`
      : 'Project Spatial View: Live source map',
    `Basemap: ${args.activeBasemapLabel}`,
    `Geology overlay: ${args.showGeologyOverlay ? 'On' : 'Off'}`,
    args.savedView && args.savedView.visibleFeatureTypes.length > 0
      ? `Visible layers: ${args.savedView.visibleFeatureTypes
          .map((featureType) => formatSpatialLabel(featureType))
          .join(', ')}`
      : null,
  ].filter((value): value is string => Boolean(value));

  return lines.join('\n');
}

function resolveProjectSpatialSheetBaseTitle(value: string | null | undefined) {
  const cleanLabel = formatOperatorFacingSheetLabel(value, 'Project Spatial Sheet');
  const withoutPaperPrefix = cleanLabel.replace(/^A[0-4]\s+/i, '').trim();
  return withoutPaperPrefix || 'Project Spatial Sheet';
}

function shouldReplaceProjectSpatialSheetTitle(value: string | null | undefined) {
  const normalized = normalizeProjectSpatialLabel(value);
  return (
    !normalized ||
    normalized === 'project spatial sheet' ||
    normalized === 'spatial workspace map sheet' ||
    normalized === 'general site plan' ||
    /^sheet \d+$/.test(normalized)
  );
}

function shouldReplaceProjectSpatialSheetName(value: string | null | undefined) {
  const normalized = normalizeProjectSpatialLabel(value);
  return (
    !normalized ||
    normalized === 'project spatial sheet' ||
    normalized === 'general site plan' ||
    /^sheet \d+$/.test(normalized)
  );
}

function shouldReplaceProjectSpatialSheetSubtitle(value: string | null | undefined) {
  const normalized = normalizeProjectSpatialLabel(value);
  return (
    !normalized ||
    normalized === 'printable sheet driven by a project spatial view.' ||
    normalized.includes('project spatial view')
  );
}

function shouldReplaceProjectSpatialNotes(value: string | null | undefined) {
  const normalized = normalizeProjectSpatialLabel(value);
  return (
    !normalized ||
    normalized.includes('assign a project spatial view') ||
    normalized.includes('project spatial view: live source map') ||
    normalized.includes('project spatial view:')
  );
}

function normalizeProjectSpatialLabel(value: string | null | undefined) {
  return value?.replace(/\s+/g, ' ').trim().toLowerCase() ?? '';
}

function normalizeSheetMetadataString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function normalizeSheetPaperSize(
  value: unknown,
  fallback: ProjectSpatialPaperSize = EMPTY_PROJECT_SPATIAL_SHEET_METADATA.paperSize,
): ProjectSpatialPaperSize {
  return PROJECT_SPATIAL_PAPER_SIZE_OPTIONS.some((option) => option.value === value)
    ? (value as ProjectSpatialPaperSize)
    : fallback;
}

function normalizeSheetMode(
  value: unknown,
  fallback: ProjectSpatialSheetMode = EMPTY_PROJECT_SPATIAL_SHEET_METADATA.mode,
): ProjectSpatialSheetMode {
  return PROJECT_SPATIAL_SHEET_MODE_OPTIONS.some((option) => option.value === value)
    ? (value as ProjectSpatialSheetMode)
    : fallback;
}

function normalizeSheetOrientation(
  value: unknown,
  fallback: ProjectSpatialSheetOrientation = EMPTY_PROJECT_SPATIAL_SHEET_METADATA.orientation,
): ProjectSpatialSheetOrientation {
  return PROJECT_SPATIAL_SHEET_ORIENTATION_OPTIONS.some((option) => option.value === value)
    ? (value as ProjectSpatialSheetOrientation)
    : fallback;
}

function normalizeSheetBoolean(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback;
}

function normalizeSheetScale(value: unknown, fallback: number, min: number, max: number) {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number.parseFloat(value)
        : Number.NaN;

  return Number.isFinite(parsed) ? clamp(parsed, min, max) : fallback;
}

function normalizeSheetTitleBlockPosition(
  value: unknown,
  fallback: ProjectSpatialTitleBlockPosition = EMPTY_PROJECT_SPATIAL_SHEET_METADATA.titleBlockPosition,
): ProjectSpatialTitleBlockPosition {
  return PROJECT_SPATIAL_TITLE_BLOCK_POSITION_OPTIONS.some((option) => option.value === value)
    ? (value as ProjectSpatialTitleBlockPosition)
    : fallback;
}

function normalizeSheetMapAlignment(
  value: unknown,
  fallback: ProjectSpatialMapAlignment = EMPTY_PROJECT_SPATIAL_SHEET_METADATA.mapAlignment,
): ProjectSpatialMapAlignment {
  return PROJECT_SPATIAL_MAP_ALIGNMENT_OPTIONS.some((option) => option.value === value)
    ? (value as ProjectSpatialMapAlignment)
    : fallback;
}

function normalizeProjectSpatialSheetMetadata(
  value: unknown,
  fallback: ProjectSpatialSheetMetadata = EMPTY_PROJECT_SPATIAL_SHEET_METADATA,
): ProjectSpatialSheetMetadata {
  const record = asRecord(value);

  return {
    address: normalizeSheetMetadataString(record.address, fallback.address),
    checkedBy: normalizeSheetMetadataString(record.checkedBy, fallback.checkedBy),
    contextScale: normalizeSheetScale(record.contextScale, fallback.contextScale, 0.75, 1.35),
    legendScale: normalizeSheetScale(record.legendScale, fallback.legendScale, 0.75, 1.35),
    mapAlignment: normalizeSheetMapAlignment(record.mapAlignment, fallback.mapAlignment),
    mapHeightScale: normalizeSheetScale(record.mapHeightScale, fallback.mapHeightScale, 0.8, 1.2),
    mapWidthScale: normalizeSheetScale(record.mapWidthScale, fallback.mapWidthScale, 0.8, 1.2),
    marginScale: normalizeSheetScale(record.marginScale, fallback.marginScale, 0.8, 1.3),
    mode: normalizeSheetMode(record.mode, fallback.mode),
    notes: normalizeSheetMetadataString(record.notes, fallback.notes),
    notesScale: normalizeSheetScale(record.notesScale, fallback.notesScale, 0.75, 1.35),
    orientation: normalizeSheetOrientation(record.orientation, fallback.orientation),
    paperSize: normalizeSheetPaperSize(record.paperSize, fallback.paperSize),
    preparedBy: normalizeSheetMetadataString(record.preparedBy, fallback.preparedBy),
    projectCode: normalizeSheetMetadataString(record.projectCode, fallback.projectCode),
    revision: normalizeSheetMetadataString(record.revision, fallback.revision),
    sheetNumber: normalizeSheetMetadataString(record.sheetNumber, fallback.sheetNumber),
    sheetTitle: normalizeSheetMetadataString(record.sheetTitle, fallback.sheetTitle),
    showLegend: normalizeSheetBoolean(record.showLegend, fallback.showLegend),
    showNotes: normalizeSheetBoolean(record.showNotes, fallback.showNotes),
    showSheetContext: normalizeSheetBoolean(record.showSheetContext, fallback.showSheetContext),
    subtitle: normalizeSheetMetadataString(record.subtitle, fallback.subtitle),
    titleBlockHeightScale: normalizeSheetScale(
      record.titleBlockHeightScale,
      fallback.titleBlockHeightScale,
      0.75,
      1.45,
    ),
    titleBlockPosition: normalizeSheetTitleBlockPosition(
      record.titleBlockPosition,
      fallback.titleBlockPosition,
    ),
    titleBlockWidthScale: normalizeSheetScale(
      record.titleBlockWidthScale,
      fallback.titleBlockWidthScale,
      0.75,
      1.45,
    ),
  };
}

function normalizeProjectSpatialMapViewState(value: unknown): ProjectSpatialMapViewState | null {
  const record = asRecord(value);
  const center = Array.isArray(record.centerLonLat) ? record.centerLonLat : null;
  const lon = typeof center?.[0] === 'number' ? center[0] : Number.NaN;
  const lat = typeof center?.[1] === 'number' ? center[1] : Number.NaN;
  const rotation = typeof record.rotation === 'number' ? record.rotation : Number.NaN;
  const zoom =
    typeof record.zoom === 'number'
      ? record.zoom
      : record.zoom === null || record.zoom === undefined
        ? undefined
        : Number.NaN;

  if (!Number.isFinite(lon) || !Number.isFinite(lat) || !Number.isFinite(rotation)) {
    return null;
  }

  return {
    centerLonLat: [lon, lat],
    rotation,
    zoom: Number.isFinite(zoom) ? zoom : undefined,
  };
}

function normalizeProjectSpatialView(value: unknown): ProjectSpatialView | null {
  const record = asRecord(value);
  const viewState = normalizeProjectSpatialMapViewState(record.viewState);
  if (!viewState) {
    return null;
  }

  const activeBasemap = PROJECT_SPATIAL_BASEMAP_OPTIONS.some(
    (option) => option.value === record.activeBasemap,
  )
    ? (record.activeBasemap as ProjectSpatialBasemap)
    : 'osm';

  return {
    activeBasemap,
    annotationFeatureIds: Array.isArray(record.annotationFeatureIds)
      ? record.annotationFeatureIds.filter((item): item is string => typeof item === 'string')
      : [],
    capturedAt: normalizeSheetMetadataString(record.capturedAt, new Date().toISOString()),
    description: normalizeSheetMetadataString(record.description),
    id: normalizeSheetMetadataString(record.id, createProjectSpatialSavedViewId()),
    label: normalizeSheetMetadataString(record.label, 'View'),
    labelMode: 'default',
    showGeologyOverlay: normalizeSheetBoolean(record.showGeologyOverlay, false),
    visibleFeatureTypes: normalizeProjectSpatialViewFeatureTypes(record.visibleFeatureTypes),
    viewState,
  };
}

function createProjectSpatialSheetId() {
  return `sheet-${Math.random().toString(36).slice(2, 10)}`;
}

function createProjectSpatialSavedViewId() {
  return `view-${Math.random().toString(36).slice(2, 10)}`;
}

function createProjectSpatialSheetRecord(
  defaultMetadata: ProjectSpatialSheetMetadata,
  projectName: string,
  availableViews: ProjectSpatialView[] = [],
  seed?: Partial<ProjectSpatialSheetRecord> & {
    metadata?: Partial<ProjectSpatialSheetMetadata> | ProjectSpatialSheetMetadata;
  },
): ProjectSpatialSheetRecord {
  const now = new Date().toISOString();
  const metadata = normalizeProjectSpatialSheetMetadata(seed?.metadata, defaultMetadata);
  const name =
    normalizeSheetMetadataString(seed?.name) || metadata.sheetTitle || `${projectName} Sheet`;
  const assignedSavedViewId = normalizeAssignedSavedViewId(
    seed?.assignedSavedViewId,
    availableViews,
  );
  const templateSourceKind =
    seed?.templateSourceKind === 'root_sheet_template'
      ? seed.templateSourceKind
      : 'root_sheet_template';
  const objects: ProjectSpatialSheetObject[] = [];

  return {
    assignedSavedViewId,
    createdAt: normalizeSheetMetadataString(seed?.createdAt, now),
    id: normalizeSheetMetadataString(seed?.id, createProjectSpatialSheetId()),
    metadata,
    name,
    objects: objects.map((object) =>
      object.type === 'mapFrame'
        ? {
            ...object,
            linkedSavedViewId: object.linkedSavedViewId ?? assignedSavedViewId,
          }
        : object,
    ),
    rootSheetTemplateSnapshot: normalizeRootSheetTemplateSnapshot(seed?.rootSheetTemplateSnapshot),
    templateDefinitionId: normalizeSheetMetadataString(seed?.templateDefinitionId) || null,
    templateSourceKind,
    templateVersionId: normalizeSheetMetadataString(seed?.templateVersionId) || null,
    updatedAt: normalizeSheetMetadataString(seed?.updatedAt, now),
    useLabel: normalizeSheetMetadataString(seed?.useLabel),
  };
}

function normalizeProjectSpatialSheetRecord(
  value: unknown,
  defaultMetadata: ProjectSpatialSheetMetadata,
  projectName: string,
  availableViews: ProjectSpatialView[],
  index: number,
): ProjectSpatialSheetRecord {
  const record = asRecord(value);
  const normalized = createProjectSpatialSheetRecord(defaultMetadata, projectName, availableViews, {
    ...record,
    metadata: normalizeProjectSpatialSheetMetadata(record.metadata, defaultMetadata),
  });

  if (!normalized.name.trim()) {
    return {
      ...normalized,
      name: index === 0 ? 'Project Spatial Sheet' : `Project Spatial Sheet ${index + 1}`,
    };
  }

  return normalized;
}

function normalizeProjectSpatialSheetStore(
  value: unknown,
  defaultMetadata: ProjectSpatialSheetMetadata,
  projectName: string,
): ProjectSpatialSheetStore {
  const record = asRecord(value);
  const rawSheets = Array.isArray(record.sheets) ? record.sheets : [];
  const rawTemplates = Array.isArray(record.templates) ? record.templates : [];
  const rawViews = Array.isArray(record.views) ? record.views : [];
  const legacyNestedViews = rawSheets.flatMap((sheet) => {
    const sheetRecord = asRecord(sheet);
    const savedViews = Array.isArray(sheetRecord.savedViews) ? sheetRecord.savedViews : [];
    const singleSavedView = sheetRecord.savedView ? [sheetRecord.savedView] : [];
    return [...savedViews, ...singleSavedView];
  });
  const views = normalizeProjectSpatialViews([...rawViews, ...legacyNestedViews]);
  const sheets = rawSheets
    .map((sheet, index) =>
      normalizeProjectSpatialSheetRecord(sheet, defaultMetadata, projectName, views, index),
    )
    .filter(
      (sheet, index, allSheets) => allSheets.findIndex((item) => item.id === sheet.id) === index,
    );
  const templates = rawTemplates
    .map((template) => normalizeProjectSpatialSheetTemplate(template))
    .filter(
      (template, index, allTemplates) =>
        allTemplates.findIndex((candidate) => candidate.id === template.id) === index,
    );

  if (sheets.length === 0) {
    const firstSheet = createProjectSpatialSheetRecord(defaultMetadata, projectName, views, {
      name: 'Project Spatial Sheet',
      metadata: defaultMetadata,
    });
    return {
      selectedSheetId: firstSheet.id,
      sheets: [firstSheet],
      templates,
      views,
    };
  }

  const selectedSheetId =
    typeof record.selectedSheetId === 'string' &&
    sheets.some((sheet) => sheet.id === record.selectedSheetId)
      ? record.selectedSheetId
      : (sheets[0]?.id ?? null);

  return {
    selectedSheetId,
    sheets,
    templates,
    views,
  };
}

function normalizeAssignedSavedViewId(
  value: unknown,
  savedViews: ProjectSpatialView[],
): string | null {
  return typeof value === 'string' && savedViews.some((savedView) => savedView.id === value)
    ? value
    : null;
}

function normalizeRootSheetTemplateSnapshot(value: unknown): GenericTemplateDocument | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  try {
    return normalizeGenericTemplateDocument(value);
  } catch {
    return null;
  }
}

function normalizeProjectSpatialViewFeatureTypes(value: unknown): ProjectSpatialFeatureType[] {
  const rawFeatureTypes = Array.isArray(value) ? value : PROJECT_SPATIAL_FEATURE_TYPES;
  const normalizedFeatureTypes = rawFeatureTypes.filter(
    (featureType): featureType is ProjectSpatialFeatureType =>
      PROJECT_SPATIAL_FEATURE_TYPES.includes(featureType as ProjectSpatialFeatureType),
  );

  return normalizedFeatureTypes.length > 0
    ? normalizedFeatureTypes
    : [...PROJECT_SPATIAL_FEATURE_TYPES];
}

function normalizeProjectSpatialViews(value: unknown): ProjectSpatialView[] {
  const rawViews = Array.isArray(value) ? value : [];

  return rawViews
    .map((savedView) => normalizeProjectSpatialView(savedView))
    .filter(
      (savedView, index, savedViews): savedView is ProjectSpatialView =>
        savedView !== null &&
        savedViews.findIndex((candidate) => candidate?.id === savedView.id) === index,
    );
}

function coerceProjectSpatialViewRecord(record: ProjectSpatialViewRecord): ProjectSpatialView {
  const visibleLayersRecord = asRecord(record.visibleLayersJson);
  const labelsOrStyleRecord = asRecord(record.labelsOrStyleJson);
  const annotationsRecord = asRecord(record.annotationsJson);

  return {
    activeBasemap: record.basemap,
    annotationFeatureIds: Array.isArray(annotationsRecord.featureIds)
      ? annotationsRecord.featureIds.filter(
          (featureId): featureId is string => typeof featureId === 'string',
        )
      : [],
    capturedAt: record.capturedAt,
    description: record.description ?? '',
    id: record.id,
    label: record.name,
    labelMode: 'default',
    showGeologyOverlay: Boolean(labelsOrStyleRecord.showGeologyOverlay),
    visibleFeatureTypes: normalizeProjectSpatialViewFeatureTypes(
      visibleLayersRecord.featureTypes ??
        visibleLayersRecord.visibleFeatureTypes ??
        record.visibleLayersJson,
    ),
    viewState: normalizeProjectSpatialMapViewState(record.viewStateJson) ?? {
      centerLonLat: [151.2093, -33.8688],
      rotation: 0,
      zoom: 16,
    },
  };
}

function buildProjectSpatialViewInput(view: ProjectSpatialView): ProjectSpatialViewInput {
  return {
    annotationsJson:
      view.annotationFeatureIds.length > 0 ? { featureIds: view.annotationFeatureIds } : null,
    basemap: view.activeBasemap,
    capturedAt: view.capturedAt,
    description: view.description || null,
    filtersJson: null,
    labelsOrStyleJson: {
      labelMode: view.labelMode,
      showGeologyOverlay: view.showGeologyOverlay,
    },
    name: view.label,
    viewStateJson: {
      centerLonLat: [...view.viewState.centerLonLat],
      rotation: view.viewState.rotation,
      zoom: view.viewState.zoom,
    },
    visibleLayersJson: {
      featureTypes: [...view.visibleFeatureTypes],
    },
  };
}

function coerceProjectSpatialSheetRecordFromApi(
  record: ProjectSpatialSheetRecordApi,
  defaultMetadata: ProjectSpatialSheetMetadata,
  projectName: string,
  availableViews: ProjectSpatialView[],
): ProjectSpatialSheetRecord {
  const assignedSavedViewId = normalizeAssignedSavedViewId(record.assignedViewId, availableViews);
  const bindingSnapshot = parseProjectSpatialSheetBindingSnapshot(
    record.bindingSnapshotJson,
    defaultMetadata,
    projectName,
    assignedSavedViewId,
    record.templateSourceKind,
  );

  return createProjectSpatialSheetRecord(defaultMetadata, projectName, availableViews, {
    assignedSavedViewId,
    createdAt: record.createdAt,
    id: record.id,
    metadata: bindingSnapshot.metadata,
    name: record.name,
    objects: bindingSnapshot.objects,
    rootSheetTemplateSnapshot:
      record.templateSourceKind === 'root_sheet_template'
        ? normalizeRootSheetTemplateSnapshot(record.templateSnapshotJson)
        : null,
    templateDefinitionId: record.rootSheetTemplateId ?? record.templateReferenceId,
    templateSourceKind: record.templateSourceKind,
    templateVersionId: record.rootSheetTemplateVersionId,
    updatedAt: record.updatedAt,
    useLabel: bindingSnapshot.useLabel,
  });
}

function buildProjectSpatialSheetInput(sheet: ProjectSpatialSheetRecord): ProjectSpatialSheetInput {
  return {
    assignedViewId: sheet.assignedSavedViewId,
    bindingSnapshotJson: {
      metadata: sheet.metadata,
      objects: sheet.objects,
      useLabel: sheet.useLabel,
    },
    name: sheet.name,
    orientation: sheet.metadata.orientation,
    paperSize: sheet.metadata.paperSize,
    rootSheetTemplateId: sheet.templateDefinitionId,
    rootSheetTemplateVersionId: sheet.templateVersionId,
    templateReferenceId: sheet.templateDefinitionId,
    templateSnapshotJson: sheet.rootSheetTemplateSnapshot,
    templateSourceKind: sheet.templateSourceKind,
  };
}

function parseProjectSpatialSheetBindingSnapshot(
  value: Record<string, unknown> | null,
  defaultMetadata: ProjectSpatialSheetMetadata,
  projectName: string,
  assignedSavedViewId: string | null,
  templateSourceKind: ProjectSpatialSheetRecordApi['templateSourceKind'],
) {
  const record = asRecord(value);
  const metadata = normalizeProjectSpatialSheetMetadata(record.metadata, defaultMetadata);
  const rawObjects = Array.isArray(record.objects) ? record.objects : [];

  return {
    metadata,
    objects:
      templateSourceKind === 'root_sheet_template'
        ? []
        : rawObjects.length > 0
          ? normalizeProjectSpatialSheetObjects(
              rawObjects,
              metadata.paperSize,
              metadata.orientation,
            )
          : createProjectSpatialSheetRecord(defaultMetadata, projectName, [], {
              assignedSavedViewId,
              metadata,
              templateSourceKind,
            }).objects,
    useLabel: normalizeSheetMetadataString(record.useLabel),
  };
}

function remapProjectSpatialSheetViewIds(
  sheet: ProjectSpatialSheetRecord,
  viewIdMap: Map<string, string>,
): ProjectSpatialSheetRecord {
  const assignedSavedViewId = sheet.assignedSavedViewId
    ? (viewIdMap.get(sheet.assignedSavedViewId) ?? null)
    : null;

  return {
    ...sheet,
    assignedSavedViewId,
    objects: sheet.objects.map((object) =>
      object.type === 'mapFrame'
        ? {
            ...object,
            linkedSavedViewId: object.linkedSavedViewId
              ? (viewIdMap.get(object.linkedSavedViewId) ?? null)
              : assignedSavedViewId,
          }
        : object,
    ),
  };
}

function hasLegacySpatialRecordsForImport(store: ProjectSpatialSheetStore | null) {
  return Boolean(store && (store.views.length > 0 || store.sheets.length > 0));
}

function buildLocalSpatialImportMarkerKey(projectId: string) {
  return `project-spatial-durable-imported:${projectId}`;
}

function createImportedRecordName(existingNames: Set<string>, preferredName: string) {
  const normalizedPreferredName = preferredName.trim() || 'Imported record';
  if (!existingNames.has(normalizedPreferredName.toLowerCase())) {
    return normalizedPreferredName;
  }

  let index = 2;
  let candidate = `${normalizedPreferredName} (Imported)`;
  while (existingNames.has(candidate.toLowerCase())) {
    candidate = `${normalizedPreferredName} (Imported ${index})`;
    index += 1;
  }
  return candidate;
}

function areProjectSpatialViewStatesEqual(
  left: ProjectSpatialMapViewState,
  right: ProjectSpatialMapViewState,
) {
  return (
    Math.abs(left.centerLonLat[0] - right.centerLonLat[0]) < 0.000001 &&
    Math.abs(left.centerLonLat[1] - right.centerLonLat[1]) < 0.000001 &&
    Math.abs(left.rotation - right.rotation) < 0.000001 &&
    Math.abs((left.zoom ?? 0) - (right.zoom ?? 0)) < 0.000001
  );
}

function areProjectSpatialFeatureTypeSetsEqual(
  left: Set<ProjectSpatialFeatureType>,
  right: Set<ProjectSpatialFeatureType>,
) {
  if (left.size !== right.size) {
    return false;
  }

  for (const featureType of left) {
    if (!right.has(featureType)) {
      return false;
    }
  }

  return true;
}

function formatSavedViewStateSummary(viewState: ProjectSpatialMapViewState) {
  const [lon, lat] = viewState.centerLonLat;
  const zoomLabel =
    typeof viewState.zoom === 'number' ? viewState.zoom.toFixed(2).replace(/\.00$/, '') : 'Auto';

  return `Zoom ${zoomLabel} · ${lat.toFixed(5)}, ${lon.toFixed(5)}`;
}

function formatSavedViewPromptDate(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  const hours = `${value.getHours()}`.padStart(2, '0');
  const minutes = `${value.getMinutes()}`.padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function reorderProjectSpatialSheetObjects(
  objects: ProjectSpatialSheetObject[],
  targetId: string,
  direction: 'backward' | 'forward',
) {
  const orderedObjects = objects.slice().sort((left, right) => left.order - right.order);
  const currentIndex = orderedObjects.findIndex((object) => object.id === targetId);
  if (currentIndex < 0) {
    return orderedObjects;
  }

  const swapIndex = direction === 'forward' ? currentIndex + 1 : currentIndex - 1;
  if (swapIndex < 0 || swapIndex >= orderedObjects.length) {
    return orderedObjects;
  }

  const currentObject = orderedObjects[currentIndex];
  const swapObject = orderedObjects[swapIndex];
  if (!currentObject || !swapObject) {
    return orderedObjects;
  }
  orderedObjects[currentIndex] = {
    ...swapObject,
    order: currentObject.order,
  };
  orderedObjects[swapIndex] = {
    ...currentObject,
    order: swapObject.order,
  };

  return orderedObjects.sort((left, right) => left.order - right.order);
}

function areProjectSpatialSheetObjectCollectionsEqual(
  left: ProjectSpatialSheetObject[],
  right: ProjectSpatialSheetObject[],
) {
  if (left.length !== right.length) {
    return false;
  }

  const orderedLeft = left.slice().sort((first, second) => first.order - second.order);
  const orderedRight = right.slice().sort((first, second) => first.order - second.order);

  return orderedLeft.every((object, index) => {
    const candidate = orderedRight[index];
    return (
      candidate &&
      candidate.contentScale === object.contentScale &&
      candidate.density === object.density &&
      candidate.id === object.id &&
      candidate.legendColumns === object.legendColumns &&
      candidate.legendShowMapContext === object.legendShowMapContext &&
      candidate.height === object.height &&
      candidate.linkedSavedViewId === object.linkedSavedViewId &&
      candidate.locked === object.locked &&
      candidate.mapFitMode === object.mapFitMode &&
      candidate.order === object.order &&
      candidate.paddingScale === object.paddingScale &&
      candidate.scaleBarShowLabel === object.scaleBarShowLabel &&
      JSON.stringify(candidate.sheetContextRowsVisibility ?? null) ===
        JSON.stringify(object.sheetContextRowsVisibility ?? null) &&
      candidate.symbolScale === object.symbolScale &&
      candidate.visible === object.visible &&
      candidate.width === object.width &&
      candidate.x === object.x &&
      candidate.y === object.y
    );
  });
}

function buildProjectSpatialSheetPreflight(args: {
  assignedSavedViewId: string | null;
  contentMetrics: ProjectSpatialSheetContentMetrics;
  objects: ProjectSpatialSheetObject[];
  orientation: ProjectSpatialSheetOrientation;
  paperSize: ProjectSpatialPaperSize;
  savedViews: ProjectSpatialView[];
}): ProjectSpatialSheetPreflightResult {
  const normalizedObjects = normalizeProjectSpatialSheetObjects(
    args.objects,
    args.paperSize,
    args.orientation,
  );
  const recommendedObjects = autoSizeProjectSpatialSheetObjects(
    normalizedObjects,
    args.paperSize,
    args.orientation,
    args.contentMetrics,
  );
  const recommendedObjectsById = new Map(recommendedObjects.map((object) => [object.id, object]));
  const safeObjects = normalizedObjects.map((object) => {
    const recommendedObject = recommendedObjectsById.get(object.id) ?? object;
    const shouldGrowForContentSafety =
      object.visible &&
      (object.type === 'titleBlock' ||
        object.type === 'legend' ||
        object.type === 'notes' ||
        object.type === 'sheetContext') &&
      (recommendedObject.width > object.width + 0.25 ||
        recommendedObject.height > object.height + 0.25);

    return clampProjectSpatialSheetObject(
      shouldGrowForContentSafety
        ? {
            ...object,
            height: Math.max(object.height, recommendedObject.height),
            width: Math.max(object.width, recommendedObject.width),
          }
        : object,
      args.paperSize,
      args.orientation,
    );
  });
  const issues: ProjectSpatialSheetPreflightIssue[] = [];
  const safeArea = getProjectSpatialSheetSafeArea(args.paperSize, args.orientation);
  const mapFrame = safeObjects.find((object) => object.type === 'mapFrame') ?? null;
  const titleBlock = safeObjects.find((object) => object.type === 'titleBlock') ?? null;
  const clampedObjects = safeObjects.filter((object, index) => {
    const original = normalizedObjects[index];
    return (
      !original ||
      original.x !== object.x ||
      original.y !== object.y ||
      original.width !== object.width ||
      original.height !== object.height
    );
  });
  const autoGrownContentObjects = safeObjects.filter((object, index) => {
    const original = normalizedObjects[index];
    return (
      original &&
      (object.type === 'titleBlock' ||
        object.type === 'legend' ||
        object.type === 'notes' ||
        object.type === 'sheetContext') &&
      (object.width > original.width + 0.25 || object.height > original.height + 0.25)
    );
  });
  const contentStillClippedObjects = safeObjects.filter((object) => {
    const recommendedObject = recommendedObjectsById.get(object.id);
    return (
      object.visible &&
      recommendedObject &&
      (object.type === 'titleBlock' ||
        object.type === 'legend' ||
        object.type === 'notes' ||
        object.type === 'sheetContext') &&
      (recommendedObject.width > object.width + 0.25 ||
        recommendedObject.height > object.height + 0.25)
    );
  });

  if (!mapFrame) {
    issues.push({
      id: 'map-frame-missing',
      message: 'Map frame is missing from the sheet layout.',
      severity: 'blocking',
    });
  } else if (!mapFrame.visible) {
    issues.push({
      id: 'map-frame-hidden',
      message: 'Map frame is hidden and will not export.',
      severity: 'blocking',
    });
  } else if (mapFrame.width < safeArea.width * 0.45 || mapFrame.height < safeArea.height * 0.35) {
    issues.push({
      id: 'map-frame-small',
      message: 'Map frame is very small for the current paper size.',
      severity: 'blocking',
    });
  }

  if (!titleBlock) {
    issues.push({
      id: 'title-block-missing',
      message: 'Title block is missing from the sheet layout.',
      severity: 'blocking',
    });
  } else if (!titleBlock.visible) {
    issues.push({
      id: 'title-block-hidden',
      message: 'Title block is hidden and will not export.',
      severity: 'blocking',
    });
  }

  if (clampedObjects.length > 0) {
    issues.push({
      id: 'objects-clamped',
      message: `Some objects were clamped inside the sheet safe area: ${clampedObjects
        .map((object) => object.name)
        .join(', ')}.`,
      severity: 'warning',
    });
  }

  if (autoGrownContentObjects.length > 0) {
    issues.push({
      id: 'content-auto-grown',
      message: `Some content blocks were grown to avoid clipped content: ${autoGrownContentObjects
        .map((object) => object.name)
        .join(', ')}.`,
      severity: 'warning',
    });
  }

  if (contentStillClippedObjects.length > 0) {
    issues.push({
      id: 'content-clipped',
      message: `Some content blocks are still too small for their content: ${contentStillClippedObjects
        .map((object) => object.name)
        .join(', ')}.`,
      severity: 'blocking',
    });
  }

  const linkedSavedViewId = mapFrame?.linkedSavedViewId ?? args.assignedSavedViewId ?? null;
  if (linkedSavedViewId) {
    const linkedSavedView = args.savedViews.find((savedView) => savedView.id === linkedSavedViewId);
    if (!linkedSavedView) {
      issues.push({
        id: 'saved-view-missing',
        message: 'Map frame is linked to a view that no longer exists.',
        severity: 'warning',
      });
    }
  } else {
    issues.push({
      id: 'saved-view-unassigned',
      message: 'Map frame has no assigned view and will use the current source map.',
      severity: 'warning',
    });
  }

  const criticalObjects = safeObjects.filter(
    (object) =>
      object.visible &&
      (object.type === 'mapFrame' ||
        object.type === 'titleBlock' ||
        object.type === 'legend' ||
        object.type === 'notes' ||
        object.type === 'sheetContext'),
  );
  const overlapWarnings = new Set<string>();

  for (let index = 0; index < criticalObjects.length; index += 1) {
    for (let compareIndex = index + 1; compareIndex < criticalObjects.length; compareIndex += 1) {
      const left = criticalObjects[index];
      const right = criticalObjects[compareIndex];
      if (!left || !right) {
        continue;
      }
      const overlapArea = measureObjectOverlap(left, right);
      if (overlapArea > 8) {
        overlapWarnings.add(`${left.name} overlaps ${right.name}.`);
      }
    }
  }

  overlapWarnings.forEach((message, index) => {
    issues.push({
      id: `overlap-${index}`,
      message,
      severity: 'blocking',
    });
  });

  return {
    issues,
    objects: safeObjects.sort((left, right) => left.order - right.order),
  };
}

function measureObjectOverlap(
  left: Pick<ProjectSpatialSheetObject, 'height' | 'width' | 'x' | 'y'>,
  right: Pick<ProjectSpatialSheetObject, 'height' | 'width' | 'x' | 'y'>,
) {
  const overlapWidth = Math.max(
    0,
    Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x),
  );
  const overlapHeight = Math.max(
    0,
    Math.min(left.y + left.height, right.y + right.height) - Math.max(left.y, right.y),
  );

  return overlapWidth * overlapHeight;
}

function parseStoredSheetStore(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function parseStoredSheetMetadata(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function extractSpatialErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    const body = asRecord(error.body);

    const validationMessage =
      extractFirstErrorMessage(body.errors) ?? extractFirstErrorMessage(body.message);

    if (validationMessage) {
      return validationMessage;
    }

    return error.message || 'Failed to save spatial feature';
  }

  if (error instanceof Error) {
    return error.message || 'Failed to save spatial feature';
  }

  return 'Failed to save spatial feature';
}

function extractProjectSpatialLoadErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    const body = asRecord(error.body);
    const message = extractFirstErrorMessage(body.message) ?? extractFirstErrorMessage(body.errors);

    return message || error.message || 'Failed to load project spatial features';
  }

  if (error instanceof Error) {
    return error.message || 'Failed to load project spatial features';
  }

  return 'Failed to load project spatial features';
}

function resolveProjectSpatialWorkspaceReturnLabel(returnToHref: string | null) {
  if (!returnToHref) {
    return 'Return';
  }

  if (/\/environmental\/monitoring\//.test(returnToHref)) {
    return 'Return to Monitoring Report';
  }

  if (/\/environmental\/cnvmp/.test(returnToHref)) {
    return 'Return to CNVMP';
  }

  if (/\/environmental\/waste-classification/.test(returnToHref)) {
    return 'Return to Waste Classification';
  }

  return 'Return to Previous Page';
}

function extractFirstErrorMessage(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  if (!Array.isArray(value)) {
    return null;
  }

  for (const item of value) {
    if (typeof item === 'string' && item.trim()) {
      return item.trim();
    }

    if (item && typeof item === 'object') {
      const nestedMessage = extractFirstErrorMessage(asRecord(item).message);
      if (nestedMessage) {
        return nestedMessage;
      }
    }
  }

  return null;
}

function formatSheetGeneratedAt(value: Date) {
  return new Intl.DateTimeFormat('en-AU', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(value);
}

function buildSpatialSheetFilename(projectIdentifier: unknown, sheetTitle: unknown) {
  const safeProjectIdentifier = normalizeSheetMetadataString(projectIdentifier)
    .trim()
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const safeSheetTitle = normalizeSheetMetadataString(sheetTitle)
    .trim()
    .toLowerCase()
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return `${safeProjectIdentifier || 'project'}-${safeSheetTitle || 'spatial-map-sheet'}.pdf`;
}

function waitForNextAnimationFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });
}

async function waitForImagesToLoad(container: HTMLElement) {
  const images = Array.from(container.querySelectorAll('img'));

  await Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }

          const handleSettled = () => {
            image.removeEventListener('load', handleSettled);
            image.removeEventListener('error', handleSettled);
            resolve();
          };

          image.addEventListener('load', handleSettled);
          image.addEventListener('error', handleSettled);
        }),
    ),
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-AU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

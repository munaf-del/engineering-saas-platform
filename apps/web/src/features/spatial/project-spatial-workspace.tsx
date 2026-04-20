'use client';

import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  ArrowLeft,
  Map as MapIcon,
  MapPin,
  MousePointer2,
  Move,
  Pentagon,
  Route,
  Save,
  Trash2,
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
import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import { extractProjectSpecifics } from '@/features/projects/project-specifics-adapter';
import {
  formatSpatialLabel,
  getProjectSpatialMetadataFields,
  PROJECT_SPATIAL_FEATURE_TYPE_OPTIONS,
  PROJECT_SPATIAL_LINKED_DELIVERABLE_TYPE_OPTIONS,
  PROJECT_SPATIAL_SOURCE_TYPE_OPTIONS,
  usesProjectSpatialFallbackMetadata,
} from './project-spatial-utils';
import {
  useCreateProjectSpatialFeature,
  useDeleteProjectSpatialFeature,
  useProjectSpatialFeatures,
  useUpdateProjectSpatialFeature,
} from '@/hooks/use-project-spatial';
import { ApiError } from '@/lib/api-client';
import { toast } from 'sonner';
import type { ProjectSpatialDraftOverlay, ProjectSpatialToolMode } from './project-spatial-map';

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
  projectId: string;
  project: Project;
};

export function ProjectSpatialWorkspace({ projectId, project }: ProjectSpatialWorkspaceProps) {
  const projectSpecifics = useMemo(() => extractProjectSpecifics(project), [project]);
  const projectName = projectSpecifics.identity.projectName || project.name;
  const { data: features = [], isLoading } = useProjectSpatialFeatures(projectId);
  const createFeature = useCreateProjectSpatialFeature(projectId);
  const deleteFeature = useDeleteProjectSpatialFeature(projectId);
  const [toolMode, setToolMode] = useState<ProjectSpatialToolMode>('select');
  const [visibleFeatureTypes, setVisibleFeatureTypes] = useState<Set<ProjectSpatialFeatureType>>(
    () => new Set(PROJECT_SPATIAL_FEATURE_TYPES),
  );
  const [draft, setDraft] = useState<EditableProjectSpatialFeature | null>(null);
  const [focusedPersistedFeatureId, setFocusedPersistedFeatureId] = useState<string | null>(null);
  const [focusRequestToken, setFocusRequestToken] = useState(0);
  const [draftBaseline, setDraftBaseline] = useState<string | null>(null);
  const [selectionSyncToken, setSelectionSyncToken] = useState(0);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);
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

  const draftOverlay: ProjectSpatialDraftOverlay | null = draft
    ? {
        key: draft.key,
        persistedId: draft.persistedId,
        featureType: draft.featureType,
        geometryType: draft.geometryType,
        geometryJson: draft.geometryJson,
      }
    : null;

  const linkedAiDocumentIdError =
    draft?.linkedAiDocumentId.trim() && !UUID_PATTERN.test(draft.linkedAiDocumentId.trim())
      ? 'AI document ID must be a valid UUID.'
      : null;

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
    setToolMode('select');
  }

  function openFeatureDraft(feature: ProjectSpatialFeature) {
    const nextDraft = editableDraftFromFeature(feature);
    setDraft(nextDraft);
    setDraftBaseline(snapshotDraft(nextDraft));
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
      setDraft({
        key: `draft-${Date.now()}`,
        persistedId: null,
        label: '',
        featureType: '',
        geometryType,
        description: '',
        geometryJson,
        status: '',
        sourceType: '',
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
      setToolMode('select');
    });
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

  const isSaving = createFeature.isPending || updateFeature.isPending;

  return (
    <>
      <div className="mb-4">
        <Link
          href={`/projects/${projectId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to project
        </Link>
      </div>

      <PageHeader
        title="Spatial"
        description={`${project.code} · Project master map, boundaries, monitoring locations, boreholes, wells, and reusable spatial features`}
        badges={
          <>
            <Badge variant="outline">{projectName}</Badge>
            <Badge variant="outline">
              {features.length} total feature{features.length === 1 ? '' : 's'}
            </Badge>
            <Badge variant="outline">{visibleFeatures.length} visible in workspace</Badge>
          </>
        }
      />

      <Alert className="mb-6">
        <MapIcon className="h-4 w-4" />
        <AlertTitle>Project-owned spatial workspace</AlertTitle>
        <AlertDescription>
          This master map is shared across Project Geotechnical, Foundations, Environmental, CNVMP,
          Monitoring Reports, and future inspections. It is the reusable source of truth for project
          spatial features.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Feature Filters</CardTitle>
              <CardDescription>
                Hide or show feature types. Hidden types are removed from the map and feature list.
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

        <div className="space-y-6">
          <Card>
            <CardHeader className="space-y-4">
              <div>
                <CardTitle className="text-base">Spatial Workspace</CardTitle>
                <CardDescription>
                  OpenLayers editing map with a default OpenStreetMap basemap.
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
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex h-[640px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                  Loading spatial features…
                </div>
              ) : (
                <ProjectSpatialMap
                  features={visibleFeatures}
                  initialFeatures={features}
                  initialAddress={projectAddress}
                  draftOverlay={draftOverlay}
                  selectedPersistedFeatureId={draft?.persistedId ?? null}
                  focusedPersistedFeatureId={focusedPersistedFeatureId}
                  focusRequestToken={focusRequestToken}
                  selectionSyncToken={selectionSyncToken}
                  mode={toolMode}
                  onFeatureSelect={handleFeatureSelection}
                  onDrawComplete={handleDrawComplete}
                  onPersistedFeatureGeometryChange={handlePersistedFeatureGeometryChange}
                  onDraftGeometryChange={handleDraftGeometryChange}
                />
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
                        No visible features yet. Use the toolbar to draw a point, line, or polygon.
                      </TableCell>
                    </TableRow>
                  ) : (
                    visibleFeatures.map((feature) => (
                      <TableRow
                        key={feature.id}
                        data-state={draft?.persistedId === feature.id ? 'selected' : undefined}
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
        </div>

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
          <CardContent>
            {!draft ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Draw a new point, line, or polygon, or select an existing feature to edit it here.
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
                        setVisibleFeatureTypes((current) => new Set(current).add(nextFeatureType));
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
                      onChange={(event) => updateDraftField('sourceReference', event.target.value)}
                      placeholder="Optional source reference"
                    />
                  </div>
                </div>

                <div className="space-y-4 rounded-lg border p-4">
                  <div>
                    <h3 className="text-sm font-semibold">Linked Records</h3>
                    <p className="text-xs text-muted-foreground">
                      Keep reuse hooks ready for project references, AI reports, and deliverables.
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

                    return (
                      <div key={field.key} className="space-y-2">
                        <Label htmlFor={`spatial-property-${field.key}`}>{field.label}</Label>
                        {field.kind === 'textarea' ? (
                          <Textarea
                            id={`spatial-property-${field.key}`}
                            value={typeof currentValue === 'string' ? currentValue : ''}
                            onChange={(event) => updateDraftProperty(field.key, event.target.value)}
                          />
                        ) : (
                          <Input
                            id={`spatial-property-${field.key}`}
                            value={typeof currentValue === 'string' ? currentValue : ''}
                            onChange={(event) => updateDraftProperty(field.key, event.target.value)}
                          />
                        )}
                      </div>
                    );
                  })}

                  {usesProjectSpatialFallbackMetadata(draft.featureType) ? (
                    <div className="space-y-2">
                      <Label htmlFor="spatial-additional-properties">Additional Properties</Label>
                      <Textarea
                        id="spatial-additional-properties"
                        value={
                          typeof asRecord(draft.propertiesJson).additionalProperties === 'string'
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
          </CardContent>
        </Card>
      </div>

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

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-AU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  Eye,
  Layers,
  Map as MapIcon,
  Maximize2,
  PencilLine,
  Plus,
  Save,
  Trash2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { ApiError, api } from '@/lib/api-client';
import { useAuth } from '@/lib/auth';
import {
  GenericTemplateSheet,
  type GenericTemplateBorderPattern,
  type GenericTemplateEditorStyleOverride,
  type GenericTemplateFontChoice,
  type GenericTemplateTextAlign,
} from '../components/generic-template-sheet';
import {
  applyAs1100TitleBlockGeometry,
  createDefaultGenericTemplateChromeStyle,
  createDefaultGenericTemplateChromeStyleForDocument,
  createDefaultGenericTemplateLineStyle,
  createGenericTemplateObject,
  getGenericTemplateObjectLabel,
  normalizeGenericTemplateDocument,
  remapGenericTemplateObjectsToPage,
  sanitizeAs1100StarterObjects,
  type GenericTemplateChromeStyle,
  type GenericTemplateDetailRow,
  type GenericTemplateDocument,
  type GenericTemplateObject,
  type GenericTemplateObjectType,
} from '../core/generic-template-document';
import { getTemplatePageLayout } from '../core/template-page';
import {
  getTemplateSafeArea,
  TEMPLATE_PAGE_ORIENTATION_OPTIONS,
  TEMPLATE_PAPER_SIZE_OPTIONS,
  TEMPLATE_PRESET_OPTIONS,
  type TemplatePageOrientation,
  type TemplatePaperSize,
  type TemplatePresetId,
} from '../core/template-preset';
import { getNextTemplateCanvasZoom, getTemplateCanvasFitZoom } from './template-canvas-zoom';
import {
  createBuiltInGenericTemplateLibrary,
  createAndInsertGenericTemplate,
  duplicateAndInsertGenericTemplate,
  GENERIC_TEMPLATE_LIBRARY_STORAGE_KEY,
  isBuiltInGenericTemplateId,
  parseStoredGenericTemplateLibrary,
} from '../persistence/generic-template-library';
import {
  coerceRootSheetTemplateDocument,
  type RootSheetTemplate,
} from '../root-sheet-template-types';
import {
  assessRootSheetTemplateSuitability,
  getSpatialSheetCapabilityBadgeLabel,
  getSpatialSheetCapabilityBadgeVariant,
} from '../root-sheet-template-suitability';
import { formatOperatorFacingSheetLabel } from '../sheet-display-labels';
import { useRootSheetTemplates } from '@/hooks/use-root-sheet-templates';
import {
  getAs1100FrameSpec,
  getAs1100GridSpec,
  getAs1100TitleBlockSpec,
} from '../presets/as1100-101/as1100-spec';

const OBJECT_CREATE_OPTIONS: Array<{
  description: string;
  type: GenericTemplateObjectType;
}> = [
  { type: 'titleBlock', description: 'Reusable title/footer layout' },
  { type: 'textBlock', description: 'Notes or explanatory copy' },
  { type: 'detailsBlock', description: 'Key-value metadata table' },
  { type: 'imageFrame', description: 'Image or diagram placeholder' },
  { type: 'mapFrame', description: 'Project Spatial map placeholder' },
];

const TEMPLATE_FONT_FAMILY_OPTIONS: GenericTemplateFontChoice[] = [
  'Inter',
  'Arial',
  'Times New Roman',
  'Courier New',
  'Georgia',
];

const TEMPLATE_FONT_WEIGHT_OPTIONS: Array<{
  label: string;
  value: number;
}> = [
  { value: 400, label: 'Normal' },
  { value: 500, label: 'Medium' },
  { value: 600, label: 'Semibold' },
  { value: 700, label: 'Bold' },
];

const TEMPLATE_TEXT_ALIGN_OPTIONS: GenericTemplateTextAlign[] = ['left', 'center', 'right'];

const TEMPLATE_BORDER_PATTERN_OPTIONS: Array<{
  label: string;
  value: GenericTemplateBorderPattern;
}> = [
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
  { value: 'none', label: 'None' },
];

type InspectorSectionKey = 'border' | 'typography';

export function TemplatesWorkspace() {
  const { user } = useAuth();
  const [library, setLibrary] = useState<GenericTemplateDocument[]>([]);
  const [localImportCandidates, setLocalImportCandidates] = useState<GenericTemplateDocument[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [draftTemplate, setDraftTemplate] = useState<GenericTemplateDocument | null>(null);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isLeftRailOpen, setIsLeftRailOpen] = useState(true);
  const [isRightRailOpen, setIsRightRailOpen] = useState(false);
  const [leftTab, setLeftTab] = useState<'library' | 'page'>('page');
  const [rightTab, setRightTab] = useState<'inspector' | 'objects'>('inspector');
  const [objectStyleOverrides, setObjectStyleOverrides] = useState<
    Record<string, GenericTemplateEditorStyleOverride>
  >({});
  const [inspectorSectionState, setInspectorSectionState] = useState<
    Record<InspectorSectionKey, boolean>
  >({
    border: true,
    typography: true,
  });
  const [zoomScale, setZoomScale] = useState(1);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isImportingLocalTemplates, setIsImportingLocalTemplates] = useState(false);
  const [isLoadingAs1100Templates, setIsLoadingAs1100Templates] = useState(false);
  const canvasViewportRef = useRef<HTMLDivElement | null>(null);
  const previewRailStateRef = useRef<{ left: boolean; right: boolean } | null>(null);
  const hydratedFromApiRef = useRef(false);

  const rootTemplatesQuery = useRootSheetTemplates();
  const rootTemplatesWithArchivedQuery = useRootSheetTemplates(true);
  const persistedTemplateIds = useMemo(
    () => new Set((rootTemplatesQuery.data ?? []).map((template) => template.id)),
    [rootTemplatesQuery.data],
  );
  const draftTemplateSuitability = useMemo(
    () => assessRootSheetTemplateSuitability(draftTemplate),
    [draftTemplate],
  );
  const as1100StandardTemplates = useMemo(() => createBuiltInGenericTemplateLibrary(), []);
  const selectedTemplateIsPersisted = draftTemplate
    ? persistedTemplateIds.has(draftTemplate.id) ||
      library.some((template) => template.id === draftTemplate.id)
    : false;
  const savedRootSheetTemplates = useMemo(
    () => library.filter((template) => persistedTemplateIds.has(template.id)),
    [library, persistedTemplateIds],
  );
  const currentOrganisationRootTemplatesByKey = useMemo(() => {
    const templates = (rootTemplatesWithArchivedQuery.data ?? []).filter(
      (template) =>
        template.scopeType === 'org' &&
        template.scopeId === (user?.organisationId ?? null) &&
        template.organisationId === (user?.organisationId ?? null),
    );

    return new Map(templates.map((template) => [template.key, template]));
  }, [rootTemplatesWithArchivedQuery.data, user?.organisationId]);
  const as1100StandardTemplateEntries = useMemo(
    () =>
      as1100StandardTemplates.map((template) => {
        const key = buildRootSheetTemplateKey(template.name);
        const persistedRecord = currentOrganisationRootTemplatesByKey.get(key) ?? null;

        return {
          key,
          persistedRecord,
          template,
        };
      }),
    [as1100StandardTemplates, currentOrganisationRootTemplatesByKey],
  );
  const missingAs1100StandardTemplateEntries = useMemo(
    () =>
      as1100StandardTemplateEntries.filter((entry) => entry.persistedRecord?.archivedAt !== null),
    [as1100StandardTemplateEntries],
  );

  function mergePersistedTemplatesIntoLibrary(templates: RootSheetTemplate[]) {
    const nextDocuments = templates
      .map((template) => coerceRootSheetTemplateDocument(template))
      .filter((template): template is GenericTemplateDocument => template !== null);

    if (!nextDocuments.length) {
      return;
    }

    setLibrary((current) => {
      const nextDocumentIds = new Set(nextDocuments.map((template) => template.id));
      const preservedTemplates = current.filter((template) => !nextDocumentIds.has(template.id));
      return sortTemplatesByUpdatedAt([...nextDocuments, ...preservedTemplates]);
    });
  }

  function openTemplateDocument(template: GenericTemplateDocument) {
    setSelectedTemplateId(template.id);
    setDraftTemplate(prepareTemplateForEditing(template));
    setSelectedObjectId(template.objects[0]?.id ?? null);
    setIsPreviewMode(false);
    setIsDirty(false);
    setLeftTab('page');
  }

  function getRootSheetTemplatePayload(template: GenericTemplateDocument) {
    const normalized = normalizeGenericTemplateDocument(template);

    return {
      category:
        assessRootSheetTemplateSuitability(normalized).capability === 'spatial_ready'
          ? 'spatial'
          : 'general',
      definitionJson: normalized,
      key: buildRootSheetTemplateKey(normalized.name),
      label: normalized.name,
      scopeType: 'org' as const,
    };
  }

  function getApiErrorMessage(error: unknown, fallback: string) {
    if (!(error instanceof ApiError)) {
      return fallback;
    }

    if (typeof error.body === 'string' && error.body.trim()) {
      return error.body.trim();
    }

    if (error.body && typeof error.body === 'object') {
      const message = (error.body as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) {
        return message.trim();
      }
      if (
        Array.isArray(message) &&
        message.length > 0 &&
        message.every((item) => typeof item === 'string')
      ) {
        return message.join(', ');
      }
    }

    return fallback;
  }

  async function refreshRootTemplateQueries() {
    await Promise.all([rootTemplatesQuery.refetch(), rootTemplatesWithArchivedQuery.refetch()]);
  }

  async function loadAs1100StandardTemplates(templates: GenericTemplateDocument[]) {
    if (!templates.length) {
      return;
    }

    setIsLoadingAs1100Templates(true);
    try {
      const savedTemplates: RootSheetTemplate[] = [];

      for (const template of templates) {
        const payload = getRootSheetTemplatePayload(template);
        const existing = currentOrganisationRootTemplatesByKey.get(payload.key) ?? null;

        if (existing && !existing.archivedAt) {
          savedTemplates.push(existing);
          continue;
        }

        const savedTemplate = await api<RootSheetTemplate>(
          existing ? `/root-sheet-templates/${existing.id}` : '/root-sheet-templates',
          {
            method: existing ? 'PATCH' : 'POST',
            body: payload,
          },
        );

        savedTemplates.push(savedTemplate);
      }

      mergePersistedTemplatesIntoLibrary(savedTemplates);
      await refreshRootTemplateQueries();
      toast.success(
        templates.length === 1
          ? 'AS 1100 standard sheet loaded to the saved library'
          : 'AS 1100 standard sheets loaded to the saved library',
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to load AS 1100 standard sheets'));
    } finally {
      setIsLoadingAs1100Templates(false);
    }
  }

  function openPersistedTemplateRecord(template: RootSheetTemplate) {
    if (
      isDirty &&
      typeof window !== 'undefined' &&
      !window.confirm('Discard unsaved template changes and open another template?')
    ) {
      return;
    }

    const persistedDocument = coerceRootSheetTemplateDocument(template);
    if (!persistedDocument) {
      toast.error('Saved Root Sheet Template could not be opened');
      return;
    }

    mergePersistedTemplatesIntoLibrary([template]);
    openTemplateDocument(persistedDocument);
  }

  function prepareTemplateForEditing(template: GenericTemplateDocument | null) {
    if (!template) {
      return null;
    }

    const shouldSanitizeAsStarter =
      template.presetId === 'as1100_inspired' &&
      (isBuiltInGenericTemplateId(template.id) || isDefaultAs1100TemplateName(template.name));

    return normalizeGenericTemplateDocument({
      ...template,
      objects: shouldSanitizeAsStarter
        ? sanitizeAs1100StarterObjects(template.objects)
        : template.objects,
    });
  }

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const localRootTemplates = readPendingLocalRootSheetTemplates(
      window.localStorage.getItem(GENERIC_TEMPLATE_LIBRARY_STORAGE_KEY),
      user?.organisationId ?? null,
    );

    setLocalImportCandidates(localRootTemplates);
  }, [user?.organisationId]);

  useEffect(() => {
    if (hydratedFromApiRef.current || !rootTemplatesQuery.data) {
      return;
    }

    const nextLibrary = rootTemplatesQuery.data
      .map((template) => coerceRootSheetTemplateDocument(template))
      .filter((template): template is GenericTemplateDocument => template !== null);
    const firstTemplate = nextLibrary[0] ?? null;

    setLibrary(nextLibrary);
    setSelectedTemplateId(firstTemplate?.id ?? null);
    setDraftTemplate(prepareTemplateForEditing(firstTemplate));
    setSelectedObjectId(firstTemplate?.objects[0]?.id ?? null);
    hydratedFromApiRef.current = true;
  }, [rootTemplatesQuery.data]);

  useEffect(() => {
    if (!draftTemplate) {
      setSelectedObjectId(null);
      return;
    }

    setSelectedObjectId((current) =>
      draftTemplate.objects.some((object) => object.id === current)
        ? current
        : (draftTemplate.objects[0]?.id ?? null),
    );
  }, [draftTemplate]);

  useEffect(() => {
    setObjectStyleOverrides({});
  }, [selectedTemplateId]);

  useEffect(() => {
    if (isPreviewMode) {
      previewRailStateRef.current = {
        left: isLeftRailOpen,
        right: isRightRailOpen,
      };
      setIsLeftRailOpen(false);
      setIsRightRailOpen(false);
      return;
    }

    if (previewRailStateRef.current) {
      setIsLeftRailOpen(previewRailStateRef.current.left);
      setIsRightRailOpen(previewRailStateRef.current.right);
      previewRailStateRef.current = null;
    }
  }, [isPreviewMode]);

  useEffect(() => {
    if (!draftTemplate || draftTemplate.presetId !== 'as1100_inspired') {
      return;
    }

    if (!isBuiltInGenericTemplateId(draftTemplate.id)) {
      return;
    }

    const standardizedObjects = applyAs1100TitleBlockGeometry(
      draftTemplate.objects,
      draftTemplate.paperSize,
      draftTemplate.orientation,
    );
    const titleBlockGeometryChanged = standardizedObjects.some((object) => {
      if (object.type !== 'titleBlock') {
        return false;
      }

      const currentObject = draftTemplate.objects.find((candidate) => candidate.id === object.id);
      return (
        !currentObject ||
        currentObject.width !== object.width ||
        currentObject.height !== object.height ||
        currentObject.x !== object.x ||
        currentObject.y !== object.y
      );
    });

    if (!titleBlockGeometryChanged) {
      return;
    }

    setDraftTemplate((current) =>
      current && current.id === draftTemplate.id
        ? normalizeGenericTemplateDocument({
            ...current,
            objects: standardizedObjects,
          })
        : current,
    );
    setIsDirty(false);
  }, [
    draftTemplate?.id,
    draftTemplate?.objects,
    draftTemplate?.orientation,
    draftTemplate?.paperSize,
    draftTemplate?.presetId,
  ]);

  const selectedTemplate = useMemo(
    () => library.find((template) => template.id === selectedTemplateId) ?? null,
    [library, selectedTemplateId],
  );
  const selectedObject = useMemo(
    () => draftTemplate?.objects.find((object) => object.id === selectedObjectId) ?? null,
    [draftTemplate, selectedObjectId],
  );
  const selectedObjectStyle = useMemo(
    () =>
      selectedObject
        ? {
            ...getDefaultEditorStyleForObject(selectedObject),
            ...(objectStyleOverrides[selectedObject.id] ?? {}),
          }
        : null,
    [objectStyleOverrides, selectedObject],
  );
  const pageLayout = useMemo(
    () =>
      draftTemplate
        ? getTemplatePageLayout(draftTemplate.paperSize, draftTemplate.orientation)
        : null,
    [draftTemplate],
  );
  const safeArea = useMemo(
    () =>
      draftTemplate
        ? getTemplateSafeArea(draftTemplate.paperSize, draftTemplate.orientation)
        : null,
    [draftTemplate],
  );
  const as1100FrameSpec = useMemo(
    () =>
      draftTemplate?.presetId === 'as1100_inspired'
        ? getAs1100FrameSpec(draftTemplate.paperSize, draftTemplate.orientation)
        : null,
    [draftTemplate],
  );
  const as1100GridSpec = useMemo(
    () =>
      draftTemplate?.presetId === 'as1100_inspired'
        ? getAs1100GridSpec(draftTemplate.paperSize, draftTemplate.orientation)
        : null,
    [draftTemplate],
  );
  const as1100TitleBlockSpec = useMemo(
    () =>
      draftTemplate?.presetId === 'as1100_inspired'
        ? getAs1100TitleBlockSpec(draftTemplate.paperSize, draftTemplate.orientation)
        : null,
    [draftTemplate],
  );

  useEffect(() => {
    if (!pageLayout || !draftTemplate || typeof window === 'undefined') {
      return;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      fitCanvasToViewport(canvasViewportRef.current, pageLayout, setZoomScale);
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [draftTemplate?.id, pageLayout?.heightPx, pageLayout?.widthPx]);

  function openTemplate(templateId: string) {
    if (templateId === selectedTemplateId) {
      return;
    }

    if (
      isDirty &&
      typeof window !== 'undefined' &&
      !window.confirm('Discard unsaved template changes and open another template?')
    ) {
      return;
    }

    const nextTemplate = library.find((template) => template.id === templateId) ?? null;
    if (!nextTemplate) {
      return;
    }

    openTemplateDocument(nextTemplate);
  }

  function createTemplate() {
    if (
      isDirty &&
      typeof window !== 'undefined' &&
      !window.confirm('Discard unsaved changes and create a new template?')
    ) {
      return;
    }

    const draft = createAndInsertGenericTemplate([], {
      name: `Template ${savedRootSheetTemplates.length + 1}`,
    }).template;
    setSelectedTemplateId(draft.id);
    setDraftTemplate(draft);
    setSelectedObjectId(draft.objects[0]?.id ?? null);
    setIsPreviewMode(false);
    setIsDirty(true);
    setLeftTab('page');
    setRightTab('inspector');
    toast.success('Root Sheet Template draft created');
  }

  function duplicateTemplate() {
    const sourceTemplate = draftTemplate ?? selectedTemplate;
    if (!sourceTemplate) {
      return;
    }

    const result = duplicateAndInsertGenericTemplate([], sourceTemplate);
    setSelectedTemplateId(result.duplicate.id);
    setDraftTemplate(result.duplicate);
    setSelectedObjectId(result.duplicate.objects[0]?.id ?? null);
    setIsPreviewMode(false);
    setIsDirty(true);
    toast.success('Root Sheet Template duplicated as a new draft');
  }

  async function deleteTemplateById(templateId: string) {
    const template = library.find((candidate) => candidate.id === templateId) ?? null;
    if (
      !template ||
      (typeof window !== 'undefined' && !window.confirm(`Delete template "${template.name}"?`))
    ) {
      return;
    }

    if (persistedTemplateIds.has(templateId)) {
      try {
        await api(`/root-sheet-templates/${templateId}`, {
          method: 'DELETE',
        });
      } catch {
        toast.error('Failed to archive Root Sheet Template');
        return;
      }
    }

    const nextLibrary = library.filter((candidate) => candidate.id !== templateId);
    setLibrary(nextLibrary);

    if (selectedTemplateId === templateId) {
      const nextTemplate = nextLibrary[0] ?? null;
      setSelectedTemplateId(nextTemplate?.id ?? null);
      setDraftTemplate(prepareTemplateForEditing(nextTemplate));
      setSelectedObjectId(nextTemplate?.objects[0]?.id ?? null);
      setIsPreviewMode(false);
      setIsDirty(false);
    }

    toast.success(
      persistedTemplateIds.has(templateId)
        ? 'Root Sheet Template archived'
        : 'Unsaved Root Sheet Template draft removed',
    );
    void refreshRootTemplateQueries();
  }

  async function saveTemplate() {
    if (!draftTemplate) {
      return;
    }

    const normalized = normalizeGenericTemplateDocument({
      ...draftTemplate,
      updatedAt: new Date().toISOString(),
    });
    setIsSavingTemplate(true);

    try {
      const savedTemplate = await api<RootSheetTemplate>(
        persistedTemplateIds.has(draftTemplate.id)
          ? `/root-sheet-templates/${draftTemplate.id}`
          : '/root-sheet-templates',
        {
          method: persistedTemplateIds.has(draftTemplate.id) ? 'PATCH' : 'POST',
          body: getRootSheetTemplatePayload(normalized),
        },
      );
      const persistedDocument = coerceRootSheetTemplateDocument(savedTemplate);
      if (!persistedDocument) {
        throw new Error('Persisted Root Sheet Template could not be reopened');
      }

      setLibrary((current) => {
        const withoutDraft = current.filter((template) => template.id !== draftTemplate.id);
        return sortTemplatesByUpdatedAt([persistedDocument, ...withoutDraft]);
      });
      setDraftTemplate(persistedDocument);
      setSelectedTemplateId(persistedDocument.id);
      setIsDirty(false);
      toast.success('Root Sheet Template saved');
      void refreshRootTemplateQueries();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to save Root Sheet Template'));
    } finally {
      setIsSavingTemplate(false);
    }
  }

  async function importLocalRootSheetTemplates() {
    if (!localImportCandidates.length) {
      return;
    }

    setIsImportingLocalTemplates(true);
    try {
      const existingTemplatesByKey = new Map(
        Array.from(currentOrganisationRootTemplatesByKey.entries()),
      );
      const savedTemplates: RootSheetTemplate[] = [];

      for (const localTemplate of localImportCandidates) {
        const payload = getRootSheetTemplatePayload(localTemplate);
        const existing = existingTemplatesByKey.get(payload.key) ?? null;

        const savedTemplate = await api<RootSheetTemplate>(
          existing ? `/root-sheet-templates/${existing.id}` : '/root-sheet-templates',
          {
            method: existing ? 'PATCH' : 'POST',
            body: payload,
          },
        );

        existingTemplatesByKey.set(savedTemplate.key, savedTemplate);
        savedTemplates.push(savedTemplate);
      }

      mergePersistedTemplatesIntoLibrary(savedTemplates);
      setLocalImportCandidates([]);
      markLocalRootSheetTemplatesImported(
        user?.organisationId ?? null,
        window.localStorage.getItem(GENERIC_TEMPLATE_LIBRARY_STORAGE_KEY),
      );
      await refreshRootTemplateQueries();
      toast.success('Local Root Sheet Templates imported');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to import local Root Sheet Templates'));
    } finally {
      setIsImportingLocalTemplates(false);
    }
  }

  function updateDraft(updater: (current: GenericTemplateDocument) => GenericTemplateDocument) {
    setDraftTemplate((current) => {
      if (!current) {
        return current;
      }

      return normalizeGenericTemplateDocument(updater(current));
    });
    setIsDirty(true);
  }

  function updateSelectedObject(
    objectId: string,
    updater: (object: GenericTemplateObject) => GenericTemplateObject,
  ) {
    updateDraft((current) => ({
      ...current,
      objects: current.objects.map((object) => (object.id === objectId ? updater(object) : object)),
    }));
  }

  function updateSelectedObjectEditorStyle(
    updater: (style: GenericTemplateEditorStyleOverride) => GenericTemplateEditorStyleOverride,
  ) {
    if (!selectedObject) {
      return;
    }

    setObjectStyleOverrides((current) => ({
      ...current,
      [selectedObject.id]: compactEditorStyleOverride(
        getDefaultEditorStyleForObject(selectedObject),
        updater({
          ...getDefaultEditorStyleForObject(selectedObject),
          ...(current[selectedObject.id] ?? {}),
        }),
      ),
    }));
  }

  function toggleInspectorSection(section: InspectorSectionKey) {
    setInspectorSectionState((current) => ({
      ...current,
      [section]: !current[section],
    }));
  }

  function updateDraftChromeStyle(
    updater: (style: GenericTemplateChromeStyle) => GenericTemplateChromeStyle,
  ) {
    updateDraft((current) => ({
      ...current,
      chromeStyle: updater(current.chromeStyle ?? createDefaultGenericTemplateChromeStyle()),
    }));
  }

  function addObject(type: GenericTemplateObjectType) {
    if (!draftTemplate) {
      return;
    }

    const nextObject = createGenericTemplateObject({
      existingObjects: draftTemplate.objects,
      orientation: draftTemplate.orientation,
      paperSize: draftTemplate.paperSize,
      type,
    });

    updateDraft((current) => ({
      ...current,
      objects: [...current.objects, nextObject],
    }));
    setSelectedObjectId(nextObject.id);
    setIsRightRailOpen(true);
    setRightTab('inspector');
  }

  function deleteSelectedObject() {
    if (!draftTemplate || !selectedObjectId) {
      return;
    }

    updateDraft((current) => ({
      ...current,
      objects: current.objects.filter((object) => object.id !== selectedObjectId),
    }));
  }

  function updatePageSetting<K extends 'paperSize' | 'orientation' | 'presetId'>(
    key: K,
    value: GenericTemplateDocument[K],
  ) {
    if (!draftTemplate) {
      return;
    }

    updateDraft((current) => {
      if (key === 'presetId') {
        const nextPresetId = value as TemplatePresetId;
        const nextChromeDefaults = createDefaultGenericTemplateChromeStyleForDocument({
          orientation: current.orientation,
          paperSize: current.paperSize,
          presetId: nextPresetId,
        });
        const nextObjects =
          nextPresetId === 'as1100_inspired'
            ? applyAs1100TitleBlockGeometry(current.objects, current.paperSize, current.orientation)
            : current.objects;

        return {
          ...current,
          chromeStyle:
            nextPresetId === 'as1100_inspired'
              ? {
                  ...current.chromeStyle,
                  widthPx: nextChromeDefaults.widthPx,
                }
              : current.chromeStyle,
          objects: nextObjects,
          presetId: nextPresetId,
        };
      }

      const nextPaperSize = key === 'paperSize' ? (value as TemplatePaperSize) : current.paperSize;
      const nextOrientation =
        key === 'orientation' ? (value as TemplatePageOrientation) : current.orientation;
      const nextChromeDefaults = createDefaultGenericTemplateChromeStyleForDocument({
        orientation: nextOrientation,
        paperSize: nextPaperSize,
        presetId: current.presetId,
      });

      const remappedObjects = remapGenericTemplateObjectsToPage(
        current.objects,
        current.paperSize,
        current.orientation,
        nextPaperSize,
        nextOrientation,
      );
      const nextObjects =
        current.presetId === 'as1100_inspired'
          ? applyAs1100TitleBlockGeometry(remappedObjects, nextPaperSize, nextOrientation)
          : remappedObjects;
      const shouldSyncAs1100Name =
        current.presetId === 'as1100_inspired' &&
        (isBuiltInGenericTemplateId(current.id) || isDefaultAs1100TemplateName(current.name));
      const sanitizedNextObjects = shouldSyncAs1100Name
        ? sanitizeAs1100StarterObjects(nextObjects)
        : nextObjects;

      return {
        ...current,
        [key]: value,
        chromeStyle:
          current.presetId === 'as1100_inspired'
            ? {
                ...current.chromeStyle,
                widthPx: nextChromeDefaults.widthPx,
              }
            : current.chromeStyle,
        name: shouldSyncAs1100Name
          ? getAs1100TemplateDisplayName(nextPaperSize, nextOrientation)
          : current.name,
        objects: sanitizedNextObjects,
      };
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-100">
      <div className="border-b bg-white px-6 py-4">
        <PageHeader
          title="Root Sheet Templates"
          description="Generic reusable paper/layouts for reports, sketches, Project Spatial Sheets, and printable outputs across monitoring, CNVMP, piling, geotech, structural, inspections, and future modules."
          actions={
            <>
              <Button variant="outline" onClick={duplicateTemplate} disabled={!draftTemplate}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </Button>
              <Button variant="outline" onClick={createTemplate}>
                <Plus className="mr-2 h-4 w-4" />
                New Blank Root Sheet Template
              </Button>
              <Button
                onClick={saveTemplate}
                disabled={!draftTemplate || !isDirty || isSavingTemplate}
              >
                <Save className="mr-2 h-4 w-4" />
                {isSavingTemplate ? 'Saving…' : 'Save Root Sheet Template'}
              </Button>
            </>
          }
          badges={
            <>
              <Badge variant="outline">
                {savedRootSheetTemplates.length} saved Root Sheet Templates
              </Badge>
              {draftTemplate ? (
                <Badge
                  variant={getSpatialSheetCapabilityBadgeVariant(
                    draftTemplateSuitability.capability,
                  )}
                >
                  {getSpatialSheetCapabilityBadgeLabel(draftTemplateSuitability.capability)}
                </Badge>
              ) : null}
              {draftTemplate && !selectedTemplateIsPersisted ? (
                <Badge variant="secondary">Unsaved draft</Badge>
              ) : null}
              {isDirty ? (
                <Badge variant="warning">Unsaved changes</Badge>
              ) : (
                <Badge variant="success">Durable save path</Badge>
              )}
            </>
          }
        />
      </div>

      {localImportCandidates.length > 0 ? (
        <div className="border-b bg-amber-50 px-6 py-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-amber-950">
              Found {localImportCandidates.length} browser-local Root Sheet Template
              {localImportCandidates.length === 1 ? '' : 's'} from the older local store. Import
              them once so they become durable organisation records.
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => void importLocalRootSheetTemplates()}
              disabled={isImportingLocalTemplates}
            >
              {isImportingLocalTemplates ? 'Importing…' : 'Import Local Root Sheet Templates'}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 gap-3 p-3">
        <div
          className={cn(
            'shrink-0 transition-all duration-200',
            isLeftRailOpen ? 'w-[300px]' : 'w-12',
          )}
        >
          {isLeftRailOpen ? (
            <Card className="flex h-full flex-col overflow-hidden">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 border-b px-4 py-3">
                <div className="space-y-1">
                  <CardTitle className="text-base">Root Sheet Template Setup</CardTitle>
                  <CardDescription className="text-xs">
                    Saved Root Sheet Templates, AS 1100 standard sheets, page setup, and layout
                    details live here.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsLeftRailOpen(false)}
                  className="h-8 px-2 text-xs font-medium"
                >
                  <ChevronsLeft className="mr-1.5 h-4 w-4" />
                  Hide
                </Button>
              </CardHeader>
              <CardContent className="flex min-h-0 flex-1 flex-col p-4">
                <Tabs
                  value={leftTab}
                  onValueChange={(value) => setLeftTab(value as typeof leftTab)}
                  className="flex min-h-0 flex-1 flex-col"
                >
                  <TabsList className="grid h-9 w-full grid-cols-2">
                    <TabsTrigger value="page">Page</TabsTrigger>
                    <TabsTrigger value="library">Library</TabsTrigger>
                  </TabsList>
                  <TabsContent value="page" className="mt-4 flex min-h-0 flex-1 flex-col">
                    {!draftTemplate || !pageLayout || !safeArea ? (
                      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                        Open a template to edit page setup and sheet styling.
                      </div>
                    ) : (
                      <div className="min-h-0 flex-1">
                        <ScrollArea className="h-full pr-2">
                          <div className="space-y-4">
                            <SettingsSection title="Page Setup">
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label>Template Name</Label>
                                  <Input
                                    value={draftTemplate.name}
                                    onChange={(event) =>
                                      updateDraft((current) => ({
                                        ...current,
                                        name: event.target.value,
                                      }))
                                    }
                                  />
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <div className="space-y-2">
                                    <Label>Paper Size</Label>
                                    <Select
                                      value={draftTemplate.paperSize}
                                      onValueChange={(value) =>
                                        updatePageSetting('paperSize', value as TemplatePaperSize)
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {TEMPLATE_PAPER_SIZE_OPTIONS.map((option) => (
                                          <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Orientation</Label>
                                    <Select
                                      value={draftTemplate.orientation}
                                      onValueChange={(value) =>
                                        updatePageSetting(
                                          'orientation',
                                          value as TemplatePageOrientation,
                                        )
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {TEMPLATE_PAGE_ORIENTATION_OPTIONS.map((option) => (
                                          <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label>Preset</Label>
                                  <Select
                                    value={draftTemplate.presetId}
                                    onValueChange={(value) =>
                                      updatePageSetting('presetId', value as TemplatePresetId)
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {TEMPLATE_PRESET_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                          {option.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </SettingsSection>

                            <SettingsSection title="Sheet Metrics">
                              <div className="space-y-4">
                                <DefinitionList
                                  items={[
                                    {
                                      label: 'Page',
                                      value: `${pageLayout.sizeLabel} ${pageLayout.orientationLabel} · ${pageLayout.widthMm} x ${pageLayout.heightMm} mm`,
                                    },
                                    {
                                      label: 'Safe Area',
                                      value: `${safeArea.width} x ${safeArea.height} mm`,
                                    },
                                    {
                                      label: 'Safe Offsets',
                                      value: `X ${safeArea.x} mm · Y ${safeArea.y} mm`,
                                    },
                                    ...(as1100TitleBlockSpec
                                      ? [
                                          {
                                            label: 'Title Block',
                                            value: `${as1100TitleBlockSpec.widthMm} x ${as1100TitleBlockSpec.heightMm} mm`,
                                          },
                                        ]
                                      : []),
                                  ]}
                                />
                                {as1100FrameSpec ? (
                                  <DefinitionGroup
                                    title="AS Frame"
                                    items={[
                                      {
                                        label: 'Dimensions',
                                        value: `${as1100FrameSpec.frameWidthMm} x ${as1100FrameSpec.frameHeightMm} mm`,
                                      },
                                      {
                                        label: 'Margins',
                                        value: `L ${as1100FrameSpec.bandLeftMm} · T ${as1100FrameSpec.bandTopMm} · R ${as1100FrameSpec.bandRightMm} · B ${as1100FrameSpec.bandBottomMm} mm`,
                                      },
                                    ]}
                                  />
                                ) : null}
                                {as1100GridSpec ? (
                                  <DefinitionGroup
                                    title="AS Grid"
                                    items={[
                                      {
                                        label: 'Bands',
                                        value: `${as1100GridSpec.columnCount} columns x ${as1100GridSpec.rowCount} rows`,
                                      },
                                      {
                                        label: 'Reference',
                                        value: 'Figure 2.5 layout bands',
                                      },
                                    ]}
                                  />
                                ) : null}
                                {draftTemplate.presetId === 'as1100_inspired' ? (
                                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950">
                                    AS 1100-inspired sizing remains evidence-led from Figure 2.2,
                                    Figure 2.5, and Figure 2.9 only.
                                  </div>
                                ) : null}
                              </div>
                            </SettingsSection>

                            <SettingsSection title="Spatial Sheet Suitability">
                              <div className="space-y-3">
                                <div className="flex flex-wrap gap-2">
                                  <Badge
                                    variant={getSpatialSheetCapabilityBadgeVariant(
                                      draftTemplateSuitability.capability,
                                    )}
                                  >
                                    {getSpatialSheetCapabilityBadgeLabel(
                                      draftTemplateSuitability.capability,
                                    )}
                                  </Badge>
                                  <Badge variant="outline">
                                    {draftTemplateSuitability.mapFrameCount} Map Frame
                                    {draftTemplateSuitability.mapFrameCount === 1 ? '' : 's'}
                                  </Badge>
                                  <Badge variant="outline">
                                    {draftTemplateSuitability.imageFrameCount} Image Frame
                                    {draftTemplateSuitability.imageFrameCount === 1 ? '' : 's'}
                                  </Badge>
                                  {draftTemplateSuitability.primaryMapFrame ? (
                                    <Badge variant="outline">
                                      Primary Map Frame uses{' '}
                                      {Math.round(
                                        draftTemplateSuitability.primaryMapFrameCoverageRatio * 100,
                                      )}
                                      % of safe area
                                    </Badge>
                                  ) : null}
                                  {draftTemplateSuitability.largestReferenceImageFrame ? (
                                    <Badge variant="outline">
                                      Largest reference frame uses{' '}
                                      {Math.round(
                                        draftTemplateSuitability.largestReferenceImageFrameCoverageRatio *
                                          100,
                                      )}
                                      % of safe area
                                    </Badge>
                                  ) : null}
                                </div>
                                <div className="rounded-lg border bg-muted/30 px-3 py-3 text-sm text-muted-foreground">
                                  {draftTemplateSuitability.hasMapFrame ? (
                                    <div className="space-y-1">
                                      <p>
                                        Map Frame blocks are the only blocks that auto-fill from a
                                        Project Spatial View. Image Frame blocks stay manual
                                        reference placeholders.
                                      </p>
                                      <p>
                                        The largest visible Map Frame is treated as the primary map
                                        frame for Project Spatial Sheets and Report Annexures.
                                      </p>
                                    </div>
                                  ) : (
                                    <p>
                                      This Root Sheet Template is currently general-purpose only.
                                      Add a Map Frame before using it for a Project Spatial Sheet or
                                      Report Annexure.
                                    </p>
                                  )}
                                </div>
                                {draftTemplateSuitability.warnings.length > 0 ? (
                                  <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950">
                                    {draftTemplateSuitability.warnings.map((warning) => (
                                      <div key={warning}>{warning}</div>
                                    ))}
                                  </div>
                                ) : null}
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => addObject('mapFrame')}
                                  >
                                    <MapIcon className="mr-2 h-4 w-4" />
                                    Add Map Frame
                                  </Button>
                                </div>
                              </div>
                            </SettingsSection>

                            <SettingsSection title="Sheet Chrome" isLast>
                              <div className="space-y-4">
                                <label className="flex items-center gap-2 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={draftTemplate.chromeStyle.visible}
                                    onChange={(event) =>
                                      updateDraftChromeStyle((current) => ({
                                        ...current,
                                        visible: event.target.checked,
                                      }))
                                    }
                                  />
                                  Show sheet chrome
                                </label>
                                <FieldRow label="Line Width">
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      step="0.25"
                                      value={draftTemplate.chromeStyle.widthPx}
                                      onChange={(event) =>
                                        updateDraftChromeStyle((current) => ({
                                          ...current,
                                          widthPx: parseNumericValue(
                                            event.target.value,
                                            current.widthPx,
                                          ),
                                        }))
                                      }
                                    />
                                    <span className="text-xs text-muted-foreground">px</span>
                                  </div>
                                </FieldRow>
                                <ColorFieldRow
                                  color={draftTemplate.chromeStyle.color}
                                  label="Line Color"
                                  onChange={(value) =>
                                    updateDraftChromeStyle((current) => ({
                                      ...current,
                                      color: value,
                                    }))
                                  }
                                />
                              </div>
                            </SettingsSection>
                          </div>
                        </ScrollArea>
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="library" className="mt-4 flex min-h-0 flex-1 flex-col">
                    <div className="min-h-0 flex-1">
                      <ScrollArea className="h-full pr-2">
                        <div className="space-y-6">
                          <section className="space-y-3">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <div className="text-sm font-semibold text-slate-900">
                                    AS 1100 Standard Sheets
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    Built-in A4-A0 landscape standards based on AS 1100.101. Load
                                    them into the durable library when you want them available
                                    across reports and modules.
                                  </p>
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    void loadAs1100StandardTemplates(
                                      missingAs1100StandardTemplateEntries.map(
                                        (entry) => entry.template,
                                      ),
                                    )
                                  }
                                  disabled={
                                    isLoadingAs1100Templates ||
                                    !missingAs1100StandardTemplateEntries.length
                                  }
                                >
                                  <Plus className="mr-2 h-4 w-4" />
                                  {isLoadingAs1100Templates
                                    ? 'Loading AS 1100 Standards…'
                                    : missingAs1100StandardTemplateEntries.length
                                      ? 'Load Missing AS 1100 Standards'
                                      : 'All AS 1100 Standards Loaded'}
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-3">
                              {as1100StandardTemplateEntries.map((entry) => {
                                const isLoaded = Boolean(
                                  entry.persistedRecord && !entry.persistedRecord.archivedAt,
                                );
                                const isArchived = Boolean(entry.persistedRecord?.archivedAt);
                                const persistedRecord = entry.persistedRecord;

                                return (
                                  <div
                                    key={entry.template.id}
                                    className="rounded-lg border bg-slate-50 p-3"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <div className="font-medium text-slate-900">
                                          {formatOperatorFacingSheetLabel(entry.template.name)}
                                        </div>
                                        <div className="mt-1 text-xs text-muted-foreground">
                                          {entry.template.paperSize.toUpperCase()} landscape
                                          standard with AS 1100 inspired title block geometry.
                                        </div>
                                      </div>
                                      <div className="flex flex-wrap gap-2">
                                        <Badge variant="outline">AS 1100.101</Badge>
                                        <Badge variant="secondary">
                                          {entry.template.paperSize.toUpperCase()}
                                        </Badge>
                                        <Badge
                                          variant={
                                            isLoaded
                                              ? 'success'
                                              : isArchived
                                                ? 'warning'
                                                : 'outline'
                                          }
                                        >
                                          {isLoaded
                                            ? 'Loaded'
                                            : isArchived
                                              ? 'Archived'
                                              : 'Not loaded'}
                                        </Badge>
                                      </div>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                      {isLoaded && persistedRecord ? (
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          onClick={() =>
                                            openPersistedTemplateRecord(persistedRecord)
                                          }
                                        >
                                          Open Loaded Template
                                        </Button>
                                      ) : (
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          onClick={() =>
                                            void loadAs1100StandardTemplates([entry.template])
                                          }
                                          disabled={isLoadingAs1100Templates}
                                        >
                                          <Plus className="mr-2 h-4 w-4" />
                                          {isArchived ? 'Restore To Library' : 'Load To Library'}
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </section>

                          {!selectedTemplateIsPersisted && draftTemplate ? (
                            <section className="space-y-3">
                              <div className="space-y-1">
                                <div className="text-sm font-semibold text-slate-900">
                                  Current Draft
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  This draft is not part of the saved Root Sheet Template library
                                  until you save it.
                                </p>
                              </div>
                              <div className="rounded-lg border border-sky-200 bg-sky-50 p-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="font-medium text-sky-950">
                                      {formatOperatorFacingSheetLabel(draftTemplate.name)}
                                    </div>
                                    <div className="mt-1 text-xs text-sky-900/80">
                                      Blank or custom draft
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    <Badge variant="secondary">Unsaved draft</Badge>
                                    <Badge
                                      variant={getSpatialSheetCapabilityBadgeVariant(
                                        draftTemplateSuitability.capability,
                                      )}
                                    >
                                      {getSpatialSheetCapabilityBadgeLabel(
                                        draftTemplateSuitability.capability,
                                      )}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </section>
                          ) : null}

                          <section className="space-y-3">
                            <div className="space-y-1">
                              <div className="text-sm font-semibold text-slate-900">
                                Saved Root Sheet Templates
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Durable generic reusable paper/layouts available across modules and
                                reports.
                              </p>
                            </div>
                            {!savedRootSheetTemplates.length ? (
                              <EmptyState
                                icon={<Layers className="h-10 w-10" />}
                                title="No saved Root Sheet Templates yet"
                                description="Create a blank draft or load one of the AS 1100 standard sheets, then save it to add it to the durable library."
                                action={
                                  <Button onClick={createTemplate}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create Blank Draft
                                  </Button>
                                }
                              />
                            ) : (
                              <div className="space-y-3">
                                {savedRootSheetTemplates.map((template) => {
                                  const templateSuitability =
                                    assessRootSheetTemplateSuitability(template);

                                  return (
                                    <div
                                      key={template.id}
                                      role="button"
                                      tabIndex={0}
                                      onClick={() => openTemplate(template.id)}
                                      onKeyDown={(event) => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                          event.preventDefault();
                                          openTemplate(template.id);
                                        }
                                      }}
                                      className={cn(
                                        'w-full rounded-lg border p-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2',
                                        template.id === selectedTemplateId
                                          ? 'border-sky-500 bg-sky-50'
                                          : 'hover:border-slate-300 hover:bg-slate-50',
                                      )}
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div>
                                          <div className="font-medium text-slate-900">
                                            {formatOperatorFacingSheetLabel(template.name)}
                                          </div>
                                          <div className="mt-1 text-xs text-muted-foreground">
                                            Updated {new Date(template.updatedAt).toLocaleString()}
                                          </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                          <Badge
                                            variant={getSpatialSheetCapabilityBadgeVariant(
                                              templateSuitability.capability,
                                            )}
                                          >
                                            {getSpatialSheetCapabilityBadgeLabel(
                                              templateSuitability.capability,
                                            )}
                                          </Badge>
                                          <Badge variant="outline">
                                            {template.presetId.replace('_', ' ')}
                                          </Badge>
                                        </div>
                                      </div>
                                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                        <Badge variant="secondary">
                                          {template.paperSize.toUpperCase()}
                                        </Badge>
                                        <Badge variant="secondary">{template.orientation}</Badge>
                                        <Badge variant="secondary">
                                          {template.objects.length} objects
                                        </Badge>
                                      </div>
                                      <div className="mt-3 flex gap-2">
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            openTemplate(template.id);
                                          }}
                                        >
                                          Edit
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            deleteTemplateById(template.id);
                                          }}
                                        >
                                          <Trash2 className="mr-1 h-3.5 w-3.5" />
                                          Delete
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </section>
                        </div>
                      </ScrollArea>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <CollapsedRail label="Setup" onExpand={() => setIsLeftRailOpen(true)} side="left" />
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          {!draftTemplate || !pageLayout ? (
            <EmptyState
              icon={<Layers className="h-12 w-12" />}
              title="Select or create a Root Sheet Template"
              description="Choose a saved Root Sheet Template or create a blank draft to open the shared canvas editor."
              action={
                <Button onClick={createTemplate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Blank Draft
                </Button>
              }
            />
          ) : (
            <Card className="flex h-full min-h-0 flex-col overflow-hidden">
              <CardHeader className="border-b bg-white px-4 py-3">
                <div className="flex flex-col gap-2 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">Canvas Editor</CardTitle>
                    <CardDescription className="text-xs">
                      Keep the sheet in view and open the setup or inspector only when you need
                      them.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <div className="flex flex-wrap items-center gap-1 rounded-md bg-muted/40 px-2 py-1">
                      <span className="pr-1 text-[11px] font-medium text-muted-foreground">
                        View
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        className={cn(
                          'h-6 rounded border border-input bg-background px-2 py-0 text-[11px] font-medium hover:bg-accent',
                          !isPreviewMode && 'border-sky-300 bg-sky-50 text-sky-900',
                        )}
                        onClick={() => setIsPreviewMode(false)}
                      >
                        <PencilLine className="mr-1 h-3 w-3" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className={cn(
                          'h-6 rounded border border-input bg-background px-2 py-0 text-[11px] font-medium hover:bg-accent',
                          isPreviewMode && 'border-sky-300 bg-sky-50 text-sky-900',
                        )}
                        onClick={() => setIsPreviewMode(true)}
                      >
                        <Eye className="mr-1 h-3 w-3" />
                        Preview
                      </Button>
                    </div>
                    {!isPreviewMode ? (
                      <>
                        <div className="flex flex-wrap items-center gap-1 rounded-md bg-muted/40 px-2 py-1">
                          <span className="pr-1 text-[11px] font-medium text-muted-foreground">
                            Panels
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-6 rounded border border-input bg-background px-2 py-0 text-[11px] font-medium hover:bg-accent"
                            onClick={() => {
                              setIsLeftRailOpen((current) => !current);
                              setLeftTab('page');
                            }}
                          >
                            {isLeftRailOpen ? 'Hide Setup' : 'Show Setup'}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-6 rounded border border-input bg-background px-2 py-0 text-[11px] font-medium hover:bg-accent"
                            onClick={() => {
                              setIsRightRailOpen((current) => !current);
                              setRightTab('inspector');
                            }}
                          >
                            {isRightRailOpen ? 'Hide Inspector' : 'Show Inspector'}
                          </Button>
                        </div>
                        <div className="flex flex-wrap items-center gap-1 rounded-md bg-muted/40 px-2 py-1">
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-6 rounded border border-sky-300 bg-sky-50 px-2 py-0 text-[11px] font-medium text-sky-900 hover:bg-sky-100"
                            onClick={() => addObject('mapFrame')}
                          >
                            <MapIcon className="mr-1 h-3 w-3" />
                            Add Map Frame
                          </Button>
                          <span className="pr-1 text-[11px] font-medium text-muted-foreground">
                            Add Block
                          </span>
                          {OBJECT_CREATE_OPTIONS.map((option) => (
                            <Button
                              key={option.type}
                              type="button"
                              variant="ghost"
                              className="h-6 rounded border border-input bg-background px-2 py-0 text-[11px] font-medium hover:bg-accent"
                              onClick={() => addObject(option.type)}
                            >
                              <Plus className="mr-1 h-3 w-3" />
                              {getGenericTemplateObjectLabel(option.type)}
                            </Button>
                          ))}
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent
                className={cn(
                  'flex min-h-0 flex-1 flex-col gap-3 p-3 transition-colors duration-200',
                  isPreviewMode ? 'bg-white' : 'bg-slate-100/70',
                )}
              >
                <div
                  className={cn(
                    'flex flex-wrap items-center gap-2 rounded-xl border bg-white px-2.5 py-2',
                    isPreviewMode ? 'justify-end' : 'justify-between',
                  )}
                >
                  {!isPreviewMode ? (
                    <div className="flex flex-wrap gap-2">
                      <MutedPill>
                        {pageLayout.sizeLabel} {pageLayout.orientationLabel}
                      </MutedPill>
                      <MutedPill>
                        {pageLayout.widthMm} x {pageLayout.heightMm} mm
                      </MutedPill>
                      <MutedPill>Zoom {formatZoomLabel(zoomScale)}</MutedPill>
                    </div>
                  ) : null}
                  <div className="inline-flex overflow-hidden rounded-md border border-input bg-background divide-x divide-input">
                    <ToolbarButton
                      label="Zoom Out"
                      onClick={() =>
                        setZoomScale((current) => getNextTemplateCanvasZoom(current, 'out'))
                      }
                      icon={<ZoomOut className="mr-1.5 h-3.5 w-3.5" />}
                    />
                    <ToolbarButton
                      label="Zoom In"
                      onClick={() =>
                        setZoomScale((current) => getNextTemplateCanvasZoom(current, 'in'))
                      }
                      icon={<ZoomIn className="mr-1.5 h-3.5 w-3.5" />}
                    />
                    <ToolbarButton label="100%" onClick={() => setZoomScale(1)} />
                    <ToolbarButton
                      label="Fit"
                      onClick={() =>
                        fitCanvasToViewport(canvasViewportRef.current, pageLayout, setZoomScale)
                      }
                      icon={<Maximize2 className="mr-1.5 h-3.5 w-3.5" />}
                    />
                  </div>
                </div>

                <div
                  ref={canvasViewportRef}
                  className={cn(
                    'relative min-h-0 flex-1 overflow-auto rounded-2xl border transition-colors duration-200',
                    isPreviewMode ? 'bg-white' : 'bg-slate-200/80',
                  )}
                >
                  <div
                    className={cn(
                      'flex min-h-full min-w-full items-start justify-center transition-all duration-200',
                      isPreviewMode ? 'p-3' : 'p-5',
                    )}
                  >
                    <div
                      style={{
                        height: `${pageLayout.heightPx * zoomScale}px`,
                        width: `${pageLayout.widthPx * zoomScale}px`,
                      }}
                    >
                      <div
                        style={{
                          transform: `scale(${zoomScale})`,
                          transformOrigin: 'top left',
                        }}
                      >
                        <GenericTemplateSheet
                          objectStyleOverrides={objectStyleOverrides}
                          onObjectGeometryChange={
                            isPreviewMode
                              ? undefined
                              : (objectId, geometry) =>
                                  updateSelectedObject(objectId, (object) => ({
                                    ...object,
                                    ...geometry,
                                  }))
                          }
                          onSelectObject={
                            isPreviewMode
                              ? undefined
                              : (objectId) => {
                                  setSelectedObjectId(objectId);
                                  setIsRightRailOpen(true);
                                  setRightTab('inspector');
                                }
                          }
                          previewMode={isPreviewMode}
                          selectedObjectId={selectedObjectId}
                          template={draftTemplate}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div
          className={cn(
            'shrink-0 transition-all duration-200',
            isRightRailOpen ? 'w-[320px]' : 'w-12',
          )}
        >
          {isRightRailOpen ? (
            <Card className="flex h-full flex-col overflow-hidden">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 border-b px-4 py-3">
                <div className="space-y-1">
                  <CardTitle className="text-base">Inspector</CardTitle>
                  <CardDescription className="text-xs">
                    Objects, geometry, typography, and border styling stay grouped here.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsRightRailOpen(false)}
                  className="h-8 px-2 text-xs font-medium"
                >
                  <ChevronsRight className="mr-1.5 h-4 w-4" />
                  Hide
                </Button>
              </CardHeader>
              <CardContent className="flex min-h-0 flex-1 flex-col p-4">
                <Tabs
                  value={rightTab}
                  onValueChange={(value) => setRightTab(value as typeof rightTab)}
                  className="flex min-h-0 flex-1 flex-col"
                >
                  <TabsList className="grid h-9 w-full grid-cols-2">
                    <TabsTrigger value="objects">Objects</TabsTrigger>
                    <TabsTrigger value="inspector">Inspector</TabsTrigger>
                  </TabsList>
                  <TabsContent value="objects" className="mt-4 flex min-h-0 flex-1 flex-col">
                    {!draftTemplate ? (
                      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                        Open a template to inspect and edit objects.
                      </div>
                    ) : (
                      <div className="min-h-0 flex-1">
                        <ScrollArea className="h-full pr-2">
                          <div className="space-y-2">
                            {draftTemplate.objects.map((object) => (
                              <button
                                key={object.id}
                                type="button"
                                onClick={() => {
                                  setSelectedObjectId(object.id);
                                  setRightTab('inspector');
                                }}
                                className={cn(
                                  'w-full rounded-lg border p-3 text-left transition-colors',
                                  object.id === selectedObjectId
                                    ? 'border-sky-500 bg-sky-50'
                                    : 'hover:border-slate-300 hover:bg-slate-50',
                                )}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="font-medium text-slate-900">{object.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {getGenericTemplateObjectLabel(object.type)}
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {object.type === 'mapFrame' ? (
                                      <Badge
                                        variant={
                                          object.id === draftTemplateSuitability.primaryMapFrame?.id
                                            ? 'success'
                                            : 'outline'
                                        }
                                      >
                                        {object.id === draftTemplateSuitability.primaryMapFrame?.id
                                          ? 'Primary Map Frame'
                                          : 'Secondary Map Frame'}
                                      </Badge>
                                    ) : object.type === 'imageFrame' ? (
                                      <>
                                        <Badge variant="warning">Reference only</Badge>
                                        {object.id ===
                                        draftTemplateSuitability.largestReferenceImageFrame?.id ? (
                                          <Badge variant="secondary">Largest reference</Badge>
                                        ) : null}
                                      </>
                                    ) : null}
                                    <Badge variant={object.visible ? 'outline' : 'secondary'}>
                                      {object.visible ? 'Visible' : 'Hidden'}
                                    </Badge>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="inspector" className="mt-4 flex min-h-0 flex-1 flex-col">
                    {!draftTemplate || !selectedObject ? (
                      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                        Select an object to edit its fields.
                      </div>
                    ) : (
                      <div className="min-h-0 flex-1">
                        <ScrollArea className="h-full pr-2">
                          <div className="rounded-xl border bg-white p-4">
                            <InspectorPanelSection title="General">
                              <InspectorFieldRow label="Object Name">
                                <Input
                                  value={selectedObject.name}
                                  onChange={(event) =>
                                    updateSelectedObject(selectedObject.id, (object) => ({
                                      ...object,
                                      name: event.target.value,
                                    }))
                                  }
                                />
                              </InspectorFieldRow>
                              <InspectorCheckboxRow
                                checked={selectedObject.visible}
                                label="Visible"
                                onChange={(checked) =>
                                  updateSelectedObject(selectedObject.id, (object) => ({
                                    ...object,
                                    visible: checked,
                                  }))
                                }
                              />
                              <InspectorCheckboxRow
                                checked={selectedObject.locked}
                                label="Locked"
                                onChange={(checked) =>
                                  updateSelectedObject(selectedObject.id, (object) => ({
                                    ...object,
                                    locked: checked,
                                  }))
                                }
                              />
                            </InspectorPanelSection>

                            <InspectorPanelSection title="Geometry">
                              {(
                                [
                                  ['x', 'X'],
                                  ['y', 'Y'],
                                  ['width', 'Width'],
                                  ['height', 'Height'],
                                ] as const
                              ).map(([field, label]) => (
                                <InspectorFieldRow key={field} label={label}>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      value={selectedObject[field]}
                                      onChange={(event) =>
                                        updateSelectedObject(selectedObject.id, (object) => ({
                                          ...object,
                                          [field]: parseNumericValue(
                                            event.target.value,
                                            object[field],
                                          ),
                                        }))
                                      }
                                    />
                                    <span className="text-xs text-muted-foreground">mm</span>
                                  </div>
                                </InspectorFieldRow>
                              ))}
                            </InspectorPanelSection>

                            {selectedObject.type !== 'imageFrame' &&
                            selectedObject.type !== 'mapFrame' &&
                            selectedObjectStyle ? (
                              <CollapsibleInspectorPanelSection
                                isOpen={inspectorSectionState.typography}
                                onToggle={() => toggleInspectorSection('typography')}
                                title="Typography"
                              >
                                <InspectorFieldRow label="Font Family">
                                  <Select
                                    value={selectedObjectStyle.fontFamily}
                                    onValueChange={(value) =>
                                      updateSelectedObjectEditorStyle((current) => ({
                                        ...current,
                                        fontFamily: value as GenericTemplateFontChoice,
                                      }))
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {TEMPLATE_FONT_FAMILY_OPTIONS.map((option) => (
                                        <SelectItem key={option} value={option}>
                                          {option}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </InspectorFieldRow>
                                <InspectorFieldRow label="Font Size">
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      value={selectedObjectStyle.fontSizePx ?? 10}
                                      onChange={(event) =>
                                        updateSelectedObjectEditorStyle((current) => ({
                                          ...current,
                                          fontSizePx: parseNumericValue(
                                            event.target.value,
                                            current.fontSizePx ?? 10,
                                          ),
                                        }))
                                      }
                                    />
                                    <span className="text-xs text-muted-foreground">px</span>
                                  </div>
                                </InspectorFieldRow>
                                <InspectorFieldRow label="Font Weight">
                                  <Select
                                    value={String(selectedObjectStyle.fontWeight ?? 400)}
                                    onValueChange={(value) =>
                                      updateSelectedObjectEditorStyle((current) => ({
                                        ...current,
                                        fontWeight: Number(value),
                                      }))
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {TEMPLATE_FONT_WEIGHT_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={String(option.value)}>
                                          {option.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </InspectorFieldRow>
                                <ColorFieldRow
                                  color={selectedObjectStyle.textColor ?? '#0f172a'}
                                  label="Text Color"
                                  onChange={(value) =>
                                    updateSelectedObjectEditorStyle((current) => ({
                                      ...current,
                                      textColor: value,
                                    }))
                                  }
                                />
                                <InspectorFieldRow label="Text Align">
                                  <div className="inline-flex overflow-hidden rounded-md border border-input bg-background">
                                    {TEMPLATE_TEXT_ALIGN_OPTIONS.map((option) => (
                                      <button
                                        key={option}
                                        type="button"
                                        className={cn(
                                          'border-r border-input px-3 py-2 text-xs font-medium last:border-r-0',
                                          (selectedObjectStyle.textAlign ?? 'left') === option
                                            ? 'bg-accent text-accent-foreground'
                                            : 'text-foreground hover:bg-accent',
                                        )}
                                        onClick={() =>
                                          updateSelectedObjectEditorStyle((current) => ({
                                            ...current,
                                            textAlign: option,
                                          }))
                                        }
                                      >
                                        {titleCase(option)}
                                      </button>
                                    ))}
                                  </div>
                                </InspectorFieldRow>
                              </CollapsibleInspectorPanelSection>
                            ) : null}

                            {selectedObjectStyle ? (
                              <CollapsibleInspectorPanelSection
                                isOpen={inspectorSectionState.border}
                                onToggle={() => toggleInspectorSection('border')}
                                title="Border"
                              >
                                <InspectorFieldRow label="Line Weight">
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      value={selectedObjectStyle.lineWeightPx ?? 1}
                                      onChange={(event) =>
                                        updateSelectedObjectEditorStyle((current) => ({
                                          ...current,
                                          lineWeightPx: parseNumericValue(
                                            event.target.value,
                                            current.lineWeightPx ?? 1,
                                          ),
                                        }))
                                      }
                                    />
                                    <span className="text-xs text-muted-foreground">px</span>
                                  </div>
                                </InspectorFieldRow>
                                <ColorFieldRow
                                  color={selectedObjectStyle.lineColor ?? '#0f172a'}
                                  label="Line Color"
                                  onChange={(value) =>
                                    updateSelectedObjectEditorStyle((current) => ({
                                      ...current,
                                      lineColor: value,
                                    }))
                                  }
                                />
                                <InspectorFieldRow label="Line Style">
                                  <Select
                                    value={selectedObjectStyle.linePattern ?? 'solid'}
                                    onValueChange={(value) =>
                                      updateSelectedObjectEditorStyle((current) => ({
                                        ...current,
                                        linePattern: value as GenericTemplateBorderPattern,
                                      }))
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {TEMPLATE_BORDER_PATTERN_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                          {option.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </InspectorFieldRow>
                                <InspectorCheckboxRow
                                  checked={selectedObjectStyle.showBorder ?? true}
                                  label="Show Border"
                                  onChange={(checked) =>
                                    updateSelectedObjectEditorStyle((current) => ({
                                      ...current,
                                      showBorder: checked,
                                    }))
                                  }
                                />
                              </CollapsibleInspectorPanelSection>
                            ) : null}

                            <InspectorPanelSection title="Content">
                              <TypeSpecificObjectFields
                                object={selectedObject}
                                onUpdate={(updater) =>
                                  updateSelectedObject(selectedObject.id, updater)
                                }
                              />
                            </InspectorPanelSection>

                            <div className="mt-4 border-t pt-4">
                              <Button variant="outline" onClick={deleteSelectedObject}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Object
                              </Button>
                            </div>
                          </div>
                        </ScrollArea>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <CollapsedRail label="Inspect" onExpand={() => setIsRightRailOpen(true)} side="right" />
          )}
        </div>
      </div>
    </div>
  );
}

function TypeSpecificObjectFields({
  object,
  onUpdate,
}: {
  object: GenericTemplateObject;
  onUpdate: (updater: (object: GenericTemplateObject) => GenericTemplateObject) => void;
}) {
  if (object.type === 'titleBlock') {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Sheet Title</Label>
          <Input
            value={object.title ?? ''}
            onChange={(event) => onUpdate((current) => ({ ...current, title: event.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Subtitle / Drawing Purpose</Label>
          <Textarea
            value={object.subtitle ?? ''}
            onChange={(event) =>
              onUpdate((current) => ({ ...current, subtitle: event.target.value }))
            }
          />
        </div>
        <div className="space-y-2">
          <Label>Project Name / Design Authority</Label>
          <Input
            value={object.projectName ?? ''}
            onChange={(event) =>
              onUpdate((current) => ({ ...current, projectName: event.target.value }))
            }
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Project Address</Label>
            <Input
              value={object.projectAddress ?? ''}
              onChange={(event) =>
                onUpdate((current) => ({ ...current, projectAddress: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Project Code</Label>
            <Input
              value={object.projectCode ?? ''}
              onChange={(event) =>
                onUpdate((current) => ({ ...current, projectCode: event.target.value }))
              }
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Sheet Number</Label>
          <Input
            value={object.sheetNumber ?? ''}
            onChange={(event) =>
              onUpdate((current) => ({ ...current, sheetNumber: event.target.value }))
            }
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Prepared By</Label>
            <Input
              value={object.preparedBy ?? ''}
              onChange={(event) =>
                onUpdate((current) => ({ ...current, preparedBy: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Checked By</Label>
            <Input
              value={object.checkedBy ?? ''}
              onChange={(event) =>
                onUpdate((current) => ({ ...current, checkedBy: event.target.value }))
              }
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Revision</Label>
            <Input
              value={object.revision ?? ''}
              onChange={(event) =>
                onUpdate((current) => ({ ...current, revision: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Scale</Label>
            <Input
              value={object.scaleLabel ?? ''}
              onChange={(event) =>
                onUpdate((current) => ({ ...current, scaleLabel: event.target.value }))
              }
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Generated / Issue Date</Label>
          <Input
            value={object.generatedAtLabel ?? ''}
            onChange={(event) =>
              onUpdate((current) => ({ ...current, generatedAtLabel: event.target.value }))
            }
          />
        </div>
      </div>
    );
  }

  if (object.type === 'textBlock') {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Heading</Label>
          <Input
            value={object.title ?? ''}
            onChange={(event) => onUpdate((current) => ({ ...current, title: event.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Body</Label>
          <Textarea
            value={object.body ?? ''}
            onChange={(event) => onUpdate((current) => ({ ...current, body: event.target.value }))}
            rows={6}
          />
        </div>
      </div>
    );
  }

  if (object.type === 'detailsBlock') {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Heading</Label>
          <Input
            value={object.title ?? ''}
            onChange={(event) => onUpdate((current) => ({ ...current, title: event.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Rows</Label>
          <Textarea
            value={formatDetailsRows(object.rows ?? [])}
            onChange={(event) =>
              onUpdate((current) => ({
                ...current,
                rows: parseDetailsRows(event.target.value),
              }))
            }
            rows={8}
          />
          <div className="text-xs text-muted-foreground">
            Use one row per line in the format `Label: Value`.
          </div>
        </div>
      </div>
    );
  }

  if (object.type === 'imageFrame') {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-950">
          Reference image only. This block will not auto-fill from a Project Spatial View.
        </div>
        <div className="space-y-2">
          <Label>Heading</Label>
          <Input
            value={object.title ?? ''}
            onChange={(event) => onUpdate((current) => ({ ...current, title: event.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Image URL</Label>
          <Input
            value={object.imageUrl ?? ''}
            onChange={(event) =>
              onUpdate((current) => ({ ...current, imageUrl: event.target.value }))
            }
            placeholder="https://example.com/image.png"
          />
        </div>
        <div className="space-y-2">
          <Label>Caption</Label>
          <Textarea
            value={object.caption ?? ''}
            onChange={(event) =>
              onUpdate((current) => ({ ...current, caption: event.target.value }))
            }
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <Label>Fit Mode</Label>
          <Select
            value={object.fitMode ?? 'contain'}
            onValueChange={(value) =>
              onUpdate((current) => ({
                ...current,
                fitMode: value === 'cover' ? 'cover' : 'contain',
              }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="contain">Contain</SelectItem>
              <SelectItem value="cover">Cover</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  if (object.type === 'mapFrame') {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-3 text-xs text-sky-950">
          This is the actual map-bearing block. Spatial Sheets and Report Annexures place the chosen
          Project Spatial View here.
        </div>
        <div className="space-y-2">
          <Label>Heading</Label>
          <Input
            value={object.title ?? ''}
            onChange={(event) => onUpdate((current) => ({ ...current, title: event.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Fit Mode</Label>
          <Select
            value={object.mapFitMode ?? 'fit'}
            onValueChange={(value) =>
              onUpdate((current) => ({
                ...current,
                mapFitMode: value === 'fill' ? 'fill' : 'fit',
              }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fit">Fit / contain</SelectItem>
              <SelectItem value="fill">Fill / crop</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  return null;
}

function SettingsSection({
  children,
  isLast = false,
  title,
}: {
  children: React.ReactNode;
  isLast?: boolean;
  title: string;
}) {
  return (
    <section className={cn('space-y-4 pb-4', !isLast && 'border-b')}>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      {children}
    </section>
  );
}

function DefinitionGroup({
  items,
  title,
}: {
  items: Array<{ label: string; value: string }>;
  title: string;
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <DefinitionList items={items} />
    </div>
  );
}

function DefinitionList({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <dl className="space-y-2">
      {items.map((item) => (
        <div
          key={`${item.label}-${item.value}`}
          className="grid grid-cols-[110px_minmax(0,1fr)] gap-3 text-sm"
        >
          <dt className="text-xs text-muted-foreground">{item.label}</dt>
          <dd className="font-medium text-slate-900">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function FieldRow({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div>{children}</div>
    </div>
  );
}

function ColorFieldRow({
  color,
  label,
  onChange,
}: {
  color: string;
  label: string;
  onChange: (value: string) => void;
}) {
  return (
    <FieldRow label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          className="h-9 w-12 rounded-md border border-input bg-background p-1"
          value={color}
          onChange={(event) => onChange(event.target.value)}
        />
        <Input value={color.toUpperCase()} readOnly className="flex-1 font-mono text-xs" />
      </div>
    </FieldRow>
  );
}

function ToolbarButton({
  icon,
  label,
  onClick,
}: {
  icon?: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="inline-flex items-center bg-background px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-accent"
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}

function MutedPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
      {children}
    </span>
  );
}

function InspectorPanelSection({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className="mt-3 border-t pt-3 first:mt-0 first:border-t-0 first:pt-0">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function CollapsibleInspectorPanelSection({
  children,
  isOpen,
  onToggle,
  title,
}: {
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  title: string;
}) {
  return (
    <section className="mt-3 border-t pt-3">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left"
        onClick={onToggle}
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {isOpen ? <div className="mt-3 space-y-3">{children}</div> : null}
    </section>
  );
}

function InspectorFieldRow({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function InspectorCheckboxRow({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-xs text-muted-foreground">{label}</span>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span>{checked ? 'On' : 'Off'}</span>
      </label>
    </div>
  );
}

function getDefaultEditorStyleForObject(
  object: GenericTemplateObject,
): GenericTemplateEditorStyleOverride {
  const lineStyle = object.lineStyle ?? createDefaultGenericTemplateLineStyle();

  return {
    fontFamily:
      object.type === 'titleBlock'
        ? mapTemplateFontFamilyToChoice(object.typography?.body.fontFamily)
        : object.type === 'detailsBlock'
          ? 'Arial'
          : 'Inter',
    fontSizePx: object.type === 'titleBlock' ? (object.typography?.body.fontSizePx ?? 11) : 10,
    fontWeight: object.type === 'titleBlock' ? (object.typography?.body.fontWeight ?? 500) : 400,
    lineColor: lineStyle.color,
    linePattern: object.type === 'imageFrame' || object.type === 'mapFrame' ? 'dashed' : 'solid',
    lineWeightPx: lineStyle.widthPx,
    showBorder: lineStyle.visible,
    textAlign: 'left',
    textColor: '#0f172a',
  };
}

function compactEditorStyleOverride(
  defaults: GenericTemplateEditorStyleOverride,
  nextStyle: GenericTemplateEditorStyleOverride,
) {
  return Object.fromEntries(
    Object.entries(nextStyle).filter(
      ([key, value]) => defaults[key as keyof GenericTemplateEditorStyleOverride] !== value,
    ),
  ) satisfies GenericTemplateEditorStyleOverride;
}

function mapTemplateFontFamilyToChoice(fontFamily: unknown): GenericTemplateFontChoice {
  if (fontFamily === 'technical_mono') {
    return 'Courier New';
  }
  if (fontFamily === 'serif') {
    return 'Georgia';
  }
  if (fontFamily === 'condensed_sans') {
    return 'Arial';
  }

  return 'Inter';
}

function CollapsedRail({
  label,
  onExpand,
  side,
}: {
  label: string;
  onExpand: () => void;
  side: 'left' | 'right';
}) {
  return (
    <div className="flex h-full flex-col items-center rounded-xl border bg-white px-1.5 py-3">
      <Button type="button" size="icon" variant="ghost" onClick={onExpand} className="h-8 w-8">
        {side === 'left' ? (
          <ChevronsRight className="h-4 w-4" />
        ) : (
          <ChevronsLeft className="h-4 w-4" />
        )}
      </Button>
      <div className="mt-4 text-xs font-medium uppercase tracking-[0.22em] text-slate-500 [writing-mode:vertical-rl]">
        {label}
      </div>
    </div>
  );
}

function fitCanvasToViewport(
  viewportElement: HTMLDivElement | null,
  pageLayout: ReturnType<typeof getTemplatePageLayout>,
  setZoomScale: (zoom: number) => void,
) {
  if (!viewportElement) {
    return;
  }

  const viewportRect = viewportElement.getBoundingClientRect();
  if (viewportRect.width < 1 || viewportRect.height < 1) {
    return;
  }

  setZoomScale(
    getTemplateCanvasFitZoom({
      pageHeightPx: pageLayout.heightPx,
      pageWidthPx: pageLayout.widthPx,
      paddingPx: 64,
      viewportHeightPx: viewportRect.height,
      viewportWidthPx: viewportRect.width,
    }),
  );
}

function buildRootSheetTemplateKey(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'root-sheet-template';
}

function sortTemplatesByUpdatedAt(templates: GenericTemplateDocument[]) {
  return [...templates].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function rootSheetTemplateImportMarkerKey(organisationId: string | null) {
  return organisationId ? `root-sheet-templates-imported:${organisationId}` : null;
}

function readPendingLocalRootSheetTemplates(
  rawLocalLibrary: string | null,
  organisationId: string | null,
) {
  if (!rawLocalLibrary) {
    return [];
  }

  const importMarkerKey = rootSheetTemplateImportMarkerKey(organisationId);
  const importedSignature =
    typeof window !== 'undefined' && importMarkerKey
      ? window.localStorage.getItem(importMarkerKey)
      : null;
  if (importedSignature === rawLocalLibrary) {
    return [];
  }

  return parseStoredGenericTemplateLibrary(rawLocalLibrary).filter(
    (template) => !isBuiltInGenericTemplateId(template.id),
  );
}

function markLocalRootSheetTemplatesImported(
  organisationId: string | null,
  rawLocalLibrary: string | null,
) {
  if (typeof window === 'undefined' || !rawLocalLibrary) {
    return;
  }

  const markerKey = rootSheetTemplateImportMarkerKey(organisationId);
  if (!markerKey) {
    return;
  }

  window.localStorage.setItem(markerKey, rawLocalLibrary);
}

function formatDetailsRows(rows: GenericTemplateDetailRow[]) {
  return rows.map((row) => `${row.label}: ${row.value}`).join('\n');
}

function parseDetailsRows(value: string) {
  const parsedRows = value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const separatorIndex = line.indexOf(':');
      const label =
        separatorIndex >= 0 ? line.slice(0, separatorIndex).trim() : `Field ${index + 1}`;
      const rowValue = separatorIndex >= 0 ? line.slice(separatorIndex + 1).trim() : line;

      return {
        id: `detail-row-${index + 1}-${Math.random().toString(36).slice(2, 8)}`,
        label: label || `Field ${index + 1}`,
        value: rowValue || 'Value',
      } satisfies GenericTemplateDetailRow;
    });

  return parsedRows.length > 0
    ? parsedRows
    : [
        {
          id: `detail-row-empty-${Math.random().toString(36).slice(2, 8)}`,
          label: 'Field',
          value: 'Value',
        },
      ];
}

function parseNumericValue(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatZoomLabel(zoomScale: number) {
  return `${Math.round(zoomScale * 100)}%`;
}

function getAs1100TemplateDisplayName(
  paperSize: TemplatePaperSize,
  orientation: TemplatePageOrientation,
) {
  return `AS 1100 ${paperSize.toUpperCase()} ${titleCase(orientation)}`;
}

function isDefaultAs1100TemplateName(name: string) {
  return /^AS 1100 A[0-4] (Landscape|Portrait)$/i.test(name.trim());
}

function titleCase(value: string) {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

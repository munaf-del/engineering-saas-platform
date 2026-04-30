import * as React from 'react';
import type { DraftingLayer, DraftingPoint, DraftingUnderlay } from '@eng/shared';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Field, NumberField } from '../properties/common-object-properties';
import { useProjectDocuments, useUploadProjectDocument } from '@/hooks/use-documents';
import { usePdfDocumentInfo, usePdfPageRender } from '../hooks/use-pdf-underlay-render';
import { clampNumber, formatDraftingTimestamp, isDraftingUnderlayRenderable } from '../model-utils';

const CALIBRATION_WARNING_TEXT =
  'PDF calibration depends on the accuracy of the source drawing. Scanned, stretched, or distorted PDFs may not be reliable for measurement. This version supports uniform two-point calibration only and does not rectify warped drawings.';

type DraftingUnderlaysPanelProps = {
  drawingId: string;
  projectId: string;
  underlays: DraftingUnderlay[];
  underlayLayer: DraftingLayer | null;
  selectedUnderlay: DraftingUnderlay | null;
  calibrationState: {
    underlayId: string;
    pdfPointA: DraftingPoint | null;
    pdfPointB: DraftingPoint | null;
  } | null;
  cropModeUnderlayId: string | null;
  onAddUnderlay: (args: {
    fileId: string;
    fileName: string;
    name: string;
    pageNumber: number;
    pageWidth: number;
    pageHeight: number;
  }) => void;
  onSelectUnderlay: (underlayId: string | null) => void;
  onUpdateUnderlay: (updater: (underlay: DraftingUnderlay) => DraftingUnderlay) => void;
  onRemoveUnderlay: () => void;
  onBeginCalibration: (underlayId: string) => void;
  onCancelCalibration: () => void;
  onApplyCalibration: (modelDistanceMm: number, warningAcknowledged: boolean) => boolean;
  onBeginCrop: (underlayId: string) => void;
  onCancelCrop: () => void;
  onClearCrop: (underlayId: string) => void;
};

type UnderlayModeAction = 'calibration' | 'crop';
type UnderlayModeBlockedCode =
  | 'layer-missing'
  | 'layer-locked'
  | 'layer-hidden'
  | 'locked'
  | 'hidden'
  | 'unavailable'
  | 'page-render-error';

type UnderlayModeBlockedScope = 'layer' | 'underlay';

type UnderlayModeBlockedState = {
  code: UnderlayModeBlockedCode;
  message: string;
  scope: UnderlayModeBlockedScope;
};

type ActiveUnderlayModeInvalidation = {
  action: UnderlayModeAction;
  key: string;
  message: string;
  shouldToast: boolean;
};

type SelectedUnderlayPropertyBlockedState = {
  message: string;
};

export function DraftingUnderlaysPanel({
  drawingId,
  projectId,
  underlays,
  underlayLayer,
  selectedUnderlay,
  calibrationState,
  cropModeUnderlayId,
  onAddUnderlay,
  onApplyCalibration,
  onBeginCalibration,
  onBeginCrop,
  onCancelCalibration,
  onCancelCrop,
  onClearCrop,
  onRemoveUnderlay,
  onSelectUnderlay,
  onUpdateUnderlay,
}: DraftingUnderlaysPanelProps) {
  const documentsQuery = useProjectDocuments(projectId, 'application/pdf');
  const uploadDocument = useUploadProjectDocument(projectId);
  const [selectedDocumentId, setSelectedDocumentId] = React.useState<string>('');
  const [addUnderlayName, setAddUnderlayName] = React.useState('');
  const [addPageNumber, setAddPageNumber] = React.useState(1);
  const [uploadFile, setUploadFile] = React.useState<File | null>(null);
  const [calibrationDistanceMm, setCalibrationDistanceMm] = React.useState('');
  const [warningAcknowledged, setWarningAcknowledged] = React.useState(false);
  const [activeModeFeedback, setActiveModeFeedback] = React.useState<string | null>(null);
  const lastInvalidationKeyRef = React.useRef<string | null>(null);

  const documents = React.useMemo(() => documentsQuery.data ?? [], [documentsQuery.data]);
  const visibleUnderlayCount = React.useMemo(
    () => underlays.filter((underlay) => underlay.visible).length,
    [underlays],
  );
  const skippedVisibleUnderlayCount = React.useMemo(
    () =>
      underlays.filter((underlay) => underlay.visible && !isDraftingUnderlayRenderable(underlay))
        .length,
    [underlays],
  );
  const selectedUnderlayRenderable = selectedUnderlay
    ? isDraftingUnderlayRenderable(selectedUnderlay)
    : true;
  const selectedUnderlayFileId =
    typeof selectedUnderlay?.fileId === 'string' && selectedUnderlay.fileId.trim().length > 0
      ? selectedUnderlay.fileId
      : null;
  const selectedDocument = React.useMemo(
    () => documents.find((document) => document.id === selectedDocumentId) ?? documents[0] ?? null,
    [documents, selectedDocumentId],
  );
  const selectedDocumentInfo = usePdfDocumentInfo(selectedDocument?.id ?? null);
  const selectedDocumentPage = usePdfPageRender(selectedDocument?.id ?? null, addPageNumber);
  const selectedUnderlayDocumentInfo = usePdfDocumentInfo(selectedUnderlayFileId);
  const selectedUnderlayPageRender = usePdfPageRender(
    selectedUnderlayRenderable ? selectedUnderlayFileId : null,
    selectedUnderlayRenderable ? (selectedUnderlay?.pageNumber ?? null) : null,
  );

  React.useEffect(() => {
    if (!documents.length) {
      setSelectedDocumentId('');
      return;
    }

    if (!selectedDocumentId || !documents.some((document) => document.id === selectedDocumentId)) {
      setSelectedDocumentId(documents[0]!.id);
    }
  }, [documents, selectedDocumentId]);

  React.useEffect(() => {
    if (!selectedDocument) {
      setAddUnderlayName('');
      setAddPageNumber(1);
      return;
    }

    setAddUnderlayName((current) =>
      current.trim().length > 0 ? current : selectedDocument.name || selectedDocument.fileName,
    );
    setAddPageNumber(1);
  }, [selectedDocument]);

  React.useEffect(() => {
    setCalibrationDistanceMm('');
    setWarningAcknowledged(false);
  }, [calibrationState?.underlayId, calibrationState?.pdfPointA, calibrationState?.pdfPointB]);

  const isCalibrationReady =
    calibrationState != null &&
    selectedUnderlay?.id === calibrationState.underlayId &&
    calibrationState.pdfPointA != null &&
    calibrationState.pdfPointB != null;
  const selectedUnderlayPropertyBlockedState =
    getSelectedUnderlayPropertyBlockedState(underlayLayer);
  const selectedUnderlayPropertyBlockedReason =
    selectedUnderlayPropertyBlockedState?.message ?? null;
  const isSelectedUnderlayPropertyBlocked = selectedUnderlayPropertyBlockedReason != null;
  const isEditingLocked = (selectedUnderlay?.locked ?? false) || isSelectedUnderlayPropertyBlocked;
  const calibrationBlockedState = getUnderlayModeBlockedState({
    action: 'calibration',
    underlay: selectedUnderlay,
    underlayLayer,
    renderable: selectedUnderlayRenderable,
    pageRenderError: selectedUnderlayPageRender.error,
  });
  const cropBlockedState = getUnderlayModeBlockedState({
    action: 'crop',
    underlay: selectedUnderlay,
    underlayLayer,
    renderable: selectedUnderlayRenderable,
    pageRenderError: selectedUnderlayPageRender.error,
  });
  const calibrationBlockedReason = calibrationBlockedState?.message ?? null;
  const cropBlockedReason = cropBlockedState?.message ?? null;
  const activeModeInvalidation =
    getActiveUnderlayModeInvalidation({
      action: 'calibration',
      activeUnderlayId: calibrationState?.underlayId ?? null,
      selectedUnderlay,
      underlays,
      underlayLayer,
      pageRenderError: selectedUnderlayPageRender.error,
    }) ??
    getActiveUnderlayModeInvalidation({
      action: 'crop',
      activeUnderlayId: cropModeUnderlayId,
      selectedUnderlay,
      underlays,
      underlayLayer,
      pageRenderError: selectedUnderlayPageRender.error,
    });

  React.useEffect(() => {
    if (!activeModeInvalidation) {
      lastInvalidationKeyRef.current = null;
      return;
    }

    if (lastInvalidationKeyRef.current === activeModeInvalidation.key) {
      return;
    }

    lastInvalidationKeyRef.current = activeModeInvalidation.key;
    setActiveModeFeedback(activeModeInvalidation.message);
    if (activeModeInvalidation.shouldToast) {
      toast.error(activeModeInvalidation.message);
    }

    if (activeModeInvalidation.action === 'calibration') {
      onCancelCalibration();
      return;
    }

    onCancelCrop();
  }, [activeModeInvalidation, onCancelCalibration, onCancelCrop]);

  async function handleUploadPdf() {
    if (!uploadFile) {
      return;
    }

    if (!uploadFile.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Only PDF files are supported for Drafting underlays');
      return;
    }

    try {
      const document = await uploadDocument.mutateAsync({
        file: uploadFile,
        name: uploadFile.name.replace(/\.pdf$/i, ''),
        entityType: 'drafting_underlay',
        entityId: drawingId,
      });

      setSelectedDocumentId(document.id);
      setAddUnderlayName(document.name || document.fileName);
      setAddPageNumber(1);
      setUploadFile(null);
      toast.success('PDF uploaded to project documents');
    } catch {
      toast.error('Failed to upload PDF');
    }
  }

  function handleAddUnderlay() {
    if (!selectedDocument || !selectedDocumentPage.data) {
      return;
    }

    onAddUnderlay({
      fileId: selectedDocument.id,
      fileName: selectedDocument.fileName,
      name: addUnderlayName.trim() || selectedDocument.name || selectedDocument.fileName,
      pageNumber: addPageNumber,
      pageWidth: selectedDocumentPage.data.width,
      pageHeight: selectedDocumentPage.data.height,
    });
    toast.success('PDF underlay added to drawing');
  }

  function updateSelectedUnderlay(updater: (underlay: DraftingUnderlay) => DraftingUnderlay) {
    onUpdateUnderlay((underlay) => ({
      ...updater(underlay),
      updatedAt: new Date().toISOString(),
    }));
  }

  function handleApplyCalibration() {
    const distanceMm = Number(calibrationDistanceMm);
    if (!Number.isFinite(distanceMm) || distanceMm <= 0) {
      toast.error('Enter a calibration distance in millimetres');
      return;
    }

    try {
      const applied = onApplyCalibration(distanceMm, warningAcknowledged);
      if (!applied) {
        toast.error('Pick two points on the PDF underlay before applying calibration');
        return;
      }

      toast.success('Uniform PDF calibration applied');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to apply calibration');
    }
  }

  function handleBeginCalibration() {
    if (!selectedUnderlay) {
      return;
    }

    if (calibrationBlockedReason) {
      toast.error(calibrationBlockedReason);
      return;
    }

    setActiveModeFeedback(null);
    onBeginCalibration(selectedUnderlay.id);
  }

  function handleBeginCrop() {
    if (!selectedUnderlay) {
      return;
    }

    if (cropBlockedReason) {
      toast.error(cropBlockedReason);
      return;
    }

    setActiveModeFeedback(null);
    onBeginCrop(selectedUnderlay.id);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add PDF Underlay</CardTitle>
          <CardDescription>
            Select an existing project PDF or upload a new one. The binary stays in project file
            storage, and only underlay metadata is saved into the Drafting model.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Project PDF">
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedDocument?.id ?? ''}
              onChange={(event) => setSelectedDocumentId(event.target.value)}
            >
              {documents.length === 0 ? (
                <option value="">No project PDFs uploaded yet</option>
              ) : null}
              {documents.map((document) => (
                <option key={document.id} value={document.id}>
                  {document.name} ({document.fileName})
                </option>
              ))}
            </select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label="Page Number"
              value={addPageNumber}
              onChange={(value) =>
                setAddPageNumber(
                  Math.max(
                    1,
                    Math.min(
                      value,
                      selectedDocumentInfo.data?.pageCount ?? Number.MAX_SAFE_INTEGER,
                    ),
                  ),
                )
              }
            />

            <Field label="Underlay Name">
              <Input
                value={addUnderlayName}
                onChange={(event) => setAddUnderlayName(event.target.value)}
              />
            </Field>
          </div>

          <div className="space-y-1 rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
            {!selectedDocument ? <p>Select or upload a PDF to inspect page availability.</p> : null}
            {selectedDocumentInfo.isLoading ? <p>Loading PDF page count...</p> : null}
            {selectedDocumentInfo.error ? (
              <p>Failed to inspect the selected PDF. Page count is unavailable.</p>
            ) : null}
            {selectedDocumentInfo.data ? (
              <p>
                {selectedDocumentInfo.data.pageCount} page
                {selectedDocumentInfo.data.pageCount === 1 ? '' : 's'} available.
              </p>
            ) : null}
            {selectedDocumentPage.isLoading ? <p>Checking page {addPageNumber}...</p> : null}
            {selectedDocumentPage.error ? (
              <p>Page {addPageNumber} could not be rendered. Check the page number or PDF file.</p>
            ) : null}
            {selectedDocumentPage.data ? (
              <p>
                Page {addPageNumber} renders at {Math.round(selectedDocumentPage.data.width)} ×{' '}
                {Math.round(selectedDocumentPage.data.height)} PDF units.
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleAddUnderlay}
              disabled={
                !selectedDocument ||
                !selectedDocumentPage.data ||
                addUnderlayName.trim().length === 0
              }
            >
              Add PDF Underlay
            </Button>
            <Button
              variant="outline"
              onClick={() => documentsQuery.refetch()}
              disabled={documentsQuery.isFetching}
            >
              Refresh Project PDFs
            </Button>
          </div>

          <div className="rounded-md border p-3">
            <p className="mb-3 text-sm font-medium">Upload new project PDF</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                type="file"
                accept=".pdf,application/pdf"
                onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
              />
              <Button
                variant="outline"
                onClick={handleUploadPdf}
                disabled={!uploadFile || uploadDocument.isPending}
              >
                Upload PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Loaded Underlays</CardTitle>
          <CardDescription>
            Visible underlays render below native Drafting objects. Locked underlays are protected
            from accidental canvas edits.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {underlays.length === 0 ? (
            <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
              No underlays are loaded yet.
            </div>
          ) : (
            <>
              {visibleUnderlayCount === 0 ? (
                <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                  All loaded PDF underlays are hidden, so none render on the canvas.
                </div>
              ) : skippedVisibleUnderlayCount > 0 ? (
                <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                  {skippedVisibleUnderlayCount} visible PDF underlay
                  {skippedVisibleUnderlayCount === 1 ? ' is' : 's are'} unavailable and skipped on
                  the canvas.
                </div>
              ) : null}

              {underlays.map((underlay) => {
                const renderable = isDraftingUnderlayRenderable(underlay);

                return (
                  <button
                    key={underlay.id}
                    type="button"
                    className={`w-full rounded-md border p-3 text-left transition ${
                      selectedUnderlay?.id === underlay.id
                        ? 'border-emerald-600 bg-emerald-50'
                        : 'border-border bg-background hover:border-emerald-300'
                    }`}
                    onClick={() => onSelectUnderlay(underlay.id)}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{underlay.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {underlay.fileName} · page {underlay.pageNumber}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={underlay.visible ? 'success' : 'secondary'}>
                          {underlay.visible ? 'Visible' : 'Hidden'}
                        </Badge>
                        <Badge variant={underlay.locked ? 'warning' : 'outline'}>
                          {underlay.locked ? 'Locked' : 'Unlocked'}
                        </Badge>
                        {!renderable ? <Badge variant="warning">Unavailable</Badge> : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </CardContent>
      </Card>

      {activeModeFeedback ? (
        <div
          className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground"
          role="status"
        >
          {activeModeFeedback}
        </div>
      ) : null}

      {selectedUnderlay ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Selected Underlay</CardTitle>
            <CardDescription>
              {selectedUnderlay.fileName} · Added{' '}
              {formatDraftingTimestamp(selectedUnderlay.createdAt)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedUnderlay.visible ? 'outline' : 'secondary'}
                disabled={isSelectedUnderlayPropertyBlocked}
                onClick={() =>
                  updateSelectedUnderlay((underlay) => ({
                    ...underlay,
                    visible: !underlay.visible,
                  }))
                }
              >
                {selectedUnderlay.visible ? 'Hide Underlay' : 'Show Underlay'}
              </Button>
              <Button
                variant={selectedUnderlay.locked ? 'secondary' : 'outline'}
                disabled={isSelectedUnderlayPropertyBlocked}
                onClick={() =>
                  updateSelectedUnderlay((underlay) => ({
                    ...underlay,
                    locked: !underlay.locked,
                  }))
                }
              >
                {selectedUnderlay.locked ? 'Unlock Underlay' : 'Lock Underlay'}
              </Button>
              <Button
                variant="destructive"
                onClick={onRemoveUnderlay}
                disabled={isSelectedUnderlayPropertyBlocked}
              >
                Remove Underlay
              </Button>
            </div>

            {selectedUnderlayPropertyBlockedReason ? (
              <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                {selectedUnderlayPropertyBlockedReason}
              </div>
            ) : null}

            {!selectedUnderlayRenderable ? (
              <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                This PDF underlay is unavailable and is skipped on the canvas. Check the PDF file,
                page, transform, opacity, and crop metadata before editing it. Calibration and crop
                stay disabled until the underlay can render safely again.
              </div>
            ) : (
              <>
                {selectedUnderlay.locked ? (
                  <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                    This underlay is locked. Unlock it to move, rotate, scale, crop, or calibrate
                    it.
                  </div>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Name">
                    <Input
                      value={selectedUnderlay.name}
                      disabled={isEditingLocked}
                      onChange={(event) =>
                        updateSelectedUnderlay((underlay) => ({
                          ...underlay,
                          name: event.target.value,
                        }))
                      }
                    />
                  </Field>

                  <NumberField
                    label="Page Number"
                    value={selectedUnderlay.pageNumber}
                    disabled={isEditingLocked}
                    onChange={(value) =>
                      updateSelectedUnderlay((underlay) => ({
                        ...underlay,
                        pageNumber: Math.max(
                          1,
                          Math.min(value, selectedUnderlayDocumentInfo.data?.pageCount ?? value),
                        ),
                        crop: null,
                        calibration: null,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Opacity</label>
                  <input
                    className="w-full"
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(selectedUnderlay.opacity * 100)}
                    disabled={isEditingLocked}
                    onChange={(event) =>
                      updateSelectedUnderlay((underlay) => ({
                        ...underlay,
                        opacity: clampNumber(Number(event.target.value) / 100, 0, 1),
                      }))
                    }
                  />
                  <p className="text-sm text-muted-foreground">
                    {Math.round(selectedUnderlay.opacity * 100)}% opacity
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <NumberField
                    label="Position X (mm)"
                    value={Math.round(selectedUnderlay.transform.x)}
                    disabled={isEditingLocked}
                    onChange={(value) =>
                      updateSelectedUnderlay((underlay) => ({
                        ...underlay,
                        transform: {
                          ...underlay.transform,
                          x: value,
                        },
                      }))
                    }
                  />
                  <NumberField
                    label="Position Y (mm)"
                    value={Math.round(selectedUnderlay.transform.y)}
                    disabled={isEditingLocked}
                    onChange={(value) =>
                      updateSelectedUnderlay((underlay) => ({
                        ...underlay,
                        transform: {
                          ...underlay.transform,
                          y: value,
                        },
                      }))
                    }
                  />
                  <NumberField
                    label="Uniform Scale"
                    value={Number(selectedUnderlay.transform.scale.toFixed(6))}
                    disabled={isEditingLocked}
                    onChange={(value) =>
                      updateSelectedUnderlay((underlay) => ({
                        ...underlay,
                        transform: {
                          ...underlay.transform,
                          scale: Math.max(value, 0.000001),
                        },
                      }))
                    }
                  />
                  <NumberField
                    label="Rotation (deg)"
                    value={Number(selectedUnderlay.transform.rotationDeg.toFixed(2))}
                    disabled={isEditingLocked}
                    onChange={(value) =>
                      updateSelectedUnderlay((underlay) => ({
                        ...underlay,
                        transform: {
                          ...underlay.transform,
                          rotationDeg: value,
                        },
                      }))
                    }
                  />
                </div>

                <div className="rounded-md border p-3">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">Calibration</p>
                      <p className="text-sm text-muted-foreground">
                        Uniform two-point calibration only. No warp, skew, rectification, or
                        non-uniform scaling.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {calibrationState?.underlayId === selectedUnderlay.id ? (
                        <Button variant="outline" onClick={onCancelCalibration}>
                          Cancel Calibration
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={handleBeginCalibration}
                          disabled={Boolean(calibrationBlockedReason)}
                        >
                          Start Calibration
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                    {selectedUnderlay.calibration ? (
                      <p>
                        Calibrated at scale{' '}
                        {selectedUnderlay.calibration.calculatedScale.toFixed(6)} on{' '}
                        {formatDraftingTimestamp(selectedUnderlay.calibration.calibratedAt)}.
                      </p>
                    ) : (
                      <p>Not calibrated yet.</p>
                    )}

                    {calibrationBlockedReason ? (
                      <p className="mt-2">{calibrationBlockedReason}</p>
                    ) : calibrationState?.underlayId === selectedUnderlay.id ? (
                      <p className="mt-2">
                        {!calibrationState.pdfPointA
                          ? 'Click the first reference point on the PDF underlay.'
                          : !calibrationState.pdfPointB
                            ? 'Click the second reference point on the PDF underlay.'
                            : 'Enter the real-world distance in millimetres and acknowledge the warning before applying calibration.'}
                      </p>
                    ) : null}
                  </div>

                  {isCalibrationReady ? (
                    <div className="mt-4 space-y-3">
                      <NumberField
                        label="Real-World Distance (mm)"
                        value={calibrationDistanceMm}
                        onChange={(value) => setCalibrationDistanceMm(String(value))}
                      />
                      <label className="flex items-start gap-3 rounded-md border p-3 text-sm">
                        <input
                          type="checkbox"
                          checked={warningAcknowledged}
                          onChange={(event) => setWarningAcknowledged(event.target.checked)}
                        />
                        <span>{CALIBRATION_WARNING_TEXT}</span>
                      </label>
                      <Button onClick={handleApplyCalibration}>Apply Uniform Calibration</Button>
                    </div>
                  ) : null}
                </div>

                <div className="rounded-md border p-3">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">Crop</p>
                      <p className="text-sm text-muted-foreground">
                        Crop affects display and exported JSON metadata only. The original PDF file
                        is unchanged.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {cropModeUnderlayId === selectedUnderlay.id ? (
                        <Button variant="outline" onClick={onCancelCrop}>
                          Cancel Crop
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={handleBeginCrop}
                          disabled={Boolean(cropBlockedReason)}
                        >
                          Start Crop
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        onClick={() => onClearCrop(selectedUnderlay.id)}
                        disabled={!selectedUnderlay.crop || isSelectedUnderlayPropertyBlocked}
                      >
                        Clear Crop
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                    {selectedUnderlay.crop ? (
                      <p>
                        Crop rectangle: x {selectedUnderlay.crop.x.toFixed(1)}, y{' '}
                        {selectedUnderlay.crop.y.toFixed(1)}, width{' '}
                        {selectedUnderlay.crop.width.toFixed(1)}, height{' '}
                        {selectedUnderlay.crop.height.toFixed(1)}.
                      </p>
                    ) : (
                      <p>No crop applied yet.</p>
                    )}
                    {cropBlockedReason ? (
                      <p className="mt-2">{cropBlockedReason}</p>
                    ) : cropModeUnderlayId === selectedUnderlay.id ? (
                      <p className="mt-2">
                        Click and drag on the selected PDF underlay to define a rectangular crop.
                      </p>
                    ) : null}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function getSelectedUnderlayPropertyBlockedState(
  underlayLayer: DraftingLayer | null,
): SelectedUnderlayPropertyBlockedState | null {
  if (!underlayLayer) {
    return {
      message:
        'The Underlay layer is unavailable. Restore the layer before editing selected underlay properties.',
    };
  }

  if (underlayLayer.locked) {
    return {
      message:
        'The Underlay layer is locked. Unlock the layer before editing selected underlay properties.',
    };
  }

  return null;
}

function getUnderlayModeBlockedState({
  action,
  underlay,
  underlayLayer,
  renderable,
  pageRenderError,
}: {
  action: UnderlayModeAction;
  underlay: DraftingUnderlay | null;
  underlayLayer: DraftingLayer | null;
  renderable: boolean;
  pageRenderError: Error | null;
}): UnderlayModeBlockedState | null {
  if (!underlay) {
    return null;
  }

  const layerBlockedState = getUnderlayLayerModeBlockedState(action, underlayLayer);
  if (layerBlockedState) {
    return layerBlockedState;
  }

  const actionLabel = action === 'calibration' ? 'calibration' : 'crop';
  const actionTitle = action === 'calibration' ? 'Calibration' : 'Crop';

  if (underlay.locked) {
    return {
      code: 'locked',
      message: `Unlock the underlay before ${actionLabel}.`,
      scope: 'underlay',
    };
  }

  if (!underlay.visible) {
    return {
      code: 'hidden',
      message: `Show the underlay before ${actionLabel}.`,
      scope: 'underlay',
    };
  }

  if (!renderable) {
    return {
      code: 'unavailable',
      message: `This underlay is unavailable or its page metadata is invalid. ${actionTitle} is disabled until the underlay can render safely again.`,
      scope: 'underlay',
    };
  }

  if (pageRenderError) {
    return {
      code: 'page-render-error',
      message: `The selected PDF page cannot currently render. ${actionTitle} is disabled until the page renders again.`,
      scope: 'underlay',
    };
  }

  return null;
}

function getUnderlayLayerModeBlockedState(
  action: UnderlayModeAction,
  underlayLayer: DraftingLayer | null,
): UnderlayModeBlockedState | null {
  const actionLabel = action === 'calibration' ? 'calibration' : 'crop';
  const actionTitle = action === 'calibration' ? 'Calibration' : 'Crop';

  if (!underlayLayer) {
    return {
      code: 'layer-missing',
      message: `The Underlay layer is unavailable. ${actionTitle} is disabled until the layer can be restored.`,
      scope: 'layer',
    };
  }

  if (underlayLayer.locked) {
    return {
      code: 'layer-locked',
      message: `Unlock the Underlay layer before ${actionLabel}.`,
      scope: 'layer',
    };
  }

  if (!underlayLayer.visible) {
    return {
      code: 'layer-hidden',
      message: `Show the Underlay layer before ${actionLabel}.`,
      scope: 'layer',
    };
  }

  return null;
}

function getActiveUnderlayModeInvalidation({
  action,
  activeUnderlayId,
  selectedUnderlay,
  underlays,
  underlayLayer,
  pageRenderError,
}: {
  action: UnderlayModeAction;
  activeUnderlayId: string | null;
  selectedUnderlay: DraftingUnderlay | null;
  underlays: DraftingUnderlay[];
  underlayLayer: DraftingLayer | null;
  pageRenderError: Error | null;
}): ActiveUnderlayModeInvalidation | null {
  if (!activeUnderlayId) {
    return null;
  }

  const actionTitle = action === 'calibration' ? 'Calibration' : 'Crop';
  const activeUnderlay = underlays.find((underlay) => underlay.id === activeUnderlayId) ?? null;

  if (!activeUnderlay) {
    return {
      action,
      key: `${action}:removed:${activeUnderlayId}`,
      message: `${actionTitle} was cancelled because the active underlay was removed.`,
      shouldToast: false,
    };
  }

  if (selectedUnderlay?.id !== activeUnderlayId) {
    return {
      action,
      key: `${action}:deselected:${activeUnderlayId}:${selectedUnderlay?.id ?? 'none'}`,
      message: `${actionTitle} was cancelled because the active underlay is no longer selected.`,
      shouldToast: false,
    };
  }

  const blockedState = getUnderlayModeBlockedState({
    action,
    underlay: activeUnderlay,
    underlayLayer,
    renderable: isDraftingUnderlayRenderable(activeUnderlay),
    pageRenderError,
  });

  if (!blockedState) {
    return null;
  }

  return {
    action,
    key: `${action}:${blockedState.code}:${activeUnderlayId}`,
    message: getActiveUnderlayModeInvalidationMessage(actionTitle, blockedState.code),
    shouldToast: blockedState.scope === 'layer',
  };
}

function getActiveUnderlayModeInvalidationMessage(
  actionTitle: 'Calibration' | 'Crop',
  code: UnderlayModeBlockedCode,
) {
  switch (code) {
    case 'layer-missing':
      return `${actionTitle} was cancelled because the Underlay layer is unavailable.`;
    case 'layer-locked':
      return `${actionTitle} was cancelled because the Underlay layer is locked.`;
    case 'layer-hidden':
      return `${actionTitle} was cancelled because the Underlay layer is hidden.`;
    case 'locked':
      return `${actionTitle} was cancelled because the active underlay is locked.`;
    case 'hidden':
      return `${actionTitle} was cancelled because the active underlay is hidden.`;
    case 'unavailable':
      return `${actionTitle} was cancelled because the active underlay is unavailable or its page metadata is invalid.`;
    case 'page-render-error':
      return `${actionTitle} was cancelled because the selected PDF page cannot currently render.`;
  }
}

'use client';

import { type InputHTMLAttributes, useEffect, useMemo, useRef, useState } from 'react';
import { FileSearch, LoaderCircle, Sparkles, Trash2, Upload } from 'lucide-react';
import { usePileGroups } from '@/hooks/use-pile-groups';
import {
  useAiDocuments,
  useDeleteAiDocuments,
  useExtractAiDocument,
  useIndexAiDocument,
  useUpdateAiDocumentClassification,
  useUploadAiDocument,
} from '@/hooks/use-ai';
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
  buildAiReportsAssistantPageContext,
  useRegisterAssistantPageContext,
} from './assistant-page-context';
import { AiExtractionSummary } from './ai-extraction-summary';
import {
  AI_REPORT_DOCUMENT_FAMILY_OPTIONS,
  AI_REPORT_OWNER_WORKSPACE_OPTIONS,
  AI_REPORT_TYPE_OPTIONS,
  DEFAULT_AI_REPORT_CLASSIFICATION,
  defaultAiReportClassificationForFamily,
  formatAiReportDocumentFamily,
  formatAiReportOwnerWorkspace,
  formatAiReportType,
  inferAiReportClassification,
  type AiDocument,
  type AiReportClassification,
  type AiReportDocumentFamily,
  type AiReportOwnerWorkspace,
  type AiReportType,
  normalizeAiEngineeringReportExtraction,
  resolveAiReportClassification,
} from './types';
import { toast } from 'sonner';

type DeleteReportsDialogState = {
  mode: 'single' | 'selected' | 'all';
  documents: AiDocument[];
};

const AI_REPORT_DOCUMENT_FAMILY_RENDER_ORDER: AiReportDocumentFamily[] = [
  'geotechnical',
  'hydrogeology_dewatering',
  'environmental',
  'structural',
  'inspections',
  'temporary_works',
  'other',
];

export function AiReportsWorkspace({ projectId }: { projectId: string }) {
  const { data: pileGroups } = usePileGroups(projectId);
  const { data: documents, isLoading } = useAiDocuments(projectId);
  const uploadDocument = useUploadAiDocument(projectId);
  const indexDocument = useIndexAiDocument(projectId);
  const extractDocument = useExtractAiDocument(projectId);
  const updateDocumentClassification = useUpdateAiDocumentClassification(projectId);
  const deleteDocuments = useDeleteAiDocuments(projectId);

  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [deleteDialog, setDeleteDialog] = useState<DeleteReportsDialogState | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPileGroupId, setSelectedPileGroupId] = useState<string>('');
  const [uploadClassification, setUploadClassification] = useState<AiReportClassification>(
    DEFAULT_AI_REPORT_CLASSIFICATION,
  );

  useEffect(() => {
    if (!documents || documents.length === 0) {
      setSelectedDocumentId(null);
      setSelectedDocumentIds([]);
      return;
    }

    if (!selectedDocumentId || !documents.some((document) => document.id === selectedDocumentId)) {
      setSelectedDocumentId(documents[0]?.id ?? null);
    }

    setSelectedDocumentIds((current) => {
      const visibleDocumentIds = new Set(documents.map((document) => document.id));
      return current.filter((documentId) => visibleDocumentIds.has(documentId));
    });
  }, [documents, selectedDocumentId]);

  const selectedDocument =
    documents?.find((document) => document.id === selectedDocumentId) ?? documents?.[0] ?? null;
  const selectedDocumentIdSet = useMemo(() => new Set(selectedDocumentIds), [selectedDocumentIds]);
  const selectedDocuments = useMemo(
    () => (documents ?? []).filter((document) => selectedDocumentIdSet.has(document.id)),
    [documents, selectedDocumentIdSet],
  );
  const groupedDocuments = useMemo(
    () => groupAiReportsByDocumentFamily(documents ?? []),
    [documents],
  );
  const allVisibleReportsSelected =
    Boolean(documents?.length) && selectedDocuments.length === documents?.length;
  const someVisibleReportsSelected = selectedDocuments.length > 0 && !allVisibleReportsSelected;
  const isDeletePending = deleteDocuments.isPending;
  const selectedReportClassification = useMemo(
    () => (selectedDocument ? resolveAiReportClassification(selectedDocument) : null),
    [selectedDocument],
  );
  const latestRun = selectedDocument?.extractionRuns[0] ?? null;
  const latestExtraction = latestRun?.resultJson;
  const normalizedExtraction = normalizeAiEngineeringReportExtraction(latestExtraction);
  const extractionSections = normalizedExtraction
    ? summarizeAssistantExtractionSections(normalizedExtraction)
    : [];
  const tableLabels =
    normalizedExtraction?.geotechnicalParameterTables.map((table) => table.tableLabel) ?? [];
  const assistantCurrentState = compactAssistantLines([
    `${documents?.length ?? 0} uploaded report${(documents?.length ?? 0) === 1 ? '' : 's'} on this project`,
    selectedDocument
      ? `Selected report: ${selectedDocument.filename} (${selectedDocument.status.replace(/_/g, ' ')})`
      : 'No report is currently selected',
    selectedReportClassification
      ? `Registry family: ${formatAiReportDocumentFamily(selectedReportClassification.documentFamily)}`
      : null,
    selectedReportClassification
      ? `Owner workspace: ${formatAiReportOwnerWorkspace(selectedReportClassification.ownerWorkspace)}`
      : null,
    latestRun
      ? `Latest extraction status: ${latestRun.status}`
      : 'No extraction run is visible yet',
    normalizedExtraction?.documentFamily.value
      ? `Document family: ${normalizedExtraction.documentFamily.value}`
      : null,
    normalizedExtraction?.reportTitle.value
      ? `Report title: ${normalizedExtraction.reportTitle.value}`
      : null,
    tableLabels.length > 0 ? `Visible structured tables: ${tableLabels.join(', ')}` : null,
    extractionSections.length > 0
      ? `Visible extracted sections: ${extractionSections.join(', ')}`
      : null,
  ]);
  const assistantMissingInputs = compactAssistantLines([
    !documents || documents.length === 0 ? 'No AI reports have been uploaded yet' : null,
    selectedDocument?.status === 'uploaded_local'
      ? 'The selected report still needs OpenAI indexing before extraction can run'
      : null,
    selectedDocument?.status === 'indexed'
      ? 'The selected report is indexed, but no extraction run is visible yet'
      : null,
    latestRun?.status === 'failed' ? 'The latest extraction run failed' : null,
    normalizedExtraction &&
    normalizedExtraction.geotechnicalParameterTables.length === 0 &&
    normalizedExtraction.documentFamily.value !== 'STRUCTURAL_REPORT'
      ? 'No structured geotechnical parameter tables are visible in the current extraction'
      : null,
    normalizedExtraction && extractionSections.length === 0
      ? 'The current extraction does not expose any of the assistant-tracked section summaries yet'
      : null,
    normalizedExtraction && normalizedExtraction.standardsMapping == null
      ? 'No AS 2159 standards mapping is attached to the selected extraction'
      : null,
  ]);
  const assistantNextActions = compactAssistantLines([
    !selectedDocument ? 'Upload a report, then select it from the reports list' : null,
    selectedDocument?.status === 'uploaded_local'
      ? 'Index the selected report in OpenAI so it can be searched and extracted'
      : null,
    selectedDocument && (latestRun == null || selectedDocument.status === 'indexed')
      ? 'Run structured extraction for the selected report'
      : null,
    extractionSections.length > 0
      ? 'Review the extracted sections and table labels to confirm what the report actually yielded'
      : null,
    normalizedExtraction?.standardsMapping
      ? 'Treat the AS 2159 mapping as a separate reference layer, not as authored project values'
      : null,
  ]);
  const assistantStandardsReferenceNotes = compactAssistantLines([
    normalizedExtraction?.standardsMapping
      ? 'AS 2159 standards mapping is a separate reference layer from the report-derived extraction facts'
      : null,
  ]);
  const assistantPageContext = useMemo(
    () =>
      buildAiReportsAssistantPageContext({
        route: `/projects/${projectId}/ai-reports`,
        projectId,
        visibleWarnings: [
          !documents || documents.length === 0 ? 'No AI reports have been uploaded yet' : null,
          selectedDocument?.status === 'uploaded_local'
            ? 'The selected report is stored locally but not indexed in OpenAI yet'
            : null,
          selectedDocument?.status === 'indexed'
            ? 'The selected report is indexed, but no extraction run is visible yet'
            : null,
          latestRun?.status === 'failed' ? 'The latest extraction run failed' : null,
          normalizedExtraction &&
          normalizedExtraction.geotechnicalParameterTables.length === 0 &&
          normalizedExtraction.documentFamily.value !== 'STRUCTURAL_REPORT'
            ? 'The latest extraction does not show any structured geotechnical parameter tables'
            : null,
          normalizedExtraction?.standardsMapping == null
            ? 'No AS 2159 reference mapping is available for the latest extraction'
            : null,
        ],
        visibleErrors: [
          selectedDocument?.status === 'index_failed'
            ? 'OpenAI indexing failed for the selected report'
            : null,
          selectedDocument?.status === 'extraction_failed'
            ? 'Structured extraction failed for the selected report'
            : null,
        ],
        keyFacts: [
          `${documents?.length ?? 0} uploaded report${(documents?.length ?? 0) === 1 ? '' : 's'}`,
          selectedDocument ? `Selected report: ${selectedDocument.filename}` : 'No report selected',
          selectedReportClassification
            ? `Registry family: ${formatAiReportDocumentFamily(selectedReportClassification.documentFamily)}`
            : null,
          normalizedExtraction?.documentFamily.value
            ? `Document family: ${normalizedExtraction.documentFamily.value}`
            : null,
          latestRun ? `Latest extraction run: ${latestRun.status}` : 'No extraction run yet',
          normalizedExtraction?.geotechnicalParameterTables.length
            ? `${normalizedExtraction.geotechnicalParameterTables.length} parameter table${normalizedExtraction.geotechnicalParameterTables.length === 1 ? '' : 's'} extracted`
            : null,
        ],
        pageSpecificData: {
          documentsCount: documents?.length ?? 0,
          extractionStatus: latestRun?.status ?? selectedDocument?.status ?? null,
          selectedDocument: selectedDocument
            ? {
                id: selectedDocument.id,
                filename: selectedDocument.filename,
                status: selectedDocument.status,
                documentFamily: selectedReportClassification?.documentFamily ?? null,
                reportType: selectedReportClassification?.reportType ?? null,
                ownerWorkspace: selectedReportClassification?.ownerWorkspace ?? null,
                pileGroupName: selectedDocument.pileGroup?.name ?? null,
              }
            : null,
          latestRun: latestRun
            ? {
                id: latestRun.id,
                status: latestRun.status,
                model: latestRun.model,
                createdAt: latestRun.createdAt,
              }
            : null,
          extractionSummary: normalizedExtraction
            ? {
                documentFamily: normalizedExtraction.documentFamily.value,
                reportTitle: normalizedExtraction.reportTitle.value,
                projectSummary: normalizedExtraction.projectSummary.value,
                extractionSections,
                hasGeotechnicalParameterTables:
                  normalizedExtraction.geotechnicalParameterTables.length > 0,
                tableLabels,
                hasStandardsMapping: normalizedExtraction.standardsMapping !== null,
                standardsMappingClauses:
                  normalizedExtraction.standardsMapping?.relevantClauses.map(
                    (clause) => clause.clause,
                  ) ?? [],
              }
            : null,
          visibleExtractedSections: extractionSections,
          visibleTableLabels: tableLabels,
          incompleteAreas: assistantMissingInputs,
          assistantGuidance: {
            currentState: assistantCurrentState,
            missingInputs: assistantMissingInputs,
            likelyBlockers: assistantMissingInputs,
            nextActions: assistantNextActions,
            standardsReferenceNotes: assistantStandardsReferenceNotes,
          },
        },
      }),
    [
      assistantCurrentState,
      assistantMissingInputs,
      assistantNextActions,
      assistantStandardsReferenceNotes,
      documents,
      extractionSections,
      latestRun,
      normalizedExtraction,
      projectId,
      selectedDocument,
      selectedReportClassification,
      tableLabels,
    ],
  );

  useRegisterAssistantPageContext(assistantPageContext);

  function handleUploadFileChange(file: File | null) {
    setSelectedFile(file);
    if (file) {
      setUploadClassification(inferAiReportClassification(file.name));
    }
  }

  function handleUploadDocumentFamilyChange(documentFamily: AiReportDocumentFamily) {
    setUploadClassification(defaultAiReportClassificationForFamily(documentFamily));
  }

  async function handleUpdateDocumentClassification(
    document: AiDocument,
    classification: AiReportClassification,
  ) {
    try {
      const updated = await updateDocumentClassification.mutateAsync({
        documentId: document.id,
        classification,
      });
      setSelectedDocumentId(updated.id);
      toast.success('Report classification updated');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update report classification',
      );
    }
  }

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile) {
      toast.error('Choose a PDF or DOCX report first');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('projectId', projectId);
    formData.append('documentFamily', uploadClassification.documentFamily);
    formData.append('reportType', uploadClassification.reportType);
    formData.append('ownerWorkspace', uploadClassification.ownerWorkspace);
    if (selectedPileGroupId) {
      formData.append('pileGroupId', selectedPileGroupId);
    }

    try {
      const created = await uploadDocument.mutateAsync(formData);
      setSelectedDocumentId(created.id);
      setSelectedFile(null);
      setSelectedPileGroupId('');
      setUploadClassification(DEFAULT_AI_REPORT_CLASSIFICATION);
      toast.success('Report uploaded locally');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload report');
    }
  }

  async function handleIndex(documentId: string) {
    try {
      const updated = await indexDocument.mutateAsync(documentId);
      setSelectedDocumentId(updated.id);
      toast.success('Report uploaded to OpenAI and attached to a vector store');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to index report');
    }
  }

  async function handleExtract(documentId: string) {
    try {
      const updated = await extractDocument.mutateAsync(documentId);
      setSelectedDocumentId(updated.id);
      toast.success('Structured extraction completed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to extract report');
    }
  }

  function setDocumentSelected(documentId: string, selected: boolean) {
    setSelectedDocumentIds((current) => {
      if (selected) {
        return current.includes(documentId) ? current : [...current, documentId];
      }
      return current.filter((currentDocumentId) => currentDocumentId !== documentId);
    });
  }

  function setAllVisibleDocumentsSelected(selected: boolean) {
    setSelectedDocumentIds(selected ? (documents ?? []).map((document) => document.id) : []);
  }

  async function handleConfirmDeleteReports() {
    if (!deleteDialog || deleteDialog.documents.length === 0) {
      return;
    }

    const deleteAll = deleteDialog.mode === 'all';
    const deleteTargets = deleteDialog.documents;
    const deletedIdSet = new Set(deleteTargets.map((document) => document.id));
    const remainingDocuments = (documents ?? []).filter(
      (document) => !deletedIdSet.has(document.id),
    );

    try {
      const result = await deleteDocuments.mutateAsync(
        deleteAll
          ? { deleteAll: true }
          : { documentIds: deleteTargets.map((document) => document.id) },
      );
      setSelectedDocumentIds((current) =>
        current.filter((documentId) => !deletedIdSet.has(documentId)),
      );
      setSelectedDocumentId((current) =>
        current && !deletedIdSet.has(current) ? current : (remainingDocuments[0]?.id ?? null),
      );
      setDeleteDialog(null);

      const deletedCount = result.deletedCount || deleteTargets.length;
      toast.success(`Deleted ${deletedCount} AI report${deletedCount === 1 ? '' : 's'}`);
      if (result.projectGeotechnicalSelectionCleared) {
        toast.info(
          'Cleared the Project Geotechnical active report selection for the deleted report',
        );
      }
      [...result.localFileWarnings, ...result.openaiCleanupWarnings].forEach((warning) =>
        toast.warning(warning),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete AI reports');
    }
  }

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Upload className="h-4 w-4" />
              Upload Engineering Report
            </CardTitle>
            <CardDescription>
              Phase 1 stores the original file locally, persists metadata in Postgres, then lets you
              index and extract against the same document.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleUpload}>
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr),220px]">
                <div className="space-y-2">
                  <Label htmlFor="ai-report-file">Report file</Label>
                  <Input
                    id="ai-report-file"
                    type="file"
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(event) => handleUploadFileChange(event.target.files?.[0] ?? null)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ai-pile-group">Pile group</Label>
                  <select
                    id="ai-pile-group"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={selectedPileGroupId}
                    onChange={(event) => setSelectedPileGroupId(event.target.value)}
                  >
                    <option value="">Project-level report</option>
                    {(pileGroups ?? []).map((pileGroup) => (
                      <option key={pileGroup.id} value={pileGroup.id}>
                        {pileGroup.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <AiReportClassificationFields
                idPrefix="ai-upload-report"
                classification={uploadClassification}
                onDocumentFamilyChange={handleUploadDocumentFamilyChange}
                onReportTypeChange={(reportType) =>
                  setUploadClassification((current) => ({ ...current, reportType }))
                }
                onOwnerWorkspaceChange={(ownerWorkspace) =>
                  setUploadClassification((current) => ({ ...current, ownerWorkspace }))
                }
              />

              <div>
                <Button type="submit" disabled={uploadDocument.isPending}>
                  {uploadDocument.isPending ? (
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Upload
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[340px,minmax(0,1fr)]">
          <Card className="h-fit">
            <CardHeader className="flex flex-col gap-3">
              <div className="space-y-1">
                <CardTitle className="text-base">Reports</CardTitle>
                <CardDescription>
                  Uploaded AI documents grouped by discipline family, ordered newest first.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={selectedDocuments.length === 0 || isDeletePending}
                  onClick={() =>
                    setDeleteDialog({
                      mode: 'selected',
                      documents: selectedDocuments,
                    })
                  }
                >
                  Delete selected
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={!documents?.length || isDeletePending}
                  onClick={() =>
                    setDeleteDialog({
                      mode: 'all',
                      documents: documents ?? [],
                    })
                  }
                >
                  Delete all AI Reports
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading uploaded reports...</p>
              ) : documents && documents.length > 0 ? (
                <>
                  <div className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2 text-sm">
                    <label className="flex items-center gap-2 font-medium">
                      <SelectionCheckbox
                        checked={allVisibleReportsSelected}
                        indeterminate={someVisibleReportsSelected}
                        disabled={isDeletePending}
                        onChange={(event) =>
                          setAllVisibleDocumentsSelected(event.currentTarget.checked)
                        }
                        aria-label="Select all AI reports"
                      />
                      Select all
                    </label>
                    <span className="text-muted-foreground">
                      {selectedDocuments.length} selected
                    </span>
                  </div>
                  <div className="space-y-4">
                    {groupedDocuments.map((group) => (
                      <section
                        key={group.documentFamily}
                        className="space-y-2"
                        data-testid={`ai-report-family-${group.documentFamily}`}
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold">{group.label}</h3>
                          <Badge variant="outline">
                            {group.documents.length} report
                            {group.documents.length === 1 ? '' : 's'}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          {group.documents.map((document) => (
                            <DocumentListItem
                              key={document.id}
                              document={document}
                              selected={document.id === selectedDocument?.id}
                              checked={selectedDocumentIdSet.has(document.id)}
                              disabled={isDeletePending}
                              onCheckedChange={(checked) =>
                                setDocumentSelected(document.id, checked)
                              }
                              onSelect={() => setSelectedDocumentId(document.id)}
                              onRequestDelete={() =>
                                setDeleteDialog({
                                  mode: 'single',
                                  documents: [document],
                                })
                              }
                            />
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                </>
              ) : (
                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  No AI reports uploaded yet.
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            {selectedDocument ? (
              <>
                <Card>
                  <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <CardTitle className="text-base">{selectedDocument.filename}</CardTitle>
                      <CardDescription>
                        Local-first AI document with persisted OpenAI file/vector-store IDs.
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={documentStatusVariant(selectedDocument.status)}>
                        {selectedDocument.status.replace(/_/g, ' ')}
                      </Badge>
                      {selectedDocument.pileGroup?.name ? (
                        <Badge variant="outline">{selectedDocument.pileGroup.name}</Badge>
                      ) : (
                        <Badge variant="secondary">Project-level</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedReportClassification ? (
                      <AiReportClassificationFields
                        idPrefix="selected-ai-report"
                        classification={selectedReportClassification}
                        disabled={updateDocumentClassification.isPending}
                        onDocumentFamilyChange={(documentFamily) =>
                          handleUpdateDocumentClassification(
                            selectedDocument,
                            defaultAiReportClassificationForFamily(documentFamily),
                          )
                        }
                        onReportTypeChange={(reportType) =>
                          handleUpdateDocumentClassification(selectedDocument, {
                            ...selectedReportClassification,
                            reportType,
                          })
                        }
                        onOwnerWorkspaceChange={(ownerWorkspace) =>
                          handleUpdateDocumentClassification(selectedDocument, {
                            ...selectedReportClassification,
                            ownerWorkspace,
                          })
                        }
                      />
                    ) : null}

                    <div className="grid gap-3 md:grid-cols-2">
                      <DetailCard
                        label="OpenAI file"
                        value={selectedDocument.openaiFileId ?? 'Not uploaded yet'}
                      />
                      <DetailCard
                        label="Vector store"
                        value={selectedDocument.openaiVectorStoreId ?? 'Not attached yet'}
                      />
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Button
                        variant="secondary"
                        onClick={() => handleIndex(selectedDocument.id)}
                        disabled={indexDocument.isPending}
                      >
                        {indexDocument.isPending ? (
                          <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <FileSearch className="mr-2 h-4 w-4" />
                        )}
                        Index in OpenAI
                      </Button>

                      <Button
                        onClick={() => handleExtract(selectedDocument.id)}
                        disabled={extractDocument.isPending}
                      >
                        {extractDocument.isPending ? (
                          <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="mr-2 h-4 w-4" />
                        )}
                        Run Extraction
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {latestRun ? (
                  <>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Latest Extraction Run</CardTitle>
                        <CardDescription>
                          Model `{latestRun.model}` · {formatDateTime(latestRun.createdAt)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Badge variant={latestRun.status === 'completed' ? 'success' : 'warning'}>
                          {latestRun.status}
                        </Badge>
                      </CardContent>
                    </Card>

                    {normalizedExtraction ? (
                      <AiExtractionSummary extraction={normalizedExtraction} />
                    ) : (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Extraction Result</CardTitle>
                          <CardDescription>
                            The latest run did not produce the expected engineering-report schema.
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <pre className="max-h-[420px] overflow-auto rounded-md bg-muted/40 p-4 text-xs">
                            {JSON.stringify(latestExtraction, null, 2)}
                          </pre>
                        </CardContent>
                      </Card>
                    )}

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Raw Extraction JSON</CardTitle>
                        <CardDescription>
                          Stored `resultJson` payload for the latest extraction run.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <pre className="max-h-[420px] overflow-auto rounded-md bg-muted/40 p-4 text-xs">
                          {JSON.stringify(latestRun.resultJson, null, 2)}
                        </pre>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">No Extraction Yet</CardTitle>
                      <CardDescription>
                        Upload the file, index it in OpenAI, then run the engineering-report
                        extraction.
                      </CardDescription>
                    </CardHeader>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Select a report</CardTitle>
                  <CardDescription>
                    Choose an uploaded document from the left to inspect IDs, status, and extraction
                    output.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </div>
        </div>
      </div>

      <DeleteReportsDialog
        state={deleteDialog}
        pending={isDeletePending}
        onOpenChange={(open) => {
          if (!open && !isDeletePending) {
            setDeleteDialog(null);
          }
        }}
        onCancel={() => setDeleteDialog(null)}
        onConfirm={handleConfirmDeleteReports}
      />
    </>
  );
}

function compactAssistantLines(values: Array<string | null | undefined>) {
  return values.filter((value): value is string => Boolean(value && value.trim()));
}

function summarizeAssistantExtractionSections(
  extraction: NonNullable<ReturnType<typeof normalizeAiEngineeringReportExtraction>>,
) {
  const sections: string[] = [];

  if (extraction.reportMetadata.projectNumber.value) {
    sections.push('Report metadata');
  }
  if (extraction.investigationBasis.purposeScope.value) {
    sections.push('Investigation basis');
  }
  if (extraction.groundModel.boreholes.length > 0) {
    sections.push('Ground model');
  }
  if (extraction.groundwater.observedConditions.length > 0) {
    sections.push('Groundwater observations');
  }
  if (countProfileFindings(extraction.geotechnicalCommentProfile) > 0) {
    sections.push('Geotechnical comment / addendum');
  }
  if (countProfileFindings(extraction.dewateringProfile) > 0) {
    sections.push('Dewatering profile');
  }
  if (extraction.shallowFoundationBearingTable?.rows.length) {
    sections.push('Shallow foundations');
  }
  if (extraction.geotechnicalBasis.foundingNotes.length > 0) {
    sections.push('Founding notes');
  }
  if (
    extraction.pileConstruction.suitableMethods.length > 0 ||
    extraction.pileConstruction.constructionControls.length > 0
  ) {
    sections.push('Deep foundations / piles');
  }
  if (extraction.reportSections.siteClassification.length > 0) {
    sections.push('Site classification');
  }
  if (extraction.reportSections.workingPlatform.length > 0) {
    sections.push('Working platform');
  }
  if (extraction.reportSections.limitations.length > 0) {
    sections.push('Limitations');
  }
  if (extraction.structuralDefaults.concreteMentions.length > 0) {
    sections.push('Structural defaults');
  }
  if (
    extraction.loadMentions.loadCases.length > 0 ||
    extraction.loadMentions.combinations.length > 0
  ) {
    sections.push('Load mentions');
  }

  return sections;
}

function countProfileFindings(profile: object) {
  return Object.values(profile).reduce(
    (count, findings) => count + (Array.isArray(findings) ? findings.length : 0),
    0,
  );
}

function groupAiReportsByDocumentFamily(documents: AiDocument[]) {
  const groups = new Map<AiReportDocumentFamily, AiDocument[]>();
  for (const document of documents) {
    const classification = resolveAiReportClassification(document);
    const existing = groups.get(classification.documentFamily) ?? [];
    existing.push(document);
    groups.set(classification.documentFamily, existing);
  }

  return AI_REPORT_DOCUMENT_FAMILY_RENDER_ORDER.map((documentFamily) => ({
    documentFamily,
    label: formatAiReportDocumentFamily(documentFamily),
    documents: groups.get(documentFamily) ?? [],
  })).filter((group) => group.documents.length > 0);
}

function AiReportClassificationFields({
  idPrefix,
  classification,
  disabled = false,
  onDocumentFamilyChange,
  onReportTypeChange,
  onOwnerWorkspaceChange,
}: {
  idPrefix: string;
  classification: AiReportClassification;
  disabled?: boolean;
  onDocumentFamilyChange: (documentFamily: AiReportDocumentFamily) => void;
  onReportTypeChange: (reportType: AiReportType) => void;
  onOwnerWorkspaceChange: (ownerWorkspace: AiReportOwnerWorkspace) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-family`}>Document Family</Label>
        <Select
          value={classification.documentFamily}
          onValueChange={(value) => onDocumentFamilyChange(value as AiReportDocumentFamily)}
          disabled={disabled}
        >
          <SelectTrigger id={`${idPrefix}-family`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AI_REPORT_DOCUMENT_FAMILY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-type`}>Report Type</Label>
        <Select
          value={classification.reportType}
          onValueChange={(value) => onReportTypeChange(value as AiReportType)}
          disabled={disabled}
        >
          <SelectTrigger id={`${idPrefix}-type`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AI_REPORT_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-owner`}>Owner Workspace</Label>
        <Select
          value={classification.ownerWorkspace}
          onValueChange={(value) => onOwnerWorkspaceChange(value as AiReportOwnerWorkspace)}
          disabled={disabled}
        >
          <SelectTrigger id={`${idPrefix}-owner`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AI_REPORT_OWNER_WORKSPACE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

type SelectionCheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  indeterminate?: boolean;
};

function SelectionCheckbox({
  indeterminate = false,
  className = '',
  ...props
}: SelectionCheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      className={`h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`.trim()}
      {...props}
    />
  );
}

function DeleteReportsDialog({
  state,
  pending,
  onOpenChange,
  onCancel,
  onConfirm,
}: {
  state: DeleteReportsDialogState | null;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const reportCount = state?.documents.length ?? 0;
  const reportLabel = `${reportCount} AI report${reportCount === 1 ? '' : 's'}`;
  const title =
    state?.mode === 'all'
      ? 'Delete All AI Reports'
      : state?.mode === 'selected'
        ? 'Delete Selected AI Reports'
        : 'Delete AI Report';

  return (
    <Dialog open={state !== null} onOpenChange={onOpenChange}>
      <DialogContent
        onEscapeKeyDown={(event) => {
          if (pending) {
            event.preventDefault();
          }
        }}
        onPointerDownOutside={(event) => {
          if (pending) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            This will permanently delete {reportLabel} from this project. It removes the AI document
            record, stored extraction runs/results, local uploaded file, and linked OpenAI
            file/vector-store references for the deleted report{reportCount === 1 ? '' : 's'}.
            Project References and other project data will not be deleted.
          </DialogDescription>
        </DialogHeader>

        {state?.documents.length ? (
          <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
            {state.mode === 'single'
              ? state.documents[0]?.filename
              : `${reportLabel} selected for deletion`}
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={pending || reportCount === 0}
          >
            {pending ? 'Deleting...' : `Delete ${reportLabel}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DocumentListItem({
  document,
  selected,
  checked,
  disabled,
  onCheckedChange,
  onSelect,
  onRequestDelete,
}: {
  document: AiDocument;
  selected: boolean;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
  onSelect: () => void;
  onRequestDelete: () => void;
}) {
  const latestRun = document.extractionRuns[0] ?? null;
  const classification = resolveAiReportClassification(document);

  return (
    <div
      className={`w-full rounded-md border p-3 text-left transition-colors ${
        selected ? 'border-primary bg-accent/40' : 'hover:border-primary/40 hover:bg-accent/20'
      }`}
    >
      <div className="flex items-start gap-3">
        <SelectionCheckbox
          className="mt-1"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onCheckedChange(event.currentTarget.checked)}
          aria-label={`Select ${document.filename} for deletion`}
        />
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={onSelect}
          disabled={disabled}
        >
          <div className="flex flex-wrap items-center gap-2">
            <p className="break-words font-medium">{document.filename}</p>
            <Badge variant={documentStatusVariant(document.status)}>
              {document.status.replace(/_/g, ' ')}
            </Badge>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant="outline">
              {formatAiReportDocumentFamily(classification.documentFamily)}
            </Badge>
            <Badge variant="outline">{formatAiReportType(classification.reportType)}</Badge>
            <Badge variant="outline">
              {formatAiReportOwnerWorkspace(classification.ownerWorkspace)}
            </Badge>
          </div>
          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
            <p>Extraction status: {document.status.replace(/_/g, ' ')}</p>
            <p>
              Latest run: {latestRun ? `${latestRun.status} · ${latestRun.model}` : 'No run yet'}
            </p>
            <p>Uploaded: {formatDateTime(document.createdAt)}</p>
          </div>
        </button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRequestDelete}
          disabled={disabled}
          aria-label={`Delete ${document.filename}`}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 break-all text-sm font-medium">{value}</p>
    </div>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function documentStatusVariant(status: AiDocument['status']) {
  switch (status) {
    case 'indexed':
    case 'extracted':
      return 'success' as const;
    case 'index_failed':
    case 'extraction_failed':
      return 'destructive' as const;
    case 'indexing':
    case 'extracting':
      return 'warning' as const;
    default:
      return 'secondary' as const;
  }
}

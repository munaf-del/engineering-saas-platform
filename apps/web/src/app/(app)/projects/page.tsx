'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type InputHTMLAttributes,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useProjects, useCreateProject, useDeleteProject } from '@/hooks/use-projects';
import { useStandardsProfiles } from '@/hooks/use-standards';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/empty-state';
import { PageLoading } from '@/components/loading';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  buildProjectsAssistantPageContext,
  useRegisterAssistantPageContext,
} from '@/features/ai/assistant-page-context';
import { toast } from 'sonner';
import type { AuthUser, Project, ProjectMember } from '@eng/shared';

const PROJECTS_PAGE_SIZE = 25;
const MAX_BULK_DELETE_SELECTION = 25;

const statusColors: Record<string, string> = {
  active: 'success',
  on_hold: 'warning',
  completed: 'default',
  archived: 'secondary',
};

type ProjectListMember = ProjectMember & {
  user?: {
    id: string;
    email: string;
    name: string;
  };
};

type ProjectListItem = Project & {
  members?: ProjectListMember[];
};

type BulkDeleteFailure = {
  id: string;
  code: string;
  name: string;
  message: string;
};

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

function canDeleteProject(project: ProjectListItem, user: AuthUser | null) {
  if (!user) {
    return false;
  }

  if (user.orgRole === 'owner' || user.orgRole === 'admin') {
    return true;
  }

  return (
    project.members?.some((member) => member.userId === user.id && member.role === 'lead') ?? false
  );
}

function getSafeErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof ApiError)) {
    return fallback;
  }

  const body = error.body;
  if (!body || typeof body !== 'object') {
    return fallback;
  }

  const payload = body as Record<string, unknown>;
  const message = payload.message;
  if (typeof message === 'string' && message.trim()) {
    return message;
  }
  if (Array.isArray(message)) {
    const combined = message
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .join(', ');
    if (combined) {
      return combined;
    }
  }
  if (typeof payload.error === 'string' && payload.error.trim()) {
    return payload.error;
  }

  return fallback;
}

function getBulkDeleteConfirmationText(count: number) {
  return `DELETE ${count} PROJECT${count === 1 ? '' : 'S'}`;
}

function formatProjectCount(count: number) {
  return `${count} project${count === 1 ? '' : 's'}`;
}

export default function ProjectsPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: '',
    code: '',
    description: '',
    standardsProfileId: '',
  });
  const [projectToDelete, setProjectToDelete] = useState<ProjectListItem | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleteTargets, setBulkDeleteTargets] = useState<ProjectListItem[]>([]);
  const [bulkDeleteConfirmation, setBulkDeleteConfirmation] = useState('');
  const [bulkDeleteFailures, setBulkDeleteFailures] = useState<BulkDeleteFailure[]>([]);
  const [isBulkDeleteRunning, setIsBulkDeleteRunning] = useState(false);

  const projectsQuery = useProjects(page, PROJECTS_PAGE_SIZE);
  const { data, isLoading, error } = projectsQuery;
  const profilesQuery = useStandardsProfiles();
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();
  const bulkDeleteProject = useDeleteProject({ invalidateProjects: false });

  useEffect(() => {
    if (!isDeleteDialogOpen && projectToDelete && !deleteProject.isPending) {
      const timeout = window.setTimeout(() => {
        setProjectToDelete(null);
      }, 200);

      return () => window.clearTimeout(timeout);
    }

    return undefined;
  }, [deleteProject.isPending, isDeleteDialogOpen, projectToDelete]);

  const projects = (data?.data ?? []) as ProjectListItem[];
  const total = data?.meta?.total ?? 0;
  const totalPages = data?.meta?.totalPages ?? 1;
  const rangeStart = total === 0 ? 0 : (page - 1) * PROJECTS_PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PROJECTS_PAGE_SIZE, total);
  const visibleProjects = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) {
      return projects;
    }

    return projects.filter((project) =>
      `${project.code} ${project.name}`.toLowerCase().includes(normalizedSearch),
    );
  }, [projects, search]);
  const visibleProjectIds = useMemo(
    () => new Set(visibleProjects.map((project) => project.id)),
    [visibleProjects],
  );
  const selectedProjectIdSet = useMemo(() => new Set(selectedProjectIds), [selectedProjectIds]);
  const visibleDeletableProjects = useMemo(
    () => visibleProjects.filter((project) => canDeleteProject(project, user)),
    [user, visibleProjects],
  );
  const selectedProjects = useMemo(
    () => visibleProjects.filter((project) => selectedProjectIdSet.has(project.id)),
    [selectedProjectIdSet, visibleProjects],
  );
  const selectedCount = selectedProjects.length;
  const allVisibleSelected =
    visibleDeletableProjects.length > 0 &&
    visibleDeletableProjects.every((project) => selectedProjectIdSet.has(project.id));
  const someVisibleSelected =
    !allVisibleSelected &&
    visibleDeletableProjects.some((project) => selectedProjectIdSet.has(project.id));
  const typedProjectCode = deleteConfirmation.trim();
  const deleteEnabled = projectToDelete !== null && typedProjectCode === projectToDelete.code;
  const bulkDeletePrompt = getBulkDeleteConfirmationText(bulkDeleteTargets.length);
  const bulkDeleteEnabled =
    bulkDeleteTargets.length > 0 && bulkDeleteConfirmation.trim() === bulkDeletePrompt;
  const isDeleteActionDisabled = deleteProject.isPending || isBulkDeleteRunning;
  const searchTerm = search.trim();
  const hasVisibleDeleteActions = visibleDeletableProjects.length > 0;
  const bulkSelectionActive = selectedCount > 0;
  const assistantCurrentState = compactAssistantLines([
    searchTerm
      ? `Search filter "${searchTerm}" is applied on the current page`
      : 'No search filter is applied on the current page',
    visibleProjects.length === 0
      ? 'No project rows are currently visible on this page'
      : `${visibleProjects.length} visible row${visibleProjects.length === 1 ? '' : 's'} on this page`,
    bulkSelectionActive
      ? `${selectedCount} row${selectedCount === 1 ? '' : 's'} selected for bulk actions`
      : 'No rows are selected for bulk actions',
    hasVisibleDeleteActions
      ? `${visibleDeletableProjects.length} visible row${visibleDeletableProjects.length === 1 ? '' : 's'} expose delete selection controls`
      : visibleProjects.length > 0
        ? 'The visible rows do not currently expose delete actions with this permission set'
        : null,
  ]);
  const assistantLikelyBlockers = compactAssistantLines([
    searchTerm && visibleProjects.length === 0
      ? 'The current search returns no visible project rows on this page'
      : null,
    !hasVisibleDeleteActions && visibleProjects.length > 0
      ? 'Bulk delete cannot start from the current visible rows because none of them are deletable here'
      : null,
    bulkDeleteFailures.length > 0
      ? `${bulkDeleteFailures.length} selected project${bulkDeleteFailures.length === 1 ? '' : 's'} failed during the last bulk delete attempt`
      : null,
    isBulkDeleteRunning ? 'Bulk delete is still running' : null,
  ]);
  const assistantNextActions = compactAssistantLines([
    visibleProjects.length > 0 ? 'Open a project by clicking its table row' : null,
    hasVisibleDeleteActions && !bulkSelectionActive
      ? 'Use the row checkboxes or the header checkbox to select visible deletable projects'
      : null,
    bulkSelectionActive
      ? 'Use Delete selected to review the confirmation prompt before removing the selected projects'
      : null,
    searchTerm ? 'Clear or refine the search filter to change which rows are visible' : null,
    'Use New Project to create another project',
  ]);
  const assistantPageContext = useMemo(
    () =>
      buildProjectsAssistantPageContext({
        search,
        totalProjects: total,
        visibleProjectCount: visibleProjects.length,
        selectedRowsCount: selectedCount,
        bulkDeleteState: isBulkDeleteRunning
          ? 'running'
          : bulkDeleteFailures.length > 0
            ? 'failed'
            : isBulkDeleteDialogOpen
              ? 'confirming'
              : 'idle',
        visibleWarnings: [
          searchTerm && visibleProjects.length === 0
            ? 'The current search does not match any rows on this page'
            : null,
          !hasVisibleDeleteActions && visibleProjects.length > 0
            ? 'Delete actions are not available on the visible rows with the current permissions'
            : null,
          selectedCount > MAX_BULK_DELETE_SELECTION
            ? `Selected rows exceed the ${MAX_BULK_DELETE_SELECTION}-project bulk delete guardrail`
            : null,
          isBulkDeleteDialogOpen && bulkDeleteTargets.length > 0
            ? `Bulk delete confirmation is open for ${bulkDeleteTargets.length} project${bulkDeleteTargets.length === 1 ? '' : 's'}`
            : null,
        ],
        visibleErrors: [
          error ? getSafeErrorMessage(error, 'Projects could not be loaded') : null,
          ...bulkDeleteFailures.slice(0, 3).map((failure) => `${failure.name}: ${failure.message}`),
        ],
        extraKeyFacts: [
          `Page ${page} of ${totalPages}`,
          hasVisibleDeleteActions
            ? `${visibleDeletableProjects.length} visible project${visibleDeletableProjects.length === 1 ? '' : 's'} can be deleted from this page`
            : 'No visible delete actions',
        ],
        extraPageSpecificData: {
          page,
          totalPages,
          visibleRowsCount: visibleProjects.length,
          selectedRowsCount: selectedCount,
          searchTerm: searchTerm || null,
          bulkSelectionActive,
          bulkDeleteVisible: bulkSelectionActive,
          deleteActionsVisible: hasVisibleDeleteActions,
          visibleDeletableRowsCount: visibleDeletableProjects.length,
          selectionTools: {
            allVisibleSelected,
            someVisibleSelected,
            headerCheckboxEnabled: hasVisibleDeleteActions && !isDeleteActionDisabled,
            rowCheckboxesEnabled: hasVisibleDeleteActions && !isDeleteActionDisabled,
            bulkDeleteGuardrail: MAX_BULK_DELETE_SELECTION,
          },
          availableActions: assistantNextActions,
          assistantGuidance: {
            currentState: assistantCurrentState,
            missingInputs: [],
            likelyBlockers: assistantLikelyBlockers,
            nextActions: assistantNextActions,
            standardsReferenceNotes: [],
          },
        },
      }),
    [
      allVisibleSelected,
      assistantCurrentState,
      assistantLikelyBlockers,
      assistantNextActions,
      bulkDeleteFailures,
      error,
      hasVisibleDeleteActions,
      isBulkDeleteDialogOpen,
      isBulkDeleteRunning,
      isDeleteActionDisabled,
      page,
      search,
      searchTerm,
      selectedCount,
      someVisibleSelected,
      total,
      totalPages,
      visibleDeletableProjects.length,
      visibleProjects.length,
      bulkDeleteTargets.length,
      bulkSelectionActive,
    ],
  );

  useRegisterAssistantPageContext(assistantPageContext);

  useEffect(() => {
    setSelectedProjectIds((currentSelection) => {
      const nextSelection = currentSelection.filter((id) => visibleProjectIds.has(id));
      return nextSelection.length === currentSelection.length ? currentSelection : nextSelection;
    });
  }, [visibleProjectIds]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const project = await createProject.mutateAsync({
        name: form.name,
        code: form.code,
        description: form.description || undefined,
        standardsProfileId: form.standardsProfileId || undefined,
      });
      toast.success('Project created');
      setShowCreate(false);
      setForm({
        name: '',
        code: '',
        description: '',
        standardsProfileId: '',
      });
      router.push(`/projects/${project.id}`);
    } catch {
      toast.error('Failed to create project');
    }
  }

  async function handleDeleteProject() {
    if (!projectToDelete) {
      return;
    }

    try {
      await deleteProject.mutateAsync(projectToDelete.id);
      if (projects.length === 1 && page > 1) {
        setPage((currentPage) => currentPage - 1);
      } else {
        await projectsQuery.refetch();
      }
      toast.success(`Deleted ${projectToDelete.code}`);
      setDeleteConfirmation('');
      setIsDeleteDialogOpen(false);
    } catch (deleteError) {
      toast.error(
        getSafeErrorMessage(
          deleteError,
          'Failed to delete project. The project has not been removed.',
        ),
      );
    }
  }

  function clearSelection() {
    setSelectedProjectIds([]);
    setBulkDeleteFailures([]);
  }

  function handleProjectSelectionChange(project: ProjectListItem, checked: boolean) {
    setBulkDeleteFailures([]);
    setSelectedProjectIds((currentSelection) => {
      const isAlreadySelected = currentSelection.includes(project.id);

      if (!checked) {
        if (!isAlreadySelected) {
          return currentSelection;
        }
        return currentSelection.filter((id) => id !== project.id);
      }

      if (isAlreadySelected) {
        return currentSelection;
      }

      if (currentSelection.length >= MAX_BULK_DELETE_SELECTION) {
        toast.error(`You can delete up to ${MAX_BULK_DELETE_SELECTION} projects at once.`);
        return currentSelection;
      }

      return [...currentSelection, project.id];
    });
  }

  function handleSelectVisibleRows(checked: boolean) {
    setBulkDeleteFailures([]);

    if (!checked) {
      setSelectedProjectIds([]);
      return;
    }

    const visibleIds = visibleDeletableProjects
      .slice(0, MAX_BULK_DELETE_SELECTION)
      .map((project) => project.id);

    if (visibleDeletableProjects.length > MAX_BULK_DELETE_SELECTION) {
      toast.error(`You can delete up to ${MAX_BULK_DELETE_SELECTION} projects at once.`);
    }

    setSelectedProjectIds(visibleIds);
  }

  function openBulkDeleteDialog() {
    if (selectedProjects.length === 0) {
      return;
    }

    setBulkDeleteTargets(selectedProjects);
    setBulkDeleteConfirmation('');
    setIsBulkDeleteDialogOpen(true);
  }

  async function handleBulkDeleteProjects() {
    if (bulkDeleteTargets.length === 0) {
      return;
    }

    setIsBulkDeleteRunning(true);
    const targets = bulkDeleteTargets;
    const deletedIds: string[] = [];
    const failures: BulkDeleteFailure[] = [];

    try {
      for (const project of targets) {
        try {
          await bulkDeleteProject.mutateAsync(project.id);
          deletedIds.push(project.id);
        } catch (deleteError) {
          failures.push({
            id: project.id,
            code: project.code,
            name: project.name,
            message: getSafeErrorMessage(
              deleteError,
              'Failed to delete project. The project has not been removed.',
            ),
          });
        }
      }

      const deletedCount = deletedIds.length;
      const failedCount = failures.length;

      if (failedCount > 0) {
        toast.error(
          `Deleted ${deletedCount} ${
            deletedCount === 1 ? 'project' : 'projects'
          }, ${failedCount} failed`,
        );
      } else {
        toast.success(`Deleted ${formatProjectCount(deletedCount)}`);
      }

      setBulkDeleteFailures(failures);
      setSelectedProjectIds(failures.map((failure) => failure.id));
      setIsBulkDeleteDialogOpen(false);
      setBulkDeleteConfirmation('');
      setBulkDeleteTargets([]);

      const nextTotal = Math.max(total - deletedCount, 0);
      const nextLastPage = Math.max(1, Math.ceil(nextTotal / PROJECTS_PAGE_SIZE));

      if (page > nextLastPage) {
        setPage(nextLastPage);
      } else {
        await projectsQuery.refetch();
      }
    } finally {
      setIsBulkDeleteRunning(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Projects"
        description={`${total} project${total !== 1 ? 's' : ''} in this organisation`}
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        }
      />

      {isLoading ? (
        <PageLoading />
      ) : error ? (
        <div className="text-destructive">Failed to load projects</div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="h-12 w-12" />}
          title="No projects yet"
          description="Create your first project to start engineering calculations."
        />
      ) : (
        <div className="space-y-4">
          {bulkDeleteFailures.length > 0 ? (
            <Alert variant="warning">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>
                {bulkDeleteFailures.length} selected{' '}
                {bulkDeleteFailures.length === 1 ? 'project' : 'projects'} failed to delete
              </AlertTitle>
              <AlertDescription className="space-y-3">
                <ul className="list-disc space-y-1 pl-5">
                  {bulkDeleteFailures.map((failure) => (
                    <li key={failure.id}>
                      <span className="font-mono">{failure.code}</span> - {failure.name}:{' '}
                      {failure.message}
                    </li>
                  ))}
                </ul>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="px-0 text-amber-900 hover:bg-transparent hover:text-amber-950"
                  onClick={() => setBulkDeleteFailures([])}
                >
                  Dismiss
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-3">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
              />
            </div>

            {selectedCount > 0 ? (
              <div className="flex flex-col gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm">
                  <div className="font-medium text-foreground">
                    {selectedCount} selected for bulk delete
                  </div>
                  <div className="text-muted-foreground">
                    Selection is limited to visible rows on this page and capped at{' '}
                    {MAX_BULK_DELETE_SELECTION}.
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearSelection}
                    disabled={isDeleteActionDisabled}
                  >
                    Clear selection
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={openBulkDeleteDialog}
                    disabled={isDeleteActionDisabled}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete selected
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[56px]">
                    <div className="flex items-center justify-center">
                      <SelectionCheckbox
                        aria-label="Select all visible deletable projects"
                        checked={allVisibleSelected}
                        indeterminate={someVisibleSelected}
                        disabled={visibleDeletableProjects.length === 0 || isDeleteActionDisabled}
                        onChange={(event) => handleSelectVisibleRows(event.currentTarget.checked)}
                        title={
                          visibleDeletableProjects.length > 0
                            ? 'Select visible deletable projects'
                            : 'No deletable projects on this page'
                        }
                      />
                    </div>
                  </TableHead>
                  <TableHead className="w-[120px]">Code</TableHead>
                  <TableHead>Project Name</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[140px]">Last Modified</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleProjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No projects match this search on the current page.
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleProjects.map((project) => {
                    const canDelete = canDeleteProject(project, user);
                    const isSelected = selectedProjectIdSet.has(project.id);

                    return (
                      <TableRow
                        key={project.id}
                        data-state={isSelected ? 'selected' : undefined}
                        onClick={() => router.push(`/projects/${project.id}`)}
                        className="cursor-pointer"
                      >
                        <TableCell
                          className="w-[56px]"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <div className="flex items-center justify-center">
                            <SelectionCheckbox
                              aria-label={`Select ${project.code} for bulk delete`}
                              checked={isSelected}
                              disabled={!canDelete || isDeleteActionDisabled}
                              onChange={(event) =>
                                handleProjectSelectionChange(project, event.currentTarget.checked)
                              }
                              title={
                                canDelete
                                  ? `Select ${project.code}`
                                  : 'Project lead, organisation admin, or owner required'
                              }
                            />
                          </div>
                        </TableCell>
                        <TableCell className="w-[120px]">
                          <span className="font-mono font-medium">{project.code}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{project.name}</span>
                        </TableCell>
                        <TableCell className="w-[120px]">
                          <Badge
                            variant={
                              (statusColors[project.status] as
                                | 'success'
                                | 'warning'
                                | 'default'
                                | 'secondary') ?? 'default'
                            }
                          >
                            {project.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="w-[140px]">
                          <span className="text-sm text-muted-foreground">
                            {new Date(project.updatedAt).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell className="w-[120px]">
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              disabled={!canDelete || isDeleteActionDisabled}
                              title={
                                canDelete
                                  ? `Delete ${project.code}`
                                  : 'Project lead, organisation admin, or owner required'
                              }
                              onClick={(event) => {
                                event.stopPropagation();
                                setProjectToDelete(project);
                                setDeleteConfirmation('');
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {search.trim()
                  ? `Showing ${visibleProjects.length} of ${projects.length} on this page • ${total} total`
                  : `Showing ${rangeStart}-${rangeEnd} of ${total}`}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((currentPage) => currentPage - 1)}
                  disabled={page <= 1 || isDeleteActionDisabled}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-2">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((currentPage) => currentPage + 1)}
                  disabled={page >= totalPages || isDeleteActionDisabled}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Project</DialogTitle>
            <DialogDescription>Set up a new engineering project.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  value={form.code}
                  onChange={(event) => setForm({ ...form, code: event.target.value })}
                  required
                  placeholder="PRJ-001"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </div>
            {profilesQuery.data && profilesQuery.data.length > 0 ? (
              <div className="space-y-2">
                <Label>Standards Profile</Label>
                <Select
                  value={form.standardsProfileId}
                  onValueChange={(value) => setForm({ ...form, standardsProfileId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select profile..." />
                  </SelectTrigger>
                  <SelectContent>
                    {profilesQuery.data.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createProject.isPending}>
                {createProject.isPending ? 'Creating...' : 'Create Project'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!deleteProject.isPending) {
            setIsDeleteDialogOpen(open);
            setDeleteConfirmation('');
          }
        }}
      >
        <DialogContent
          onEscapeKeyDown={(event) => {
            if (deleteProject.isPending) {
              event.preventDefault();
            }
          }}
          onPointerDownOutside={(event) => {
            if (deleteProject.isPending) {
              event.preventDefault();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              {projectToDelete
                ? `This permanently removes ${projectToDelete.code} - ${projectToDelete.name} and its project-owned data, including pile groups, Multi-Pile authored state and envelope runs, calculations, project references, load definitions, and project-scoped documents.`
                : 'This permanently removes the selected project and its project-owned data.'}
            </DialogDescription>
          </DialogHeader>

          {projectToDelete ? (
            <div className="space-y-2">
              <Label htmlFor="delete-project-confirmation">
                Type <span className="font-mono">{projectToDelete.code}</span> to confirm
              </Label>
              <Input
                id="delete-project-confirmation"
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                placeholder={projectToDelete.code}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                disabled={deleteProject.isPending}
              />
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setDeleteConfirmation('');
              }}
              disabled={deleteProject.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteProject}
              disabled={!deleteEnabled || deleteProject.isPending}
            >
              {deleteProject.isPending ? 'Deleting...' : 'Delete Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isBulkDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!isBulkDeleteRunning) {
            setIsBulkDeleteDialogOpen(open);
            setBulkDeleteConfirmation('');
            if (!open) {
              setBulkDeleteTargets([]);
            }
          }
        }}
      >
        <DialogContent
          className="sm:max-w-lg"
          onEscapeKeyDown={(event) => {
            if (isBulkDeleteRunning) {
              event.preventDefault();
            }
          }}
          onPointerDownOutside={(event) => {
            if (isBulkDeleteRunning) {
              event.preventDefault();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Delete Selected Projects</DialogTitle>
            <DialogDescription>
              This permanently removes {formatProjectCount(bulkDeleteTargets.length)} and reuses the
              existing project delete path for each selected row.
            </DialogDescription>
          </DialogHeader>

          {bulkDeleteTargets.length > 0 ? (
            <>
              <div className="space-y-2">
                <div className="text-sm font-medium">{bulkDeleteTargets.length} selected</div>
                <div className="rounded-md border">
                  <ScrollArea className="max-h-56">
                    <ul className="divide-y">
                      {bulkDeleteTargets.map((project) => (
                        <li
                          key={project.id}
                          className="flex items-start justify-between gap-3 px-3 py-2 text-sm"
                        >
                          <span className="font-mono font-medium">{project.code}</span>
                          <span className="flex-1 text-right text-muted-foreground">
                            {project.name}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bulk-delete-project-confirmation">
                  Type <span className="font-mono">{bulkDeletePrompt}</span> to confirm
                </Label>
                <Input
                  id="bulk-delete-project-confirmation"
                  value={bulkDeleteConfirmation}
                  onChange={(event) => setBulkDeleteConfirmation(event.target.value)}
                  placeholder={bulkDeletePrompt}
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  disabled={isBulkDeleteRunning}
                />
              </div>
            </>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsBulkDeleteDialogOpen(false);
                setBulkDeleteConfirmation('');
                setBulkDeleteTargets([]);
              }}
              disabled={isBulkDeleteRunning}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleBulkDeleteProjects}
              disabled={!bulkDeleteEnabled || isBulkDeleteRunning}
            >
              {isBulkDeleteRunning
                ? 'Deleting selected projects...'
                : `Delete ${formatProjectCount(bulkDeleteTargets.length)}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function compactAssistantLines(values: Array<string | null | undefined>) {
  return values.filter((value): value is string => Boolean(value && value.trim()));
}

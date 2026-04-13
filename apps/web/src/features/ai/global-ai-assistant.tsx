'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  AI_AGENT_PROVIDER,
  AI_ASSISTANT_PROVIDER_LABELS,
  buildOrganisationAiSettingsResponse,
  resolveAiAgentRuntimeSelection,
  resolveAiAssistantRuntimeSelection,
} from '@eng/shared';
import {
  AlertTriangle,
  Bot,
  LoaderCircle,
  MessageSquare,
  RotateCcw,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useAiAssistantRespond, useAiRuntimeSettings } from '@/hooks/use-ai';
import { useAuth } from '@/lib/auth';
import type { CurrentPageActionExecutor } from './current-page-action-executor';
import {
  type AiAssistantDraftActionAdapter,
  useAssistantDraftActionAdapter,
  useAssistantCurrentPageActionExecutor,
  useAssistantPageContext,
  useAssistantSuggestionAdapter,
  type AiAssistantSuggestedField,
  type AiAssistantSuggestionApplyAdapter,
} from './assistant-page-context';
import {
  AI_ASSISTANT_QUICK_ACTION_LABELS,
  type AiAssistantConversationMessage,
  type AiAssistantMode,
  type AiAssistantQuickAction,
  type AiAssistantStructuredResponse,
} from './assistant-types';
import { ProjectAiSuggestionsContent } from '@/features/projects/project-ai-suggestions-content';

const LOCAL_STORAGE_PREFIX = 'eng.ai-assistant.v1';

export function GlobalAiAssistant() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const pageContext = useAssistantPageContext();
  const suggestionAdapter = useAssistantSuggestionAdapter();
  const currentPageActionExecutor = useAssistantCurrentPageActionExecutor();
  const draftActionAdapter = useAssistantDraftActionAdapter();
  const respond = useAiAssistantRespond();
  const aiRuntimeSettings = useAiRuntimeSettings(user?.organisationId ?? '');
  const fallbackRuntimeSettings = useMemo(() => buildOrganisationAiSettingsResponse(null), []);
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<AiAssistantMode>('assistant');
  const [draftMessage, setDraftMessage] = useState('');
  const [messages, setMessages] = useState<AiAssistantConversationMessage[]>([]);

  const storageKey = useMemo(
    () =>
      [
        LOCAL_STORAGE_PREFIX,
        mode,
        pageContext.projectId ?? 'no-project',
        pageContext.pileGroupId ?? 'no-group',
        pageContext.route,
      ].join(':'),
    [mode, pageContext.pileGroupId, pageContext.projectId, pageContext.route],
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        setMessages([]);
        return;
      }

      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setMessages(
          parsed.filter((entry): entry is AiAssistantConversationMessage => {
            return (
              entry &&
              typeof entry === 'object' &&
              typeof entry.id === 'string' &&
              typeof entry.role === 'string' &&
              typeof entry.content === 'string' &&
              typeof entry.createdAt === 'string'
            );
          }),
        );
        return;
      }
    } catch {
      // Ignore corrupted local state and start fresh.
    }

    setMessages([]);
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(messages.slice(-20)));
  }, [messages, storageKey]);

  if (shouldHideAssistant(pathname)) {
    return null;
  }

  const hasLimitedContext =
    pageContext.pageKind === 'generic' || pageContext.pageSpecificData.supportLevel === 'limited';
  const effectiveRuntimeSettings = aiRuntimeSettings.data ?? fallbackRuntimeSettings;
  const assistantRuntime = resolveAiAssistantRuntimeSelection(
    effectiveRuntimeSettings,
    effectiveRuntimeSettings.assistantProviderStatus,
  );
  const agentRuntime = resolveAiAgentRuntimeSelection(effectiveRuntimeSettings);
  const activeRuntime = mode === 'assistant' ? assistantRuntime : agentRuntime;
  const activeProvider = activeRuntime.provider;
  const activeModel = activeRuntime.model;
  const selectedAssistantProvider = effectiveRuntimeSettings.assistantProvider;
  const selectedAssistantProviderStatus =
    effectiveRuntimeSettings.assistantProviderStatus[selectedAssistantProvider];
  const assistantRuntimeNotice =
    mode === 'assistant' && aiRuntimeSettings.data
      ? buildAssistantRuntimeNotice({
          selectedProvider: selectedAssistantProvider,
          selectedProviderStatus: selectedAssistantProviderStatus,
          activeProvider: assistantRuntime.provider,
          activeModel: assistantRuntime.model,
        })
      : null;
  const routeScopedDraftActionAdapter = resolveAssistantDraftActionAdapterForRoute(
    pathname,
    draftActionAdapter,
  );
  const assistantActionDraftAdapter =
    mode === 'assistant' ? routeScopedDraftActionAdapter : null;
  const routeScopedSuggestionAdapter =
    assistantActionDraftAdapter != null ? suggestionAdapter : null;
  const routeScopedCurrentPageActionExecutor =
    assistantActionDraftAdapter != null ? currentPageActionExecutor : null;
  const supportsProjectDraftActions =
    assistantActionDraftAdapter?.kind === 'project';
  const supportsFieldDraftActions = false;

  async function sendMessage({
    content,
    quickAction,
  }: {
    content: string;
    quickAction?: AiAssistantQuickAction;
  }) {
    const trimmed = content.trim();
    if (!trimmed || respond.isPending) {
      return;
    }

    const nextUserMessage: AiAssistantConversationMessage = {
      id: createClientMessageId(),
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
      mode,
      quickAction,
    };

    const nextMessages = [...messages, nextUserMessage];
    setMessages(nextMessages);
    setDraftMessage('');
    setIsOpen(true);

    try {
      const response = await respond.mutateAsync({
        mode,
        messages: nextMessages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        pageContext,
        ...(quickAction ? { quickAction } : {}),
      });

      setMessages((current) => [...current, createAssistantMessage(response, mode, quickAction)]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Assistant request failed';
      toast.error(message);
      setMessages((current) => [
        ...current,
        createAssistantMessage(
          {
            answer:
              'I could not answer from the current page context just now. Please retry, or ask a narrower question about what is visible on this page.',
            visiblePageFacts: [],
            toolFindings: [],
            inferredLikelyIssues: [],
            standardsReferenceNotes: [],
            suggestedNextSteps: [],
            suggestedFields: [],
            draftActions: [],
            limitationNote: message,
          },
          mode,
          quickAction,
        ),
      ]);
    }
  }

  function clearConversation() {
    setMessages([]);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(storageKey);
    }
  }

  function clearSuggestions(messageId: string) {
    setMessages((current) =>
      current.map((message) =>
        message.id === messageId && message.structured
          ? {
              ...message,
              structured: {
                ...message.structured,
                suggestedFields: [],
                draftActions: [],
              },
            }
          : message,
      ),
    );
  }

  return (
    <>
      {isOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/10 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      ) : null}

      {isOpen ? (
        <section className="fixed bottom-24 right-6 top-20 z-50 flex w-[min(54rem,calc(100vw-3rem))] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-[1.75rem] border bg-background shadow-2xl max-md:left-4 max-md:right-4 max-md:top-16 max-md:w-auto">
          <div className="border-b bg-slate-950 px-5 py-4 text-slate-50">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  <h2 className="text-sm font-semibold">AI Assistant</h2>
                  <Badge variant="secondary" className="bg-white/10 text-white">
                    {getAssistantModeLabel(mode)}
                  </Badge>
                  <Badge variant="secondary" className="bg-white/10 text-white">
                    {pageContext.pageTitle}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-slate-300">
                  {mode === 'assistant'
                    ? supportsProjectDraftActions
                      ? 'Guided current-page draft actions on supported pages. You review and apply changes manually, and Save stays manual.'
                      : supportsFieldDraftActions
                        ? 'Guided current-page draft apply where supported. You stay in control, and Save stays manual.'
                        : 'Guidance-first support for the current page. This page does not yet support draft actions.'
                    : `Separate OpenAI-only beta mode that stays read-only while gathering extra internal context before answering.`}
                </p>
                {activeModel ? (
                  <p className="mt-1 text-[11px] text-slate-300">
                    Provider: {AI_ASSISTANT_PROVIDER_LABELS[activeProvider]} | Model:{' '}
                    {activeModel}
                  </p>
                ) : null}
                {assistantRuntimeNotice ? (
                  <p className="mt-1 text-[11px] text-amber-200">{assistantRuntimeNotice}</p>
                ) : null}
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-50 hover:bg-white/10 hover:text-white"
                onClick={() => setIsOpen(false)}
                aria-label="Close assistant"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="border-b px-5 py-4">
            <div className="rounded-xl border bg-muted/30 p-1">
              <div className="grid grid-cols-2 gap-1">
                {(['assistant', 'agent'] as const).map((candidateMode) => (
                  <Button
                    key={candidateMode}
                    type="button"
                    size="sm"
                    variant={mode === candidateMode ? 'default' : 'ghost'}
                    disabled={respond.isPending}
                    onClick={() => setMode(candidateMode)}
                    className="justify-between"
                  >
                    <span>{getAssistantModeLabel(candidateMode)}</span>
                    {candidateMode === 'agent' ? (
                      <span className="text-[10px] uppercase tracking-[0.16em]">
                        OpenAI-only
                      </span>
                    ) : null}
                  </Button>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {Object.entries(AI_ASSISTANT_QUICK_ACTION_LABELS).map(([quickAction, label]) => (
                <Button
                  key={quickAction}
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={respond.isPending}
                  className="justify-start whitespace-normal text-left"
                  onClick={() =>
                    sendMessage({
                      content: label,
                      quickAction: quickAction as AiAssistantQuickAction,
                    })
                  }
                >
                  {label}
                </Button>
              ))}
              {assistantActionDraftAdapter?.kind === 'project' &&
              assistantActionDraftAdapter.aiReportsHref ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={respond.isPending}
                  className="justify-start whitespace-normal text-left"
                  onClick={() => {
                    router.push(assistantActionDraftAdapter.aiReportsHref ?? '');
                    setIsOpen(false);
                  }}
                >
                  Open AI Reports Upload
                </Button>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant={pageContext.saveState === 'unsaved' ? 'warning' : 'outline'}>
                Save state: {pageContext.saveState}
              </Badge>
              {pageContext.keyFacts.slice(0, 3).map((fact) => (
                <Badge
                  key={fact}
                  variant="outline"
                  className="max-w-full whitespace-normal text-left"
                >
                  {fact}
                </Badge>
              ))}
            </div>

            {hasLimitedContext ? (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    This page is using fallback route context, so answers may be more limited.
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          <ScrollArea className="flex-1 px-5 py-5">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="rounded-xl border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
                  Ask about what this page is showing, what looks incomplete, or what to do next.
                  On supported pages, I can also suggest current-page draft changes for you to
                  review and apply manually.
                </div>
              ) : null}

              {messages.map((message) =>
                message.role === 'user' ? (
                  <div
                    key={message.id}
                    className="ml-6 rounded-2xl bg-slate-950 px-4 py-3 text-sm text-slate-50 sm:ml-12"
                  >
                    {message.content}
                  </div>
                ) : (
                  <AssistantMessageCard
                    key={message.id}
                    message={message}
                    suggestionAdapter={routeScopedSuggestionAdapter}
                    currentPageActionExecutor={routeScopedCurrentPageActionExecutor}
                    draftActionAdapter={assistantActionDraftAdapter}
                    onClearSuggestions={clearSuggestions}
                  />
                ),
              )}

              {respond.isPending ? (
                <div className="mr-6 rounded-2xl border bg-card px-4 py-3 text-sm text-muted-foreground sm:mr-12">
                  <div className="flex items-center gap-2">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    {mode === 'assistant'
                      ? 'Thinking through the current page context...'
                      : 'Gathering read-only workspace context and reasoning through it...'}
                  </div>
                </div>
              ) : null}
            </div>
          </ScrollArea>

          <div className="border-t px-5 py-4">
            <Textarea
              value={draftMessage}
              onChange={(event) => setDraftMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void sendMessage({ content: draftMessage });
                }
              }}
              placeholder={
                mode === 'assistant'
                  ? 'Ask about this page, or ask for draft suggestions you can review and apply manually...'
                  : 'Ask for a read-only review using project, workspace, and report context...'
              }
              className="min-h-[104px] resize-none"
            />

            <div className="mt-3 flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearConversation}
                disabled={respond.isPending || messages.length === 0}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Clear conversation
              </Button>

              <Button
                type="button"
                onClick={() => void sendMessage({ content: draftMessage })}
                disabled={respond.isPending || draftMessage.trim().length === 0}
              >
                {respond.isPending ? (
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Send
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      <div className="fixed bottom-6 right-6 z-40">
        <Button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="h-14 rounded-full px-5 shadow-lg"
        >
          {isOpen ? <X className="mr-2 h-5 w-5" /> : <Sparkles className="mr-2 h-5 w-5" />}
          {isOpen ? 'Close Assistant' : 'AI Assistant'}
        </Button>
      </div>
    </>
  );
}

function AssistantMessageCard({
  message,
  suggestionAdapter,
  currentPageActionExecutor,
  draftActionAdapter,
  onClearSuggestions,
}: {
  message: AiAssistantConversationMessage;
  suggestionAdapter: AiAssistantSuggestionApplyAdapter | null;
  currentPageActionExecutor: CurrentPageActionExecutor | null;
  draftActionAdapter: AiAssistantDraftActionAdapter | null;
  onClearSuggestions: (messageId: string) => void;
}) {
  const structured = message.structured;
  const mode = message.mode ?? 'assistant';
  const suggestedFields = structured?.suggestedFields ?? [];
  const shouldRenderProjectDraftSuggestions =
    mode === 'assistant' &&
    draftActionAdapter?.kind === 'project' &&
    structured != null &&
    (structured.suggestedFields.length > 0 || structured.limitationNote != null);
  const applicableSuggestionKeys = useMemo(
    () =>
      suggestedFields
        .filter((field) => canApplySuggestion(suggestionAdapter, field))
        .map((field) => suggestionKey(field)),
    [suggestedFields, suggestionAdapter],
  );
  const applicableSuggestionSignature = useMemo(
    () => applicableSuggestionKeys.join('\u001f'),
    [applicableSuggestionKeys],
  );
  const applicableSuggestionCount = applicableSuggestionKeys.length;
  const [selectedSuggestionKeys, setSelectedSuggestionKeys] = useState<Set<string>>(
    () => new Set(applicableSuggestionKeys),
  );
  const selectedApplicableSuggestionCount = useMemo(
    () =>
      applicableSuggestionKeys.filter((key) => selectedSuggestionKeys.has(key)).length,
    [applicableSuggestionKeys, selectedSuggestionKeys],
  );
  const applicableSuggestionKeysRef = useRef(applicableSuggestionKeys);
  const hasInitializedSelectionRef = useRef(applicableSuggestionKeys.length > 0);

  applicableSuggestionKeysRef.current = applicableSuggestionKeys;

  useEffect(() => {
    if (hasInitializedSelectionRef.current || applicableSuggestionKeysRef.current.length === 0) {
      return;
    }

    hasInitializedSelectionRef.current = true;
    setSelectedSuggestionKeys((current) => {
      const next = new Set(applicableSuggestionKeysRef.current);
      return areSuggestionKeySetsEqual(current, next) ? current : next;
    });
  }, [applicableSuggestionSignature]);

  function handleToggleSuggestion(key: string, checked: boolean) {
    setSelectedSuggestionKeys((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  }

  function handleApplySelected() {
    if (!suggestionAdapter) {
      toast.error('This page does not yet support draft apply.');
      return;
    }

    const selectedSuggestions = suggestedFields.filter(
      (field) =>
        selectedSuggestionKeys.has(suggestionKey(field)) &&
        canApplySuggestion(suggestionAdapter, field),
    );
    if (selectedSuggestions.length === 0) {
      toast.error('Select at least one applicable suggestion to apply.');
      return;
    }

    const result = suggestionAdapter.applySuggestions(selectedSuggestions);
    if (result.appliedCount > 0) {
      toast.success(
        `${result.appliedCount} suggestion${result.appliedCount === 1 ? '' : 's'} applied to the current form draft. Save remains manual.`,
      );
    } else {
      toast('No selected suggestions were applied.');
    }

    if (result.appliedCount > 0) {
      const appliedKeys = new Set(selectedSuggestions.map((field) => suggestionKey(field)));
      setSelectedSuggestionKeys((current) => {
        const next = new Set(current);
        appliedKeys.forEach((key) => next.delete(key));
        return next;
      });
    }
  }

  function handleSelectAllApplicable() {
    setSelectedSuggestionKeys(new Set(applicableSuggestionKeys));
  }

  function handleClearSelection() {
    setSelectedSuggestionKeys(new Set());
  }

  return (
    <div className="mr-6 rounded-2xl border bg-card px-4 py-3 text-sm sm:mr-12">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        <MessageSquare className="h-3.5 w-3.5" />
        {getAssistantModeLabel(mode)}
      </div>

      <p className="mt-2 whitespace-pre-wrap text-foreground">
        {structured?.answer ?? message.content}
      </p>

      {structured?.visiblePageFacts.length ? (
        <StructuredList title="Visible page facts" items={structured.visiblePageFacts} />
      ) : null}
      {structured?.toolFindings?.length ? (
        <StructuredList title="Tool findings" items={structured.toolFindings} />
      ) : null}
      {structured?.inferredLikelyIssues.length ? (
        <StructuredList title="Likely issues" items={structured.inferredLikelyIssues} />
      ) : null}
      {structured?.standardsReferenceNotes.length ? (
        <StructuredList
          title="Standards reference notes"
          items={structured.standardsReferenceNotes}
        />
      ) : null}
      {structured?.suggestedNextSteps.length ? (
        <StructuredList title="Suggested next steps" items={structured.suggestedNextSteps} />
      ) : null}
      {shouldRenderProjectDraftSuggestions && structured && draftActionAdapter ? (
        <ProjectAiSuggestionsContent
          response={structured}
          suggestionAdapter={suggestionAdapter}
          currentPageActionExecutor={currentPageActionExecutor}
          draftActionAdapter={draftActionAdapter}
          presentation="assistant"
        />
      ) : suggestedFields.length ? (
        <div className="mt-3 rounded-2xl border bg-muted/20 p-3">
          <div className="flex flex-col gap-3 border-b pb-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Suggestion Review List
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedApplicableSuggestionCount} of {applicableSuggestionCount} applicable suggestion
                {applicableSuggestionCount === 1 ? '' : 's'} selected. Applying updates the current form
                draft only.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={applicableSuggestionCount === 0}
                onClick={handleSelectAllApplicable}
              >
                Select all applicable
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={selectedApplicableSuggestionCount === 0}
                onClick={handleClearSelection}
              >
                Clear selection
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={
                  !suggestionAdapter ||
                  suggestedFields.every(
                    (field) =>
                      !selectedSuggestionKeys.has(suggestionKey(field)) ||
                      !canApplySuggestion(suggestionAdapter, field),
                  )
                }
                onClick={handleApplySelected}
              >
                Apply selected
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => onClearSuggestions(message.id)}
              >
                Clear suggestions
              </Button>
            </div>
          </div>
          <div className="mt-3 space-y-3">
            {suggestedFields.map((field) => {
              const key = suggestionKey(field);
              const isApplicable = canApplySuggestion(suggestionAdapter, field);
              const currentValue = suggestionAdapter?.getCurrentValue(field.fieldPath) ?? null;

              return (
                <label
                  key={key}
                  className={`block rounded-xl border px-3 py-3 ${
                    isApplicable ? 'bg-background' : 'bg-muted/10 opacity-80'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border border-input"
                      checked={selectedSuggestionKeys.has(key)}
                      disabled={!isApplicable}
                      onChange={(event) => handleToggleSuggestion(key, event.target.checked)}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-medium">{field.label}</div>
                        <Badge variant="secondary">
                          {formatSuggestionSection(field.fieldPath)}
                        </Badge>
                        <Badge variant="outline">
                          {formatSuggestionSourceType(field.sourceType)}
                        </Badge>
                        <Badge variant="secondary">{formatApplyMode(field.applyMode)}</Badge>
                        {field.confidence != null ? (
                          <Badge variant="outline">{formatConfidence(field.confidence)}</Badge>
                        ) : null}
                      </div>

                      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,0.9fr),minmax(0,0.9fr),minmax(0,1.2fr)]">
                        <ReviewCell title="Current value">
                          {formatSuggestionValue(currentValue)}
                        </ReviewCell>
                        <ReviewCell title="Suggested value">{field.suggestedValue}</ReviewCell>
                        <div className="grid gap-3">
                          <ReviewCell title="Source / rationale">
                            <div>{field.sourceSummary}</div>
                            <div className="mt-2 text-muted-foreground">{field.rationale}</div>
                          </ReviewCell>
                        </div>
                      </div>

                      {!isApplicable ? (
                        <div className="mt-2 text-xs text-amber-700">
                          Applying is not supported for this field on the current page yet.
                        </div>
                      ) : null}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      ) : null}
      {structured?.limitationNote && !shouldRenderProjectDraftSuggestions ? (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {structured.limitationNote}
        </div>
      ) : null}
    </div>
  );
}

function buildAssistantRuntimeNotice({
  selectedProvider,
  selectedProviderStatus,
  activeProvider,
  activeModel,
}: {
  selectedProvider: keyof typeof AI_ASSISTANT_PROVIDER_LABELS;
  selectedProviderStatus: {
    available: boolean;
    statusReason: string;
    credentialIssueReason?: string | null;
  };
  activeProvider: keyof typeof AI_ASSISTANT_PROVIDER_LABELS;
  activeModel: string;
}) {
  if (selectedProvider !== activeProvider) {
    if (
      selectedProviderStatus.statusReason === 'credential_unusable' &&
      selectedProviderStatus.credentialIssueReason ===
        'stored_credential_cannot_be_decrypted'
    ) {
      return `${AI_ASSISTANT_PROVIDER_LABELS[selectedProvider]} has a stored organisation credential that cannot currently be decrypted, so chat is falling back to ${AI_ASSISTANT_PROVIDER_LABELS[activeProvider]} with ${activeModel} right now.`;
    }

    if (
      selectedProviderStatus.statusReason === 'credential_unusable' &&
      selectedProviderStatus.credentialIssueReason === 'encryption_secret_unavailable'
    ) {
      return `${AI_ASSISTANT_PROVIDER_LABELS[selectedProvider]} has a stored organisation credential, but the organisation encryption secret is currently unavailable, so chat is falling back to ${AI_ASSISTANT_PROVIDER_LABELS[activeProvider]} with ${activeModel} right now.`;
    }

    return `The saved assistant provider is unavailable, so chat is falling back to ${AI_ASSISTANT_PROVIDER_LABELS[activeProvider]} with ${activeModel} right now.`;
  }

  if (
    selectedProviderStatus.statusReason === 'credential_unusable' &&
    selectedProviderStatus.available
  ) {
    if (
      selectedProviderStatus.credentialIssueReason ===
      'stored_credential_cannot_be_decrypted'
    ) {
      return `${AI_ASSISTANT_PROVIDER_LABELS[selectedProvider]} has a stored organisation credential that cannot currently be decrypted, so assistant chat is using environment fallback right now.`;
    }

    if (
      selectedProviderStatus.credentialIssueReason === 'encryption_secret_unavailable'
    ) {
      return `${AI_ASSISTANT_PROVIDER_LABELS[selectedProvider]} has a stored organisation credential, but the organisation encryption secret is currently unavailable, so assistant chat is using environment fallback right now.`;
    }

    return `${AI_ASSISTANT_PROVIDER_LABELS[selectedProvider]} has a stored organisation credential that is not currently usable, so assistant chat is using environment fallback right now.`;
  }

  if (selectedProviderStatus.statusReason === 'environment_fallback') {
    return `${AI_ASSISTANT_PROVIDER_LABELS[selectedProvider]} is currently using environment fallback because this organisation does not have a stored assistant credential.`;
  }

  if (selectedProviderStatus.statusReason === 'credential_unusable') {
    if (
      selectedProviderStatus.credentialIssueReason ===
      'stored_credential_cannot_be_decrypted'
    ) {
      return `${AI_ASSISTANT_PROVIDER_LABELS[selectedProvider]} has a stored organisation credential that cannot currently be decrypted, and no environment fallback is available right now.`;
    }

    if (
      selectedProviderStatus.credentialIssueReason === 'encryption_secret_unavailable'
    ) {
      return `${AI_ASSISTANT_PROVIDER_LABELS[selectedProvider]} has a stored organisation credential, but the organisation encryption secret is currently unavailable, and no environment fallback is available right now.`;
    }

    return `${AI_ASSISTANT_PROVIDER_LABELS[selectedProvider]} has a stored organisation credential that is not currently usable, and no environment fallback is available right now.`;
  }

  if (!selectedProviderStatus.available) {
    return `${AI_ASSISTANT_PROVIDER_LABELS[selectedProvider]} is currently unavailable until assistant credentials are configured or environment fallback is restored.`;
  }

  return null;
}

function StructuredList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-3 space-y-2">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </div>
      <ul className="space-y-1 text-foreground">
        {items.map((item) => (
          <li key={item} className="rounded-xl bg-muted/30 px-3 py-2">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReviewCell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border bg-background px-3 py-2">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </div>
      <div className="mt-1 whitespace-pre-wrap text-foreground">{children}</div>
    </div>
  );
}

function createAssistantMessage(
  response: AiAssistantStructuredResponse,
  mode: AiAssistantMode,
  quickAction?: AiAssistantQuickAction,
): AiAssistantConversationMessage {
  return {
    id: createClientMessageId(),
    role: 'assistant',
    content: response.answer,
    createdAt: new Date().toISOString(),
    mode,
    quickAction,
    structured: response,
  };
}

function createClientMessageId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `assistant-${Math.random().toString(36).slice(2, 10)}`;
}

function shouldHideAssistant(pathname: string) {
  return /\/report$/.test(pathname);
}

function resolveAssistantDraftActionAdapterForRoute(
  pathname: string,
  draftActionAdapter: AiAssistantDraftActionAdapter | null,
) {
  if (draftActionAdapter?.kind !== 'project') {
    return null;
  }

  if (draftActionAdapter.scope === 'project-page') {
    return /^\/projects\/[^/]+$/.test(pathname) ? draftActionAdapter : null;
  }
  if (draftActionAdapter.scope === 'project-geotechnical') {
    return /^\/projects\/[^/]+\/project-geotechnical$/.test(pathname) ? draftActionAdapter : null;
  }
  if (draftActionAdapter.scope === 'project-foundations') {
    return /^\/projects\/[^/]+\/pile-groups$/.test(pathname) ? draftActionAdapter : null;
  }

  return null;
}

function getAssistantModeLabel(mode: AiAssistantMode) {
  return mode === 'agent' ? 'Agent (Beta)' : 'Assistant';
}

function suggestionKey(field: AiAssistantSuggestedField) {
  return [field.fieldPath, field.suggestedValue, field.sourceSummary].join('::');
}

function canApplySuggestion(
  suggestionAdapter: AiAssistantSuggestionApplyAdapter | null,
  field: AiAssistantSuggestedField,
) {
  if (!suggestionAdapter) {
    return false;
  }
  return suggestionAdapter.canApplyField ? suggestionAdapter.canApplyField(field.fieldPath) : true;
}

function formatSuggestionSourceType(sourceType: AiAssistantSuggestedField['sourceType']) {
  switch (sourceType) {
    case 'report_derived':
      return 'Report-derived';
    case 'page_context_inference':
      return 'Page context';
    case 'internal_tool':
      return 'Internal tool';
    case 'project_state':
      return 'Project state';
    case 'standards_reference':
      return 'Standards reference';
    default:
      return sourceType;
  }
}

function formatSuggestionSection(fieldPath: string) {
  if (fieldPath.startsWith('identity.') || fieldPath.startsWith('reportMeta.')) {
    return 'Project Details';
  }
  if (fieldPath.startsWith('references[')) {
    return 'Project References';
  }
  if (
    fieldPath.startsWith('geotechnicalBasis.') ||
    fieldPath.startsWith('geotechnicalMaterials.')
  ) {
    return 'Project Geotechnical';
  }
  if (fieldPath.startsWith('pileTypes[')) {
    return 'Pile Types';
  }
  if (fieldPath.startsWith('joints[')) {
    return 'Joint Loads';
  }

  return 'Current page';
}

function formatApplyMode(applyMode: AiAssistantSuggestedField['applyMode']) {
  return applyMode === 'fill-if-empty' ? 'Fill if empty' : 'Replace';
}

function formatConfidence(confidence: number) {
  return `${Math.round(confidence * 100)}% confidence`;
}

function formatSuggestionValue(value: string | null) {
  return value && value.trim().length > 0 ? value : 'Empty';
}

function areSuggestionKeySetsEqual(current: Set<string>, next: Set<string>) {
  if (current.size !== next.size) {
    return false;
  }

  for (const key of next) {
    if (!current.has(key)) {
      return false;
    }
  }

  return true;
}

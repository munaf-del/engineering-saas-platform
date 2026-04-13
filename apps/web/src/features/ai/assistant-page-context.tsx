'use client';

import type { MultiPileProjectSpecifics } from '@eng/shared';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import type { CurrentPageActionExecutor } from './current-page-action-executor';

export type AiAssistantSaveState = 'saved' | 'unsaved' | 'saving' | 'readonly' | 'unknown';

export type AiAssistantSuggestionSourceType =
  | 'report_derived'
  | 'page_context_inference'
  | 'internal_tool'
  | 'project_state'
  | 'standards_reference';

export type AiAssistantSuggestionApplyMode = 'replace' | 'fill-if-empty';

export type AiAssistantSuggestedField = {
  fieldPath: string;
  label: string;
  suggestedValue: string;
  sourceType: AiAssistantSuggestionSourceType;
  sourceSummary: string;
  rationale: string;
  confidence: number | null;
  applyMode: AiAssistantSuggestionApplyMode;
};

export type AiAssistantSuggestionApplyResult = {
  appliedCount: number;
  skippedCount: number;
};

export type AiAssistantProjectGeotechnicalMaterialCandidate = {
  id: string;
  index: number;
  unitCode: string;
  displayName: string;
  sourceDocument: string;
  sourceProject: string;
  sourceSite: string;
  sourceSection: string;
  sourceTable: string;
  notes: string;
  gamma_b: number | null;
  phi_prime: number | null;
  c_prime: number | null;
  cu: number | null;
  E_MPa: number | null;
  nu: number | null;
  Ka: number | null;
  Ko: number | null;
  Kp: number | null;
  pile_fms_comp_kPa: number | null;
  pile_fms_allow_kPa: number | null;
  pile_fms_tension_kPa: number | null;
  pile_fb_ult_kPa: number | null;
  pile_fb_allow_kPa: number | null;
  cfaUpliftTensionFactor: number | null;
  sourceSummary: string;
  confidence: number | null;
  suggestions: AiAssistantSuggestedField[];
};

export type AiAssistantSuggestionApplyAdapter = {
  getCurrentValue: (fieldPath: string) => string | null;
  canApplyField?: (fieldPath: string) => boolean;
  applySuggestions: (suggestions: AiAssistantSuggestedField[]) => AiAssistantSuggestionApplyResult;
};

export type AiAssistantDraftActionAdapter = {
  kind: 'project';
  scope: 'project-page' | 'project-geotechnical' | 'project-foundations';
  projectSpecifics: MultiPileProjectSpecifics;
  aiReportsHref?: string | null;
  onAddMaterialCandidate?: (
    candidate: AiAssistantProjectGeotechnicalMaterialCandidate,
    includeInProject: boolean,
  ) => void;
  onApplyMaterialCandidateToExisting?: (
    candidate: AiAssistantProjectGeotechnicalMaterialCandidate,
    targetIndex: number,
  ) => void;
};

export type AiAssistantPageContext = {
  route: string;
  pageTitle: string;
  projectId: string | null;
  pileGroupId: string | null;
  pageKind: string;
  visibleWarnings: string[];
  visibleErrors: string[];
  saveState: AiAssistantSaveState;
  keyFacts: string[];
  pageSpecificData: Record<string, unknown>;
};

type AiAssistantPageContextValue = {
  pageContext: AiAssistantPageContext;
  registerPageContext: (pageContext: AiAssistantPageContext | null) => void;
  suggestionAdapter: AiAssistantSuggestionApplyAdapter | null;
  registerSuggestionAdapter: (adapter: AiAssistantSuggestionApplyAdapter | null) => void;
  currentPageActionExecutor: CurrentPageActionExecutor | null;
  registerCurrentPageActionExecutor: (executor: CurrentPageActionExecutor | null) => void;
  draftActionAdapter: AiAssistantDraftActionAdapter | null;
  registerDraftActionAdapter: (adapter: AiAssistantDraftActionAdapter | null) => void;
};

const AiAssistantPageContextRegistry = createContext<AiAssistantPageContextValue | null>(null);

export function AiAssistantPageContextProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [registeredPageContext, setRegisteredPageContext] = useState<AiAssistantPageContext | null>(
    null,
  );
  const [registeredSuggestionAdapter, setRegisteredSuggestionAdapter] =
    useState<AiAssistantSuggestionApplyAdapter | null>(null);
  const [registeredCurrentPageActionExecutor, setRegisteredCurrentPageActionExecutor] =
    useState<CurrentPageActionExecutor | null>(null);
  const [registeredDraftActionAdapter, setRegisteredDraftActionAdapter] =
    useState<AiAssistantDraftActionAdapter | null>(null);

  useEffect(() => {
    setRegisteredPageContext((current) => (current === null ? current : null));
    setRegisteredSuggestionAdapter((current) => (current === null ? current : null));
    setRegisteredCurrentPageActionExecutor((current) => (current === null ? current : null));
    setRegisteredDraftActionAdapter((current) => (current === null ? current : null));
  }, [pathname]);

  const fallbackPageContext = useMemo(() => buildGenericAssistantPageContext(pathname), [pathname]);

  const registerPageContext = useCallback((pageContext: AiAssistantPageContext | null) => {
    setRegisteredPageContext((current) =>
      getPageContextSignature(current) === getPageContextSignature(pageContext)
        ? current
        : pageContext,
    );
  }, []);
  const registerSuggestionAdapter = useCallback(
    (adapter: AiAssistantSuggestionApplyAdapter | null) => {
      setRegisteredSuggestionAdapter((current) => (current === adapter ? current : adapter));
    },
    [],
  );
  const registerCurrentPageActionExecutor = useCallback(
    (executor: CurrentPageActionExecutor | null) => {
      setRegisteredCurrentPageActionExecutor((current) =>
        current === executor ? current : executor,
      );
    },
    [],
  );
  const registerDraftActionAdapter = useCallback(
    (adapter: AiAssistantDraftActionAdapter | null) => {
      setRegisteredDraftActionAdapter((current) => (current === adapter ? current : adapter));
    },
    [],
  );

  const pageContext =
    registeredPageContext && registeredPageContext.route === pathname
      ? registeredPageContext
      : fallbackPageContext;

  const value = useMemo(
    () => ({
      pageContext,
      registerPageContext,
      suggestionAdapter: registeredSuggestionAdapter,
      registerSuggestionAdapter,
      currentPageActionExecutor: registeredCurrentPageActionExecutor,
      registerCurrentPageActionExecutor,
      draftActionAdapter: registeredDraftActionAdapter,
      registerDraftActionAdapter,
    }),
    [
      pageContext,
      registerCurrentPageActionExecutor,
      registerDraftActionAdapter,
      registerPageContext,
      registerSuggestionAdapter,
      registeredCurrentPageActionExecutor,
      registeredDraftActionAdapter,
      registeredSuggestionAdapter,
    ],
  );

  return (
    <AiAssistantPageContextRegistry.Provider value={value}>
      {children}
    </AiAssistantPageContextRegistry.Provider>
  );
}

export function useAssistantPageContext() {
  const context = useContext(AiAssistantPageContextRegistry);
  if (!context) {
    throw new Error('useAssistantPageContext must be used within AiAssistantPageContextProvider');
  }

  return context.pageContext;
}

export function useRegisterAssistantPageContext(pageContext: AiAssistantPageContext | null) {
  const context = useContext(AiAssistantPageContextRegistry);
  if (!context) {
    throw new Error(
      'useRegisterAssistantPageContext must be used within AiAssistantPageContextProvider',
    );
  }

  const registerPageContext = context.registerPageContext;
  const pageContextSignature = useMemo(() => getPageContextSignature(pageContext), [pageContext]);

  useEffect(() => {
    registerPageContext(pageContext);
  }, [pageContext, pageContextSignature, registerPageContext]);

  useEffect(
    () => () => {
      registerPageContext(null);
    },
    [registerPageContext],
  );
}

export function useAssistantSuggestionAdapter() {
  const context = useContext(AiAssistantPageContextRegistry);
  if (!context) {
    throw new Error(
      'useAssistantSuggestionAdapter must be used within AiAssistantPageContextProvider',
    );
  }

  return context.suggestionAdapter;
}

export function useRegisterAssistantSuggestionAdapter(
  adapter: AiAssistantSuggestionApplyAdapter | null,
) {
  const context = useContext(AiAssistantPageContextRegistry);
  if (!context) {
    throw new Error(
      'useRegisterAssistantSuggestionAdapter must be used within AiAssistantPageContextProvider',
    );
  }

  const registerSuggestionAdapter = context.registerSuggestionAdapter;

  useEffect(() => {
    registerSuggestionAdapter(adapter);
  }, [adapter, registerSuggestionAdapter]);

  useEffect(
    () => () => {
      registerSuggestionAdapter(null);
    },
    [registerSuggestionAdapter],
  );
}

export function useAssistantCurrentPageActionExecutor() {
  const context = useContext(AiAssistantPageContextRegistry);
  if (!context) {
    throw new Error(
      'useAssistantCurrentPageActionExecutor must be used within AiAssistantPageContextProvider',
    );
  }

  return context.currentPageActionExecutor;
}

export function useRegisterAssistantCurrentPageActionExecutor(
  executor: CurrentPageActionExecutor | null,
) {
  const context = useContext(AiAssistantPageContextRegistry);
  if (!context) {
    throw new Error(
      'useRegisterAssistantCurrentPageActionExecutor must be used within AiAssistantPageContextProvider',
    );
  }

  const registerCurrentPageActionExecutor = context.registerCurrentPageActionExecutor;

  useEffect(() => {
    registerCurrentPageActionExecutor(executor);
  }, [executor, registerCurrentPageActionExecutor]);

  useEffect(
    () => () => {
      registerCurrentPageActionExecutor(null);
    },
    [registerCurrentPageActionExecutor],
  );
}

export function useAssistantDraftActionAdapter() {
  const context = useContext(AiAssistantPageContextRegistry);
  if (!context) {
    throw new Error(
      'useAssistantDraftActionAdapter must be used within AiAssistantPageContextProvider',
    );
  }

  return context.draftActionAdapter;
}

export function useRegisterAssistantDraftActionAdapter(
  adapter: AiAssistantDraftActionAdapter | null,
) {
  const context = useContext(AiAssistantPageContextRegistry);
  if (!context) {
    throw new Error(
      'useRegisterAssistantDraftActionAdapter must be used within AiAssistantPageContextProvider',
    );
  }

  const registerDraftActionAdapter = context.registerDraftActionAdapter;

  useEffect(() => {
    registerDraftActionAdapter(adapter);
  }, [adapter, registerDraftActionAdapter]);

  useEffect(
    () => () => {
      registerDraftActionAdapter(null);
    },
    [registerDraftActionAdapter],
  );
}

export function buildProjectsAssistantPageContext({
  search,
  totalProjects,
  visibleProjectCount,
  selectedRowsCount,
  bulkDeleteState,
  visibleWarnings,
  visibleErrors,
  extraKeyFacts,
  extraPageSpecificData,
}: {
  search: string;
  totalProjects: number;
  visibleProjectCount: number;
  selectedRowsCount: number;
  bulkDeleteState: 'idle' | 'confirming' | 'running' | 'failed';
  visibleWarnings?: Array<string | null | undefined>;
  visibleErrors?: Array<string | null | undefined>;
  extraKeyFacts?: Array<string | null | undefined>;
  extraPageSpecificData?: Record<string, unknown>;
}) {
  return createAssistantPageContext({
    route: '/projects',
    pageTitle: 'Projects',
    pageKind: 'projects',
    saveState: 'readonly',
    keyFacts: [
      `${totalProjects} total project${totalProjects === 1 ? '' : 's'}`,
      search.trim()
        ? `Search "${search.trim()}" matches ${visibleProjectCount} visible project${visibleProjectCount === 1 ? '' : 's'}`
        : `Showing ${visibleProjectCount} project${visibleProjectCount === 1 ? '' : 's'} on the current page`,
      `${selectedRowsCount} selected row${selectedRowsCount === 1 ? '' : 's'}`,
      bulkDeleteState !== 'idle' ? `Bulk delete state: ${formatEnumLabel(bulkDeleteState)}` : null,
      ...(extraKeyFacts ?? []),
    ],
    visibleWarnings,
    visibleErrors,
    pageSpecificData: {
      totalProjects,
      visibleProjectCount,
      searchFilter: search.trim() || null,
      selectedRowsCount,
      bulkDeleteState,
      ...(extraPageSpecificData ?? {}),
    },
  });
}

export function buildProjectDetailAssistantPageContext({
  route,
  projectId,
  pageTitle,
  saveState,
  visibleWarnings,
  visibleErrors,
  keyFacts,
  pageSpecificData,
}: {
  route: string;
  projectId: string;
  pageTitle: string;
  saveState: AiAssistantSaveState;
  visibleWarnings?: Array<string | null | undefined>;
  visibleErrors?: Array<string | null | undefined>;
  keyFacts: Array<string | null | undefined>;
  pageSpecificData: Record<string, unknown>;
}) {
  return createAssistantPageContext({
    route,
    pageTitle,
    projectId,
    pageKind: 'project_detail',
    saveState,
    keyFacts,
    visibleWarnings,
    visibleErrors,
    pageSpecificData,
  });
}

export function buildAiReportsAssistantPageContext({
  route,
  projectId,
  visibleWarnings,
  visibleErrors,
  keyFacts,
  pageSpecificData,
}: {
  route: string;
  projectId: string;
  visibleWarnings?: Array<string | null | undefined>;
  visibleErrors?: Array<string | null | undefined>;
  keyFacts: Array<string | null | undefined>;
  pageSpecificData: Record<string, unknown>;
}) {
  return createAssistantPageContext({
    route,
    pageTitle: 'AI Reports',
    projectId,
    pageKind: 'ai_reports',
    saveState: 'readonly',
    keyFacts,
    visibleWarnings,
    visibleErrors,
    pageSpecificData,
  });
}

export function buildMultiPileAssistantPageContext({
  route,
  projectId,
  pileGroupId,
  saveState,
  visibleWarnings,
  visibleErrors,
  keyFacts,
  pageSpecificData,
}: {
  route: string;
  projectId: string;
  pileGroupId: string;
  saveState: AiAssistantSaveState;
  visibleWarnings?: Array<string | null | undefined>;
  visibleErrors?: Array<string | null | undefined>;
  keyFacts: Array<string | null | undefined>;
  pageSpecificData: Record<string, unknown>;
}) {
  return createAssistantPageContext({
    route,
    pageTitle: 'Multi-Pile',
    projectId,
    pileGroupId,
    pageKind: 'multi_pile',
    saveState,
    keyFacts,
    visibleWarnings,
    visibleErrors,
    pageSpecificData,
  });
}

export function buildGenericAssistantPageContext(pathname: string) {
  return createAssistantPageContext({
    route: pathname,
    pageTitle: formatAssistantRouteTitle(pathname),
    pageKind: inferAssistantPageKind(pathname),
    saveState: 'unknown',
    keyFacts: [
      `Current route: ${pathname}`,
      'This page does not expose a dedicated assistant context builder yet',
    ],
    visibleWarnings: ['The assistant only has limited route-level context on this page'],
    pageSpecificData: {
      supportLevel: 'limited',
    },
  });
}

function createAssistantPageContext({
  route,
  pageTitle,
  projectId = null,
  pileGroupId = null,
  pageKind,
  saveState = 'unknown',
  visibleWarnings,
  visibleErrors,
  keyFacts,
  pageSpecificData = {},
}: {
  route: string;
  pageTitle: string;
  projectId?: string | null;
  pileGroupId?: string | null;
  pageKind: string;
  saveState?: AiAssistantSaveState;
  visibleWarnings?: Array<string | null | undefined>;
  visibleErrors?: Array<string | null | undefined>;
  keyFacts?: Array<string | null | undefined>;
  pageSpecificData?: Record<string, unknown>;
}): AiAssistantPageContext {
  return {
    route,
    pageTitle,
    projectId,
    pileGroupId,
    pageKind,
    saveState,
    visibleWarnings: compactTextList(visibleWarnings),
    visibleErrors: compactTextList(visibleErrors),
    keyFacts: compactTextList(keyFacts),
    pageSpecificData,
  };
}

function compactTextList(values?: Array<string | null | undefined>) {
  return Array.from(
    new Set((values ?? []).map((value) => value?.trim() ?? '').filter((value) => value.length > 0)),
  );
}

function getPageContextSignature(pageContext: AiAssistantPageContext | null) {
  return pageContext == null ? 'null' : JSON.stringify(pageContext);
}

function inferAssistantPageKind(pathname: string) {
  if (pathname === '/projects') {
    return 'projects';
  }

  if (/^\/projects\/[^/]+\/ai-reports$/.test(pathname)) {
    return 'ai_reports';
  }

  if (/^\/projects\/[^/]+\/pile-groups\/[^/]+\/multi-pile$/.test(pathname)) {
    return 'multi_pile';
  }

  if (/^\/projects\/[^/]+$/.test(pathname)) {
    return 'project_detail';
  }

  return 'generic';
}

function formatAssistantRouteTitle(pathname: string) {
  const segments = pathname
    .split('/')
    .filter(Boolean)
    .filter((segment) => !looksLikeRouteId(segment))
    .map((segment) => formatEnumLabel(segment));

  return segments.length > 0 ? segments.join(' / ') : 'Workspace';
}

function looksLikeRouteId(segment: string) {
  return /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(segment);
}

function formatEnumLabel(value: string) {
  return value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

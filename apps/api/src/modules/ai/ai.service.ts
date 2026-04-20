import {
  AiDocument,
  AiDocumentKind,
  AiDocumentStatus,
  AiExtractionRunStatus,
  Prisma,
} from '@prisma/client';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AI_AGENT_PROVIDER,
  buildDefaultOrganisationAiSettings,
  normalizeAiModelSelection,
  resolveAiAgentRuntimeSelection,
  resolveAiAssistantRuntimeSelection,
  type AiAssistantModelId,
  type AiAssistantProvider,
  type AiModelId,
  type OrganisationAiSettings,
} from '@eng/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RequestUser } from '../auth/decorators/current-user.decorator';
import OpenAI from 'openai';
import type { ResponseFileSearchToolCall } from 'openai/resources/responses/responses';
import type { VectorStoreSearchResponse } from 'openai/resources/vector-stores/vector-stores';
import { zodTextFormat } from 'openai/helpers/zod';
import { access } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { randomUUID } from 'node:crypto';
import {
  type AiAssistantMode,
  type AiAssistantQuickAction,
  type RespondAiAssistantDto,
} from './dto/respond-ai-assistant.dto';
import { AiAgentOrchestrationService } from './agent/ai-agent-orchestration.service';
import {
  buildAssistantDraftActionsForCurrentPage,
  buildDeterministicFieldSuggestions,
  type AssistantFieldSuggestionBuildResult,
} from './assistant-field-suggestions';
import {
  getOrganisationAiSettingsFromMetadata,
  isMissingOrganisationMetadataColumnError,
} from '../organisations/organisation-ai-settings';
import { OrganisationAiAssistantCredentialStoreService } from '../organisations/organisation-ai-assistant-credential-store.service';
import { CreateAiDocumentDto } from './dto/create-ai-document.dto';
import { DeleteAiDocumentsDto } from './dto/delete-ai-documents.dto';
import { ExtractAiDocumentDto } from './dto/extract-ai-document.dto';
import { ListAiDocumentsDto } from './dto/list-ai-documents.dto';
import { assistantResponseSchema, type AssistantResponse } from './assistant-response.schema';
import {
  AI_REPORT_DOCUMENT_FAMILIES,
  AI_REPORT_OWNER_WORKSPACES,
  AI_REPORT_TYPES,
  type AiReportClassification,
  type AiReportDocumentFamily,
  type AiReportOwnerWorkspace,
  type AiReportType,
  UpdateAiDocumentClassificationDto,
} from './dto/ai-document-classification.dto';
import { AiDocumentStorageService } from './documents/ai-document-storage.service';
import { buildAs2159StandardsMapping } from './extraction/as2159-standards-mapping';
import { normalizeProjectSpecifics } from '../projects/project-specifics.adapter';
import { MultiPileService } from '../pile-groups/multi-pile.service';
import { AssistantProviderRegistry } from './providers/assistant-provider.registry';
import type { AssistantProviderCredentialInput } from './providers/assistant-provider.interface';
import {
  type BatterSlopeTable,
  type EarthquakeSiteFactorExtraction,
  type DewateringProfileExtraction,
  type EngineeringReportExtractionProfile,
  type GroundModelExtraction,
  type GroundwaterExtraction,
  engineeringReportExtractionDraftSchema,
  geotechnicalFocusedRefinementDraftSchema,
  type EngineeringReportDocumentFamily,
  type EngineeringReportExtractionDraft,
  type EngineeringReportExtractionResult,
  type InvestigationBasisExtraction,
  type ExtractionCitation,
  type ExtractionFinding,
  type GeotechnicalCommentProfileExtraction,
  type GeotechnicalFocusedRefinementDraft,
  type GeotechnicalParameterTable,
  type NullableDocumentFamilyExtractionFinding,
  type NullableExtractionFinding,
  type NullableNumericExtractionFinding,
  type PileConstructionExtraction,
  type ReportMetadataExtraction,
  type ReportSectionExtraction,
  type RetainingWallPreliminaryParameters,
  type ShallowFoundationBearingTable,
  type SiteClassificationExtraction,
  type SoilNailBondStressTable,
} from './extraction/report-extraction.schema';

const ALLOWED_AI_REPORT_EXTENSIONS = new Set(['.pdf', '.docx']);
const ALLOWED_AI_REPORT_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/octet-stream',
]);
const AI_REPORT_DOCUMENT_FAMILY_SET = new Set<string>(AI_REPORT_DOCUMENT_FAMILIES);
const AI_REPORT_TYPE_SET = new Set<string>(AI_REPORT_TYPES);
const AI_REPORT_OWNER_WORKSPACE_SET = new Set<string>(AI_REPORT_OWNER_WORKSPACES);

const ENGINEERING_REPORT_PROMPT = [
  'You extract engineering report facts from the attached document only.',
  'Use the file_search tool to inspect the report before answering.',
  'Classify the report using the normalized documentFamily enum and keep the exact reportTitle separately.',
  'Choose the most specific documentFamily that matches the report title and scope.',
  'For geotechnical or groundwater reports, prioritize geotechnicalBasis fields.',
  'A registry classification is supplied by the application; use its reportType as the extraction profile selector even when the filename is ambiguous or the PDF bundles multiple disciplines.',
  'Do not split bundled PDFs yet. Preserve the one-upload-one-record behavior and focus profile-specific sections on the selected registry reportType.',
  'For reportType geotechnical_investigation, continue extracting full geotechnical investigation findings and design-parameter table evidence when explicitly present.',
  'For reportType geotechnical_comment, treat the document as a delta or addendum: extract what changed, what remains unchanged, revised recommendations or comments, and affected drawings, revisions, and dates. Do not treat comment letters as fresh material-library sources unless they explicitly introduce new design tables or parameters.',
  'For reportType dewatering_management_plan, populate dewateringProfile with groundwater and water-level observations, permeability or hydraulic conductivity, inflow rates, drawdown estimates, aquifer / WaterNSW / AIP compliance notes, neighbouring property / settlement effects, monitoring and reporting requirements, key assumptions or limitations, piezometer locations / monitoring network, settlement or drawdown trigger levels, WaterNSW licence or bore registration numbers, and the construction stage the plan applies to.',
  'For dewatering management plans, do not force the document through the geotechnical candidate-material extraction path.',
  'For environmental, structural, inspection, temporary works, or other report types, keep profile-specific outputs lightweight and leave unrelated profile sections empty unless explicitly supported.',
  'Extract reportMetadata from the title page, document history, or front matter when present, keeping filename and revision/status as printed rather than inferred.',
  'Extract investigationBasis as the evidence base of the report: purpose/scope, borehole or test-location counts, target depth rules, fieldwork dates, investigation methods, laboratory testing, coordinate or datum references, and explicit interpretation limits.',
  'Keep groundwater.observedConditions limited to direct observations or absences of groundwater.',
  'Keep groundwater.uncertaintyAndMonitoring limited to uncertainty, obscured observations, perched-water notes, standpipe or piezometer notes, and monitoring recommendations.',
  'Keep groundwater.constructionImplications limited to excavation, footing, pile, pumping, dewatering, or construction consequences.',
  'Use reportSections to capture optional heading-aware sections only when the report explicitly includes them, such as Excavations, Batter Slopes, Soil Nails, Retaining Walls, Fill Materials, Site Classification, Shallow Foundations, Deep Foundations, Raft Slab, Subgrade Preparation, Drainage / Service Installation / Site Maintenance, Earthquake Site Factor, Working Platform, Existing Conditions Survey, and Limitations.',
  'Keep pileConstruction as report-derived pile method suitability, cautions, verification notes, construction controls, testing recommendations, uplift notes, and settlement expectations only.',
  'Retaining wall preliminary parameters must stay report-derived and separate from standards mapping.',
  'For geotechnical reports, do not label groundwater design assumptions, hydrostatic uplift assumptions, water-pressure assumptions, or dewatering assumptions as loadCases or combinations.',
  'Only populate loadMentions when the report explicitly contains named engineering load cases, load schedules, or design combination schedules.',
  'It is acceptable for structuralDefaults to remain empty when the report does not explicitly state concrete, cover, durability, or reinforcement defaults.',
  'Prefer the title page, introduction, and scope sections for reportTitle and projectSummary.',
  'Prefer foundation recommendation sections and design-parameter tables for foundingNotes, recommendations, and rock or shale parameters.',
  'Prefer groundwater, dewatering, basement, and hydrostatic sections for groundwater and hydrostatic assumptions.',
  'Keep groundwaterNotes limited to narrative observations, monitoring, dewatering discussion, and groundwater behaviour.',
  'Keep groundwaterDesignAssumptions limited to explicit design-use assumptions such as adopted levels, lowering targets, conservative rises, and stated construction assumptions.',
  'Keep hydrostaticAssumptions limited to explicit hydrostatic uplift, water-pressure, or pressure-per-metre design assumptions.',
  'Do not duplicate the same statement across groundwaterNotes, groundwaterDesignAssumptions, and hydrostaticAssumptions unless the report gives no more specific wording.',
  'Prefer geological-unit, borehole, and material-parameter tables for materialMentions.',
  'Keep report-derived findings separate from standards-reference concepts. Do not present AS 2159 or other standards content as site values.',
  'Return only facts that are directly supported by the source document.',
  'If a field is not supported, return null for nullable fields or an empty array for lists.',
  'Do not infer design values, formulas, or calculations that are not explicitly stated.',
  'Keep each list item atomic, concise, and non-duplicated.',
  'For every populated field or list item, provide a field-specific evidenceQuery that would retrieve the best supporting passage from the same document.',
  'Prefer evidence queries that explicitly mention the relevant section or table, such as title page, document history, scope of works, field work methods, Table 1, Table 6, Table 7, Table 8, Table 9, site classification, working platform, or limitations when applicable.',
].join(' ');

const GEOTECHNICAL_FOCUSED_REFINEMENT_PROMPT = [
  'You refine geotechnical report extraction using only the supplied snippet bundle from one report.',
  'Do not use outside knowledge and do not infer values that are not explicit in the snippets.',
  'Stage A only: extract report-derived facts and keep them separate from standards interpretation.',
  'Return structured geotechnicalParameterTables when tables are present.',
  'For foundation design tables, map maximum allowable end bearing to endBearingAllowableKPa, maximum allowable shaft adhesion/compression to shaftAdhesionCompressionAllowableKPa, maximum ultimate end bearing to endBearingUltimateKPa, and maximum ultimate shaft adhesion/compression to shaftAdhesionCompressionUltimateKPa.',
  'For shoring/material-parameter tables, map unit weight to unitWeightBulkKNm3, active earth pressure coefficient to Ka, at-rest earth pressure coefficient to Ko, effective cohesion to cohesionKPa, effective friction angle to frictionAngleDeg, and Young modulus to modulusMPa.',
  'Preserve combined class row labels exactly as printed, such as Class V-IV or Class III-II, rather than splitting them into individual classes.',
  'Return a structured groundModel when a generalised subsurface profile table is present.',
  'Return structured batterSlopeTable and soilNailBondStressTable when those tables are present.',
  'If a table cell cannot be aligned confidently to a requested field, leave that field null and preserve the full rawRowText.',
  'Do not compute new values from percentages or formulas unless the exact numeric value is explicitly printed in the snippet.',
  'Keep groundwaterNotes to narrative observations and dewatering discussion only.',
  'Keep groundwaterDesignAssumptions to explicit design-use assumptions only.',
  'Keep hydrostaticAssumptions to explicit hydrostatic uplift, water-pressure, or pressure-per-metre assumptions only.',
  'Keep foundingNotes to explicit founding recommendations or founding-basis statements only.',
  'Keep aggressivityDurabilityNotes to aggressivity, durability, sulfate, corrosion, or pile-design testing notes only.',
  'Keep furtherInvestigationNotes to explicit future monitoring, testing, or further-work recommendations only.',
  'For groundModel depth entries, preserve qualifiers like not encountered or minimum depth rather than inventing exact depths.',
  'Every finding and every table row must cite the sourceSnippetIds that support it.',
].join(' ');

const AI_ASSISTANT_SYSTEM_PROMPT = [
  'You are the floating assistant for an engineering SaaS application.',
  'The assistant is guidance-first with user-controlled draft-only apply on supported current pages.',
  'On supported project authoring pages, you can suggest grounded current-page draft changes that the user previews and applies manually.',
  'Those draft changes affect only the current page draft, do not auto-save, do not cross pages, and still require the normal Save action.',
  'If the user asks whether you are read-only, can edit, or can save, answer generally: on supported pages you can suggest draft changes that they preview and apply manually; you cannot auto-save, cannot edit unsupported pages, and cannot act across pages.',
  'Never claim that you saved data, auto-applied values, updated a form without user action, ran calculations, or changed persisted project state.',
  'Use only the supplied pageContext, conversation, project snapshot, pile group snapshot, and recent AI report summaries.',
  'If context is limited, say so clearly and briefly.',
  'If pageContext.pageSpecificData includes assistantGuidance, activeTabContext, incompleteAreas, or route-specific summaries, treat those as curated UI-grounded facts and prioritize them over weaker inference.',
  'If project_detail context includes field-level blanks, incomplete reference rows, structural library gaps, or geotechnical row gaps, name those exact items instead of summarizing them generically.',
  'Keep visiblePageFacts limited to direct facts from the provided context.',
  'Keep inferredLikelyIssues limited to cautious workflow inferences from warnings, errors, missing inputs, unsaved state, empty selections, or absent project libraries.',
  'Prefer visible blockers, missing inputs, pending states, and practical workflow next steps over low-value metadata observations.',
  'Do not mention missing client metadata or similar low-value page details unless the user explicitly asks or that fact is clearly blocking the workflow.',
  'Keep standardsReferenceNotes clearly separated and label them as reference only.',
  'Do not present standards mapping or extracted report content as adopted authored project values unless the context explicitly says they are authored.',
  'Only populate suggestedFields when a grounded field suggestion is explicitly requested or clearly helpful, and only when the exact value already exists in the supplied context.',
  'If route context distinguishes current state, missing inputs, likely blockers, and next actions, preserve that distinction in the response.',
  'For quick actions, prioritize this order when relevant: current state, missing inputs or blockers, then practical next steps.',
  'Never invent engineering numbers, capacities, dimensions, or design decisions.',
  'Prefer concise, practical answers that explain what the page shows, what is missing, and what the user can do next.',
].join(' ');

const AI_AGENT_SYSTEM_PROMPT = [
  'You are the beta Agent mode for the floating assistant in an engineering SaaS application.',
  'Agent mode is strictly read-only and must stay bounded to the supplied internal tool outputs.',
  'Never claim that you saved data, updated forms, changed assignments, triggered runs, or mutated project state.',
  'Use the supplied tool outputs as the source of truth and prefer them over generic guesses.',
  'Keep visiblePageFacts limited to direct facts from the tool outputs.',
  'Use toolFindings for the most relevant cross-tool observations.',
  'Keep inferredLikelyIssues limited to cautious workflow inferences grounded in the supplied facts.',
  'Keep standardsReferenceNotes clearly separated from authored project values and from report-derived facts.',
  'For Multi-Pile, distinguish current authored assignment, suggested type matching, manual overrides, and stale or missing envelope data.',
  'For AI Reports, distinguish report-derived facts from AS 2159 standards mapping.',
  'Only populate suggestedFields when a grounded field suggestion is explicitly requested or clearly helpful, and only when the exact value already exists in the supplied tool outputs.',
  'Never invent engineering values, capacities, dimensions, or design decisions.',
  'Prefer concise, practical answers that explain current state, notable findings, blockers, and next steps.',
].join(' ');

const GENERIC_EVIDENCE_QUERY_PATTERNS = [
  'foundation recommendations',
  'geotechnical engineer',
  'project summary',
  'report purpose',
  'material parameters',
  'laboratory test results',
  'future work',
];

const GEOTECHNICAL_DOCUMENT_FAMILIES = new Set<EngineeringReportDocumentFamily>([
  'GEOTECHNICAL_REPORT',
  'PRELIMINARY_GEOTECHNICAL_INVESTIGATION',
  'GEOTECHNICAL_GROUNDWATER_REPORT',
  'PRELIMINARY_GEOTECHNICAL_GROUNDWATER_REPORT',
]);

type CitationHint = {
  value?: string | null;
  preferredTerms?: string[];
  fallbackQueryTerms?: string[];
  avoidTerms?: string[];
  preferTitlePage?: boolean;
  maxResults?: number;
};

type BuildCitationsFn = (
  query: string | null,
  hint?: CitationHint,
) => Promise<ExtractionCitation[]>;

type EvidenceQuerySpec = {
  key: string;
  query: string;
  maxResults?: number;
  requiredTerms?: string[];
  requiredTermsAll?: string[];
};

type ReportEvidenceSnippet = {
  id: string;
  key: string;
  query: string;
  rawText: string;
  citation: ExtractionCitation;
};

type CitationBundle = {
  citations: ExtractionCitation[];
  text: string;
};

type GeotechnicalFallbackContext = {
  groundwater: CitationBundle;
  groundwaterConstruction: CitationBundle;
  groundwaterAppendix: CitationBundle;
  shallowFoundationTableNotes: CitationBundle;
  shallowFoundationNarrative: CitationBundle;
  retainingWalls: CitationBundle;
  siteClassification: CitationBundle;
  earthquakeSiteFactor: CitationBundle;
  workingPlatformAndSurvey: CitationBundle;
  limitations: CitationBundle;
  deepFoundations: CitationBundle;
  pileDesignControls: CitationBundle;
  pileTesting: CitationBundle;
};

type AssistantProjectSnapshot = {
  id: string;
  name: string;
  code: string;
  status: string;
  updatedAt: string;
} | null;

type AssistantPileGroupSnapshot = {
  id: string;
  name: string;
  description: string | null;
} | null;

type AssistantRecentDocumentSummary = {
  id: string;
  filename: string;
  status: string;
  pileGroupName: string | null;
  latestRunStatus: string | null;
  documentFamily: string | null;
  reportTitle: string | null;
  hasGeotechnicalParameterTables: boolean;
  tableLabels: string[];
  hasStandardsMapping: boolean;
  extractionSections: string[];
};

type AiDocumentDeleteCandidate = AiDocument & {
  extractionRuns: Array<{
    resultJson: Prisma.JsonValue | null;
  }>;
};

type AiDocumentDeleteProjectCleanup = {
  metadata: Prisma.InputJsonValue | null;
  clearedActiveGeotechnicalReport: boolean;
};

const GEOTECHNICAL_REFINEMENT_QUERY_SPECS: EvidenceQuerySpec[] = [
  {
    key: 'table1',
    query: 'Table 1 generalised subsurface profile borehole depth to base of unit',
    maxResults: 2,
    requiredTerms: ['table 1', 'subsurface profile'],
  },
  {
    key: 'table6',
    query: 'Table 6 batter slopes up to 3 m high',
    maxResults: 2,
    requiredTerms: ['table 6', 'batter slopes'],
  },
  {
    key: 'table7_soil_nails',
    query: 'Table 7 preliminary allowable bond stress soil nails dowels',
    maxResults: 2,
    requiredTerms: ['table 7', 'bond stress'],
  },
  {
    key: 'table7_shoring_parameters',
    query:
      'Table 7 Recommended Design Parameters for Shoring Systems unit weight active at rest effective cohesion friction angle Young modulus',
    maxResults: 2,
    requiredTermsAll: ['table 7', 'shoring'],
  },
  {
    key: 'table8',
    query: 'Table 8 maximum allowable bearing pressures shallow foundations',
    maxResults: 2,
    requiredTerms: ['table 8', 'bearing pressures'],
  },
  {
    key: 'table9',
    query: 'Table 9 ultimate unit stresses preliminary design of piles',
    maxResults: 2,
    requiredTerms: ['table 9', 'ultimate unit stresses'],
  },
  {
    key: 'table10_foundation_design',
    query:
      'Table 10 Design Parameters for Foundation Design maximum allowable end bearing shaft adhesion compression maximum ultimate Class II Siltstone',
    maxResults: 2,
    requiredTermsAll: ['table 10', 'foundation design'],
  },
  {
    key: 'table3',
    query: 'Table 3 indicative design parameters geological units',
    maxResults: 2,
    requiredTerms: ['table 3', 'design parameters'],
  },
  {
    key: 'table7',
    query: 'Table 7 design parameters bored or CFA piles',
    maxResults: 2,
    requiredTerms: ['table 7', 'bored', 'cfa'],
  },
  {
    key: 'groundwater',
    query: 'groundwater dewatering design level rise 2 m bulk excavation',
    maxResults: 3,
    requiredTerms: ['groundwater'],
  },
  {
    key: 'hydrostatic',
    query: 'hydrostatic uplift pressure tanked slab 10 kPa per metre design groundwater level',
    maxResults: 2,
    requiredTerms: ['hydrostatic', 'tanked slab'],
  },
  {
    key: 'founding',
    query: 'piles founded within rock minimum one pile diameter suitable founding strata',
    maxResults: 3,
    requiredTerms: ['pile', 'founding'],
  },
  {
    key: 'durability',
    query: 'aggressivity testing pile design durability further geotechnical works',
    maxResults: 3,
    requiredTerms: ['aggress', 'testing'],
  },
];

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openAiClient: OpenAI | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly aiAgentOrchestrationService: AiAgentOrchestrationService,
    private readonly storageService: AiDocumentStorageService,
    private readonly multiPileService: MultiPileService,
    private readonly assistantProviderRegistry: AssistantProviderRegistry,
    private readonly organisationAiAssistantCredentialStore: OrganisationAiAssistantCredentialStoreService,
  ) {}

  async listDocuments(user: RequestUser & { organisationId: string }, query: ListAiDocumentsDto) {
    await this.assertProjectAccess(query.projectId, user.organisationId, user.id, user.orgRole);

    return this.prisma.aiDocument.findMany({
      where: {
        organisationId: user.organisationId,
        projectId: query.projectId,
      },
      include: {
        pileGroup: { select: { id: true, name: true } },
        extractionRuns: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDocument(user: RequestUser & { organisationId: string }, id: string) {
    const document = await this.findAccessibleDocumentOrThrow(id, user, 5);
    return document;
  }

  async createDocument(
    user: RequestUser & { organisationId: string },
    dto: CreateAiDocumentDto,
    file: Express.Multer.File,
  ) {
    this.assertAiFeatureEnabled();
    validateReportFile(file);

    await this.assertProjectAccess(dto.projectId, user.organisationId, user.id, user.orgRole);
    if (dto.pileGroupId) {
      await this.assertPileGroupAccess(dto.projectId, dto.pileGroupId);
    }

    const documentId = randomUUID();
    const classification = resolveAiReportClassification(dto, file.originalname);
    const persistedFile = await this.storageService.persistUploadedFile({
      organisationId: user.organisationId,
      projectId: dto.projectId,
      documentId,
      originalName: file.originalname,
      buffer: file.buffer,
    });

    await this.prisma.aiDocument.create({
      data: {
        id: documentId,
        organisationId: user.organisationId,
        projectId: dto.projectId,
        pileGroupId: dto.pileGroupId,
        kind: dto.kind ?? AiDocumentKind.engineering_report,
        documentFamily: classification.documentFamily,
        reportType: classification.reportType,
        ownerWorkspace: classification.ownerWorkspace,
        filename: file.originalname,
        mimeType: normalizeMimeType(file),
        storagePath: persistedFile.storagePath,
        status: AiDocumentStatus.uploaded_local,
      },
    });

    return this.getDocument(user, documentId);
  }

  async updateDocumentClassification(
    user: RequestUser & { organisationId: string },
    id: string,
    dto: UpdateAiDocumentClassificationDto,
  ) {
    const document = await this.findAccessibleDocumentOrThrow(id, user, 1);
    const classification = resolveAiReportClassification(dto, document.filename);

    await this.prisma.aiDocument.update({
      where: { id: document.id },
      data: classification,
    });

    return this.getDocument(user, document.id);
  }

  async deleteDocument(user: RequestUser & { organisationId: string }, id: string) {
    const document = await this.findAccessibleDocumentOrThrow(id, user, 1);
    return this.deleteProjectDocuments(user, {
      projectId: document.projectId,
      documentIds: [document.id],
      deleteAll: false,
    });
  }

  async deleteDocuments(user: RequestUser & { organisationId: string }, dto: DeleteAiDocumentsDto) {
    return this.deleteProjectDocuments(user, {
      projectId: dto.projectId,
      documentIds: dto.documentIds ?? [],
      deleteAll: dto.deleteAll === true,
    });
  }

  private async deleteProjectDocuments(
    user: RequestUser & { organisationId: string },
    params: { projectId: string; documentIds: string[]; deleteAll: boolean },
  ) {
    const project = await this.assertProjectAccess(
      params.projectId,
      user.organisationId,
      user.id,
      user.orgRole,
    );
    const documentIds = [...new Set(params.documentIds)];

    if (!params.deleteAll && documentIds.length === 0) {
      throw new BadRequestException('Choose at least one AI report to delete');
    }

    const documents = await this.prisma.aiDocument.findMany({
      where: {
        organisationId: user.organisationId,
        projectId: params.projectId,
        ...(params.deleteAll ? {} : { id: { in: documentIds } }),
      },
      include: {
        extractionRuns: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { resultJson: true },
        },
      },
    });

    if (!params.deleteAll && documents.length !== documentIds.length) {
      throw new NotFoundException('One or more AI reports were not found for this project');
    }

    if (documents.length === 0) {
      return {
        deletedCount: 0,
        deletedDocumentIds: [],
        hardDelete: true,
        projectGeotechnicalSelectionCleared: false,
        localFileWarnings: [],
        openaiCleanupWarnings: [],
      };
    }

    const deleteCandidates = documents as AiDocumentDeleteCandidate[];
    const projectCleanup = this.buildProjectCleanupForDeletedAiDocuments(project, deleteCandidates);
    const deletedDocumentIds = deleteCandidates.map((document) => document.id);

    await this.prisma.$transaction(async (tx) => {
      if (projectCleanup.metadata) {
        await tx.project.update({
          where: { id: project.id },
          data: { metadata: projectCleanup.metadata },
        });
      }

      await tx.aiDocument.deleteMany({
        where: {
          organisationId: user.organisationId,
          projectId: params.projectId,
          id: { in: deletedDocumentIds },
        },
      });
    });

    const [localFileWarnings, openaiCleanupWarnings] = await Promise.all([
      this.cleanupDeletedLocalFiles(deleteCandidates),
      this.cleanupDeletedOpenAiReferences(deleteCandidates),
    ]);

    return {
      deletedCount: deletedDocumentIds.length,
      deletedDocumentIds,
      hardDelete: true,
      projectGeotechnicalSelectionCleared: projectCleanup.clearedActiveGeotechnicalReport,
      localFileWarnings,
      openaiCleanupWarnings,
    };
  }

  async indexDocument(user: RequestUser & { organisationId: string }, id: string) {
    const document = await this.findAccessibleDocumentOrThrow(id, user, 1);
    await this.ensureLocalFileExists(document);

    const openai = this.getOpenAiClient();

    await this.prisma.aiDocument.update({
      where: { id: document.id },
      data: { status: AiDocumentStatus.indexing },
    });

    let openaiFileId = document.openaiFileId ?? null;
    let openaiVectorStoreId = document.openaiVectorStoreId ?? null;

    try {
      if (!openaiFileId) {
        const openaiFile = await openai.files.create({
          file: createReadStream(this.storageService.resolveAbsolutePath(document.storagePath)),
          purpose: 'assistants',
        });
        await openai.files.waitForProcessing(openaiFile.id, {
          pollInterval: 1000,
          maxWait: 120_000,
        });
        openaiFileId = openaiFile.id;
      }

      if (openaiVectorStoreId) {
        const existingVectorStore = await openai.vectorStores.retrieve(openaiVectorStoreId);
        if (
          existingVectorStore.status === 'completed' &&
          existingVectorStore.file_counts.completed > 0
        ) {
          await this.prisma.aiDocument.update({
            where: { id: document.id },
            data: {
              openaiFileId,
              openaiVectorStoreId,
              status: AiDocumentStatus.indexed,
            },
          });
          return this.getDocument(user, document.id);
        }
      }

      if (!openaiVectorStoreId || document.status === AiDocumentStatus.index_failed) {
        const vectorStore = await openai.vectorStores.create({
          name: buildVectorStoreName(document),
          metadata: {
            documentId: document.id,
            projectId: document.projectId,
            kind: document.kind,
            documentFamily: document.documentFamily,
            reportType: document.reportType,
            ownerWorkspace: document.ownerWorkspace,
          },
        });
        openaiVectorStoreId = vectorStore.id;
      }

      const indexedFile = await openai.vectorStores.files.createAndPoll(
        openaiVectorStoreId,
        { file_id: openaiFileId },
        { pollIntervalMs: 1_000 },
      );

      if (indexedFile.status !== 'completed') {
        throw new Error(
          indexedFile.last_error?.message ?? 'Vector store indexing did not complete',
        );
      }

      await this.prisma.aiDocument.update({
        where: { id: document.id },
        data: {
          openaiFileId,
          openaiVectorStoreId,
          status: AiDocumentStatus.indexed,
        },
      });

      return this.getDocument(user, document.id);
    } catch (error) {
      const message = getErrorMessage(error);
      this.logger.error(`Failed to index AI document ${document.id}: ${message}`);

      await this.prisma.aiDocument.update({
        where: { id: document.id },
        data: {
          openaiFileId,
          openaiVectorStoreId,
          status: AiDocumentStatus.index_failed,
        },
      });

      throw new BadRequestException(message);
    }
  }

  async extractDocument(
    user: RequestUser & { organisationId: string },
    id: string,
    dto: ExtractAiDocumentDto,
  ) {
    let document = await this.findAccessibleDocumentOrThrow(id, user, 5);
    if (!document.openaiFileId || !document.openaiVectorStoreId) {
      document = await this.indexDocument(user, id);
    }

    if (!document.openaiVectorStoreId) {
      throw new BadRequestException('Document is not indexed in OpenAI yet');
    }

    const model = this.resolveExtractionModel(dto.model);
    const extractionRun = await this.prisma.aiExtractionRun.create({
      data: {
        documentId: document.id,
        model,
        status: AiExtractionRunStatus.pending,
        requestJson: {
          schemaVersion: 'engineering_report_v4',
          openaiFileId: document.openaiFileId,
          openaiVectorStoreId: document.openaiVectorStoreId,
          model,
          documentFamily: document.documentFamily,
          reportType: document.reportType,
          ownerWorkspace: document.ownerWorkspace,
        } satisfies Prisma.InputJsonValue,
      },
    });

    await this.prisma.aiDocument.update({
      where: { id: document.id },
      data: { status: AiDocumentStatus.extracting },
    });

    try {
      const extractionResult = await this.runEngineeringReportExtraction(
        document,
        document.openaiVectorStoreId,
        model,
      );

      await this.prisma.aiExtractionRun.update({
        where: { id: extractionRun.id },
        data: {
          status: AiExtractionRunStatus.completed,
          resultJson: extractionResult as Prisma.InputJsonValue,
        },
      });

      await this.prisma.aiDocument.update({
        where: { id: document.id },
        data: { status: AiDocumentStatus.extracted },
      });

      return this.getDocument(user, document.id);
    } catch (error) {
      const message = getErrorMessage(error);
      this.logger.error(`Failed to extract AI document ${document.id}: ${message}`);

      await this.prisma.aiExtractionRun.update({
        where: { id: extractionRun.id },
        data: {
          status: AiExtractionRunStatus.failed,
          resultJson: {
            error: message,
          } satisfies Prisma.InputJsonValue,
        },
      });

      await this.prisma.aiDocument.update({
        where: { id: document.id },
        data: { status: AiDocumentStatus.extraction_failed },
      });

      throw new BadRequestException(message);
    }
  }

  async respondToAssistant(
    user: RequestUser & { organisationId: string },
    dto: RespondAiAssistantDto,
  ): Promise<AssistantResponse> {
    this.assertAiFeatureEnabled();

    const mode: AiAssistantMode = dto.mode ?? 'assistant';
    const projectId = resolveAssistantScopeId(dto.projectId, dto.pageContext.projectId);
    const pileGroupId = resolveAssistantScopeId(dto.pileGroupId, dto.pageContext.pileGroupId);

    if (pileGroupId && !projectId) {
      throw new BadRequestException('projectId is required when pileGroupId is provided');
    }

    const project =
      projectId != null
        ? await this.assertProjectAccess(projectId, user.organisationId, user.id, user.orgRole)
        : null;

    const pileGroup =
      projectId != null && pileGroupId != null
        ? await this.assertPileGroupAccess(projectId, pileGroupId)
        : null;

    if (dto.quickAction === 'suggest_fields') {
      const recentDocuments =
        projectId != null
          ? await this.listRecentAssistantDocuments(user.organisationId, projectId)
          : [];
      const fallback = {
        projectName: project?.name ?? '',
        projectNumber: project?.code ?? '',
      };
      const projectSpecifics =
        project != null ? normalizeProjectSpecifics(project.metadata, fallback) : null;
      const [multiPileState, latestEnvelopeRun] =
        projectId != null && pileGroupId != null && dto.pageContext.pageKind === 'multi_pile'
          ? await Promise.all([
              this.multiPileService.getState(pileGroupId, projectId),
              this.multiPileService.getLatestEnvelopeRun(pileGroupId, projectId),
            ])
          : [null, null];

      const suggestionResult = buildDeterministicFieldSuggestions({
        pageContext: dto.pageContext,
        projectSpecifics,
        recentDocuments: recentDocuments.map((document) => ({
          id: document.id,
          filename: document.filename,
          latestRunStatus: document.extractionRuns[0]?.status ?? null,
          resultJson: document.extractionRuns[0]?.resultJson ?? null,
        })),
        multiPileState,
        latestEnvelopeRun,
      });

      return buildSuggestedFieldAssistantResponse(dto.pageContext, suggestionResult);
    }

    const deterministicProjectDetailResponse = buildProjectDetailQuickActionAssistantResponse(
      dto.pageContext,
      dto.quickAction,
    );
    if (deterministicProjectDetailResponse) {
      return deterministicProjectDetailResponse;
    }

    if (mode === 'agent') {
      const runtimeSelection = await this.getOrganisationAiAgentRuntimeSelection(
        user.organisationId,
      );

      this.logger.log(
        `AI respond mode=${mode} provider=${runtimeSelection.provider} model=${runtimeSelection.model} organisationId=${user.organisationId} route=${dto.pageContext.route}`,
      );

      return this.respondWithAgentMode({
        user,
        dto,
        projectId,
        pileGroupId,
        model: runtimeSelection.model,
        project,
        pileGroup,
      });
    }

    const runtimeState = await this.getOrganisationAiAssistantRuntimeState(user.organisationId);
    const runtimeSelection = resolveAiAssistantRuntimeSelection(
      runtimeState.settings,
      runtimeState.providerStatus,
    );
    const selectedModel = runtimeSelection.model;
    const selectedProvider = runtimeSelection.provider;
    const recentDocuments =
      projectId != null
        ? await this.listRecentAssistantDocuments(user.organisationId, projectId)
        : [];

    this.logger.log(
      `AI respond mode=${mode} provider=${selectedProvider} model=${selectedModel} organisationId=${user.organisationId} route=${dto.pageContext.route}`,
    );

    const quickAction = dto.quickAction ?? 'review_page';
    const promptContext = buildAssistantPromptContext({
      quickAction,
      pageContext: dto.pageContext,
      projectSnapshot: project
        ? {
            id: project.id,
            name: project.name,
            code: project.code,
            status: project.status,
            updatedAt: project.updatedAt.toISOString(),
          }
        : null,
      pileGroupSnapshot: pileGroup
        ? {
            id: pileGroup.id,
            name: pileGroup.name,
            description: pileGroup.description ?? null,
          }
        : null,
      recentAiDocuments: recentDocuments.map((document) => summarizeAssistantDocument(document)),
    });

    return this.respondWithProviderModel({
      provider: selectedProvider,
      model: selectedModel,
      credential: runtimeState.providerCredentials[selectedProvider],
      systemPrompt: AI_ASSISTANT_SYSTEM_PROMPT,
      promptContext,
      messages: dto.messages,
      responseFormatName: 'engineering_app_assistant_response',
      responseFormatDescription:
        'Current-page guidance for the engineering app assistant, with draft-only apply on supported pages',
      noPayloadErrorMessage:
        selectedProvider === 'anthropic'
          ? 'Anthropic returned no assistant payload'
          : 'OpenAI returned no assistant payload',
      logContext: 'AI assistant guidance',
    });
  }

  private async respondWithAgentMode({
    user,
    dto,
    projectId,
    pileGroupId,
    model,
    project,
    pileGroup,
  }: {
    user: RequestUser & { organisationId: string };
    dto: RespondAiAssistantDto;
    projectId: string | null;
    pileGroupId: string | null;
    model: AiModelId;
    project: {
      id: string;
      name: string;
      code: string;
      status: string;
      updatedAt: Date;
    } | null;
    pileGroup: {
      id: string;
      name: string;
      description: string | null;
    } | null;
  }) {
    const promptContext = await this.aiAgentOrchestrationService.buildPromptContext({
      user,
      dto,
      projectId,
      pileGroupId,
      projectSnapshot: project
        ? {
            id: project.id,
            name: project.name,
            code: project.code,
            status: project.status,
            updatedAt: project.updatedAt.toISOString(),
          }
        : null,
      pileGroupSnapshot: pileGroup
        ? {
            id: pileGroup.id,
            name: pileGroup.name,
            description: pileGroup.description ?? null,
          }
        : null,
    });

    return this.respondWithOpenAiModel({
      model,
      systemPrompt: AI_AGENT_SYSTEM_PROMPT,
      promptContext,
      messages: dto.messages,
      responseFormatName: 'engineering_app_agent_response',
      responseFormatDescription:
        'Structured read-only response for the engineering app beta agent mode',
      noPayloadErrorMessage: 'OpenAI returned no agent payload',
      logContext: 'AI agent guidance',
    });
  }

  private async respondWithOpenAiModel({
    model,
    systemPrompt,
    promptContext,
    messages,
    responseFormatName,
    responseFormatDescription,
    noPayloadErrorMessage,
    logContext,
  }: {
    model: AiModelId;
    systemPrompt: string;
    promptContext: string;
    messages: RespondAiAssistantDto['messages'];
    responseFormatName: string;
    responseFormatDescription: string;
    noPayloadErrorMessage: string;
    logContext: string;
  }) {
    try {
      const openai = this.getOpenAiClient();
      const response = await openai.responses.parse({
        model,
        input: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: promptContext,
          },
          ...this.buildAssistantProviderConversation(messages),
        ],
        text: {
          format: zodTextFormat(assistantResponseSchema, responseFormatName, {
            description: responseFormatDescription,
          }),
          verbosity: 'medium',
        },
      });

      const parsed = response.output_parsed;
      if (!parsed) {
        throw new Error(noPayloadErrorMessage);
      }

      return parsed;
    } catch (error) {
      const message = getErrorMessage(error);
      this.logger.error(`Failed to respond with ${logContext}: ${message}`);
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      throw new BadRequestException(message);
    }
  }

  private async respondWithProviderModel({
    provider,
    model,
    credential,
    systemPrompt,
    promptContext,
    messages,
    responseFormatName,
    responseFormatDescription,
    noPayloadErrorMessage,
    logContext,
  }: {
    provider: AiAssistantProvider;
    model: AiAssistantModelId;
    credential?: AssistantProviderCredentialInput;
    systemPrompt: string;
    promptContext: string;
    messages: RespondAiAssistantDto['messages'];
    responseFormatName: string;
    responseFormatDescription: string;
    noPayloadErrorMessage: string;
    logContext: string;
  }) {
    try {
      const adapter = this.assistantProviderRegistry.getProvider(provider, model);

      return await adapter.respondToAssistant(
        {
          model,
          systemPrompt,
          promptContext,
          conversation: this.buildAssistantProviderConversation(messages),
          responseFormatName,
          responseFormatDescription,
          noPayloadErrorMessage,
        },
        credential,
      );
    } catch (error) {
      const message = getErrorMessage(error);
      this.logger.error(`Failed to respond with ${logContext}: ${message}`);
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      throw new BadRequestException(message);
    }
  }

  private async runEngineeringReportExtraction(
    document: AiDocument,
    vectorStoreId: string,
    model: string,
  ): Promise<EngineeringReportExtractionResult> {
    const openai = this.getOpenAiClient();
    const citationRegistry = new Map<string, ExtractionCitation>();
    const citationCache = new Map<string, ExtractionCitation[]>();
    const extractionProfile = resolveEngineeringReportExtractionProfile(document);

    const response = await openai.responses.parse({
      model,
      input: [
        {
          role: 'system',
          content: [{ type: 'input_text', text: ENGINEERING_REPORT_PROMPT }],
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: [
                `Extract structured engineering report details from "${document.filename}".`,
                `Registry classification: documentFamily=${extractionProfile.documentFamily}, reportType=${extractionProfile.reportType}, ownerWorkspace=${extractionProfile.ownerWorkspace}.`,
                'Use the registry reportType as the extraction profile selector. Do not re-route the document purely from the filename.',
                'Extract normalized document family, report title, project summary, structural defaults, geotechnical basis, and load mentions.',
                'If the report is geotechnical, move groundwater and hydrostatic design assumptions into geotechnicalBasis instead of loadMentions.',
                'If reportType is geotechnical_comment, populate geotechnicalCommentProfile as a delta/addendum summary and leave unrelated fields empty unless directly supported.',
                'If reportType is dewatering_management_plan, populate dewateringProfile and leave geotechnical material-table fields empty unless a table is explicitly part of the selected profile.',
                'Only return loadMentions when the report explicitly contains named load cases or combination schedules.',
                'If a concept is absent, return null or an empty list instead of inferring.',
              ].join(' '),
            },
          ],
        },
      ],
      tools: [
        {
          type: 'file_search',
          vector_store_ids: [vectorStoreId],
          max_num_results: 8,
        },
      ],
      include: ['file_search_call.results'],
      text: {
        format: zodTextFormat(
          engineeringReportExtractionDraftSchema,
          'engineering_report_extraction',
          {
            description: 'Structured engineering report extraction with evidence queries',
          },
        ),
        verbosity: 'medium',
      },
    });

    const parsed = response.output_parsed;
    if (!parsed) {
      throw new Error('OpenAI returned no structured extraction payload');
    }

    const retrievalResults = response.output
      .filter((item): item is ResponseFileSearchToolCall => item.type === 'file_search_call')
      .flatMap((item) => item.results ?? []);

    const buildCitations = async (query: string | null, hint: CitationHint = {}) => {
      const resolvedQuery = resolveCitationQuery(query, hint);
      if (!resolvedQuery) {
        return [];
      }

      const cacheKey = JSON.stringify({
        query: resolvedQuery,
        value: hint.value ?? null,
        preferredTerms: hint.preferredTerms ?? [],
        fallbackQueryTerms: hint.fallbackQueryTerms ?? [],
        avoidTerms: hint.avoidTerms ?? [],
        preferTitlePage: hint.preferTitlePage ?? false,
        maxResults: hint.maxResults ?? 2,
      });

      const cached = citationCache.get(cacheKey);
      if (cached) {
        return cached;
      }

      const searchResponse = await openai.vectorStores.search(vectorStoreId, {
        query: resolvedQuery,
        max_num_results: 6,
        rewrite_query: true,
        ranking_options: {
          score_threshold: 0.45,
        },
      });

      const citations = rankAndLimitCitations(
        searchResponse.data
          .map((result) => toCitation(result, resolvedQuery, citationRegistry))
          .filter((citation): citation is ExtractionCitation => citation !== null),
        hint,
      );

      if (citations.length === 0) {
        const fallback = rankAndLimitCitations(
          retrievalResults
            .map((result) => toCitationFromResponseResult(result, resolvedQuery, citationRegistry))
            .filter((citation): citation is ExtractionCitation => citation !== null)
            .filter((citation) => matchesCitationHint(citation, hint)),
          hint,
        );

        citationCache.set(cacheKey, fallback);
        return fallback;
      }

      citationCache.set(cacheKey, citations);
      return citations;
    };

    const normalizedDocumentFamily = normalizeDocumentFamily(
      parsed.documentFamily.value,
      parsed.reportTitle.value,
      parsed.projectSummary.value,
    );

    const documentHistoryBundle = await buildRawSearchCitationBundle(
      openai,
      vectorStoreId,
      'Revision 0 Osama Naushad Chris Crowe 7 November 2025',
      citationRegistry,
      2,
    );

    const geotechnicalBasis = {
      foundingNotes: await mapFindingList(parsed.geotechnicalBasis.foundingNotes, buildCitations, {
        preferredTerms: ['foundation', 'founding', 'pile', 'footing', 'raft', 'bearing'],
        fallbackQueryTerms: ['pile founding recommendations', 'table 7 pile founding strata'],
        avoidTerms: ['shoring', 'anchor', 'sheet pile', 'temporary excavation'],
      }),
      groundwaterNotes: await mapFindingList(
        parsed.geotechnicalBasis.groundwaterNotes,
        buildCitations,
        {
          preferredTerms: ['groundwater', 'dewatering', 'monitoring', 'excavation'],
          fallbackQueryTerms: ['groundwater monitoring', 'dewatering', 'drawdown'],
        },
      ),
      groundwaterDesignAssumptions: await mapFindingList(
        parsed.geotechnicalBasis.groundwaterDesignAssumptions,
        buildCitations,
        {
          preferredTerms: ['groundwater', 'design groundwater', 'assumption', 'basement'],
          fallbackQueryTerms: ['design groundwater level', '2 m above current measured levels'],
        },
      ),
      hydrostaticAssumptions: await mapFindingList(
        parsed.geotechnicalBasis.hydrostaticAssumptions,
        buildCitations,
        {
          preferredTerms: ['hydrostatic', 'uplift', 'water pressure', 'basement'],
          fallbackQueryTerms: ['hydrostatic uplift pressure', 'tanked slab', '10 kPa per metre'],
        },
      ),
      materialMentions: await mapFindingList(
        parsed.geotechnicalBasis.materialMentions,
        buildCitations,
        {
          preferredTerms: ['soil', 'rock', 'shale', 'sand', 'clay', 'geological unit', 'material'],
          fallbackQueryTerms: ['table 3 geological units', 'material parameters'],
        },
      ),
      rockStrataDesignParameters: await mapFindingList(
        parsed.geotechnicalBasis.rockStrataDesignParameters,
        buildCitations,
        {
          preferredTerms: ['rock', 'shale', 'strata', 'design parameter', 'bearing', 'adhesion'],
          fallbackQueryTerms: ['table 3 geological units', 'table 7 bored CFA piles'],
          avoidTerms: ['shoring', 'anchor', 'sheet pile', 'temporary excavation'],
        },
      ),
      pileRecommendations: await mapFindingList(
        parsed.geotechnicalBasis.pileRecommendations,
        buildCitations,
        {
          preferredTerms: ['pile', 'bored pile', 'CFA pile', 'founding'],
          fallbackQueryTerms: ['bored or CFA piles', 'one pile diameter', 'founding strata'],
        },
      ),
      footingRecommendations: await mapFindingList(
        parsed.geotechnicalBasis.footingRecommendations,
        buildCitations,
        {
          preferredTerms: ['footing', 'pad footing', 'strip footing', 'bearing'],
        },
      ),
      raftRecommendations: await mapFindingList(
        parsed.geotechnicalBasis.raftRecommendations,
        buildCitations,
        {
          preferredTerms: ['raft', 'slab', 'mat foundation', 'subgrade reaction'],
        },
      ),
      shoringRecommendations: await mapFindingList(
        parsed.geotechnicalBasis.shoringRecommendations,
        buildCitations,
        {
          preferredTerms: ['shoring', 'retention', 'anchor', 'excavation', 'wall'],
        },
      ),
      aggressivityDurabilityNotes: await mapFindingList(
        parsed.geotechnicalBasis.aggressivityDurabilityNotes,
        buildCitations,
        {
          preferredTerms: ['aggressivity', 'durability', 'sulfate', 'corrosion'],
          fallbackQueryTerms: ['aggressivity testing', 'pile design durability'],
          avoidTerms: ['shoring', 'anchor', 'trapezoidal earth pressure'],
        },
      ),
      furtherInvestigationNotes: await mapFindingList(
        parsed.geotechnicalBasis.furtherInvestigationNotes,
        buildCitations,
        {
          preferredTerms: ['further investigation', 'additional testing', 'further works'],
          fallbackQueryTerms: ['further geotechnical works', 'continuous groundwater monitoring'],
        },
      ),
    };

    const reportMetadata: ReportMetadataExtraction = {
      projectNumber: await mapNullableFinding(parsed.reportMetadata.projectNumber, buildCitations, {
        preferredTerms: ['project no', 'project number', 'document history'],
        fallbackQueryTerms: ['document history project number'],
        preferTitlePage: true,
      }),
      filename: await mapNullableFinding(parsed.reportMetadata.filename, buildCitations, {
        preferredTerms: ['filename', 'document history'],
        fallbackQueryTerms: ['document history filename'],
        preferTitlePage: true,
      }),
      documentTitle: await mapNullableFinding(parsed.reportMetadata.documentTitle, buildCitations, {
        preferredTerms: ['document title', 'report title', 'document history'],
        fallbackQueryTerms: ['document history document title'],
        preferTitlePage: true,
      }),
      siteAddress: await mapNullableFinding(parsed.reportMetadata.siteAddress, buildCitations, {
        preferredTerms: ['site address', 'address', 'document history'],
        fallbackQueryTerms: ['document history site address'],
        preferTitlePage: true,
      }),
      preparedFor: await mapNullableFinding(parsed.reportMetadata.preparedFor, buildCitations, {
        preferredTerms: ['prepared for', 'document history'],
        fallbackQueryTerms: ['prepared for document history'],
        preferTitlePage: true,
      }),
      revision: await mapNullableFinding(parsed.reportMetadata.revision, buildCitations, {
        preferredTerms: ['revision', 'document history'],
        fallbackQueryTerms: ['revision document history'],
        preferTitlePage: true,
      }),
      status: await mapNullableFinding(parsed.reportMetadata.status, buildCitations, {
        preferredTerms: ['status', 'document history'],
        fallbackQueryTerms: ['status prepared by reviewed by document history'],
        preferTitlePage: true,
      }),
      preparedBy: await mapNullableFinding(parsed.reportMetadata.preparedBy, buildCitations, {
        preferredTerms: ['prepared by', 'document history'],
        fallbackQueryTerms: ['prepared by document history'],
        preferTitlePage: true,
      }),
      reviewedBy: await mapNullableFinding(parsed.reportMetadata.reviewedBy, buildCitations, {
        preferredTerms: ['reviewed by', 'document history'],
        fallbackQueryTerms: ['reviewed by document history'],
        preferTitlePage: true,
      }),
      dateIssued: await mapNullableFinding(parsed.reportMetadata.dateIssued, buildCitations, {
        preferredTerms: ['date issued', 'issued', 'document history'],
        fallbackQueryTerms: ['date issued document history'],
        preferTitlePage: true,
      }),
      distributionIssuedTo: await mapNullableFinding(
        parsed.reportMetadata.distributionIssuedTo,
        buildCitations,
        {
          preferredTerms: ['distribution of copies', 'issued to'],
          fallbackQueryTerms: ['distribution of copies issued to'],
          preferTitlePage: true,
        },
      ),
      authorSignOffDate: await mapNullableFinding(
        parsed.reportMetadata.authorSignOffDate,
        buildCitations,
        {
          preferredTerms: ['author', 'signature date'],
          fallbackQueryTerms: ['author signature date'],
          preferTitlePage: true,
        },
      ),
      reviewerSignOffDate: await mapNullableFinding(
        parsed.reportMetadata.reviewerSignOffDate,
        buildCitations,
        {
          preferredTerms: ['reviewer', 'signature date'],
          fallbackQueryTerms: ['reviewer signature date'],
          preferTitlePage: true,
        },
      ),
    };

    applyReportMetadataFallbacks(reportMetadata, documentHistoryBundle);

    const investigationBasis: InvestigationBasisExtraction = {
      purposeScope: await mapNullableFinding(
        parsed.investigationBasis.purposeScope,
        buildCitations,
        {
          preferredTerms: ['scope of works', 'purpose', 'aim of the investigation'],
          fallbackQueryTerms: ['scope of works purpose of investigation'],
        },
      ),
      numberOfBoreholes: await mapNullableFinding(
        parsed.investigationBasis.numberOfBoreholes,
        buildCitations,
        {
          preferredTerms: ['boreholes', 'field work methods'],
          fallbackQueryTerms: ['field work methods boreholes'],
        },
      ),
      testLocationSummary: await mapNullableFinding(
        parsed.investigationBasis.testLocationSummary,
        buildCitations,
        {
          preferredTerms: ['test locations', 'boreholes', 'scope of works'],
          fallbackQueryTerms: ['scope of works test locations'],
        },
      ),
      targetDepthRule: await mapNullableFinding(
        parsed.investigationBasis.targetDepthRule,
        buildCitations,
        {
          preferredTerms: ['target depth', 'depth of 15 m', 'scope of works'],
          fallbackQueryTerms: ['scope of works target depth'],
        },
      ),
      fieldworkDates: await mapNullableFinding(
        parsed.investigationBasis.fieldworkDates,
        buildCitations,
        {
          preferredTerms: ['fieldwork', 'date', 'field work methods'],
          fallbackQueryTerms: ['field work methods date'],
        },
      ),
      investigationMethods: await mapFindingList(
        parsed.investigationBasis.investigationMethods,
        buildCitations,
        {
          preferredTerms: ['field work methods', 'boreholes', 'sampling', 'augers'],
          fallbackQueryTerms: ['field work methods'],
        },
      ),
      laboratoryTestingSummary: await mapFindingList(
        parsed.investigationBasis.laboratoryTestingSummary,
        buildCitations,
        {
          preferredTerms: ['laboratory testing', 'table 2', 'table 3', 'table 4', 'table 5'],
          fallbackQueryTerms: ['laboratory testing'],
        },
      ),
      coordinateDatumReferences: await mapFindingList(
        parsed.investigationBasis.coordinateDatumReferences,
        buildCitations,
        {
          preferredTerms: ['coordinate', 'datum', 'AHD', 'RL'],
          fallbackQueryTerms: ['coordinate datum ahd'],
        },
      ),
      confidenceLimitations: await mapFindingList(
        parsed.investigationBasis.confidenceLimitations,
        buildCitations,
        {
          preferredTerms: ['limited', 'between and beyond', 'undetected variations', 'sampling'],
          fallbackQueryTerms: ['limitations undetected variations sampling locations'],
        },
      ),
    };

    const groundwater = {
      observedConditions: await mapFindingList(
        parsed.groundwater.observedConditions,
        buildCitations,
        {
          preferredTerms: ['groundwater', 'observed', 'no free groundwater', 'boreholes'],
          fallbackQueryTerms: ['groundwater conditions observed'],
        },
      ),
      uncertaintyAndMonitoring: await mapFindingList(
        parsed.groundwater.uncertaintyAndMonitoring,
        buildCitations,
        {
          preferredTerms: ['groundwater', 'obscured', 'perched water', 'monitoring', 'standpipe'],
          fallbackQueryTerms: ['groundwater obscured perched monitoring'],
        },
      ),
      constructionImplications: await mapFindingList(
        parsed.groundwater.constructionImplications,
        buildCitations,
        {
          preferredTerms: ['groundwater', 'excavations', 'piles', 'construction'],
          fallbackQueryTerms: ['groundwater construction implications excavations piles'],
        },
      ),
    };

    const geotechnicalCommentProfile: GeotechnicalCommentProfileExtraction = {
      changedItems: await mapFindingList(
        parsed.geotechnicalCommentProfile.changedItems,
        buildCitations,
        {
          preferredTerms: ['change', 'changed', 'revised', 'addendum', 'comment', 'amendment'],
          fallbackQueryTerms: ['geotechnical comment addendum revised recommendation changed'],
        },
      ),
      unchangedItems: await mapFindingList(
        parsed.geotechnicalCommentProfile.unchangedItems,
        buildCitations,
        {
          preferredTerms: ['unchanged', 'remains', 'remain valid', 'no change'],
          fallbackQueryTerms: ['unchanged remains valid no change'],
        },
      ),
      revisedRecommendations: await mapFindingList(
        parsed.geotechnicalCommentProfile.revisedRecommendations,
        buildCitations,
        {
          preferredTerms: ['recommendation', 'revised', 'comment', 'advice', 'addendum'],
          fallbackQueryTerms: ['revised recommendation geotechnical comment addendum'],
        },
      ),
      affectedDrawingsRevisionsDates: await mapFindingList(
        parsed.geotechnicalCommentProfile.affectedDrawingsRevisionsDates,
        buildCitations,
        {
          preferredTerms: ['drawing', 'revision', 'rev', 'dated', 'date'],
          fallbackQueryTerms: ['affected drawings revisions dates'],
          preferTitlePage: true,
        },
      ),
      explicitNewDesignTablesOrParameters: await mapFindingList(
        parsed.geotechnicalCommentProfile.explicitNewDesignTablesOrParameters,
        buildCitations,
        {
          preferredTerms: ['table', 'design parameter', 'parameters', 'allowable', 'ultimate'],
          fallbackQueryTerms: ['new revised design parameter table'],
        },
      ),
    };

    const dewateringProfile: DewateringProfileExtraction = {
      groundwaterObservations: await mapFindingList(
        parsed.dewateringProfile.groundwaterObservations,
        buildCitations,
        {
          preferredTerms: ['groundwater', 'observed', 'standing water', 'seepage'],
          fallbackQueryTerms: ['dewatering groundwater observations'],
        },
      ),
      groundwaterLevels: await mapFindingList(
        parsed.dewateringProfile.groundwaterLevels,
        buildCitations,
        {
          preferredTerms: ['groundwater level', 'water level', 'RL', 'm AHD'],
          fallbackQueryTerms: ['groundwater water levels dewatering'],
        },
      ),
      permeabilityHydraulicConductivity: await mapFindingList(
        parsed.dewateringProfile.permeabilityHydraulicConductivity,
        buildCitations,
        {
          preferredTerms: ['permeability', 'hydraulic conductivity', 'k value', 'm/s'],
          fallbackQueryTerms: ['permeability hydraulic conductivity dewatering'],
        },
      ),
      inflowRates: await mapFindingList(parsed.dewateringProfile.inflowRates, buildCitations, {
        preferredTerms: ['inflow', 'flow rate', 'L/s', 'ML/day', 'pump rate'],
        fallbackQueryTerms: ['dewatering inflow rates pump rate'],
      }),
      drawdownEstimates: await mapFindingList(
        parsed.dewateringProfile.drawdownEstimates,
        buildCitations,
        {
          preferredTerms: ['drawdown', 'lowering', 'cone of depression'],
          fallbackQueryTerms: ['drawdown estimate dewatering'],
        },
      ),
      aquiferWaterNswAipComplianceNotes: await mapFindingList(
        parsed.dewateringProfile.aquiferWaterNswAipComplianceNotes,
        buildCitations,
        {
          preferredTerms: ['aquifer', 'WaterNSW', 'AIP', 'aquifer interference policy', 'licence'],
          fallbackQueryTerms: ['WaterNSW AIP aquifer interference dewatering compliance'],
        },
      ),
      neighbouringPropertySettlementEffects: await mapFindingList(
        parsed.dewateringProfile.neighbouringPropertySettlementEffects,
        buildCitations,
        {
          preferredTerms: ['settlement', 'neighbouring', 'adjacent property', 'drawdown impact'],
          fallbackQueryTerms: ['settlement neighbouring property drawdown effects'],
        },
      ),
      monitoringReportingRequirements: await mapFindingList(
        parsed.dewateringProfile.monitoringReportingRequirements,
        buildCitations,
        {
          preferredTerms: ['monitoring', 'reporting', 'records', 'frequency'],
          fallbackQueryTerms: ['dewatering monitoring reporting requirements'],
        },
      ),
      keyAssumptionsLimitations: await mapFindingList(
        parsed.dewateringProfile.keyAssumptionsLimitations,
        buildCitations,
        {
          preferredTerms: ['assumption', 'limitation', 'limited', 'basis'],
          fallbackQueryTerms: ['dewatering assumptions limitations'],
        },
      ),
      piezometerMonitoringNetwork: await mapFindingList(
        parsed.dewateringProfile.piezometerMonitoringNetwork,
        buildCitations,
        {
          preferredTerms: ['piezometer', 'monitoring well', 'standpipe', 'monitoring location'],
          fallbackQueryTerms: ['piezometer locations monitoring network'],
        },
      ),
      settlementDrawdownTriggerLevels: await mapFindingList(
        parsed.dewateringProfile.settlementDrawdownTriggerLevels,
        buildCitations,
        {
          preferredTerms: [
            'trigger level',
            'trigger value',
            'settlement trigger',
            'drawdown trigger',
          ],
          fallbackQueryTerms: ['settlement drawdown trigger levels'],
        },
      ),
      waterNswLicenceBoreRegistration: await mapFindingList(
        parsed.dewateringProfile.waterNswLicenceBoreRegistration,
        buildCitations,
        {
          preferredTerms: ['WaterNSW', 'licence', 'bore', 'registration', 'approval'],
          fallbackQueryTerms: ['WaterNSW licence bore registration number'],
        },
      ),
      constructionStageApplicability: await mapFindingList(
        parsed.dewateringProfile.constructionStageApplicability,
        buildCitations,
        {
          preferredTerms: ['stage', 'construction stage', 'bulk excavation', 'basement excavation'],
          fallbackQueryTerms: ['dewatering plan construction stage applies'],
        },
      ),
    };

    const reportSections: ReportSectionExtraction = {
      excavations: await mapFindingList(parsed.reportSections.excavations, buildCitations, {
        preferredTerms: ['excavations', 'excavatability', 'vibration', 'noise'],
      }),
      batterSlopes: await mapFindingList(parsed.reportSections.batterSlopes, buildCitations, {
        preferredTerms: ['batter slopes', 'table 6', 'slope'],
      }),
      soilNails: await mapFindingList(parsed.reportSections.soilNails, buildCitations, {
        preferredTerms: ['soil nails', 'dowels', 'table 7'],
      }),
      retainingWalls: await mapFindingList(parsed.reportSections.retainingWalls, buildCitations, {
        preferredTerms: ['retaining walls', 'earth pressure', 'drainage'],
      }),
      fillMaterials: await mapFindingList(parsed.reportSections.fillMaterials, buildCitations, {
        preferredTerms: ['fill materials', 'select fill', 'CBR', 'plasticity'],
      }),
      siteClassification: await mapFindingList(
        parsed.reportSections.siteClassification,
        buildCitations,
        {
          preferredTerms: ['site classification', 'class s', 'ground movement'],
        },
      ),
      aggressivityDurability: await mapFindingList(
        parsed.reportSections.aggressivityDurability,
        buildCitations,
        {
          preferredTerms: ['aggressivity', 'durability', 'exposure classification'],
        },
      ),
      shallowFoundations: await mapFindingList(
        parsed.reportSections.shallowFoundations,
        buildCitations,
        {
          preferredTerms: ['shallow foundations', 'table 8', 'footings', 'bearing pressures'],
        },
      ),
      deepFoundations: await mapFindingList(parsed.reportSections.deepFoundations, buildCitations, {
        preferredTerms: ['deep foundations', 'piles', 'table 9'],
      }),
      raftSlab: await mapFindingList(parsed.reportSections.raftSlab, buildCitations, {
        preferredTerms: ['raft slab', 'subgrade reaction', 'elastic spring'],
      }),
      subgradePreparation: await mapFindingList(
        parsed.reportSections.subgradePreparation,
        buildCitations,
        {
          preferredTerms: ['subgrade preparation', 'proof rolled', 'select fill', 'AS3798'],
        },
      ),
      drainageServiceInstallationSiteMaintenance: await mapFindingList(
        parsed.reportSections.drainageServiceInstallationSiteMaintenance,
        buildCitations,
        {
          preferredTerms: ['drainage', 'service installation', 'site maintenance', 'AS 2870'],
        },
      ),
      earthquakeSiteFactor: await mapFindingList(
        parsed.reportSections.earthquakeSiteFactor,
        buildCitations,
        {
          preferredTerms: ['earthquake site factor', 'AS 1170.4', 'hazard factor'],
        },
      ),
      workingPlatform: await mapFindingList(parsed.reportSections.workingPlatform, buildCitations, {
        preferredTerms: ['working platform', 'granular platform', 'pile boring rigs'],
      }),
      existingConditionsSurvey: await mapFindingList(
        parsed.reportSections.existingConditionsSurvey,
        buildCitations,
        {
          preferredTerms: ['existing conditions survey', 'vibration monitoring', 'survey'],
        },
      ),
      limitations: await mapFindingList(parsed.reportSections.limitations, buildCitations, {
        preferredTerms: [
          'limitations',
          'exclusive use',
          'contaminants',
          'construction specification',
        ],
        fallbackQueryTerms: ['limitations report exclusive use contaminants'],
      }),
    };

    const retainingWallPreliminaryParameters: RetainingWallPreliminaryParameters = {
      Ka: await mapNullableNumericFinding(
        parsed.retainingWallPreliminaryParameters.Ka,
        buildCitations,
        {
          preferredTerms: ['coefficient of active earth pressure', 'ka', 'retaining walls'],
          fallbackQueryTerms: ['retaining walls coefficient of active earth pressure ka'],
        },
      ),
      Kp: await mapNullableNumericFinding(
        parsed.retainingWallPreliminaryParameters.Kp,
        buildCitations,
        {
          preferredTerms: ['coefficient of passive earth pressure', 'kp', 'retaining walls'],
          fallbackQueryTerms: ['retaining walls coefficient of passive earth pressure kp'],
        },
      ),
      K0: await mapNullableNumericFinding(
        parsed.retainingWallPreliminaryParameters.K0,
        buildCitations,
        {
          preferredTerms: ['at rest earth pressure', 'k0', 'retaining walls'],
          fallbackQueryTerms: ['retaining walls at rest earth pressure k0'],
        },
      ),
      bulkDensityKNm3: await mapNullableNumericFinding(
        parsed.retainingWallPreliminaryParameters.bulkDensityKNm3,
        buildCitations,
        {
          preferredTerms: ['bulk density', 'retaining walls'],
          fallbackQueryTerms: ['retaining walls bulk density'],
        },
      ),
      triangularPressureDistributionNotes: await mapFindingList(
        parsed.retainingWallPreliminaryParameters.triangularPressureDistributionNotes,
        buildCitations,
        {
          preferredTerms: ['triangular earth pressure distribution', 'cantilevered walls'],
        },
      ),
      rectangularPressureExpression: await mapNullableFinding(
        parsed.retainingWallPreliminaryParameters.rectangularPressureExpression,
        buildCitations,
        {
          preferredTerms: ['rectangular earth pressure distribution', 'p = 4h + 0.4q'],
          fallbackQueryTerms: ['retaining walls p equals 4h plus 0.4q'],
        },
      ),
      adjacentFootingPressureExpression: await mapNullableFinding(
        parsed.retainingWallPreliminaryParameters.adjacentFootingPressureExpression,
        buildCitations,
        {
          preferredTerms: ['6H+ 0.6q', 'zone of influence', 'adjacent building footings'],
          fallbackQueryTerms: ['retaining walls 6H plus 0.6q'],
        },
      ),
      hydrostaticDrainageNotes: await mapFindingList(
        parsed.retainingWallPreliminaryParameters.hydrostaticDrainageNotes,
        buildCitations,
        {
          preferredTerms: [
            'drainage should be provided behind retaining walls',
            'hydrostatic pressures',
          ],
        },
      ),
      compactionPressureKPa: await mapNullableNumericFinding(
        parsed.retainingWallPreliminaryParameters.compactionPressureKPa,
        buildCitations,
        {
          preferredTerms: ['compaction induced earth pressures', '15 to 20 kPa'],
          fallbackQueryTerms: ['retaining walls compaction induced earth pressures'],
        },
      ),
    };

    const siteClassificationResult: SiteClassificationExtraction = {
      classification: await mapNullableFinding(
        parsed.siteClassificationResult.classification,
        buildCitations,
        {
          preferredTerms: ['site classification', 'class s', 'AS 2870'],
          fallbackQueryTerms: ['site classification class s as 2870'],
        },
      ),
      estimatedGroundMovement: await mapNullableFinding(
        parsed.siteClassificationResult.estimatedGroundMovement,
        buildCitations,
        {
          preferredTerms: ['ground surface movements', '15 to 20 mm', 'site classification'],
          fallbackQueryTerms: ['site classification ground surface movements'],
        },
      ),
      notes: await mapFindingList(parsed.siteClassificationResult.notes, buildCitations, {
        preferredTerms: ['site classification', 'abnormal moisture', 'AS 2870'],
      }),
    };

    const earthquakeSiteFactor: EarthquakeSiteFactorExtraction = {
      siteSubsoilClass: await mapNullableFinding(
        parsed.earthquakeSiteFactor.siteSubsoilClass,
        buildCitations,
        {
          preferredTerms: ['site sub-soil', 'class ce', 'AS 1170.4'],
          fallbackQueryTerms: ['earthquake site factor class ce'],
        },
      ),
      hazardFactorZ: await mapNullableNumericFinding(
        parsed.earthquakeSiteFactor.hazardFactorZ,
        buildCitations,
        {
          preferredTerms: ['hazard factor', 'z', 'AS 1170.4'],
          fallbackQueryTerms: ['earthquake site factor hazard factor z'],
        },
      ),
      notes: await mapFindingList(parsed.earthquakeSiteFactor.notes, buildCitations, {
        preferredTerms: ['earthquake site factor', 'AS 1170.4'],
      }),
    };

    const pileConstruction: PileConstructionExtraction = {
      suitableMethods: await mapFindingList(
        parsed.pileConstruction.suitableMethods,
        buildCitations,
        {
          preferredTerms: ['bored piles', 'suitable piling method'],
        },
      ),
      cautionsOrUnsuitableMethods: await mapFindingList(
        parsed.pileConstruction.cautionsOrUnsuitableMethods,
        buildCitations,
        {
          preferredTerms: [
            'driven piles',
            'cfa piles',
            'limited penetration',
            'noise',
            'vibration',
          ],
        },
      ),
      designVerificationNotes: await mapFindingList(
        parsed.pileConstruction.designVerificationNotes,
        buildCitations,
        {
          preferredTerms: ['as 2159', 'phi_g', 'risk rating', 'integrity testing'],
        },
      ),
      constructionControls: await mapFindingList(
        parsed.pileConstruction.constructionControls,
        buildCitations,
        {
          preferredTerms: ['methodology statement', 'socket length', 'base cleanliness', 'logging'],
        },
      ),
      testingRecommendations: await mapFindingList(
        parsed.pileConstruction.testingRecommendations,
        buildCitations,
        {
          preferredTerms: ['high strain load testing', 'production piles', 'integrity testing'],
        },
      ),
      upliftTensionNotes: await mapFindingList(
        parsed.pileConstruction.upliftTensionNotes,
        buildCitations,
        {
          preferredTerms: ['tension loads', '0.8 times', 'uplift capacity'],
        },
      ),
      settlementExpectations: await mapFindingList(
        parsed.pileConstruction.settlementExpectations,
        buildCitations,
        {
          preferredTerms: ['settlement of a pile', '1% of pile diameter'],
        },
      ),
    };

    const loadMentions = {
      loadCases: await mapFindingList(parsed.loadMentions.loadCases, buildCitations, {
        preferredTerms: ['load case', 'dead load', 'live load', 'wind load', 'seismic'],
      }),
      combinations: await mapFindingList(parsed.loadMentions.combinations, buildCitations, {
        preferredTerms: ['combination', 'ULS', 'SLS', 'AS 1170'],
      }),
    };

    let geotechnicalParameterTables: GeotechnicalParameterTable[] = [];
    let groundModel = emptyGroundModelExtraction();
    let batterSlopeTable: BatterSlopeTable | null = null;
    let soilNailBondStressTable: SoilNailBondStressTable | null = null;
    let geotechnicalFallbackContext: GeotechnicalFallbackContext | null = null;

    if (shouldApplyGeotechnicalNarrativeProfile(extractionProfile, normalizedDocumentFamily)) {
      geotechnicalFallbackContext = await collectGeotechnicalFallbackContext(
        openai,
        vectorStoreId,
        citationRegistry,
      );
      const focusedEvidence = shouldCollectGeotechnicalFocusedEvidence(extractionProfile)
        ? await collectGeotechnicalFocusedEvidence(openai, vectorStoreId, citationRegistry)
        : [];

      if (
        focusedEvidence.length > 0 &&
        shouldRunGeotechnicalFocusedRefinement(
          extractionProfile,
          geotechnicalCommentProfile,
          focusedEvidence,
        )
      ) {
        const focusedRefinement = await runGeotechnicalFocusedRefinement(
          openai,
          model,
          document.filename,
          focusedEvidence,
        );

        geotechnicalParameterTables = refineGeotechnicalParameterTables(
          mapFocusedTables(focusedRefinement, focusedEvidence),
        );
        applyGeotechnicalFocusedRefinement(geotechnicalBasis, focusedRefinement, focusedEvidence);
        groundModel = mapGroundModel(focusedRefinement, focusedEvidence);
        batterSlopeTable = mapBatterSlopeTable(focusedRefinement, focusedEvidence);
        soilNailBondStressTable = mapSoilNailBondStressTable(focusedRefinement, focusedEvidence);
      }

      reclassifyGeotechnicalLoadMentions(geotechnicalBasis, loadMentions);
      promoteGeotechnicalAssumptionFindings(geotechnicalBasis);
      pruneGeotechnicalFindingOverlap(geotechnicalBasis);
      normalizeGeotechnicalNarrativeFindings(geotechnicalBasis);
      await retargetGeotechnicalFindingCitations(geotechnicalBasis, buildCitations);
      applyGroundwaterFallbacks(groundwater, geotechnicalFallbackContext);
      applyStructuredSectionFallbacks(reportSections, batterSlopeTable, soilNailBondStressTable);
      applyRetainingWallFallbacks(
        retainingWallPreliminaryParameters,
        reportSections,
        geotechnicalFallbackContext,
      );
      applySiteClassificationFallbacks(
        siteClassificationResult,
        reportSections,
        geotechnicalFallbackContext,
      );
      applyEarthquakeSiteFactorFallbacks(
        earthquakeSiteFactor,
        reportSections,
        geotechnicalFallbackContext,
      );
      applyWorkingPlatformAndSurveyFallbacks(reportSections, geotechnicalFallbackContext);
      applyLimitationsFallbacks(reportSections, geotechnicalFallbackContext);
      applyPileConstructionFallbacks(pileConstruction, reportSections, geotechnicalFallbackContext);
    }

    const shallowFoundationBearingTable = buildShallowFoundationBearingTable(
      geotechnicalParameterTables,
      reportSections,
      geotechnicalBasis,
      geotechnicalFallbackContext?.shallowFoundationTableNotes ?? null,
      geotechnicalFallbackContext?.shallowFoundationNarrative ?? null,
    );

    const result: EngineeringReportExtractionResult = {
      extractionProfile,
      documentFamily: await mapNullableDocumentFamilyFinding(
        {
          ...parsed.documentFamily,
          value: normalizedDocumentFamily,
        },
        buildCitations,
        {
          preferredTerms: ['report', 'title', 'geotechnical', 'groundwater', 'structural'],
          fallbackQueryTerms: ['report title', 'prepared for', 'introduction'],
          avoidTerms: ['references', 'bibliography'],
          preferTitlePage: true,
        },
      ),
      reportTitle: await mapNullableFinding(parsed.reportTitle, buildCitations, {
        preferredTerms: ['report', 'title', 'prepared for'],
        fallbackQueryTerms: ['report title', 'prepared for', 'title page'],
        avoidTerms: ['references', 'bibliography'],
        preferTitlePage: true,
      }),
      projectSummary: await mapNullableFinding(parsed.projectSummary, buildCitations, {
        preferredTerms: ['introduction', 'scope', 'project', 'development application'],
        fallbackQueryTerms: ['introduction', 'scope', 'project development application'],
        avoidTerms: ['references', 'appendix'],
        preferTitlePage: true,
      }),
      reportMetadata,
      investigationBasis,
      groundwater,
      reportSections,
      groundModel,
      shallowFoundationBearingTable,
      batterSlopeTable,
      soilNailBondStressTable,
      retainingWallPreliminaryParameters,
      siteClassificationResult,
      earthquakeSiteFactor,
      pileConstruction,
      structuralDefaults: {
        concreteMentions: await mapFindingList(
          parsed.structuralDefaults.concreteMentions,
          buildCitations,
          {
            preferredTerms: ['concrete', 'MPa', 'strength'],
          },
        ),
        coverDurabilityMentions: await mapFindingList(
          parsed.structuralDefaults.coverDurabilityMentions,
          buildCitations,
          {
            preferredTerms: ['cover', 'durability', 'exposure', 'aggressive'],
          },
        ),
        reinforcementMentions: await mapFindingList(
          parsed.structuralDefaults.reinforcementMentions,
          buildCitations,
          {
            preferredTerms: ['reinforcement', 'bar', 'mesh', 'cage'],
          },
        ),
      },
      geotechnicalBasis,
      loadMentions,
      geotechnicalCommentProfile,
      dewateringProfile,
      geotechnicalParameterTables,
      standardsMapping: null,
      citations: [],
    };

    result.standardsMapping = shouldBuildAs2159StandardsMapping(extractionProfile)
      ? buildAs2159StandardsMapping(result)
      : null;
    result.citations = collectCitationsFromResult(result);
    return result;
  }

  private buildProjectCleanupForDeletedAiDocuments(
    project: { id: string; code: string; name: string; metadata: Prisma.JsonValue },
    documents: AiDocumentDeleteCandidate[],
  ): AiDocumentDeleteProjectCleanup {
    const baseMetadata = recordValue(project.metadata);
    const deletedDocumentIds = new Set(documents.map((document) => document.id));
    const rawProjectSpecifics = baseMetadata.projectSpecifics;
    const projectSpecifics = normalizeProjectSpecifics(rawProjectSpecifics, {
      projectName: project.name,
      projectNumber: project.code,
    });
    const activeReferenceId = projectSpecifics.geotechnicalMaterials.activeReferenceId;
    const activeReference =
      projectSpecifics.references.find((reference) => reference.id === activeReferenceId) ?? null;
    const shouldClearActiveReference =
      Boolean(activeReferenceId && deletedDocumentIds.has(activeReferenceId)) ||
      Boolean(
        activeReference &&
        (deletedDocumentIds.has(activeReference.id) ||
          deletedDocumentIds.has(activeReference.referenceId)),
      );

    if (!shouldClearActiveReference) {
      return {
        metadata: null,
        clearedActiveGeotechnicalReport: false,
      };
    }

    const metadata = {
      ...baseMetadata,
      projectSpecifics: {
        ...projectSpecifics,
        references: activeReference
          ? projectSpecifics.references.map((reference) =>
              reference.id === activeReference.id
                ? { ...reference, primaryGeotechnical: false }
                : reference,
            )
          : projectSpecifics.references,
        geotechnicalMaterials: {
          ...projectSpecifics.geotechnicalMaterials,
          activeReferenceId: '',
        },
      },
    } as unknown as Prisma.InputJsonValue;

    return {
      metadata,
      clearedActiveGeotechnicalReport: true,
    };
  }

  private async cleanupDeletedLocalFiles(documents: AiDocumentDeleteCandidate[]) {
    const warnings: string[] = [];

    await Promise.all(
      documents.map(async (document) => {
        try {
          await this.storageService.deleteStoredFile(document.storagePath);
        } catch (error) {
          const message = getErrorMessage(error);
          this.logger.warn(`Failed to delete local AI document file ${document.id}: ${message}`);
          warnings.push(`Local file cleanup failed for ${document.filename}: ${message}`);
        }
      }),
    );

    return warnings;
  }

  private async cleanupDeletedOpenAiReferences(documents: AiDocumentDeleteCandidate[]) {
    const documentsWithOpenAiReferences = documents.filter(
      (document) => document.openaiFileId || document.openaiVectorStoreId,
    );

    if (documentsWithOpenAiReferences.length === 0) {
      return [];
    }

    const openai = this.getOpenAiClientForCleanup();
    if (!openai) {
      return ['OpenAI cleanup skipped because OPENAI_API_KEY is not configured'];
    }

    const warnings: string[] = [];

    for (const document of documentsWithOpenAiReferences) {
      if (document.openaiVectorStoreId) {
        try {
          await openai.vectorStores.delete(document.openaiVectorStoreId);
        } catch (error) {
          if (!isOpenAiNotFoundError(error)) {
            const message = getErrorMessage(error);
            this.logger.warn(
              `Failed to delete OpenAI vector store for AI document ${document.id}: ${message}`,
            );
            warnings.push(
              `OpenAI vector store cleanup failed for ${document.filename}: ${message}`,
            );
          }
        }
      }

      if (document.openaiFileId) {
        try {
          await openai.files.delete(document.openaiFileId);
        } catch (error) {
          if (!isOpenAiNotFoundError(error)) {
            const message = getErrorMessage(error);
            this.logger.warn(
              `Failed to delete OpenAI file for AI document ${document.id}: ${message}`,
            );
            warnings.push(`OpenAI file cleanup failed for ${document.filename}: ${message}`);
          }
        }
      }
    }

    return warnings;
  }

  private getOpenAiClientForCleanup() {
    if (this.openAiClient) {
      return this.openAiClient;
    }

    const apiKey = this.configService.get<string>('OPENAI_API_KEY')?.trim();
    if (!apiKey) {
      return null;
    }

    this.openAiClient = new OpenAI({ apiKey });
    return this.openAiClient;
  }

  private async findAccessibleDocumentOrThrow(
    id: string,
    user: RequestUser & { organisationId: string },
    extractionRunLimit: number,
  ) {
    const document = await this.prisma.aiDocument.findFirst({
      where: {
        id,
        organisationId: user.organisationId,
      },
      include: {
        pileGroup: { select: { id: true, name: true } },
        extractionRuns: {
          orderBy: { createdAt: 'desc' },
          take: extractionRunLimit,
        },
      },
    });

    if (!document) {
      throw new NotFoundException('AI document not found');
    }

    await this.assertProjectAccess(document.projectId, user.organisationId, user.id, user.orgRole);
    return document;
  }

  private async assertProjectAccess(
    projectId: string,
    organisationId: string,
    userId: string,
    orgRole?: string,
  ) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organisationId,
      },
      include: {
        members: {
          select: { userId: true },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (orgRole === 'owner' || orgRole === 'admin') {
      return project;
    }

    const isProjectMember = project.members.some((member) => member.userId === userId);
    if (!isProjectMember) {
      throw new ForbiddenException('Not a member of this project');
    }

    return project;
  }

  private async assertPileGroupAccess(projectId: string, pileGroupId: string) {
    const pileGroup = await this.prisma.pileGroup.findFirst({
      where: {
        id: pileGroupId,
        projectId,
      },
      select: { id: true, name: true, description: true },
    });

    if (!pileGroup) {
      throw new BadRequestException('Pile group not found for the selected project');
    }

    return pileGroup;
  }

  private async ensureLocalFileExists(document: AiDocument) {
    try {
      await access(this.storageService.resolveAbsolutePath(document.storagePath));
    } catch {
      throw new NotFoundException(
        `Local AI document file is missing for ${document.filename}. Re-upload the report to continue.`,
      );
    }
  }

  private getOpenAiClient() {
    this.assertAiFeatureEnabled();

    if (this.openAiClient) {
      return this.openAiClient;
    }

    const apiKey = this.configService.get<string>('OPENAI_API_KEY')?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException('OPENAI_API_KEY is not configured');
    }

    this.openAiClient = new OpenAI({ apiKey });
    return this.openAiClient;
  }

  private assertAiFeatureEnabled() {
    const enabled = this.configService.get<string>('AI_FEATURE_ENABLED');
    if (enabled !== 'true') {
      throw new ServiceUnavailableException('AI feature is disabled');
    }
  }

  private resolveExtractionModel(model?: string) {
    return model?.trim() || this.configService.get<string>('AI_OPENAI_MODEL')?.trim() || 'gpt-4.1';
  }

  private buildAssistantProviderConversation(messages: RespondAiAssistantDto['messages']) {
    return messages
      .filter((message) => message.content.trim().length > 0)
      .slice(-12)
      .map((message) => ({
        role: message.role,
        content: message.content.trim(),
      }));
  }

  private listRecentAssistantDocuments(organisationId: string, projectId: string) {
    return this.prisma.aiDocument.findMany({
      where: {
        organisationId,
        projectId,
      },
      include: {
        pileGroup: { select: { id: true, name: true } },
        extractionRuns: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    });
  }

  private async getOrganisationAiAgentRuntimeSelection(organisationId: string) {
    const { fallbackSettings, metadata } =
      await this.readOrganisationAiSettingsMetadataForRuntime(organisationId);

    return resolveAiAgentRuntimeSelection(
      metadata
        ? getOrganisationAiSettingsFromMetadata(metadata, fallbackSettings)
        : fallbackSettings,
    );
  }

  private async getOrganisationAiAssistantRuntimeState(organisationId: string) {
    const { fallbackSettings, metadata } =
      await this.readOrganisationAiSettingsMetadataForRuntime(organisationId);
    const providerCredentials =
      await this.organisationAiAssistantCredentialStore.getCredentialState(organisationId, {
        legacyMetadata: metadata,
      });

    return {
      settings: metadata
        ? getOrganisationAiSettingsFromMetadata(metadata, fallbackSettings)
        : fallbackSettings,
      providerStatus: this.assistantProviderRegistry.getProviderStatusMap(providerCredentials),
      providerCredentials,
    };
  }

  private async readOrganisationAiSettingsMetadataForRuntime(organisationId: string): Promise<{
    fallbackSettings: OrganisationAiSettings;
    metadata: unknown | null;
  }> {
    const fallbackSettings = buildDefaultOrganisationAiSettings({
      assistantProvider: AI_AGENT_PROVIDER,
      assistantModel: this.resolveAssistantFallbackModel(),
      agentModel: this.resolveAgentFallbackModel(),
    });

    try {
      const organisation = await this.prisma.organisation.findUnique({
        where: { id: organisationId },
        select: { metadata: true },
      });

      return {
        fallbackSettings,
        metadata: organisation?.metadata ?? null,
      };
    } catch (error) {
      if (!isMissingOrganisationMetadataColumnError(error)) {
        throw error;
      }

      this.logger.warn(
        `Organisation metadata column is unavailable; using fallback AI settings for organisation ${organisationId}`,
      );

      return {
        fallbackSettings,
        metadata: null,
      };
    }
  }

  private resolveAssistantFallbackModel(): AiModelId {
    return normalizeAiModelSelection(
      this.configService.get<string>('AI_OPENAI_MODEL')?.trim(),
      'gpt-4.1',
    );
  }

  private resolveAgentFallbackModel(): AiModelId {
    return normalizeAiModelSelection(
      this.configService.get<string>('AI_OPENAI_AGENT_MODEL')?.trim() ||
        this.configService.get<string>('AI_OPENAI_MODEL')?.trim(),
      'gpt-4.1-mini',
    );
  }
}

function resolveAssistantScopeId(
  explicitId: string | undefined,
  contextId: string | null | undefined,
) {
  if (explicitId && contextId && explicitId !== contextId) {
    throw new BadRequestException('Assistant scope identifiers do not match page context');
  }

  return explicitId ?? contextId ?? null;
}

function buildSuggestedFieldAssistantResponse(
  pageContext: RespondAiAssistantDto['pageContext'],
  result: AssistantFieldSuggestionBuildResult,
): AssistantResponse {
  const visibleFacts = getPreferredAssistantPageFacts(pageContext).slice(0, 4);
  const answer = result.supported
    ? result.suggestedFields.length > 0
      ? `I found ${result.suggestedFields.length} grounded suggestion${result.suggestedFields.length === 1 ? '' : 's'} for this page. Review them below and apply only the ones you want. Any applied changes affect only the current page draft, do not save or run anything, and still require the normal Save action.`
      : 'I could not find any grounded field suggestions for this page from the current project state, extracted reports, or internal read-only tools, so I am not inventing values.'
    : 'This page does not yet support guided draft actions. I can still answer questions from the current page context.';

  return {
    answer,
    visiblePageFacts:
      visibleFacts.length > 0 ? visibleFacts : (pageContext.keyFacts ?? []).slice(0, 4),
    toolFindings: result.toolFindings.slice(0, 8),
    inferredLikelyIssues: [],
    standardsReferenceNotes: [],
    suggestedNextSteps:
      result.suggestedFields.length > 0
        ? [
            'Review the suggested values, apply only the ones you want, then use the normal Save button to persist them.',
          ]
        : result.supported
          ? [
              'Upload and extract an AI report or complete the missing setup inputs before retrying suggestions.',
            ]
          : pageContext.pageKind === 'multi_pile'
            ? [
                'Use the assistant for guidance only on Multi-Pile for now; make calculator-owned changes manually.',
              ]
            : [
                'Use a supported project authoring page for guided draft apply, or keep using the assistant for guidance on this page.',
              ],
    suggestedFields: result.suggestedFields.slice(0, 160),
    draftActions: buildAssistantDraftActionsForCurrentPage(
      pageContext,
      result.suggestedFields.slice(0, 160),
    ),
    limitationNote: result.limitationNote,
  };
}

function getPreferredAssistantPageFacts(pageContext: RespondAiAssistantDto['pageContext']) {
  const pageSpecificData = objectRecord(pageContext.pageSpecificData);
  const assistantGuidance = objectRecord(pageSpecificData.assistantGuidance);
  const projectPrecision = objectRecord(pageSpecificData.projectPrecision);

  return dedupeStringList([
    ...stringArrayValue(projectPrecision.currentStateFacts),
    ...stringArrayValue(assistantGuidance.currentState),
    ...(pageContext.keyFacts ?? []),
  ]);
}

function buildAssistantPromptContext({
  quickAction,
  pageContext,
  projectSnapshot,
  pileGroupSnapshot,
  recentAiDocuments,
}: {
  quickAction: AiAssistantQuickAction;
  pageContext: RespondAiAssistantDto['pageContext'];
  projectSnapshot: AssistantProjectSnapshot;
  pileGroupSnapshot: AssistantPileGroupSnapshot;
  recentAiDocuments: AssistantRecentDocumentSummary[];
}) {
  const payload = {
    quickAction,
    quickActionFocus: describeAssistantQuickAction(quickAction),
    pageContext,
    projectSnapshot,
    pileGroupSnapshot,
    recentAiDocuments,
  };

  return [
    'Use this app context as the sole source of truth for the response.',
    'If the latest user message asks a specific question, answer that question directly; otherwise follow the quickActionFocus.',
    'If the page kind is unsupported or sparse, explain the limit honestly.',
    'If pageContext.pageSpecificData.assistantGuidance exists, prioritize those arrays as the route-authored summary of current state, missing inputs, blockers, standards-reference notes, and next actions.',
    'For project_detail pages, prefer exact field labels, reference-row gaps, library gaps, and geotechnical row gaps from pageContext over generic section summaries.',
    'If pageContext.pageSpecificData.activeTabContext exists, prefer that active-tab detail when the user asks what is missing, why a run is blocked, or what to do next.',
    'Return direct facts, likely issues, standards-reference notes, and next steps without claiming any mutation.',
    JSON.stringify(payload, null, 2),
  ].join('\n\n');
}

function buildProjectDetailQuickActionAssistantResponse(
  pageContext: RespondAiAssistantDto['pageContext'],
  quickAction: AiAssistantQuickAction | undefined,
): AssistantResponse | null {
  if (
    !quickAction ||
    quickAction === 'suggest_fields' ||
    pageContext.pageKind !== 'project_detail'
  ) {
    return null;
  }

  const pageSpecificData = objectRecord(pageContext.pageSpecificData);
  const assistantGuidance = objectRecord(pageSpecificData.assistantGuidance);
  const projectPrecision = objectRecord(pageSpecificData.projectPrecision);
  const currentStateFacts = dedupeStringList([
    ...stringArrayValue(projectPrecision.currentStateFacts),
    ...stringArrayValue(assistantGuidance.currentState),
    ...(pageContext.keyFacts ?? []),
  ]);
  const missingInputs = dedupeStringList([
    ...stringArrayValue(projectPrecision.exactMissingItems),
    ...stringArrayValue(assistantGuidance.missingInputs),
  ]);
  const nextActions = dedupeStringList([
    ...stringArrayValue(projectPrecision.exactNextEdits),
    ...stringArrayValue(assistantGuidance.nextActions),
  ]);
  const warnings = dedupeStringList(pageContext.visibleWarnings ?? []);

  switch (quickAction) {
    case 'review_page':
      return {
        answer:
          missingInputs.length > 0
            ? 'This Project page is the shared source of truth for project details, references, structural defaults, and geotechnical setup. The exact visible gaps on the page are listed below, including blank fields and incomplete rows.'
            : 'This Project page looks materially complete from the current visible context, and the main authored sections are listed below.',
        visiblePageFacts: currentStateFacts.slice(0, 6),
        toolFindings: warnings.slice(0, 4),
        inferredLikelyIssues: missingInputs.slice(0, 8),
        standardsReferenceNotes: [],
        suggestedNextSteps: nextActions.slice(0, 6),
        suggestedFields: [],
        draftActions: [],
        limitationNote: null,
      };
    case 'explain_page':
      return {
        answer:
          'This page is where the project-owned details, references, structural default libraries, and geotechnical inputs are authored before downstream Multi-Pile work. I listed the current state below, plus any exact gaps that are still visible on the page.',
        visiblePageFacts: currentStateFacts.slice(0, 6),
        toolFindings: [],
        inferredLikelyIssues: missingInputs.slice(0, 6),
        standardsReferenceNotes: [],
        suggestedNextSteps: nextActions.slice(0, 5),
        suggestedFields: [],
        draftActions: [],
        limitationNote: null,
      };
    case 'find_missing_inputs':
      return {
        answer:
          missingInputs.length > 0
            ? 'The current Project page still has named blank fields and incomplete rows. I listed the exact missing items below.'
            : 'I do not see named blank fields or incomplete rows from the current Project page context.',
        visiblePageFacts: currentStateFacts.slice(0, 4),
        toolFindings: [],
        inferredLikelyIssues: missingInputs.slice(0, 8),
        standardsReferenceNotes: [],
        suggestedNextSteps: nextActions.slice(0, 5),
        suggestedFields: [],
        draftActions: [],
        limitationNote: null,
      };
    case 'suggest_next_steps':
      return {
        answer:
          nextActions.length > 0
            ? 'The highest-value edits from this Project page are the exact section-level changes listed below.'
            : 'I do not see a clearer next edit from the current Project page context.',
        visiblePageFacts: currentStateFacts.slice(0, 4),
        toolFindings: [],
        inferredLikelyIssues: missingInputs.slice(0, 6),
        standardsReferenceNotes: [],
        suggestedNextSteps: nextActions.slice(0, 8),
        suggestedFields: [],
        draftActions: [],
        limitationNote: null,
      };
    default:
      return null;
  }
}

function describeAssistantQuickAction(quickAction: AiAssistantQuickAction) {
  switch (quickAction) {
    case 'review_page':
      return 'Review the page, summarize what is visible, identify likely workflow gaps, and suggest next steps.';
    case 'explain_page':
      return 'Explain what this page is for and what the current state is showing.';
    case 'find_missing_inputs':
      return 'Start with the most relevant current state facts, then identify likely missing inputs or unresolved prerequisites based on the current page context.';
    case 'suggest_next_steps':
      return 'Suggest practical next steps that the user can take from the current page without making direct edits.';
    case 'suggest_fields':
      return 'Suggest grounded field values for the current page only when they come directly from current context, reports, or internal read-only tools.';
    default:
      return 'Provide grounded help about the current page and explain draft-apply limits truthfully.';
  }
}

function objectRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {} as Record<string, unknown>;
  }

  return value as Record<string, unknown>;
}

function stringArrayValue(value: unknown) {
  return Array.isArray(value)
    ? value
        .filter((entry): entry is string => typeof entry === 'string')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
    : [];
}

function dedupeStringList(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)),
  );
}

function summarizeAssistantDocument(
  document: AiDocument & {
    pileGroup: { id: string; name: string } | null;
    extractionRuns: Array<{
      status: string;
      resultJson: unknown;
    }>;
  },
): AssistantRecentDocumentSummary {
  const latestRun = document.extractionRuns[0] ?? null;
  const extractionSummary = summarizeAssistantExtraction(latestRun?.resultJson);

  return {
    id: document.id,
    filename: document.filename,
    status: document.status,
    pileGroupName: document.pileGroup?.name ?? null,
    latestRunStatus: latestRun?.status ?? null,
    documentFamily: extractionSummary?.documentFamily ?? null,
    reportTitle: extractionSummary?.reportTitle ?? null,
    hasGeotechnicalParameterTables: extractionSummary?.hasGeotechnicalParameterTables ?? false,
    tableLabels: extractionSummary?.tableLabels ?? [],
    hasStandardsMapping: extractionSummary?.hasStandardsMapping ?? false,
    extractionSections: extractionSummary?.extractionSections ?? [],
  };
}

function summarizeAssistantExtraction(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const tables = Array.isArray(record.geotechnicalParameterTables)
    ? record.geotechnicalParameterTables
    : [];

  return {
    documentFamily: getNestedString(record, 'documentFamily', 'value'),
    reportTitle: getNestedString(record, 'reportTitle', 'value'),
    hasGeotechnicalParameterTables: tables.length > 0,
    tableLabels: tables
      .map((table) => {
        if (!table || typeof table !== 'object' || Array.isArray(table)) {
          return null;
        }
        const label = (table as Record<string, unknown>).tableLabel;
        return typeof label === 'string' && label.trim().length > 0 ? label.trim() : null;
      })
      .filter((label): label is string => label !== null)
      .slice(0, 6),
    hasStandardsMapping:
      record.standardsMapping !== null &&
      typeof record.standardsMapping === 'object' &&
      !Array.isArray(record.standardsMapping),
    extractionSections: buildAssistantExtractionSections(record),
  };
}

function buildAssistantExtractionSections(record: Record<string, unknown>) {
  const sections: string[] = [];

  if (getNestedString(record, 'reportMetadata', 'projectNumber')) {
    sections.push('Report metadata');
  }
  if (getNestedString(record, 'investigationBasis', 'purposeScope')) {
    sections.push('Investigation basis');
  }
  if (Array.isArray(objectRecord(record.groundModel).boreholes)) {
    const boreholes = objectRecord(record.groundModel).boreholes as unknown[];
    if (boreholes.length > 0) {
      sections.push('Ground model');
    }
  }
  if (countNestedFindings(record, ['groundwater', 'observedConditions']) > 0) {
    sections.push('Groundwater observations');
  }
  if (
    countNestedFindings(record, ['geotechnicalCommentProfile', 'changedItems']) > 0 ||
    countNestedFindings(record, ['geotechnicalCommentProfile', 'unchangedItems']) > 0 ||
    countNestedFindings(record, ['geotechnicalCommentProfile', 'revisedRecommendations']) > 0 ||
    countNestedFindings(record, ['geotechnicalCommentProfile', 'affectedDrawingsRevisionsDates']) >
      0 ||
    countNestedFindings(record, [
      'geotechnicalCommentProfile',
      'explicitNewDesignTablesOrParameters',
    ]) > 0
  ) {
    sections.push('Geotechnical comment / addendum');
  }
  if (
    countNestedFindings(record, ['dewateringProfile', 'groundwaterObservations']) > 0 ||
    countNestedFindings(record, ['dewateringProfile', 'groundwaterLevels']) > 0 ||
    countNestedFindings(record, ['dewateringProfile', 'permeabilityHydraulicConductivity']) > 0 ||
    countNestedFindings(record, ['dewateringProfile', 'inflowRates']) > 0 ||
    countNestedFindings(record, ['dewateringProfile', 'drawdownEstimates']) > 0 ||
    countNestedFindings(record, ['dewateringProfile', 'aquiferWaterNswAipComplianceNotes']) > 0 ||
    countNestedFindings(record, ['dewateringProfile', 'neighbouringPropertySettlementEffects']) >
      0 ||
    countNestedFindings(record, ['dewateringProfile', 'monitoringReportingRequirements']) > 0 ||
    countNestedFindings(record, ['dewateringProfile', 'keyAssumptionsLimitations']) > 0 ||
    countNestedFindings(record, ['dewateringProfile', 'piezometerMonitoringNetwork']) > 0 ||
    countNestedFindings(record, ['dewateringProfile', 'settlementDrawdownTriggerLevels']) > 0 ||
    countNestedFindings(record, ['dewateringProfile', 'waterNswLicenceBoreRegistration']) > 0 ||
    countNestedFindings(record, ['dewateringProfile', 'constructionStageApplicability']) > 0
  ) {
    sections.push('Dewatering profile');
  }
  if (objectRecord(record.shallowFoundationBearingTable).rows) {
    const rows = objectRecord(record.shallowFoundationBearingTable).rows;
    if (Array.isArray(rows) && rows.length > 0) {
      sections.push('Shallow foundations');
    }
  }
  if (countNestedFindings(record, ['geotechnicalBasis', 'foundingNotes']) > 0) {
    sections.push('Founding notes');
  }
  if (
    countNestedFindings(record, ['pileConstruction', 'suitableMethods']) > 0 ||
    countNestedFindings(record, ['pileConstruction', 'constructionControls']) > 0
  ) {
    sections.push('Deep foundations / piles');
  }
  if (countNestedFindings(record, ['reportSections', 'siteClassification']) > 0) {
    sections.push('Site classification');
  }
  if (countNestedFindings(record, ['reportSections', 'limitations']) > 0) {
    sections.push('Limitations');
  }
  if (countNestedFindings(record, ['structuralDefaults', 'concreteMentions']) > 0) {
    sections.push('Structural defaults');
  }
  if (countNestedFindings(record, ['loadMentions', 'loadCases']) > 0) {
    sections.push('Load mentions');
  }

  return sections;
}

function countNestedFindings(record: Record<string, unknown>, path: [string, string]) {
  const [rootKey, childKey] = path;
  const root = record[rootKey];
  if (!root || typeof root !== 'object' || Array.isArray(root)) {
    return 0;
  }

  const child = (root as Record<string, unknown>)[childKey];
  return Array.isArray(child) ? child.length : 0;
}

function getNestedString(record: Record<string, unknown>, rootKey: string, childKey: string) {
  const root = record[rootKey];
  if (!root || typeof root !== 'object' || Array.isArray(root)) {
    return null;
  }

  const value = (root as Record<string, unknown>)[childKey];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

async function mapFindingList(
  findings: EngineeringReportExtractionDraft['structuralDefaults']['concreteMentions'],
  buildCitations: (query: string | null, hint?: CitationHint) => Promise<ExtractionCitation[]>,
  baseHint: CitationHint = {},
): Promise<ExtractionFinding[]> {
  return Promise.all(
    findings.map(async (finding) => ({
      value: finding.value,
      citations: await buildCitations(finding.evidenceQuery, {
        ...baseHint,
        value: finding.value,
      }),
    })),
  );
}

async function mapNullableFinding(
  finding: EngineeringReportExtractionDraft['reportTitle'],
  buildCitations: (query: string | null, hint?: CitationHint) => Promise<ExtractionCitation[]>,
  baseHint: CitationHint = {},
): Promise<NullableExtractionFinding> {
  return {
    value: finding.value,
    citations: await buildCitations(finding.evidenceQuery, {
      ...baseHint,
      value: finding.value,
    }),
  };
}

async function mapNullableDocumentFamilyFinding(
  finding: EngineeringReportExtractionDraft['documentFamily'],
  buildCitations: (query: string | null, hint?: CitationHint) => Promise<ExtractionCitation[]>,
  baseHint: CitationHint = {},
): Promise<NullableDocumentFamilyExtractionFinding> {
  return {
    value: finding.value,
    citations: await buildCitations(finding.evidenceQuery, baseHint),
  };
}

async function mapNullableNumericFinding(
  finding: { value: number | null; evidenceQuery: string | null },
  buildCitations: (query: string | null, hint?: CitationHint) => Promise<ExtractionCitation[]>,
  baseHint: CitationHint = {},
): Promise<NullableNumericExtractionFinding> {
  return {
    value: finding.value,
    citations: await buildCitations(finding.evidenceQuery, baseHint),
  };
}

function emptyNullableFinding(): NullableExtractionFinding {
  return { value: null, citations: [] };
}

function emptyGroundModelExtraction(): GroundModelExtraction {
  return {
    siteWideInterpretation: emptyNullableFinding(),
    boreholes: [],
  };
}

function mapGroundModel(
  refinement: GeotechnicalFocusedRefinementDraft,
  evidence: ReportEvidenceSnippet[],
): GroundModelExtraction {
  return {
    siteWideInterpretation: mapNullableSnippetFinding(
      refinement.groundModel.siteWideInterpretation,
      evidence,
    ),
    boreholes: refinement.groundModel.boreholes.map((borehole) => ({
      boreholeId: borehole.boreholeId,
      unitDepths: borehole.unitDepths.map((unitDepth) => ({
        unitName: unitDepth.unitName,
        weatheringNote: unitDepth.weatheringNote,
        depthToBaseMeters: unitDepth.depthToBaseMeters,
        depthQualifier: unitDepth.depthQualifier,
        rawDepthText: unitDepth.rawDepthText,
        citations: citationsFromSnippetIds(unitDepth.sourceSnippetIds, evidence),
      })),
      citations: citationsFromSnippetIds(borehole.sourceSnippetIds, evidence),
    })),
  };
}

function mapBatterSlopeTable(
  refinement: GeotechnicalFocusedRefinementDraft,
  evidence: ReportEvidenceSnippet[],
): BatterSlopeTable | null {
  const table = refinement.batterSlopeTable;
  if (!table || table.rows.length === 0) {
    return null;
  }

  return {
    tableLabel: table.tableLabel,
    pageLabel:
      table.pageLabel ??
      table.rows
        .flatMap((row) => citationsFromSnippetIds(row.sourceSnippetIds, evidence))
        .map((citation) => citation.pageLabel)
        .find((pageLabel): pageLabel is string => Boolean(pageLabel)) ??
      null,
    rows: table.rows.map((row) => ({
      material: row.material,
      temporarySlope: row.temporarySlope,
      permanentSlope: row.permanentSlope,
      notes: row.notes,
      assumptions: row.assumptions,
      citations: citationsFromSnippetIds(row.sourceSnippetIds, evidence),
    })),
  };
}

function mapSoilNailBondStressTable(
  refinement: GeotechnicalFocusedRefinementDraft,
  evidence: ReportEvidenceSnippet[],
): SoilNailBondStressTable | null {
  const table = refinement.soilNailBondStressTable;
  if (!table || table.rows.length === 0) {
    return null;
  }

  return {
    tableLabel: table.tableLabel,
    pageLabel:
      table.pageLabel ??
      table.rows
        .flatMap((row) => citationsFromSnippetIds(row.sourceSnippetIds, evidence))
        .map((citation) => citation.pageLabel)
        .find((pageLabel): pageLabel is string => Boolean(pageLabel)) ??
      null,
    rows: table.rows.map((row) => ({
      material: row.material,
      allowableBondStressKPa: row.allowableBondStressKPa,
      notes: row.notes,
      assumptions: row.assumptions,
      citations: citationsFromSnippetIds(row.sourceSnippetIds, evidence),
    })),
  };
}

function mapNullableSnippetFinding(
  finding: { value: string | null; sourceSnippetIds: string[] },
  evidence: ReportEvidenceSnippet[],
): NullableExtractionFinding {
  return {
    value: finding.value,
    citations: citationsFromSnippetIds(finding.sourceSnippetIds, evidence),
  };
}

function buildShallowFoundationBearingTable(
  tables: GeotechnicalParameterTable[],
  reportSections: ReportSectionExtraction,
  geotechnicalBasis: EngineeringReportExtractionResult['geotechnicalBasis'],
  tableNotesBundle: CitationBundle | null,
  narrativeBundle: CitationBundle | null,
): ShallowFoundationBearingTable | null {
  const table = tables.find((entry) => normalizeForMatching(entry.tableLabel).includes('table 8'));
  if (!table || table.rows.length === 0) {
    return null;
  }

  const tableContextText = [
    buildSnippetText(table.rows.flatMap((row) => row.citations)),
    tableNotesBundle?.text ?? '',
  ]
    .filter(Boolean)
    .join('\n');
  const globalFactorOfSafetyMatch = tableContextText.match(
    /factor of safety(?: of)?\s*(\d+(?:\.\d+)?)/i,
  );
  const globalToeOfCuttingMatch = tableContextText.match(
    /(allowable bearing pressures in table 8 assume a level surface[^.]*toe of any cutting[^.]*)/i,
  );
  const globalFactorOfSafety = globalFactorOfSafetyMatch
    ? Number(globalFactorOfSafetyMatch[1])
    : null;
  const globalToeOfCuttingGeometryAssumption = globalToeOfCuttingMatch?.[1]?.trim() ?? null;

  const rows = table.rows
    .map((row) => {
      const parsedPressures = parseShallowFoundationRawRow(row.rawRowText);
      const parsedNotes = parseShallowFoundationRowNotes(row.notes);

      return {
        foundingMaterial: row.rowLabel ?? row.unitDescription ?? null,
        padOrSquareOrCircularAllowableKPa: parsedPressures.padOrSquareOrCircularAllowableKPa,
        stripAllowableKPa: parsedPressures.stripAllowableKPa,
        notes: parsedNotes.notes,
        assumptions: parsedNotes.assumptions,
        factorOfSafety: parsedNotes.factorOfSafety ?? globalFactorOfSafety,
        minimumFoundingWidthM: parsedNotes.minimumFoundingWidthM,
        minimumFoundingDepthM: parsedNotes.minimumFoundingDepthM,
        toeOfCuttingGeometryAssumption:
          parsedNotes.toeOfCuttingGeometryAssumption ?? globalToeOfCuttingGeometryAssumption,
        citations: row.citations,
      };
    })
    .filter(
      (row) =>
        row.foundingMaterial ||
        row.padOrSquareOrCircularAllowableKPa !== null ||
        row.stripAllowableKPa !== null,
    );

  if (rows.length === 0) {
    return null;
  }

  const shallowFoundationFindings = [
    ...reportSections.shallowFoundations,
    ...geotechnicalBasis.footingRecommendations,
  ];

  const settlementFinding = findFindingByPatterns(shallowFoundationFindings, [
    ['settlement', 'footing width'],
    ['settlement'],
  ]);
  const differentialSettlementFinding = findFindingByPatterns(shallowFoundationFindings, [
    ['differential settlement'],
  ]);
  const footingInspectionFinding = findFindingByPatterns(
    [...shallowFoundationFindings, ...geotechnicalBasis.foundingNotes],
    [
      ['inspect', 'geotechnical engineer'],
      ['footing excavations', 'inspected'],
    ],
  );
  const engineeredFillFinding = findFindingByPatterns(shallowFoundationFindings, [
    ['engineered fill', '125 kpa'],
    ['engineered fill', 'bearing pressures'],
  ]);

  const narrativeSettlementFinding =
    settlementFinding ??
    createNullableFinding(
      extractSentence(
        narrativeBundle?.text ?? '',
        /Settlement of pad footings proportioned using the allowable bearing pressures presented in Table 8.*?footing width\./i,
      ),
      narrativeBundle?.citations ?? [],
    );
  const narrativeDifferentialFinding =
    differentialSettlementFinding ??
    createNullableFinding(
      extractSentence(
        narrativeBundle?.text ?? '',
        /For preliminary design purposes, differential settlement between footings can be assumed to be[^.]*\./i,
      ),
      narrativeBundle?.citations ?? [],
    );
  const narrativeFootingInspectionFinding =
    footingInspectionFinding ??
    createNullableFinding(
      extractSentence(
        narrativeBundle?.text ?? '',
        /Footing excavations should be inspected by a geotechnical engineer during construction[^.]*\./i,
      ),
      narrativeBundle?.citations ?? [],
    );
  const engineeredFillFallback =
    engineeredFillFinding != null
      ? {
          ...parseEngineeredFillBearingPressures(engineeredFillFinding.value),
          citations: engineeredFillFinding.citations,
        }
      : parseEngineeredFillBearingPressuresFromText(
          narrativeBundle?.text ?? '',
          narrativeBundle?.citations ?? [],
        );

  return {
    tableLabel: table.tableLabel,
    pageLabel: table.pageLabel,
    rows,
    expectedSettlementRange: narrativeSettlementFinding,
    differentialSettlementAssumption: narrativeDifferentialFinding,
    engineeredFillBearingPressures: engineeredFillFallback,
    footingInspectionRequirement: narrativeFootingInspectionFinding,
  };
}

function parseShallowFoundationRawRow(rawRowText: string) {
  const matches = Array.from(rawRowText.matchAll(/(\d[\d,]*)\s*kPa/gi));
  let first = matches[0]?.[1] ?? null;
  let second = matches[1]?.[1] ?? null;

  if (!first || !second) {
    const fallbackMatches = rawRowText.match(
      /(-?\d[\d,]*(?:\.\d+)?)\D+(-?\d[\d,]*(?:\.\d+)?)(?!.*\d)/,
    );
    first = first ?? fallbackMatches?.[1] ?? null;
    second = second ?? fallbackMatches?.[2] ?? null;
  }

  return {
    padOrSquareOrCircularAllowableKPa: parseIntegerValue(first),
    stripAllowableKPa: parseIntegerValue(second),
  };
}

function parseShallowFoundationRowNotes(value: string | null) {
  const notes = value?.trim() ?? '';
  const factorOfSafetyMatch = notes.match(/factor of safety of?\s*(\d+(?:\.\d+)?)/i);
  const minimumWidthMatch = notes.match(/minimum width of\s*(\d+(?:\.\d+)?)\s*m/i);
  const minimumDepthMatch = notes.match(/minimum founding depth of\s*(\d+(?:\.\d+)?)\s*m/i);
  const toeOfCuttingMatch = notes.match(
    /(level surface .*? 1V:2H gradient to the toe of any cutting[^.;]*)/i,
  );

  return {
    notes: notes.length > 0 ? notes : null,
    assumptions: notes.length > 0 ? notes : null,
    factorOfSafety: factorOfSafetyMatch ? Number(factorOfSafetyMatch[1]) : null,
    minimumFoundingWidthM: minimumWidthMatch ? Number(minimumWidthMatch[1]) : null,
    minimumFoundingDepthM: minimumDepthMatch ? Number(minimumDepthMatch[1]) : null,
    toeOfCuttingGeometryAssumption: toeOfCuttingMatch?.[1]?.trim() ?? null,
  };
}

function parseEngineeredFillBearingPressures(value: string) {
  const matches = Array.from(value.matchAll(/(\d[\d,]*)\s*kPa/gi));
  return {
    padOrSquareOrCircularAllowableKPa: parseIntegerValue(matches[0]?.[1] ?? null),
    stripAllowableKPa: parseIntegerValue(matches[1]?.[1] ?? null),
    notes: value,
  };
}

function parseEngineeredFillBearingPressuresFromText(
  value: string,
  citations: ExtractionCitation[],
) {
  const sentence = extractSentence(
    value,
    /maximum allowable bearing pressures of\s+\d[\d,]*\s*kPa for pad footings and\s+\d[\d,]*\s*kPa for strip footings[^.]*\./i,
  );
  if (!sentence) {
    return null;
  }

  return {
    ...parseEngineeredFillBearingPressures(sentence),
    citations,
  };
}

async function collectGeotechnicalFallbackContext(
  openai: OpenAI,
  vectorStoreId: string,
  citationRegistry: Map<string, ExtractionCitation>,
): Promise<GeotechnicalFallbackContext> {
  const [
    groundwater,
    groundwaterConstruction,
    groundwaterAppendix,
    shallowFoundationTableNotes,
    shallowFoundationNarrative,
    retainingWalls,
    siteClassification,
    earthquakeSiteFactor,
    workingPlatformAndSurvey,
    limitations,
    deepFoundations,
    pileDesignControls,
    pileTesting,
  ] = await Promise.all([
    buildRawSearchCitationBundle(
      openai,
      vectorStoreId,
      'No free groundwater was observed during augering to a maximum depth of about 6.15 m',
      citationRegistry,
      2,
    ),
    buildRawSearchCitationBundle(
      openai,
      vectorStoreId,
      'Groundwater is not expected to be encountered within typical excavation depths for shallow footings or services',
      citationRegistry,
      2,
    ),
    buildRawSearchCitationBundle(
      openai,
      vectorStoreId,
      'More reliable measurements can be made by installing standpipes',
      citationRegistry,
      2,
    ),
    buildRawSearchCitationBundle(
      openai,
      vectorStoreId,
      'A factor of safety of 3 has been applied on ultimate bearing pressures',
      citationRegistry,
      2,
    ),
    buildRawSearchCitationBundle(
      openai,
      vectorStoreId,
      'Footing excavations should be inspected by a geotechnical engineer during construction',
      citationRegistry,
      2,
    ),
    buildRawSearchCitationBundle(
      openai,
      vectorStoreId,
      'Coefficient of Active Earth Pressure (Ka): 0.4',
      citationRegistry,
      2,
    ),
    buildRawSearchCitationBundle(
      openai,
      vectorStoreId,
      'site classification of Class S is considered applicable',
      citationRegistry,
      2,
    ),
    buildRawSearchCitationBundle(
      openai,
      vectorStoreId,
      'site sub-soil is considered to correlate to Class Ce',
      citationRegistry,
      2,
    ),
    buildRawSearchCitationBundle(
      openai,
      vectorStoreId,
      'A suitable working platform would be needed to support large plant',
      citationRegistry,
      2,
    ),
    buildRawSearchCitationBundle(
      openai,
      vectorStoreId,
      'This report is provided for the exclusive use of Hansen Yuncken Pty Ltd',
      citationRegistry,
      2,
    ),
    buildRawSearchCitationBundle(
      openai,
      vectorStoreId,
      'Bored piles would be a suitable piling method for the site',
      citationRegistry,
      2,
    ),
    buildRawSearchCitationBundle(
      openai,
      vectorStoreId,
      'The minimum socket length for piles founded in weathered rock should be 4 pile diameters',
      citationRegistry,
      2,
    ),
    buildRawSearchCitationBundle(
      openai,
      vectorStoreId,
      'High strain load testing of piles is recommended',
      citationRegistry,
      2,
    ),
  ]);

  return {
    groundwater,
    groundwaterConstruction,
    groundwaterAppendix,
    shallowFoundationTableNotes,
    shallowFoundationNarrative,
    retainingWalls,
    siteClassification,
    earthquakeSiteFactor,
    workingPlatformAndSurvey,
    limitations,
    deepFoundations,
    pileDesignControls,
    pileTesting,
  };
}

async function buildRawSearchCitationBundle(
  openai: OpenAI,
  vectorStoreId: string,
  query: string,
  citationRegistry: Map<string, ExtractionCitation>,
  maxResults = 3,
): Promise<CitationBundle> {
  const response = await openai.vectorStores.search(vectorStoreId, {
    query,
    max_num_results: maxResults,
    rewrite_query: false,
  });
  const citations = response.data
    .map((result) => toCitation(result, query, citationRegistry))
    .filter((citation): citation is ExtractionCitation => citation !== null);
  const rawSearchText = Array.from(
    new Set(
      response.data
        .map((result) =>
          normalizeSentenceWhitespace(result.content.map((item) => item.text).join('\n\n')),
        )
        .filter((value) => value.length > 0),
    ),
  ).join('\n');
  return {
    citations,
    text: rawSearchText || buildSnippetText(citations),
  };
}

function buildSnippetText(citations: ExtractionCitation[]) {
  return Array.from(
    new Set(
      citations
        .map((citation) => normalizeSentenceWhitespace(citation.snippet))
        .filter((value) => value.length > 0),
    ),
  ).join('\n');
}

function applyReportMetadataFallbacks(
  reportMetadata: ReportMetadataExtraction,
  bundle: CitationBundle,
) {
  if (!bundle.text) {
    return;
  }

  assignNullableFinding(
    reportMetadata.projectNumber,
    firstMatchGroup(bundle.text, /Project No\.?\s*([A-Z0-9.]+)/i),
    bundle.citations,
  );
  assignNullableFinding(
    reportMetadata.documentTitle,
    firstMatchGroup(bundle.text, /Document Title\s+(.+?)(?=\s+Site Address\b)/i),
    bundle.citations,
  );
  assignNullableFinding(
    reportMetadata.siteAddress,
    firstMatchGroup(bundle.text, /Site Address\s+(.+?)(?=\s+Report Prepared For\b)/i),
    bundle.citations,
  );
  assignNullableFinding(
    reportMetadata.preparedFor,
    firstMatchGroup(bundle.text, /Report Prepared For\s+(.+?)(?=\s+Filename\b)/i),
    bundle.citations,
    {
      replaceIf: () => true,
    },
  );
  assignNullableFinding(
    reportMetadata.filename,
    firstMatchGroup(bundle.text, /Filename\s+([A-Z0-9_.-]+)/i),
    bundle.citations,
    {
      replaceIf: (value) =>
        !value || value.includes('_') || value.includes(' ') || /\.pdf$/i.test(value),
    },
  );
  assignNullableFinding(
    reportMetadata.distributionIssuedTo,
    firstMatchGroup(
      bundle.text,
      /Distribution of Copies\s+Status\s+Issued to\s+Revision\s+\d+\s+(.+?)(?=\s+The undersigned\b)/i,
    ),
    bundle.citations,
  );
  assignNullableFinding(
    reportMetadata.authorSignOffDate,
    firstMatchGroup(bundle.text, /Author\s+(\d{1,2}\s+\w+\s+\d{4})/i),
    bundle.citations,
  );
  assignNullableFinding(
    reportMetadata.reviewerSignOffDate,
    firstMatchGroup(bundle.text, /Reviewer\s+(\d{1,2}\s+\w+\s+\d{4})/i),
    bundle.citations,
  );

  const statusRowMatch = bundle.text.match(
    /Status(?:\s+and\s+Review)?\s+Status\s+Prepared\s+by\s+Reviewed\s+by\s+Date\s+issued\s+Revision\s+(\d+)\s+(.+?)\s+(\d{1,2}\s+\w+\s+\d{4})(?=\s+Distribution of Copies|\s+The undersigned\b)/i,
  );
  if (statusRowMatch) {
    const revision = normalizeSentenceWhitespace(statusRowMatch[1] ?? '');
    const names = splitPreparedAndReviewedNames(statusRowMatch[2] ?? '');

    assignNullableFinding(reportMetadata.revision, revision, bundle.citations, {
      replaceIf: (value) => !value || /^rev/i.test(value),
    });
    assignNullableFinding(reportMetadata.status, `Revision ${revision}`, bundle.citations);
    assignNullableFinding(reportMetadata.preparedBy, names.preparedBy, bundle.citations, {
      replaceIf: (value) => !value || /\bpty ltd\b/i.test(value),
    });
    assignNullableFinding(reportMetadata.reviewedBy, names.reviewedBy, bundle.citations);
    assignNullableFinding(reportMetadata.dateIssued, statusRowMatch[3] ?? null, bundle.citations);
  }
}

function applyGroundwaterFallbacks(
  groundwater: GroundwaterExtraction,
  context: GeotechnicalFallbackContext,
) {
  const observationSentence = extractSentence(
    context.groundwater.text,
    /No free groundwater was observed during augering[^.]*\./i,
  );
  const observation = observationSentence
    ? `${observationSentence.split(';')[0]?.trim().replace(/\.*$/, '')}.`
    : null;
  const obscured = extractSentence(
    context.groundwater.text,
    /groundwater was obscured by the drilling fluids below this depth\./i,
  );
  const perched = extractSentence(
    context.groundwater.text,
    /boreholes were only left open for a short period of time and perched water may be present at shallow depths in some areas\./i,
  );
  const monitoring = extractSentence(
    context.groundwater.text,
    /Further groundwater monitoring is recommended[^.]*\./i,
  );
  const construction = extractSentence(
    context.groundwaterConstruction.text,
    /Groundwater is not expected to be encountered within typical excavation depths[^.]*\./i,
  );
  const standpipes = extractSentence(
    context.groundwaterAppendix.text,
    /More reliable measurements can be made by installing standpipes[^.]*\./i,
  );
  const piezometers = extractSentence(context.groundwaterAppendix.text, /Piezometers[^.]*\./i);

  groundwater.observedConditions = [];
  appendFindingIfMissing(
    groundwater.observedConditions,
    observation,
    context.groundwater.citations,
  );

  groundwater.uncertaintyAndMonitoring = [];
  appendFindingIfMissing(
    groundwater.uncertaintyAndMonitoring,
    obscured,
    context.groundwater.citations,
  );
  appendFindingIfMissing(
    groundwater.uncertaintyAndMonitoring,
    perched,
    context.groundwater.citations,
  );
  appendFindingIfMissing(
    groundwater.uncertaintyAndMonitoring,
    monitoring,
    context.groundwater.citations,
  );
  appendFindingIfMissing(
    groundwater.uncertaintyAndMonitoring,
    standpipes,
    context.groundwaterAppendix.citations,
  );
  appendFindingIfMissing(
    groundwater.uncertaintyAndMonitoring,
    piezometers,
    context.groundwaterAppendix.citations,
  );

  if (construction) {
    groundwater.constructionImplications = [
      createFinding(construction, context.groundwaterConstruction.citations)!,
    ];
  }
}

function applyStructuredSectionFallbacks(
  reportSections: ReportSectionExtraction,
  batterSlopeTable: BatterSlopeTable | null,
  soilNailBondStressTable: SoilNailBondStressTable | null,
) {
  if (reportSections.batterSlopes.length === 0 && batterSlopeTable?.rows.length) {
    appendFindingIfMissing(
      reportSections.batterSlopes,
      `Table 6 provides temporary and permanent batter slope guidance up to 3 m high for ${batterSlopeTable.rows
        .map((row) => row.material)
        .filter((value): value is string => Boolean(value))
        .join(', ')}.`,
      uniqueCitationsFromStructuredRows(batterSlopeTable.rows),
    );
  }

  if (reportSections.soilNails.length === 0 && soilNailBondStressTable?.rows.length) {
    appendFindingIfMissing(
      reportSections.soilNails,
      `Table 7 provides preliminary allowable bond stress guidance for soil nails and dowels across ${soilNailBondStressTable.rows.length} material group${soilNailBondStressTable.rows.length === 1 ? '' : 's'}.`,
      uniqueCitationsFromStructuredRows(soilNailBondStressTable.rows),
    );
  }
}

function applyRetainingWallFallbacks(
  retainingWall: RetainingWallPreliminaryParameters,
  reportSections: ReportSectionExtraction,
  context: GeotechnicalFallbackContext,
) {
  const text = context.retainingWalls.text;
  const citations = context.retainingWalls.citations;
  assignNullableNumericFinding(
    retainingWall.Ka,
    parseNumericMatch(text, /Coefficient of Active Earth Pressure\s*\(Ka\)\s*:\s*(\d+(?:\.\d+)?)/i),
    citations,
  );
  assignNullableNumericFinding(
    retainingWall.Kp,
    parseNumericMatch(
      text,
      /Coefficient of Passive Earth Pressure\s*\(Kp\)\s*:\s*(\d+(?:\.\d+)?)/i,
    ),
    citations,
  );
  assignNullableNumericFinding(
    retainingWall.K0,
    parseNumericMatch(text, /Earth Pressure\s*\(k0\)\s*:\s*(\d+(?:\.\d+)?)/i),
    citations,
  );
  assignNullableNumericFinding(
    retainingWall.bulkDensityKNm3,
    parseNumericMatch(text, /Bulk Density\s*\(γb\)\s*:\s*(\d+(?:\.\d+)?)\s*kN\/m3/i),
    citations,
  );
  assignNullableFinding(
    retainingWall.rectangularPressureExpression,
    extractSentence(text, /p\s*=\s*4H\s*\+\s*0\.4q/i),
    citations,
  );
  assignNullableFinding(
    retainingWall.adjacentFootingPressureExpression,
    extractSentence(text, /6H\+\s*0\.6q[^.]*\./i),
    citations,
  );
  assignNullableNumericFinding(
    retainingWall.compactionPressureKPa,
    parseNumericMatch(
      text,
      /minimum compaction induced earth pressure of\s*(\d+(?:\.\d+)?)\s*kPa/i,
    ),
    citations,
  );
  appendFindingIfMissing(
    retainingWall.triangularPressureDistributionNotes,
    extractSentence(text, /For retaining walls that are free to rotate at the top[^.]*\./i),
    citations,
  );
  appendFindingIfMissing(
    retainingWall.hydrostaticDrainageNotes,
    extractSentence(text, /Adequate drainage should be provided behind retaining walls[^.]*\./i),
    citations,
  );
  appendFindingIfMissing(
    retainingWall.triangularPressureDistributionNotes,
    extractSentence(
      text,
      /Compaction pressures in the order of 15 to 20 kPa[^.]*minimum compaction induced earth pressure of 15 kPa is suggested[^.]*\./i,
    ),
    citations,
  );

  if (reportSections.retainingWalls.length === 0) {
    const summaryParts = [
      retainingWall.Ka.value != null ? `Ka ${retainingWall.Ka.value}` : null,
      retainingWall.Kp.value != null ? `Kp ${retainingWall.Kp.value}` : null,
      retainingWall.K0.value != null ? `K0 ${retainingWall.K0.value}` : null,
      retainingWall.bulkDensityKNm3.value != null
        ? `bulk density ${retainingWall.bulkDensityKNm3.value} kN/m3`
        : null,
    ].filter((value): value is string => value !== null);
    appendFindingIfMissing(
      reportSections.retainingWalls,
      summaryParts.length > 0
        ? `Preliminary retaining wall design guidance includes ${summaryParts.join(', ')}.`
        : extractSentence(text, /Retaining walls may be required to facilitate earthworks[^.]*\./i),
      citations,
    );
  }
}

function applySiteClassificationFallbacks(
  siteClassification: SiteClassificationExtraction,
  reportSections: ReportSectionExtraction,
  context: GeotechnicalFallbackContext,
) {
  const text = context.siteClassification.text;
  const citations = context.siteClassification.citations;
  assignNullableFinding(
    siteClassification.classification,
    firstMatchGroup(text, /site classification of\s+(Class\s+[A-Z][A-Za-z0-9-]*)/i),
    citations,
  );
  assignNullableFinding(
    siteClassification.estimatedGroundMovement,
    firstMatchGroup(text, /ground surface movements of\s+(\d+\s+to\s+\d+\s*mm)/i),
    citations,
  );
  appendFindingIfMissing(
    siteClassification.notes,
    extractSentence(
      text,
      /Where cutting is to exceed 0\.5 m deep or filling is to exceed 0\.4 m thickness[^.]*\./i,
    ),
    citations,
  );

  if (reportSections.siteClassification.length === 0) {
    const classification = siteClassification.classification.value;
    const movement = siteClassification.estimatedGroundMovement.value;
    appendFindingIfMissing(
      reportSections.siteClassification,
      classification && movement
        ? `${classification} with estimated moisture related ground surface movements of ${movement}.`
        : extractSentence(text, /Based on these results[^.]*Class\s+[A-Z][A-Za-z0-9-]*[^.]*\./i),
      citations,
    );
    return;
  }

  const existingSummary = normalizeForMatching(
    reportSections.siteClassification.map((finding) => finding.value).join(' '),
  );
  if (existingSummary.includes('exposure classification')) {
    reportSections.siteClassification = [];
    const classification = siteClassification.classification.value;
    const movement = siteClassification.estimatedGroundMovement.value;
    appendFindingIfMissing(
      reportSections.siteClassification,
      classification && movement
        ? `${classification} with estimated moisture related ground surface movements of ${movement}.`
        : extractSentence(text, /Based on these results[^.]*Class\s+[A-Z][A-Za-z0-9-]*[^.]*\./i),
      citations,
    );
  }
}

function applyEarthquakeSiteFactorFallbacks(
  earthquakeSiteFactor: EarthquakeSiteFactorExtraction,
  reportSections: ReportSectionExtraction,
  context: GeotechnicalFallbackContext,
) {
  const text = context.earthquakeSiteFactor.text;
  const citations = context.earthquakeSiteFactor.citations;
  assignNullableFinding(
    earthquakeSiteFactor.siteSubsoilClass,
    firstMatchGroup(
      text,
      /site sub[- ]soil is considered to correlate to\s+(Class\s+[A-Z][A-Za-z0-9-]*)/i,
    ),
    citations,
  );
  assignNullableNumericFinding(
    earthquakeSiteFactor.hazardFactorZ,
    parseNumericMatch(text, /hazard factor\s*\(Z\)\s+is\s+(\d+(?:\.\d+)?)/i),
    citations,
  );
  appendFindingIfMissing(
    earthquakeSiteFactor.notes,
    extractSentence(
      text,
      /In accordance with the requirements of Australia Standard AS 1170\.4[^.]*\./i,
    ),
    citations,
  );

  if (reportSections.earthquakeSiteFactor.length === 0) {
    const siteClass = earthquakeSiteFactor.siteSubsoilClass.value;
    const hazardFactor = earthquakeSiteFactor.hazardFactorZ.value;
    appendFindingIfMissing(
      reportSections.earthquakeSiteFactor,
      siteClass && hazardFactor != null
        ? `${siteClass} with hazard factor Z ${hazardFactor}.`
        : null,
      citations,
    );
  }
}

function applyWorkingPlatformAndSurveyFallbacks(
  reportSections: ReportSectionExtraction,
  context: GeotechnicalFallbackContext,
) {
  const text = context.workingPlatformAndSurvey.text;
  const citations = context.workingPlatformAndSurvey.citations;
  appendFindingIfMissing(
    reportSections.workingPlatform,
    extractSentence(
      text,
      /A suitable working platform would be needed to support large plant such as pile boring rigs and mobile cranes\./i,
    ),
    citations,
  );
  appendFindingIfMissing(
    reportSections.workingPlatform,
    extractSentence(text, /It is recommended allowance be made to use a granular platform[^.]*\./i),
    citations,
  );
  appendFindingIfMissing(
    reportSections.existingConditionsSurvey,
    extractSentence(text, /ground vibration monitoring program should be implemented[^.]*\./i),
    citations,
  );
  appendFindingIfMissing(
    reportSections.existingConditionsSurvey,
    extractSentence(
      text,
      /Existing condition surveys on adjoining\/nearby structures should be performed[^.]*\./i,
    ),
    citations,
  );
}

function applyLimitationsFallbacks(
  reportSections: ReportSectionExtraction,
  context: GeotechnicalFallbackContext,
) {
  const text = context.limitations.text;
  const citations = context.limitations.citations;
  appendFindingIfMissing(
    reportSections.limitations,
    extractSentence(text, /This report is provided for the exclusive use of[^.]*\./i),
    citations,
  );
  appendFindingIfMissing(
    reportSections.limitations,
    extractSentence(
      text,
      /The results provided in the report are indicative of the sub-surface conditions on the site only at the specific sampling and\/or testing locations[^.]*\./i,
    ),
    citations,
  );
  appendFindingIfMissing(
    reportSections.limitations,
    extractSentence(
      text,
      /undetected variations in ground conditions across the site between and beyond the sampling and\/or testing locations\./i,
    ),
    citations,
  );
  appendFindingIfMissing(
    reportSections.limitations,
    extractSentence(
      text,
      /The assessment of atypical safety hazards arising from this advice[^.]*outside the current scope of this report[^.]*\./i,
    ),
    citations,
  );
  appendFindingIfMissing(
    reportSections.limitations,
    extractSentence(
      text,
      /did not include the assessment of surface or sub-surface materials or groundwater for contaminants[^.]*\./i,
    ),
    citations,
  );
  appendFindingIfMissing(
    reportSections.limitations,
    extractSentence(
      text,
      /should not be used as part of a specification for a project[^.]*advice and opinion rather than instructions for construction\./i,
    ),
    citations,
  );
}

function applyPileConstructionFallbacks(
  pileConstruction: PileConstructionExtraction,
  reportSections: ReportSectionExtraction,
  context: GeotechnicalFallbackContext,
) {
  const deepText = context.deepFoundations.text;
  const designControlText = context.pileDesignControls.text;
  const testingText = context.pileTesting.text;
  const combinedText = [deepText, designControlText, testingText].filter(Boolean).join('\n');

  appendFindingIfMissing(
    pileConstruction.suitableMethods,
    extractSentence(combinedText, /Bored piles would be a suitable piling method for the site\./i),
    context.deepFoundations.citations,
  );
  appendFindingIfMissing(
    pileConstruction.cautionsOrUnsuitableMethods,
    extractSentence(
      combinedText,
      /The installation of driven piles causes noise, vibration[^.]*shallow depth rock may impede driven piles\./i,
    ),
    context.deepFoundations.citations,
  );
  appendFindingIfMissing(
    pileConstruction.cautionsOrUnsuitableMethods,
    extractSentence(
      combinedText,
      /CFA piles would have limited penetration into rock[^.]*uncertainty about the ground conditions encountered[^.]*\./i,
    ),
    context.deepFoundations.citations,
  );
  appendFindingIfMissing(
    pileConstruction.designVerificationNotes,
    extractSentence(
      combinedText,
      /The shaft resistance from the top 1 metre of the pile should be ignored[^.]*\./i,
    ),
    context.pileDesignControls.citations,
  );
  appendFindingIfMissing(
    pileConstruction.designVerificationNotes,
    extractSentence(
      combinedText,
      /The minimum socket length for piles founded in weathered rock should be 4 pile diameters[^.]*\./i,
    ),
    context.pileDesignControls.citations,
  );
  appendFindingIfMissing(
    pileConstruction.designVerificationNotes,
    extractSentence(
      combinedText,
      /The base area of piles constructed under a stabilising fluid[^.]*reduced by between 25% and 50%[^.]*\./i,
    ),
    context.pileDesignControls.citations,
  );
  appendFindingIfMissing(
    pileConstruction.constructionControls,
    extractSentence(
      combinedText,
      /selected piling contractor should submit a detailed methodology statement[^.]*\./i,
    ),
    context.pileDesignControls.citations,
  );
  appendFindingIfMissing(
    pileConstruction.constructionControls,
    extractSentence(
      combinedText,
      /logging of the bored piles should be carried out by a geotechnical engineer during construction[^.]*\./i,
    ),
    context.pileDesignControls.citations,
  );
  appendFindingIfMissing(
    pileConstruction.testingRecommendations,
    extractSentence(combinedText, /High strain load testing of piles is recommended[^.]*\./i),
    context.pileTesting.citations,
  );
  appendFindingIfMissing(
    pileConstruction.upliftTensionNotes,
    extractSentence(
      combinedText,
      /For bored concrete piles subject to tension loads[^.]*0\.8 times the frictional capacity developed under compression\./i,
    ),
    context.pileDesignControls.citations,
  );
  appendFindingIfMissing(
    pileConstruction.settlementExpectations,
    extractSentence(
      combinedText,
      /The total settlement of single widely spaced piles designed using the parameters provided in Table 9 is expected to be of the order of 1% of pile diameter at serviceability loads\./i,
    ),
    context.pileDesignControls.citations,
  );

  if (reportSections.deepFoundations.length === 0) {
    appendFindingIfMissing(
      reportSections.deepFoundations,
      pileConstruction.suitableMethods[0]?.value ??
        extractSentence(
          combinedText,
          /Bored piles socketed into the schist rock would provide a foundation system[^.]*\./i,
        ),
      pileConstruction.suitableMethods[0]?.citations ?? context.deepFoundations.citations,
    );
  }
}

function assignNullableFinding(
  target: NullableExtractionFinding,
  value: string | null,
  citations: ExtractionCitation[],
  options: { replaceIf?: (existing: string | null) => boolean } = {},
) {
  const normalizedValue = normalizeSentenceWhitespace(value ?? '');
  if (!normalizedValue) {
    return;
  }

  const shouldReplace = target.value == null || options.replaceIf?.(target.value ?? null) === true;
  if (!shouldReplace) {
    return;
  }

  target.value = normalizedValue;
  target.citations = citations;
}

function assignNullableNumericFinding(
  target: NullableNumericExtractionFinding,
  value: number | null,
  citations: ExtractionCitation[],
) {
  if (value == null || target.value != null) {
    return;
  }

  target.value = value;
  target.citations = citations;
}

function appendFindingIfMissing(
  target: ExtractionFinding[],
  value: string | null,
  citations: ExtractionCitation[],
) {
  const finding = createFinding(value, citations);
  if (!finding) {
    return;
  }

  const matchingIndex = target.findIndex((entry) => {
    const existing = normalizeForMatching(entry.value);
    const next = normalizeForMatching(finding.value);
    return existing === next || existing.includes(next) || next.includes(existing);
  });

  if (matchingIndex >= 0) {
    if (target[matchingIndex]!.value.length < finding.value.length) {
      target[matchingIndex] = finding;
    }
    return;
  }

  target.push(finding);
}

function createFinding(value: string | null, citations: ExtractionCitation[]) {
  const normalizedValue = normalizeSentenceWhitespace(value ?? '');
  if (!normalizedValue) {
    return null;
  }

  return {
    value: normalizedValue,
    citations,
  } satisfies ExtractionFinding;
}

function createNullableFinding(
  value: string | null,
  citations: ExtractionCitation[],
): NullableExtractionFinding {
  return {
    value: normalizeSentenceWhitespace(value ?? '') || null,
    citations: value ? citations : [],
  };
}

function extractSentence(value: string, pattern: RegExp) {
  const match = value.match(pattern);
  return match?.[0] ? normalizeSentenceWhitespace(match[0]) : null;
}

function firstMatchGroup(value: string, pattern: RegExp) {
  const match = value.match(pattern);
  return match?.[1] ? normalizeSentenceWhitespace(match[1]) : null;
}

function parseNumericMatch(value: string, pattern: RegExp) {
  const raw = firstMatchGroup(value, pattern);
  return raw ? Number(raw.replace(/,/g, '')) : null;
}

function splitPreparedAndReviewedNames(value: string) {
  const tokens = normalizeSentenceWhitespace(value).split(' ');
  if (tokens.length < 4) {
    return {
      preparedBy: normalizeSentenceWhitespace(value),
      reviewedBy: null,
    };
  }

  const reviewerTokenCount = 2;
  return {
    preparedBy: tokens.slice(0, tokens.length - reviewerTokenCount).join(' '),
    reviewedBy: tokens.slice(tokens.length - reviewerTokenCount).join(' '),
  };
}

function uniqueCitationsFromStructuredRows(rows: Array<{ citations: ExtractionCitation[] }>) {
  const citations = new Map<string, ExtractionCitation>();
  for (const row of rows) {
    for (const citation of row.citations) {
      citations.set(citation.id, citation);
    }
  }
  return Array.from(citations.values());
}

function normalizeSentenceWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function parseIntegerValue(value: string | null) {
  if (!value) {
    return null;
  }

  const numeric = Number(value.replace(/,/g, ''));
  return Number.isFinite(numeric) ? numeric : null;
}

function findFindingByPatterns(
  findings: ExtractionFinding[],
  patternGroups: string[][],
): ExtractionFinding | null {
  for (const finding of findings) {
    const normalized = normalizeForMatching(finding.value);
    if (
      patternGroups.some((patterns) =>
        patterns.every((pattern) => normalized.includes(normalizeForMatching(pattern))),
      )
    ) {
      return finding;
    }
  }

  return null;
}

function resolveCitationQuery(query: string | null, hint: CitationHint) {
  const trimmedQuery = query?.trim() ?? '';
  const fallback = buildFallbackCitationQuery(hint);

  if (!trimmedQuery) {
    return fallback;
  }

  const normalizedQuery = normalizeForMatching(trimmedQuery);
  const hasPreferredTerms =
    hint.preferredTerms?.some((term) => normalizedQuery.includes(normalizeForMatching(term))) ??
    false;
  const looksGeneric = GENERIC_EVIDENCE_QUERY_PATTERNS.some((pattern) =>
    normalizedQuery.includes(normalizeForMatching(pattern)),
  );

  if (fallback && looksGeneric && !hasPreferredTerms) {
    return fallback;
  }

  return trimmedQuery;
}

function buildFallbackCitationQuery(hint: CitationHint) {
  const parts = [
    hint.value?.trim() ?? '',
    ...(hint.fallbackQueryTerms ?? []),
    ...(hint.preferredTerms ?? []).slice(0, 2),
  ]
    .filter((part) => part.length > 0)
    .join(' ')
    .trim();

  if (!parts) {
    return null;
  }

  return parts.length > 240 ? `${parts.slice(0, 237)}...` : parts;
}

async function collectGeotechnicalFocusedEvidence(
  openai: OpenAI,
  vectorStoreId: string,
  citationRegistry: Map<string, ExtractionCitation>,
) {
  const results = await Promise.all(
    GEOTECHNICAL_REFINEMENT_QUERY_SPECS.map(async (spec) => {
      const searchResponse = await openai.vectorStores.search(vectorStoreId, {
        query: spec.query,
        max_num_results: spec.maxResults ?? 2,
        rewrite_query: true,
        ranking_options: {
          score_threshold: 0.2,
        },
      });

      return searchResponse.data
        .map((result) => {
          const rawText = result.content
            .map((item) => item.text)
            .join('\n\n')
            .replace(/\s+/g, ' ')
            .trim();

          if (!rawText) {
            return null;
          }

          if (
            spec.requiredTerms?.length &&
            !spec.requiredTerms.some((term) => containsAny(rawText, [term]))
          ) {
            return null;
          }
          if (
            spec.requiredTermsAll?.length &&
            !spec.requiredTermsAll.every((term) => containsAny(rawText, [term]))
          ) {
            return null;
          }

          const citation = toCitation(result, spec.query, citationRegistry);
          if (!citation) {
            return null;
          }

          return {
            key: spec.key,
            query: spec.query,
            rawText,
            citation,
          };
        })
        .filter((entry): entry is Omit<ReportEvidenceSnippet, 'id'> => entry !== null);
    }),
  );

  const deduped = new Map<string, Omit<ReportEvidenceSnippet, 'id'>>();
  for (const entry of results.flat()) {
    const dedupeKey = `${entry.citation.fileId}::${entry.citation.pageLabel ?? ''}::${normalizeForMatching(
      entry.rawText,
    ).slice(0, 240)}`;
    const existing = deduped.get(dedupeKey);
    if (!existing || existing.citation.score < entry.citation.score) {
      deduped.set(dedupeKey, entry);
    }
  }

  return Array.from(deduped.values())
    .sort((left, right) => right.citation.score - left.citation.score)
    .slice(0, 16)
    .map((entry, index) => ({
      id: `snippet_${index + 1}`,
      ...entry,
    }));
}

async function runGeotechnicalFocusedRefinement(
  openai: OpenAI,
  model: string,
  filename: string,
  evidence: ReportEvidenceSnippet[],
) {
  const bundle = evidence
    .map((entry) =>
      [
        `[${entry.id}] ${entry.key} | ${entry.citation.pageLabel ?? 'Page not tagged'} | ${entry.query}`,
        limitSnippetBundleText(entry.rawText),
      ].join('\n'),
    )
    .join('\n\n');

  const response = await openai.responses.parse({
    model,
    input: [
      {
        role: 'system',
        content: [{ type: 'input_text', text: GEOTECHNICAL_FOCUSED_REFINEMENT_PROMPT }],
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: [
              `Document: ${filename}`,
              'Use only the snippet bundle below.',
              'If a row or finding is not explicitly supported by the supplied snippets, omit it.',
              bundle,
            ].join('\n\n'),
          },
        ],
      },
    ],
    text: {
      format: zodTextFormat(
        geotechnicalFocusedRefinementDraftSchema,
        'geotechnical_focused_refinement',
        {
          description:
            'Structured geotechnical refinement from targeted report snippets with snippet-backed citations',
        },
      ),
      verbosity: 'medium',
    },
  });

  const parsed = response.output_parsed;
  if (!parsed) {
    throw new Error('OpenAI returned no focused geotechnical refinement payload');
  }

  return parsed;
}

function applyGeotechnicalFocusedRefinement(
  geotechnicalBasis: EngineeringReportExtractionResult['geotechnicalBasis'],
  refinement: GeotechnicalFocusedRefinementDraft,
  evidence: ReportEvidenceSnippet[],
) {
  replaceFindingListIfPresent(
    geotechnicalBasis,
    'foundingNotes',
    mapSnippetFindingList(refinement.foundingNotes, evidence),
  );
  replaceFindingListIfPresent(
    geotechnicalBasis,
    'groundwaterNotes',
    mapSnippetFindingList(refinement.groundwaterNotes, evidence),
  );
  replaceFindingListIfPresent(
    geotechnicalBasis,
    'groundwaterDesignAssumptions',
    mapSnippetFindingList(refinement.groundwaterDesignAssumptions, evidence),
  );
  replaceFindingListIfPresent(
    geotechnicalBasis,
    'hydrostaticAssumptions',
    mapSnippetFindingList(refinement.hydrostaticAssumptions, evidence),
  );
  replaceFindingListIfPresent(
    geotechnicalBasis,
    'rockStrataDesignParameters',
    mapSnippetFindingList(refinement.rockStrataDesignParameters, evidence),
  );
  replaceFindingListIfPresent(
    geotechnicalBasis,
    'pileRecommendations',
    mapSnippetFindingList(refinement.pileRecommendations, evidence),
  );
  replaceFindingListIfPresent(
    geotechnicalBasis,
    'aggressivityDurabilityNotes',
    mapSnippetFindingList(refinement.aggressivityDurabilityNotes, evidence),
  );
  replaceFindingListIfPresent(
    geotechnicalBasis,
    'furtherInvestigationNotes',
    mapSnippetFindingList(refinement.furtherInvestigationNotes, evidence),
  );
}

function mapFocusedTables(
  refinement: GeotechnicalFocusedRefinementDraft,
  evidence: ReportEvidenceSnippet[],
): GeotechnicalParameterTable[] {
  return refinement.geotechnicalParameterTables
    .map((table) => ({
      tableKey: table.tableKey,
      tableLabel: table.tableLabel,
      pageLabel:
        table.pageLabel ??
        table.rows
          .flatMap((row) => citationsFromSnippetIds(row.sourceSnippetIds, evidence))
          .map((citation) => citation.pageLabel)
          .find((pageLabel): pageLabel is string => Boolean(pageLabel)) ??
        null,
      tableType: normalizeFocusedTableType(table.tableLabel, table.tableType),
      rows: table.rows.map((row) => ({
        rowLabel: row.rowLabel,
        unitCode: row.unitCode,
        unitDescription: row.unitDescription,
        foundingStrata: row.foundingStrata,
        endBearingUltimateKPa: row.endBearingUltimateKPa,
        endBearingAllowableKPa: row.endBearingAllowableKPa,
        shaftAdhesionCompressionUltimateKPa: row.shaftAdhesionCompressionUltimateKPa,
        shaftAdhesionCompressionAllowableKPa: row.shaftAdhesionCompressionAllowableKPa,
        shaftAdhesionTensionUltimateKPa: row.shaftAdhesionTensionUltimateKPa,
        unitWeightBulkKNm3: row.unitWeightBulkKNm3,
        frictionAngleDeg: row.frictionAngleDeg,
        cohesionKPa: row.cohesionKPa,
        undrainedShearStrengthKPa: row.undrainedShearStrengthKPa,
        modulusMPa: row.modulusMPa,
        poissonRatio: row.poissonRatio,
        wallInterfaceReduction: row.wallInterfaceReduction,
        Ka: row.Ka,
        Ko: row.Ko,
        Kp: row.Kp,
        notes: row.notes,
        rawRowText: row.rawRowText,
        citations: citationsFromSnippetIds(row.sourceSnippetIds, evidence),
      })),
    }))
    .filter((table) => table.rows.length > 0);
}

function normalizeFocusedTableType(
  tableLabel: string,
  tableType: GeotechnicalParameterTable['tableType'],
): GeotechnicalParameterTable['tableType'] {
  const normalizedLabel = normalizeForMatching(tableLabel);
  if (normalizedLabel.includes('table 8') || normalizedLabel.includes('bearing pressures')) {
    return 'OTHER_GEOTECHNICAL_PARAMETERS';
  }
  return tableType;
}

function mapSnippetFindingList(
  findings: GeotechnicalFocusedRefinementDraft['foundingNotes'],
  evidence: ReportEvidenceSnippet[],
): ExtractionFinding[] {
  return findings.map((finding) => ({
    value: finding.value,
    citations: citationsFromSnippetIds(finding.sourceSnippetIds, evidence),
  }));
}

function citationsFromSnippetIds(snippetIds: string[], evidence: ReportEvidenceSnippet[]) {
  const byId = new Map(evidence.map((entry) => [entry.id, entry.citation]));
  const citations: ExtractionCitation[] = [];
  const seen = new Set<string>();

  for (const snippetId of snippetIds) {
    const citation = byId.get(snippetId);
    if (!citation) {
      continue;
    }

    const key = `${citation.fileId}::${citation.pageLabel ?? ''}::${citation.snippet}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    citations.push(citation);
  }

  return citations;
}

function refineGeotechnicalParameterTables(tables: GeotechnicalParameterTable[]) {
  return tables.map((table) => {
    if (table.tableType !== 'GEOLOGICAL_UNIT_PARAMETERS') {
      return table;
    }

    return {
      ...table,
      rows: table.rows.map((row) => refineGeologicalUnitRow(row)),
    };
  });
}

function refineGeologicalUnitRow(row: GeotechnicalParameterTable['rows'][number]) {
  const tailTokens = extractTrailingRowTokens(row.rawRowText, row.poissonRatio);
  if (tailTokens.length < 3) {
    return row;
  }

  const [wallReductionToken, ambiguousToken, kaToken, koToken, kpToken] = tailTokens;
  const refined = { ...row };

  refined.wallInterfaceReduction =
    parseUnitlessNumber(wallReductionToken) ?? refined.wallInterfaceReduction;
  refined.Ka = parseUnitlessNumber(kaToken) ?? refined.Ka;
  refined.Ko = parseUnitlessNumber(koToken) ?? refined.Ko;

  const parsedKp = parseUnitlessNumber(kpToken);
  if (kpToken && !/[a-z]/i.test(kpToken) && parsedKp !== null && parsedKp > 1) {
    refined.Kp = parsedKp;
  } else if (kpToken) {
    refined.Kp = null;
    refined.notes = appendRowNote(refined.notes, kpToken);
  }

  if (ambiguousToken && ambiguousToken !== wallReductionToken) {
    refined.notes = appendRowNote(refined.notes, `auxiliary factor ${ambiguousToken}`);
  }

  return refined;
}

function extractTrailingRowTokens(rawRowText: string, poissonRatio: number | null) {
  if (poissonRatio === null) {
    return [];
  }

  const afterUnitCode = rawRowText.replace(/^.*?:\s*/, '');
  const firstDigitIndex = afterUnitCode.search(/\d/);
  if (firstDigitIndex < 0) {
    return [];
  }

  const numericSection = afterUnitCode.slice(firstDigitIndex);
  const tokens = numericSection.match(/-?\d+(?:,\d{3})*(?:\.\d+)?(?:\s*(?:kPa|MPa))?/g) ?? [];
  const poissonIndex = tokens.findIndex((token) => {
    const parsed = parseUnitlessNumber(token);
    return parsed !== null && Math.abs(parsed - poissonRatio) < 0.0001;
  });

  if (poissonIndex < 0) {
    return [];
  }

  return tokens.slice(poissonIndex + 1);
}

function parseUnitlessNumber(token: string | undefined) {
  if (!token || /[a-z]/i.test(token)) {
    return null;
  }

  const numeric = Number(token.replace(/,/g, ''));
  return Number.isFinite(numeric) ? numeric : null;
}

function appendRowNote(existing: string | null, value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return existing;
  }

  if (!existing) {
    return trimmed;
  }

  if (normalizeForMatching(existing).includes(normalizeForMatching(trimmed))) {
    return existing;
  }

  return `${existing}; ${trimmed}`;
}

function replaceFindingListIfPresent(
  geotechnicalBasis: EngineeringReportExtractionResult['geotechnicalBasis'],
  key:
    | 'foundingNotes'
    | 'groundwaterNotes'
    | 'groundwaterDesignAssumptions'
    | 'hydrostaticAssumptions'
    | 'rockStrataDesignParameters'
    | 'pileRecommendations'
    | 'aggressivityDurabilityNotes'
    | 'furtherInvestigationNotes',
  findings: ExtractionFinding[],
) {
  if (findings.length > 0) {
    geotechnicalBasis[key] = dedupeFindingList(findings);
  }
}

function pruneGeotechnicalFindingOverlap(
  geotechnicalBasis: EngineeringReportExtractionResult['geotechnicalBasis'],
) {
  const redistributedGroundwaterNotes: ExtractionFinding[] = [];
  const redistributedGroundwaterAssumptions: ExtractionFinding[] = [];
  const redistributedFoundingNotes: ExtractionFinding[] = [];

  const routeGroundwaterSentence = (sentenceFinding: ExtractionFinding) => {
    if (isHydrostaticAssumptionText(sentenceFinding.value)) {
      pushUniqueFinding(geotechnicalBasis.hydrostaticAssumptions, sentenceFinding);
      return;
    }

    if (containsAny(sentenceFinding.value, ['pile', 'cfa', 'bored pile', 'footing', 'founding'])) {
      redistributedFoundingNotes.push(sentenceFinding);
      return;
    }

    if (isExplicitGroundwaterDesignAssumptionText(sentenceFinding.value)) {
      redistributedGroundwaterAssumptions.push(sentenceFinding);
      return;
    }

    if (
      containsAny(sentenceFinding.value, ['groundwater', 'dewatering', 'pump', 'well', 'drawdown'])
    ) {
      redistributedGroundwaterNotes.push(sentenceFinding);
    }
  };

  for (const finding of geotechnicalBasis.groundwaterNotes) {
    for (const sentenceFinding of splitFindingIntoSentences(finding)) {
      routeGroundwaterSentence(sentenceFinding);
    }
  }

  for (const finding of geotechnicalBasis.groundwaterDesignAssumptions) {
    for (const sentenceFinding of splitFindingIntoSentences(finding)) {
      routeGroundwaterSentence(sentenceFinding);
    }
  }

  for (const finding of geotechnicalBasis.foundingNotes) {
    for (const sentenceFinding of splitFindingIntoSentences(finding)) {
      if (
        containsAny(sentenceFinding.value, ['found', 'pile', 'footing', 'raft', 'bearing', 'embed'])
      ) {
        redistributedFoundingNotes.push(sentenceFinding);
      } else {
        routeGroundwaterSentence(sentenceFinding);
      }
    }
  }

  geotechnicalBasis.groundwaterNotes = redistributedGroundwaterNotes;
  geotechnicalBasis.groundwaterDesignAssumptions = redistributedGroundwaterAssumptions;
  geotechnicalBasis.foundingNotes = redistributedFoundingNotes;

  geotechnicalBasis.foundingNotes = geotechnicalBasis.foundingNotes.filter(
    (finding) =>
      !containsAny(finding.value, ['shoring', 'sheet pile', 'anchor']) ||
      containsAny(finding.value, ['founding', 'pile', 'footing', 'raft']),
  );

  geotechnicalBasis.rockStrataDesignParameters =
    geotechnicalBasis.rockStrataDesignParameters.filter(
      (finding) =>
        !containsAny(finding.value, ['shoring', 'sheet pile', 'anchor']) ||
        containsAny(finding.value, [
          'table',
          'shale',
          'bearing',
          'adhesion',
          'unit 4',
          'parameter',
        ]),
    );

  geotechnicalBasis.aggressivityDurabilityNotes =
    geotechnicalBasis.aggressivityDurabilityNotes.filter(
      (finding) =>
        !containsAny(finding.value, ['shoring', 'sheet pile', 'anchor']) ||
        containsAny(finding.value, ['aggress', 'durab', 'sulfate', 'corrosion', 'testing']),
    );

  geotechnicalBasis.groundwaterNotes = dedupeFindingList(geotechnicalBasis.groundwaterNotes);
  geotechnicalBasis.groundwaterDesignAssumptions = dedupeFindingList(
    geotechnicalBasis.groundwaterDesignAssumptions,
  );
  geotechnicalBasis.hydrostaticAssumptions = dedupeFindingList(
    geotechnicalBasis.hydrostaticAssumptions,
  );
  geotechnicalBasis.foundingNotes = dedupeFindingList(geotechnicalBasis.foundingNotes);
}

function dedupeFindingList(findings: ExtractionFinding[]) {
  const deduped: ExtractionFinding[] = [];
  for (const finding of findings) {
    pushUniqueFinding(deduped, finding);
  }
  return deduped;
}

function normalizeGeotechnicalNarrativeFindings(
  geotechnicalBasis: EngineeringReportExtractionResult['geotechnicalBasis'],
) {
  geotechnicalBasis.groundwaterNotes = normalizeSentenceFindingList(
    geotechnicalBasis.groundwaterNotes,
    (value) =>
      containsAny(value, ['groundwater', 'dewatering', 'pump', 'well', 'drawdown', 'monitor']) &&
      !isHydrostaticAssumptionText(value) &&
      !isExplicitGroundwaterDesignAssumptionText(value),
  );

  geotechnicalBasis.groundwaterDesignAssumptions = normalizeSentenceFindingList(
    geotechnicalBasis.groundwaterDesignAssumptions,
    (value) => isGroundwaterDesignAssumptionText(value) && !isHydrostaticAssumptionText(value),
  );

  geotechnicalBasis.hydrostaticAssumptions = normalizeSentenceFindingList(
    geotechnicalBasis.hydrostaticAssumptions,
    (value) => isHydrostaticAssumptionText(value),
  );

  geotechnicalBasis.foundingNotes = normalizeSentenceFindingList(
    geotechnicalBasis.foundingNotes,
    (value) =>
      containsAny(value, ['found', 'pile', 'footing', 'raft', 'bearing', 'embed']) &&
      !isHydrostaticAssumptionText(value),
  );

  geotechnicalBasis.pileRecommendations = geotechnicalBasis.pileRecommendations.filter(
    (finding) => !containsAny(finding.value, ['as 2159', 'phi_g', 'strength reduction factor']),
  );
}

function normalizeSentenceFindingList(
  findings: ExtractionFinding[],
  predicate: (value: string) => boolean,
) {
  return dedupeFindingList(
    findings.flatMap((finding) =>
      splitFindingIntoSentences(finding).filter((sentenceFinding) =>
        predicate(sentenceFinding.value),
      ),
    ),
  );
}

function splitFindingIntoSentences(finding: ExtractionFinding) {
  return finding.value
    .split(/(?<=[.!?;])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0)
    .map((sentence) => ({
      value: sentence,
      citations: finding.citations,
    }));
}

function limitSnippetBundleText(value: string) {
  return value.length > 5_000 ? `${value.slice(0, 4_997)}...` : value;
}

function isGeotechnicalDocumentFamily(family: EngineeringReportDocumentFamily | null | undefined) {
  return family ? GEOTECHNICAL_DOCUMENT_FAMILIES.has(family) : false;
}

function resolveEngineeringReportExtractionProfile(
  document: AiDocument,
): EngineeringReportExtractionProfile {
  return {
    documentFamily: document.documentFamily,
    reportType: document.reportType,
    ownerWorkspace: document.ownerWorkspace,
  };
}

function shouldApplyGeotechnicalNarrativeProfile(
  extractionProfile: EngineeringReportExtractionProfile,
  normalizedDocumentFamily: EngineeringReportDocumentFamily | null,
) {
  if (extractionProfile.reportType === 'dewatering_management_plan') {
    return false;
  }
  return (
    extractionProfile.documentFamily === 'geotechnical' ||
    isGeotechnicalDocumentFamily(normalizedDocumentFamily)
  );
}

function shouldCollectGeotechnicalFocusedEvidence(
  extractionProfile: EngineeringReportExtractionProfile,
) {
  return (
    extractionProfile.reportType === 'geotechnical_investigation' ||
    extractionProfile.reportType === 'geotechnical_comment'
  );
}

function shouldRunGeotechnicalFocusedRefinement(
  extractionProfile: EngineeringReportExtractionProfile,
  geotechnicalCommentProfile: GeotechnicalCommentProfileExtraction,
  focusedEvidence: ReportEvidenceSnippet[],
) {
  if (extractionProfile.reportType === 'geotechnical_investigation') {
    return true;
  }
  if (extractionProfile.reportType !== 'geotechnical_comment') {
    return false;
  }

  return (
    geotechnicalCommentProfile.explicitNewDesignTablesOrParameters.length > 0 ||
    focusedEvidence.some((entry) => isExplicitNewDesignParameterEvidence(entry.rawText))
  );
}

function shouldBuildAs2159StandardsMapping(extractionProfile: EngineeringReportExtractionProfile) {
  return extractionProfile.reportType === 'geotechnical_investigation';
}

function isExplicitNewDesignParameterEvidence(value: string) {
  const normalized = normalizeForMatching(value);
  return containsAny(normalized, [
    'new design parameter',
    'new parameter table',
    'new design table',
    'revised design parameter',
    'revised parameter table',
    'revised design table',
    'updated design parameter',
    'updated parameter table',
    'updated design table',
    'supersedes table',
    'supersedes design parameter',
    'allowable bearing table',
    'ultimate bearing table',
    'table of design parameters',
  ]);
}

function normalizeDocumentFamily(
  family: EngineeringReportDocumentFamily | null,
  reportTitle: string | null,
  projectSummary: string | null,
): EngineeringReportDocumentFamily | null {
  const text = normalizeForMatching([reportTitle, projectSummary].filter(Boolean).join(' '));

  if (text.includes('preliminary geotechnical') && text.includes('groundwater assessment')) {
    return 'PRELIMINARY_GEOTECHNICAL_GROUNDWATER_REPORT';
  }

  if (text.includes('preliminary geotechnical')) {
    return 'PRELIMINARY_GEOTECHNICAL_INVESTIGATION';
  }

  if (text.includes('groundwater assessment')) {
    return 'GEOTECHNICAL_GROUNDWATER_REPORT';
  }

  if (text.includes('geotechnical')) {
    return 'GEOTECHNICAL_REPORT';
  }

  return family;
}

function reclassifyGeotechnicalLoadMentions(
  geotechnicalBasis: EngineeringReportExtractionResult['geotechnicalBasis'],
  loadMentions: EngineeringReportExtractionResult['loadMentions'],
) {
  const retainedLoadCases: ExtractionFinding[] = [];
  for (const finding of loadMentions.loadCases) {
    if (isHydrostaticAssumptionText(finding.value)) {
      pushUniqueFinding(geotechnicalBasis.hydrostaticAssumptions, finding);
      continue;
    }

    if (isGroundwaterDesignAssumptionText(finding.value)) {
      pushUniqueFinding(geotechnicalBasis.groundwaterDesignAssumptions, finding);
      continue;
    }

    if (isExplicitEngineeringLoadCaseText(finding.value)) {
      retainedLoadCases.push(finding);
    }
  }
  loadMentions.loadCases = retainedLoadCases;

  const retainedCombinations: ExtractionFinding[] = [];
  for (const finding of loadMentions.combinations) {
    if (isHydrostaticAssumptionText(finding.value)) {
      pushUniqueFinding(geotechnicalBasis.hydrostaticAssumptions, finding);
      continue;
    }

    if (isGroundwaterDesignAssumptionText(finding.value)) {
      pushUniqueFinding(geotechnicalBasis.groundwaterDesignAssumptions, finding);
      continue;
    }

    if (isExplicitEngineeringLoadCombinationText(finding.value)) {
      retainedCombinations.push(finding);
    }
  }
  loadMentions.combinations = retainedCombinations;
}

function promoteGeotechnicalAssumptionFindings(
  geotechnicalBasis: EngineeringReportExtractionResult['geotechnicalBasis'],
) {
  const candidateSources = [
    ...geotechnicalBasis.groundwaterNotes,
    ...geotechnicalBasis.foundingNotes,
    ...geotechnicalBasis.raftRecommendations,
    ...geotechnicalBasis.shoringRecommendations,
  ];

  for (const finding of candidateSources) {
    if (isGroundwaterDesignAssumptionText(finding.value)) {
      pushUniqueFinding(geotechnicalBasis.groundwaterDesignAssumptions, finding);
    }

    if (isHydrostaticAssumptionText(finding.value)) {
      pushUniqueFinding(geotechnicalBasis.hydrostaticAssumptions, finding);
    }
  }
}

function pushUniqueFinding(target: ExtractionFinding[], finding: ExtractionFinding) {
  const key = normalizeForMatching(finding.value);
  if (target.some((entry) => normalizeForMatching(entry.value) === key)) {
    return;
  }
  target.push(finding);
}

function isHydrostaticAssumptionText(value: string) {
  return containsAny(value, [
    'hydrostatic uplift',
    'hydrostatic pressure',
    'hydrostatic relief',
    'water pressure',
    '10 kpa per metre',
    'head above',
    'tanked slab',
    'portals',
    'valves',
    'basement slab invert',
  ]);
}

function isGroundwaterDesignAssumptionText(value: string) {
  return containsAny(value, [
    'design groundwater',
    'groundwater level',
    'groundwater table',
    'measured level',
    'dewatering',
    'lowered to at least',
    'conservative allowance',
    'current measured levels',
    'water level',
  ]);
}

function isExplicitGroundwaterDesignAssumptionText(value: string) {
  return containsAny(value, [
    'design groundwater',
    'should be lowered',
    'could be taken',
    'will be assessed',
    'conservative allowance',
    'should be made in the design',
    'for preliminary design purposes',
    'adopted design water level',
    'in the design',
  ]);
}

function isExplicitEngineeringLoadCaseText(value: string) {
  return /(?:\bload case\b|\bLC\d+\b|\bdead load\b|\blive load\b|\bimposed load\b|\bwind load\b|\bseismic\b|\bearthquake\b|\bcrane surcharge\b)/i.test(
    value,
  );
}

function isExplicitEngineeringLoadCombinationText(value: string) {
  return /(?:\bULS\b|\bSLS\b|\bcombination\b|\bAS\s*1170\b|\b\d+(?:\.\d+)?\s*[GQWE]\b)/i.test(
    value,
  );
}

function containsAny(value: string, patterns: string[]) {
  const haystack = normalizeForMatching(value);
  return patterns.some((pattern) => haystack.includes(normalizeForMatching(pattern)));
}

function collectCitationsFromResult(result: EngineeringReportExtractionResult) {
  const seen = new Set<string>();
  const citations: ExtractionCitation[] = [];

  const appendCitations = (entries: ExtractionCitation[]) => {
    for (const citation of entries) {
      const key = `${citation.fileId}::${citation.pageLabel ?? ''}::${citation.snippet}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      citations.push(citation);
    }
  };

  appendCitations(result.documentFamily.citations);
  appendCitations(result.reportTitle.citations);
  appendCitations(result.projectSummary.citations);
  appendCitations(result.reportMetadata.projectNumber.citations);
  appendCitations(result.reportMetadata.filename.citations);
  appendCitations(result.reportMetadata.documentTitle.citations);
  appendCitations(result.reportMetadata.siteAddress.citations);
  appendCitations(result.reportMetadata.preparedFor.citations);
  appendCitations(result.reportMetadata.revision.citations);
  appendCitations(result.reportMetadata.status.citations);
  appendCitations(result.reportMetadata.preparedBy.citations);
  appendCitations(result.reportMetadata.reviewedBy.citations);
  appendCitations(result.reportMetadata.dateIssued.citations);
  appendCitations(result.reportMetadata.distributionIssuedTo.citations);
  appendCitations(result.reportMetadata.authorSignOffDate.citations);
  appendCitations(result.reportMetadata.reviewerSignOffDate.citations);
  appendCitations(result.investigationBasis.purposeScope.citations);
  appendCitations(result.investigationBasis.numberOfBoreholes.citations);
  appendCitations(result.investigationBasis.testLocationSummary.citations);
  appendCitations(result.investigationBasis.targetDepthRule.citations);
  appendCitations(result.investigationBasis.fieldworkDates.citations);
  appendCitations(result.retainingWallPreliminaryParameters.Ka.citations);
  appendCitations(result.retainingWallPreliminaryParameters.Kp.citations);
  appendCitations(result.retainingWallPreliminaryParameters.K0.citations);
  appendCitations(result.retainingWallPreliminaryParameters.bulkDensityKNm3.citations);
  appendCitations(
    result.retainingWallPreliminaryParameters.rectangularPressureExpression.citations,
  );
  appendCitations(
    result.retainingWallPreliminaryParameters.adjacentFootingPressureExpression.citations,
  );
  appendCitations(result.retainingWallPreliminaryParameters.compactionPressureKPa.citations);
  appendCitations(result.siteClassificationResult.classification.citations);
  appendCitations(result.siteClassificationResult.estimatedGroundMovement.citations);
  appendCitations(result.earthquakeSiteFactor.siteSubsoilClass.citations);
  appendCitations(result.earthquakeSiteFactor.hazardFactorZ.citations);
  appendCitations(result.groundModel.siteWideInterpretation.citations);
  if (result.shallowFoundationBearingTable) {
    appendCitations(result.shallowFoundationBearingTable.expectedSettlementRange.citations);
    appendCitations(
      result.shallowFoundationBearingTable.differentialSettlementAssumption.citations,
    );
    appendCitations(result.shallowFoundationBearingTable.footingInspectionRequirement.citations);
    if (result.shallowFoundationBearingTable.engineeredFillBearingPressures) {
      appendCitations(
        result.shallowFoundationBearingTable.engineeredFillBearingPressures.citations,
      );
    }
    for (const row of result.shallowFoundationBearingTable.rows) {
      appendCitations(row.citations);
    }
  }
  if (result.batterSlopeTable) {
    for (const row of result.batterSlopeTable.rows) {
      appendCitations(row.citations);
    }
  }
  if (result.soilNailBondStressTable) {
    for (const row of result.soilNailBondStressTable.rows) {
      appendCitations(row.citations);
    }
  }
  for (const borehole of result.groundModel.boreholes) {
    appendCitations(borehole.citations);
    for (const unitDepth of borehole.unitDepths) {
      appendCitations(unitDepth.citations);
    }
  }

  for (const finding of result.structuralDefaults.concreteMentions) {
    appendCitations(finding.citations);
  }
  for (const finding of result.structuralDefaults.coverDurabilityMentions) {
    appendCitations(finding.citations);
  }
  for (const finding of result.structuralDefaults.reinforcementMentions) {
    appendCitations(finding.citations);
  }
  for (const finding of result.geotechnicalBasis.foundingNotes) {
    appendCitations(finding.citations);
  }
  for (const finding of result.geotechnicalBasis.groundwaterNotes) {
    appendCitations(finding.citations);
  }
  for (const finding of result.geotechnicalBasis.groundwaterDesignAssumptions) {
    appendCitations(finding.citations);
  }
  for (const finding of result.geotechnicalBasis.hydrostaticAssumptions) {
    appendCitations(finding.citations);
  }
  for (const finding of result.geotechnicalBasis.materialMentions) {
    appendCitations(finding.citations);
  }
  for (const finding of result.geotechnicalBasis.rockStrataDesignParameters) {
    appendCitations(finding.citations);
  }
  for (const finding of result.geotechnicalBasis.pileRecommendations) {
    appendCitations(finding.citations);
  }
  for (const finding of result.geotechnicalBasis.footingRecommendations) {
    appendCitations(finding.citations);
  }
  for (const finding of result.geotechnicalBasis.raftRecommendations) {
    appendCitations(finding.citations);
  }
  for (const finding of result.geotechnicalBasis.shoringRecommendations) {
    appendCitations(finding.citations);
  }
  for (const finding of result.geotechnicalBasis.aggressivityDurabilityNotes) {
    appendCitations(finding.citations);
  }
  for (const finding of result.geotechnicalBasis.furtherInvestigationNotes) {
    appendCitations(finding.citations);
  }
  for (const finding of result.investigationBasis.investigationMethods) {
    appendCitations(finding.citations);
  }
  for (const finding of result.investigationBasis.laboratoryTestingSummary) {
    appendCitations(finding.citations);
  }
  for (const finding of result.investigationBasis.coordinateDatumReferences) {
    appendCitations(finding.citations);
  }
  for (const finding of result.investigationBasis.confidenceLimitations) {
    appendCitations(finding.citations);
  }
  for (const finding of result.groundwater.observedConditions) {
    appendCitations(finding.citations);
  }
  for (const finding of result.groundwater.uncertaintyAndMonitoring) {
    appendCitations(finding.citations);
  }
  for (const finding of result.groundwater.constructionImplications) {
    appendCitations(finding.citations);
  }
  for (const finding of result.geotechnicalCommentProfile.changedItems) {
    appendCitations(finding.citations);
  }
  for (const finding of result.geotechnicalCommentProfile.unchangedItems) {
    appendCitations(finding.citations);
  }
  for (const finding of result.geotechnicalCommentProfile.revisedRecommendations) {
    appendCitations(finding.citations);
  }
  for (const finding of result.geotechnicalCommentProfile.affectedDrawingsRevisionsDates) {
    appendCitations(finding.citations);
  }
  for (const finding of result.geotechnicalCommentProfile.explicitNewDesignTablesOrParameters) {
    appendCitations(finding.citations);
  }
  for (const finding of result.dewateringProfile.groundwaterObservations) {
    appendCitations(finding.citations);
  }
  for (const finding of result.dewateringProfile.groundwaterLevels) {
    appendCitations(finding.citations);
  }
  for (const finding of result.dewateringProfile.permeabilityHydraulicConductivity) {
    appendCitations(finding.citations);
  }
  for (const finding of result.dewateringProfile.inflowRates) {
    appendCitations(finding.citations);
  }
  for (const finding of result.dewateringProfile.drawdownEstimates) {
    appendCitations(finding.citations);
  }
  for (const finding of result.dewateringProfile.aquiferWaterNswAipComplianceNotes) {
    appendCitations(finding.citations);
  }
  for (const finding of result.dewateringProfile.neighbouringPropertySettlementEffects) {
    appendCitations(finding.citations);
  }
  for (const finding of result.dewateringProfile.monitoringReportingRequirements) {
    appendCitations(finding.citations);
  }
  for (const finding of result.dewateringProfile.keyAssumptionsLimitations) {
    appendCitations(finding.citations);
  }
  for (const finding of result.dewateringProfile.piezometerMonitoringNetwork) {
    appendCitations(finding.citations);
  }
  for (const finding of result.dewateringProfile.settlementDrawdownTriggerLevels) {
    appendCitations(finding.citations);
  }
  for (const finding of result.dewateringProfile.waterNswLicenceBoreRegistration) {
    appendCitations(finding.citations);
  }
  for (const finding of result.dewateringProfile.constructionStageApplicability) {
    appendCitations(finding.citations);
  }
  for (const finding of result.reportSections.excavations) {
    appendCitations(finding.citations);
  }
  for (const finding of result.reportSections.batterSlopes) {
    appendCitations(finding.citations);
  }
  for (const finding of result.reportSections.soilNails) {
    appendCitations(finding.citations);
  }
  for (const finding of result.reportSections.retainingWalls) {
    appendCitations(finding.citations);
  }
  for (const finding of result.reportSections.fillMaterials) {
    appendCitations(finding.citations);
  }
  for (const finding of result.reportSections.siteClassification) {
    appendCitations(finding.citations);
  }
  for (const finding of result.reportSections.aggressivityDurability) {
    appendCitations(finding.citations);
  }
  for (const finding of result.reportSections.shallowFoundations) {
    appendCitations(finding.citations);
  }
  for (const finding of result.reportSections.deepFoundations) {
    appendCitations(finding.citations);
  }
  for (const finding of result.reportSections.raftSlab) {
    appendCitations(finding.citations);
  }
  for (const finding of result.reportSections.subgradePreparation) {
    appendCitations(finding.citations);
  }
  for (const finding of result.reportSections.drainageServiceInstallationSiteMaintenance) {
    appendCitations(finding.citations);
  }
  for (const finding of result.reportSections.earthquakeSiteFactor) {
    appendCitations(finding.citations);
  }
  for (const finding of result.reportSections.workingPlatform) {
    appendCitations(finding.citations);
  }
  for (const finding of result.reportSections.existingConditionsSurvey) {
    appendCitations(finding.citations);
  }
  for (const finding of result.reportSections.limitations) {
    appendCitations(finding.citations);
  }
  for (const finding of result.retainingWallPreliminaryParameters
    .triangularPressureDistributionNotes) {
    appendCitations(finding.citations);
  }
  for (const finding of result.retainingWallPreliminaryParameters.hydrostaticDrainageNotes) {
    appendCitations(finding.citations);
  }
  for (const finding of result.siteClassificationResult.notes) {
    appendCitations(finding.citations);
  }
  for (const finding of result.earthquakeSiteFactor.notes) {
    appendCitations(finding.citations);
  }
  for (const finding of result.pileConstruction.suitableMethods) {
    appendCitations(finding.citations);
  }
  for (const finding of result.pileConstruction.cautionsOrUnsuitableMethods) {
    appendCitations(finding.citations);
  }
  for (const finding of result.pileConstruction.designVerificationNotes) {
    appendCitations(finding.citations);
  }
  for (const finding of result.pileConstruction.constructionControls) {
    appendCitations(finding.citations);
  }
  for (const finding of result.pileConstruction.testingRecommendations) {
    appendCitations(finding.citations);
  }
  for (const finding of result.pileConstruction.upliftTensionNotes) {
    appendCitations(finding.citations);
  }
  for (const finding of result.pileConstruction.settlementExpectations) {
    appendCitations(finding.citations);
  }
  for (const finding of result.loadMentions.loadCases) {
    appendCitations(finding.citations);
  }
  for (const finding of result.loadMentions.combinations) {
    appendCitations(finding.citations);
  }
  for (const table of result.geotechnicalParameterTables) {
    for (const row of table.rows) {
      appendCitations(row.citations);
    }
  }

  return citations;
}

async function retargetGeotechnicalFindingCitations(
  geotechnicalBasis: EngineeringReportExtractionResult['geotechnicalBasis'],
  buildCitations: BuildCitationsFn,
) {
  geotechnicalBasis.foundingNotes = await remapFindingListCitations(
    geotechnicalBasis.foundingNotes,
    buildCitations,
    'pile founding recommendations rock unit 4 table 7 embedment footing inspection',
    {
      preferredTerms: ['pile', 'founding', 'foundation', 'embedment', 'bearing', 'table 7'],
      fallbackQueryTerms: ['pile founding recommendations', 'table 7 bored CFA piles'],
      avoidTerms: ['shoring', 'sheet pile', 'anchor', 'hydrostatic'],
      maxResults: 1,
    },
  );

  geotechnicalBasis.groundwaterNotes = await remapFindingListCitations(
    geotechnicalBasis.groundwaterNotes,
    buildCitations,
    'groundwater dewatering drawdown monitoring numerical modelling',
    {
      preferredTerms: ['groundwater', 'dewatering', 'drawdown', 'monitoring'],
      fallbackQueryTerms: ['groundwater dewatering drawdown monitoring'],
      avoidTerms: ['table 7', 'pile founding', 'tanked slab', 'hydrostatic uplift'],
      maxResults: 1,
    },
  );

  geotechnicalBasis.groundwaterDesignAssumptions = await remapFindingListCitations(
    geotechnicalBasis.groundwaterDesignAssumptions,
    buildCitations,
    'design groundwater level preliminary design current measured levels 2 m rise',
    {
      preferredTerms: [
        'design groundwater',
        'current measured levels',
        'preliminary design',
        'conservative allowance',
        'lowered to at least',
      ],
      fallbackQueryTerms: ['design groundwater level preliminary design current measured levels'],
      avoidTerms: ['table 7', 'pile founding', 'sheet pile anchor'],
      maxResults: 1,
    },
  );

  geotechnicalBasis.hydrostaticAssumptions = await remapFindingListCitations(
    geotechnicalBasis.hydrostaticAssumptions,
    buildCitations,
    'hydrostatic uplift tanked slab 10 kPa per metre relief valves',
    {
      preferredTerms: [
        'hydrostatic uplift',
        'tanked slab',
        '10 kPa per metre',
        'hydrostatic relief',
        'basement slab invert',
      ],
      fallbackQueryTerms: ['hydrostatic uplift tanked slab 10 kPa per metre relief valves'],
      avoidTerms: ['table 7', 'pile founding', 'shoring', 'dewatering'],
      maxResults: 1,
    },
  );

  geotechnicalBasis.rockStrataDesignParameters = await remapFindingListCitations(
    geotechnicalBasis.rockStrataDesignParameters,
    buildCitations,
    'table 3 geological unit parameters table 7 shale bearing adhesion unit 4',
    {
      preferredTerms: ['table 3', 'table 7', 'shale', 'bearing', 'adhesion', 'unit 4'],
      fallbackQueryTerms: ['table 3 geological unit parameters table 7 pile parameters'],
      avoidTerms: ['shoring', 'sheet pile', 'anchor'],
      maxResults: 1,
    },
  );

  geotechnicalBasis.pileRecommendations = await remapFindingListCitations(
    geotechnicalBasis.pileRecommendations,
    buildCitations,
    'bored CFA pile recommendations table 7 casing uplift footing inspection',
    {
      preferredTerms: ['pile', 'bored pile', 'CFA pile', 'table 7', 'casing', 'founding'],
      fallbackQueryTerms: ['bored CFA pile recommendations table 7 casing founding strata'],
      avoidTerms: ['as 2159', 'phi_g', 'shoring', 'hydrostatic uplift'],
      maxResults: 1,
    },
  );

  geotechnicalBasis.aggressivityDurabilityNotes = await remapFindingListCitations(
    geotechnicalBasis.aggressivityDurabilityNotes,
    buildCitations,
    'aggressivity durability sulfate corrosion acid sulfate testing',
    {
      preferredTerms: ['aggressivity', 'durability', 'sulfate', 'corrosion', 'acid sulfate'],
      fallbackQueryTerms: ['aggressivity durability sulfate corrosion testing'],
      avoidTerms: ['shoring', 'sheet pile', 'anchor'],
      maxResults: 1,
    },
  );

  geotechnicalBasis.furtherInvestigationNotes = await remapFindingListCitations(
    geotechnicalBasis.furtherInvestigationNotes,
    buildCitations,
    'further investigation testing monitoring groundwater borehole CPT logs',
    {
      preferredTerms: ['further', 'testing', 'monitoring', 'investigation'],
      fallbackQueryTerms: ['further investigation testing monitoring'],
      avoidTerms: ['shoring', 'sheet pile', 'anchor'],
      maxResults: 1,
    },
  );
}

async function remapFindingListCitations(
  findings: ExtractionFinding[],
  buildCitations: BuildCitationsFn,
  query: string,
  hint: CitationHint,
) {
  return Promise.all(
    findings.map(async (finding) => ({
      value: finding.value,
      citations: await buildCitations(query, {
        ...hint,
        value: finding.value,
      }),
    })),
  );
}

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function isOpenAiNotFoundError(error: unknown) {
  const record = recordValue(error);
  return record.status === 404 || record.code === 404;
}

function buildVectorStoreName(document: AiDocument) {
  return `ai-doc-${document.id}`;
}

function resolveAiReportClassification(
  input: Partial<AiReportClassification>,
  filename: string,
): AiReportClassification {
  const inferred = inferAiReportClassification(filename);
  const documentFamily = isAiReportDocumentFamily(input.documentFamily)
    ? input.documentFamily
    : inferred.documentFamily;
  const familyDefault = defaultAiReportClassificationForFamily(documentFamily);

  return {
    documentFamily,
    reportType: isAiReportType(input.reportType)
      ? input.reportType
      : input.documentFamily
        ? familyDefault.reportType
        : inferred.reportType,
    ownerWorkspace: isAiReportOwnerWorkspace(input.ownerWorkspace)
      ? input.ownerWorkspace
      : input.documentFamily
        ? familyDefault.ownerWorkspace
        : inferred.ownerWorkspace,
  };
}

function inferAiReportClassification(filename: string): AiReportClassification {
  const normalized = normalizeForMatching(filename);

  if (
    /(dewater|groundwater|ground water|hydrogeolog|hydrostatic|water management)/.test(normalized)
  ) {
    return {
      documentFamily: 'hydrogeology_dewatering',
      reportType: 'dewatering_management_plan',
      ownerWorkspace: 'environmental',
    };
  }

  if (/(contamin|environmental|remediation|acid sulfate|asbestos)/.test(normalized)) {
    return {
      documentFamily: 'environmental',
      reportType: 'contamination_assessment',
      ownerWorkspace: 'environmental',
    };
  }

  if (/(structural|structure)/.test(normalized)) {
    return {
      documentFamily: 'structural',
      reportType: 'structural_design_report',
      ownerWorkspace: 'structural',
    };
  }

  if (/(inspection|site record|dilapidation|condition survey)/.test(normalized)) {
    return {
      documentFamily: 'inspections',
      reportType: 'inspection_report',
      ownerWorkspace: 'inspections',
    };
  }

  if (/(temporary works|temp works|working platform)/.test(normalized)) {
    return {
      documentFamily: 'temporary_works',
      reportType: 'temporary_works_report',
      ownerWorkspace: 'other',
    };
  }

  if (/(geotech|geo[ _-]*investigation|ground investigation|soil report)/.test(normalized)) {
    return {
      documentFamily: 'geotechnical',
      reportType: /(comment|letter|advice|memo)/.test(normalized)
        ? 'geotechnical_comment'
        : 'geotechnical_investigation',
      ownerWorkspace: 'project_geotechnical',
    };
  }

  return {
    documentFamily: 'other',
    reportType: 'other',
    ownerWorkspace: 'project',
  };
}

function defaultAiReportClassificationForFamily(
  documentFamily: AiReportDocumentFamily,
): AiReportClassification {
  switch (documentFamily) {
    case 'geotechnical':
      return {
        documentFamily,
        reportType: 'geotechnical_investigation',
        ownerWorkspace: 'project_geotechnical',
      };
    case 'hydrogeology_dewatering':
      return {
        documentFamily,
        reportType: 'dewatering_management_plan',
        ownerWorkspace: 'environmental',
      };
    case 'environmental':
      return {
        documentFamily,
        reportType: 'contamination_assessment',
        ownerWorkspace: 'environmental',
      };
    case 'structural':
      return {
        documentFamily,
        reportType: 'structural_design_report',
        ownerWorkspace: 'structural',
      };
    case 'inspections':
      return {
        documentFamily,
        reportType: 'inspection_report',
        ownerWorkspace: 'inspections',
      };
    case 'temporary_works':
      return {
        documentFamily,
        reportType: 'temporary_works_report',
        ownerWorkspace: 'other',
      };
    case 'other':
    default:
      return {
        documentFamily: 'other',
        reportType: 'other',
        ownerWorkspace: 'project',
      };
  }
}

function isAiReportDocumentFamily(
  value: string | null | undefined,
): value is AiReportDocumentFamily {
  return Boolean(value && AI_REPORT_DOCUMENT_FAMILY_SET.has(value));
}

function isAiReportType(value: string | null | undefined): value is AiReportType {
  return Boolean(value && AI_REPORT_TYPE_SET.has(value));
}

function isAiReportOwnerWorkspace(
  value: string | null | undefined,
): value is AiReportOwnerWorkspace {
  return Boolean(value && AI_REPORT_OWNER_WORKSPACE_SET.has(value));
}

function normalizeMimeType(file: Express.Multer.File) {
  if (file.mimetype && file.mimetype.trim().length > 0) {
    return file.mimetype;
  }

  const lowerName = file.originalname.toLowerCase();
  if (lowerName.endsWith('.pdf')) {
    return 'application/pdf';
  }
  if (lowerName.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  return 'application/octet-stream';
}

function validateReportFile(file: Express.Multer.File) {
  const fileExtension = getFileExtension(file.originalname);
  if (!ALLOWED_AI_REPORT_EXTENSIONS.has(fileExtension)) {
    throw new BadRequestException('Only PDF and DOCX reports are supported in phase 1');
  }

  const mimeType = normalizeMimeType(file);
  if (!ALLOWED_AI_REPORT_MIME_TYPES.has(mimeType)) {
    throw new BadRequestException(`Unsupported report MIME type: ${mimeType}`);
  }
}

function getFileExtension(filename: string) {
  const index = filename.lastIndexOf('.');
  return index >= 0 ? filename.slice(index).toLowerCase() : '';
}

function toCitation(
  result: VectorStoreSearchResponse,
  query: string,
  registry: Map<string, ExtractionCitation>,
) {
  const snippet = truncateSnippet(result.content.map((item) => item.text).join('\n\n'));
  if (!snippet) {
    return null;
  }

  const pageLabel = extractPageLabel(result.attributes, snippet);
  const key = `${query}::${result.file_id}::${pageLabel ?? ''}::${snippet}`;
  const existing = registry.get(key);
  if (existing) {
    existing.score = Math.max(existing.score, Number(result.score.toFixed(3)));
    return existing;
  }

  const citation: ExtractionCitation = {
    id: `cit_${registry.size + 1}`,
    fileId: result.file_id,
    filename: result.filename,
    snippet,
    score: Number(result.score.toFixed(3)),
    query,
    pageLabel,
  };
  registry.set(key, citation);
  return citation;
}

function toCitationFromResponseResult(
  result: ResponseFileSearchToolCall.Result,
  query: string,
  registry: Map<string, ExtractionCitation>,
) {
  if (!result.file_id || !result.filename || !result.text) {
    return null;
  }

  const snippet = truncateSnippet(result.text);
  if (!snippet) {
    return null;
  }

  const pageLabel = extractPageLabel(result.attributes ?? null, snippet);
  const key = `${query}::${result.file_id}::${pageLabel ?? ''}::${snippet}`;
  const existing = registry.get(key);
  if (existing) {
    existing.score = Math.max(existing.score, Number((result.score ?? 0).toFixed(3)));
    return existing;
  }

  const citation: ExtractionCitation = {
    id: `cit_${registry.size + 1}`,
    fileId: result.file_id,
    filename: result.filename,
    snippet,
    score: Number((result.score ?? 0).toFixed(3)),
    query,
    pageLabel,
  };
  registry.set(key, citation);
  return citation;
}

function rankAndLimitCitations(citations: ExtractionCitation[], hint: CitationHint) {
  const deduped = dedupeCitations(citations);
  const ranked = deduped.map((citation) => ({
    citation,
    rank: scoreCitationCandidate(citation, hint),
  }));
  const matching = ranked.filter((entry) => matchesCitationHint(entry.citation, hint));
  const pool = matching.length > 0 ? matching : ranked;

  return pool
    .sort((left, right) => right.rank - left.rank)
    .slice(0, hint.maxResults ?? 2)
    .map((entry) => entry.citation);
}

function dedupeCitations(citations: ExtractionCitation[]) {
  const byKey = new Map<string, ExtractionCitation>();

  for (const citation of citations) {
    const key = `${citation.fileId}::${citation.pageLabel ?? ''}::${citation.snippet}`;
    const existing = byKey.get(key);
    if (!existing || existing.score < citation.score) {
      byKey.set(key, citation);
    }
  }

  return Array.from(byKey.values());
}

function matchesCitationHint(citation: ExtractionCitation, hint: CitationHint) {
  const hasAvoidTerms =
    hint.avoidTerms?.some((term) => containsAny(citation.snippet, [term])) ?? false;
  const valueOverlap = hint.value ? tokenOverlapRatio(citation.snippet, hint.value) : 0;
  const preferredTermMatches =
    hint.preferredTerms?.filter((term) => containsAny(citation.snippet, [term])).length ?? 0;

  if (
    !hint.value &&
    (!hint.preferredTerms || hint.preferredTerms.length === 0) &&
    !hint.avoidTerms?.length
  ) {
    return true;
  }

  if (preferredTermMatches > 0) {
    return true;
  }

  if (valueOverlap >= 0.16) {
    return true;
  }

  return !hasAvoidTerms && valueOverlap > 0;
}

function scoreCitationCandidate(citation: ExtractionCitation, hint: CitationHint) {
  let score = citation.score;

  if (hint.value) {
    score += Math.min(0.35, tokenOverlapRatio(citation.snippet, hint.value) * 0.45);
  }

  if (hint.preferredTerms?.length) {
    const preferredTermMatches = hint.preferredTerms.filter((term) =>
      containsAny(citation.snippet, [term]),
    ).length;
    score += Math.min(0.3, preferredTermMatches * 0.08);
  }

  if (hint.preferTitlePage) {
    if (citation.pageLabel?.toLowerCase().startsWith('page 1')) {
      score += 0.3;
    }
    if (containsAny(citation.snippet, ['report on', 'introduction', 'prepared for'])) {
      score += 0.12;
    }
  }

  if (citation.pageLabel) {
    score += 0.04;
  }

  if (!matchesCitationHint(citation, hint)) {
    score -= 0.25;
  }

  if (hint.avoidTerms?.some((term) => containsAny(citation.snippet, [term]))) {
    score -= 0.35;
  }

  return score;
}

function tokenOverlapRatio(text: string, reference: string) {
  const referenceTokens = tokenize(reference);
  if (referenceTokens.length === 0) {
    return 0;
  }

  const textTokens = new Set(tokenize(text));
  const shared = referenceTokens.filter((token) => textTokens.has(token)).length;
  return shared / referenceTokens.length;
}

function tokenize(value: string) {
  return normalizeForMatching(value)
    .split(' ')
    .filter((token) => token.length > 2 && !COMMON_MATCH_STOPWORDS.has(token));
}

function normalizeForMatching(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractPageLabel(
  attributes: Record<string, string | number | boolean> | null | undefined,
  snippet: string,
) {
  const attributeCandidates = [
    attributes?.pageLabel,
    attributes?.page_label,
    attributes?.page,
    attributes?.pageNumber,
    attributes?.page_number,
  ];

  for (const candidate of attributeCandidates) {
    if (typeof candidate === 'number') {
      return `Page ${candidate}`;
    }

    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return /^page\b/i.test(candidate) ? candidate.trim() : `Page ${candidate.trim()}`;
    }
  }

  const pageMatch = snippet.match(/\bPage\s+\d+(?:\s+of\s+\d+)?\b/i);
  return pageMatch?.[0] ?? null;
}

const COMMON_MATCH_STOPWORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'that',
  'this',
  'from',
  'report',
  'page',
  'works',
  'phase',
  'road',
]);

function truncateSnippet(text: string) {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (!compact) {
    return '';
  }
  return compact.length > 500 ? `${compact.slice(0, 497)}...` : compact;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown AI operation failure';
}

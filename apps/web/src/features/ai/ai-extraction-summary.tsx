import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type {
  AiDocumentFamily,
  AiEngineeringReportExtraction,
  AiExtractionCitation,
  AiExtractionFinding,
  AiGeotechnicalParameterTable,
  AiGeotechnicalParameterTableRow,
  AiNullableExtractionFinding,
  AiNullableNumericFinding,
  AiStandardsMapping,
} from './types';
import { isGeotechnicalDocumentFamily } from './types';

type ParameterColumnKey = Exclude<
  keyof AiGeotechnicalParameterTableRow,
  'rowLabel' | 'rawRowText' | 'citations'
>;

const PARAMETER_TABLE_COLUMNS: Array<{
  key: ParameterColumnKey;
  label: string;
}> = [
  { key: 'unitCode', label: 'Unit' },
  { key: 'unitDescription', label: 'Description' },
  { key: 'foundingStrata', label: 'Founding Strata' },
  { key: 'unitWeightBulkKNm3', label: 'gamma_b' },
  { key: 'frictionAngleDeg', label: 'phi' },
  { key: 'cohesionKPa', label: 'c' },
  { key: 'undrainedShearStrengthKPa', label: 'cu' },
  { key: 'modulusMPa', label: 'E' },
  { key: 'poissonRatio', label: 'nu' },
  { key: 'wallInterfaceReduction', label: 'Wall Red.' },
  { key: 'Ka', label: 'Ka' },
  { key: 'Ko', label: 'Ko' },
  { key: 'Kp', label: 'Kp' },
  { key: 'endBearingUltimateKPa', label: 'End Ult. kPa' },
  { key: 'endBearingAllowableKPa', label: 'End Allow. kPa' },
  { key: 'shaftAdhesionCompressionUltimateKPa', label: 'Shaft Comp. Ult. kPa' },
  { key: 'shaftAdhesionCompressionAllowableKPa', label: 'Shaft Comp. Allow. kPa' },
  { key: 'shaftAdhesionTensionUltimateKPa', label: 'Shaft Tens. Ult. kPa' },
  { key: 'notes', label: 'Notes' },
];

export function AiExtractionSummary({
  extraction,
}: {
  extraction: AiEngineeringReportExtraction;
}) {
  const documentFamilyLabel = formatDocumentFamily(extraction.documentFamily.value);
  const isGeotechnical = isGeotechnicalDocumentFamily(extraction.documentFamily.value);

  const reportMetadataFields = [
    { label: 'Project number', finding: extraction.reportMetadata.projectNumber },
    { label: 'Filename', finding: extraction.reportMetadata.filename },
    { label: 'Document title', finding: extraction.reportMetadata.documentTitle },
    { label: 'Site address', finding: extraction.reportMetadata.siteAddress },
    { label: 'Prepared for', finding: extraction.reportMetadata.preparedFor },
    { label: 'Revision', finding: extraction.reportMetadata.revision },
    { label: 'Status', finding: extraction.reportMetadata.status },
    { label: 'Prepared by', finding: extraction.reportMetadata.preparedBy },
    { label: 'Reviewed by', finding: extraction.reportMetadata.reviewedBy },
    { label: 'Date issued', finding: extraction.reportMetadata.dateIssued },
    { label: 'Issued to', finding: extraction.reportMetadata.distributionIssuedTo },
    { label: 'Author sign-off', finding: extraction.reportMetadata.authorSignOffDate },
    { label: 'Reviewer sign-off', finding: extraction.reportMetadata.reviewerSignOffDate },
  ];

  const investigationBasisFields = [
    { label: 'Purpose / scope', finding: extraction.investigationBasis.purposeScope },
    { label: 'Number of boreholes', finding: extraction.investigationBasis.numberOfBoreholes },
    { label: 'Test locations', finding: extraction.investigationBasis.testLocationSummary },
    { label: 'Target depth rule', finding: extraction.investigationBasis.targetDepthRule },
    { label: 'Fieldwork dates', finding: extraction.investigationBasis.fieldworkDates },
  ];

  const investigationBasisGroups = [
    {
      label: 'Investigation methods',
      findings: extraction.investigationBasis.investigationMethods,
    },
    {
      label: 'Laboratory testing',
      findings: extraction.investigationBasis.laboratoryTestingSummary,
    },
    {
      label: 'Coordinate / datum references',
      findings: extraction.investigationBasis.coordinateDatumReferences,
    },
    {
      label: 'Confidence / evidence limitations',
      findings: extraction.investigationBasis.confidenceLimitations,
    },
  ];

  const groundwaterGroups = [
    { label: 'Observed conditions', findings: extraction.groundwater.observedConditions },
    {
      label: 'Uncertainty / monitoring',
      findings: extraction.groundwater.uncertaintyAndMonitoring,
    },
    {
      label: 'Construction implications',
      findings: extraction.groundwater.constructionImplications,
    },
  ];

  const foundationAndDesignGroups = [
    { label: 'Founding notes', findings: extraction.geotechnicalBasis.foundingNotes },
    { label: 'Pile recommendations', findings: extraction.geotechnicalBasis.pileRecommendations },
    {
      label: 'Footing recommendations',
      findings: extraction.geotechnicalBasis.footingRecommendations,
    },
    { label: 'Raft recommendations', findings: extraction.geotechnicalBasis.raftRecommendations },
    {
      label: 'Aggressivity / durability',
      findings: extraction.geotechnicalBasis.aggressivityDurabilityNotes,
    },
    {
      label: 'Further investigation',
      findings: extraction.geotechnicalBasis.furtherInvestigationNotes,
    },
  ];

  const pileConstructionGroups = [
    { label: 'Suitable pile methods', findings: extraction.pileConstruction.suitableMethods },
    {
      label: 'Cautions / unsuitable methods',
      findings: extraction.pileConstruction.cautionsOrUnsuitableMethods,
    },
    {
      label: 'Design / verification notes',
      findings: extraction.pileConstruction.designVerificationNotes,
    },
    { label: 'Construction controls', findings: extraction.pileConstruction.constructionControls },
    {
      label: 'Testing recommendations',
      findings: extraction.pileConstruction.testingRecommendations,
    },
    { label: 'Uplift / tension notes', findings: extraction.pileConstruction.upliftTensionNotes },
    {
      label: 'Settlement expectations',
      findings: extraction.pileConstruction.settlementExpectations,
    },
  ];

  const optionalReportSectionGroups = [
    { label: 'Excavations', findings: extraction.reportSections.excavations },
    { label: 'Retaining walls', findings: extraction.reportSections.retainingWalls },
    { label: 'Fill materials', findings: extraction.reportSections.fillMaterials },
    { label: 'Raft slab', findings: extraction.reportSections.raftSlab },
    { label: 'Subgrade preparation', findings: extraction.reportSections.subgradePreparation },
    {
      label: 'Drainage / service installation / site maintenance',
      findings: extraction.reportSections.drainageServiceInstallationSiteMaintenance,
    },
    { label: 'Working platform', findings: extraction.reportSections.workingPlatform },
    {
      label: 'Existing conditions survey',
      findings: extraction.reportSections.existingConditionsSurvey,
    },
  ];

  const limitationsFindings = dedupeFindingLists(
    extraction.reportSections.limitations,
    extraction.investigationBasis.confidenceLimitations,
  );

  const structuralDefaultsGroups = [
    { label: 'Concrete mentions', findings: extraction.structuralDefaults.concreteMentions },
    {
      label: 'Cover / durability mentions',
      findings: extraction.structuralDefaults.coverDurabilityMentions,
    },
    {
      label: 'Reinforcement mentions',
      findings: extraction.structuralDefaults.reinforcementMentions,
    },
  ];

  const geotechnicalCommentGroups = [
    { label: 'What changed', findings: extraction.geotechnicalCommentProfile.changedItems },
    {
      label: 'What remains unchanged',
      findings: extraction.geotechnicalCommentProfile.unchangedItems,
    },
    {
      label: 'Revised recommendations / comments',
      findings: extraction.geotechnicalCommentProfile.revisedRecommendations,
    },
    {
      label: 'Affected drawings / revisions / dates',
      findings: extraction.geotechnicalCommentProfile.affectedDrawingsRevisionsDates,
    },
    {
      label: 'Explicit new design tables / parameters',
      findings: extraction.geotechnicalCommentProfile.explicitNewDesignTablesOrParameters,
    },
  ];

  const dewateringGroups = [
    {
      label: 'Groundwater observations',
      findings: extraction.dewateringProfile.groundwaterObservations,
    },
    { label: 'Groundwater / water levels', findings: extraction.dewateringProfile.groundwaterLevels },
    {
      label: 'Permeability / hydraulic conductivity',
      findings: extraction.dewateringProfile.permeabilityHydraulicConductivity,
    },
    { label: 'Inflow rates', findings: extraction.dewateringProfile.inflowRates },
    { label: 'Drawdown estimates', findings: extraction.dewateringProfile.drawdownEstimates },
    {
      label: 'Aquifer / WaterNSW / AIP compliance',
      findings: extraction.dewateringProfile.aquiferWaterNswAipComplianceNotes,
    },
    {
      label: 'Neighbouring property / settlement effects',
      findings: extraction.dewateringProfile.neighbouringPropertySettlementEffects,
    },
    {
      label: 'Monitoring and reporting requirements',
      findings: extraction.dewateringProfile.monitoringReportingRequirements,
    },
    {
      label: 'Key assumptions / limitations',
      findings: extraction.dewateringProfile.keyAssumptionsLimitations,
    },
    {
      label: 'Piezometer locations / monitoring network',
      findings: extraction.dewateringProfile.piezometerMonitoringNetwork,
    },
    {
      label: 'Settlement / drawdown trigger levels',
      findings: extraction.dewateringProfile.settlementDrawdownTriggerLevels,
    },
    {
      label: 'WaterNSW licence / bore registration',
      findings: extraction.dewateringProfile.waterNswLicenceBoreRegistration,
    },
    {
      label: 'Construction stage applicability',
      findings: extraction.dewateringProfile.constructionStageApplicability,
    },
  ];

  const showStructuralDefaults =
    !isGeotechnical || structuralDefaultsGroups.some((group) => group.findings.length > 0);
  const genericParameterTables = extraction.geotechnicalParameterTables.filter(
    (table) => !normalizeForMatching(table.tableLabel).includes('table 8'),
  );
  const showGenericParameterTables = genericParameterTables.some((table) => table.rows.length > 0);
  const showGroundModel =
    extraction.groundModel.siteWideInterpretation.value !== null ||
    extraction.groundModel.boreholes.length > 0;
  const showGroundwater = groundwaterGroups.some((group) => group.findings.length > 0);
  const showFoundationAndDesign =
    foundationAndDesignGroups.some((group) => group.findings.length > 0) ||
    extraction.shallowFoundationBearingTable !== null;
  const showPileConstruction = pileConstructionGroups.some((group) => group.findings.length > 0);
  const showRetainingWallCard =
    hasValue(extraction.retainingWallPreliminaryParameters.Ka.value) ||
    hasValue(extraction.retainingWallPreliminaryParameters.Kp.value) ||
    hasValue(extraction.retainingWallPreliminaryParameters.K0.value) ||
    hasValue(extraction.retainingWallPreliminaryParameters.bulkDensityKNm3.value) ||
    hasValue(extraction.retainingWallPreliminaryParameters.compactionPressureKPa.value) ||
    extraction.retainingWallPreliminaryParameters.triangularPressureDistributionNotes.length > 0 ||
    extraction.retainingWallPreliminaryParameters.hydrostaticDrainageNotes.length > 0 ||
    extraction.retainingWallPreliminaryParameters.rectangularPressureExpression.value !== null ||
    extraction.retainingWallPreliminaryParameters.adjacentFootingPressureExpression.value !== null;
  const showSiteClassification =
    extraction.siteClassificationResult.classification.value !== null ||
    extraction.siteClassificationResult.estimatedGroundMovement.value !== null ||
    extraction.siteClassificationResult.notes.length > 0;
  const showEarthquakeSiteFactor =
    extraction.earthquakeSiteFactor.siteSubsoilClass.value !== null ||
    extraction.earthquakeSiteFactor.hazardFactorZ.value !== null ||
    extraction.earthquakeSiteFactor.notes.length > 0;
  const showOptionalReportSections = optionalReportSectionGroups.some(
    (group) => group.findings.length > 0,
  );
  const showLimitations = limitationsFindings.length > 0;
  const showStandardsMapping =
    extraction.standardsMapping !== null &&
    (extraction.standardsMapping.parameterMappings.length > 0 ||
      extraction.standardsMapping.relevantClauses.length > 0);
  const showGeotechnicalCommentProfile = geotechnicalCommentGroups.some(
    (group) => group.findings.length > 0,
  );
  const showDewateringProfile = dewateringGroups.some((group) => group.findings.length > 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-3">
        <SummaryCard
          title="Document Family"
          description="Normalized classification for the uploaded report."
          finding={{
            value: documentFamilyLabel,
            citations: extraction.documentFamily.citations,
          }}
        />
        <SummaryCard
          title="Report Title"
          description="Exact title captured from the report front matter when available."
          finding={extraction.reportTitle}
        />
        <SummaryCard
          title="Project Summary"
          description="Short project and scope summary grounded in the report text."
          finding={extraction.projectSummary}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <FieldListCard
          title="Report Metadata"
          description="Lightweight front-matter metadata kept separate from technical findings."
          fields={reportMetadataFields}
        />
        <FieldAndGroupCard
          title="Investigation Basis"
          description="What the evidence base actually was: scope, fieldwork, testing, and interpretation limits."
          fields={investigationBasisFields}
          groups={investigationBasisGroups}
        />
      </div>

      {showGeotechnicalCommentProfile ? (
        <FindingGroupCard
          title="Geotechnical Comment / Addendum"
          description="Delta-style report findings kept separate from full material-table extraction."
          groups={geotechnicalCommentGroups}
          hideEmptyGroups
        />
      ) : null}

      {showDewateringProfile ? (
        <FindingGroupCard
          title="Dewatering Management Plan"
          description="Groundwater, drawdown, compliance, monitoring, and construction-stage controls captured for dewatering reports."
          groups={dewateringGroups}
          hideEmptyGroups
        />
      ) : null}

      {showGroundModel ? <GroundModelCard extraction={extraction} /> : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {showGroundwater ? (
          <FindingGroupCard
            title="Groundwater"
            description="Report-derived groundwater content, kept separate as observations, uncertainty / monitoring, and construction implications."
            groups={groundwaterGroups}
            hideEmptyGroups
          />
        ) : null}

        {showLimitations ? (
          <SingleListCard
            title="Limitations / Use Caution"
            description="The report's own limitations, uncertainty statements, and use constraints."
            findings={limitationsFindings}
          />
        ) : null}
      </div>

      {showFoundationAndDesign ? (
        <div className="space-y-4">
          {extraction.shallowFoundationBearingTable ? (
            <ShallowFoundationCard table={extraction.shallowFoundationBearingTable} />
          ) : null}

          <FindingGroupCard
            title="Foundation & Design Notes"
            description="Supporting report-derived notes that sit around the foundation recommendations and design commentary."
            groups={foundationAndDesignGroups}
            hideEmptyGroups
          />
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {extraction.batterSlopeTable ? <BatterSlopeTableCard table={extraction.batterSlopeTable} /> : null}
        {extraction.soilNailBondStressTable ? (
          <SoilNailBondStressTableCard table={extraction.soilNailBondStressTable} />
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {showRetainingWallCard ? (
          <RetainingWallParametersCard
            parameters={extraction.retainingWallPreliminaryParameters}
            sectionFindings={extraction.reportSections.retainingWalls}
          />
        ) : null}
        {showSiteClassification ? (
          <SiteClassificationCard extraction={extraction.siteClassificationResult} />
        ) : null}
        {showEarthquakeSiteFactor ? (
          <EarthquakeSiteFactorCard extraction={extraction.earthquakeSiteFactor} />
        ) : null}
      </div>

      {showPileConstruction ? (
        <FindingGroupCard
          title="Deep Foundations / Piles"
          description="Broader pile construction, verification, uplift, and settlement controls kept report-derived and separate from standards-reference content."
          groups={pileConstructionGroups}
          hideEmptyGroups
        />
      ) : null}

      {showOptionalReportSections ? (
        <FindingGroupCard
          title="Optional Report Sections"
          description="Heading-aware non-pile sections shown only when this report actually contains them."
          groups={optionalReportSectionGroups}
          hideEmptyGroups
        />
      ) : null}

      {showStructuralDefaults ? (
        <FindingGroupCard
          title="Structural Defaults"
          description="Concrete, cover, and reinforcement defaults only when the report explicitly states them."
          groups={structuralDefaultsGroups}
          hideEmptyGroups={isGeotechnical}
        />
      ) : null}

      {showGenericParameterTables ? (
        <GeotechnicalParameterTablesCard tables={genericParameterTables} />
      ) : null}

      {showStandardsMapping && extraction.standardsMapping ? (
        <StandardsMappingCard mapping={extraction.standardsMapping} />
      ) : null}

      <Card>
        <CardHeader>
          <HeaderWithBadge title="Citations / Provenance" badge="Report-derived" />
          <CardDescription>
            Best supporting snippets retained for the current extraction summary.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {extraction.citations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No citations were returned for this run.</p>
          ) : (
            extraction.citations.map((citation) => (
              <CitationCard key={citation.id} citation={citation} />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  title,
  description,
  finding,
}: {
  title: string;
  description: string;
  finding: AiNullableExtractionFinding;
}) {
  return (
    <Card>
      <CardHeader>
        <HeaderWithBadge title={title} badge="Report-derived" />
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">
          {finding.value ?? 'Not found in report'}
        </p>
        <CitationList citations={finding.citations} />
      </CardContent>
    </Card>
  );
}

function FieldListCard({
  title,
  description,
  fields,
}: {
  title: string;
  description: string;
  fields: Array<{ label: string; finding: AiNullableExtractionFinding }>;
}) {
  const visibleFields = fields.filter((field) => field.finding.value !== null);
  if (visibleFields.length === 0) {
    return null;
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <HeaderWithBadge title={title} badge="Report-derived" />
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          {visibleFields.map((field) => (
            <div key={field.label} className="rounded-md border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{field.label}</p>
              <p className="mt-1 text-sm font-medium">{field.finding.value}</p>
              <div className="mt-2">
                <CitationList citations={field.finding.citations} compact />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function FieldAndGroupCard({
  title,
  description,
  fields,
  groups,
}: {
  title: string;
  description: string;
  fields: Array<{ label: string; finding: AiNullableExtractionFinding }>;
  groups: Array<{ label: string; findings: AiExtractionFinding[] }>;
}) {
  const visibleFields = fields.filter((field) => field.finding.value !== null);
  const visibleGroups = groups.filter((group) => group.findings.length > 0);

  if (visibleFields.length === 0 && visibleGroups.length === 0) {
    return null;
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <HeaderWithBadge title={title} badge="Report-derived" />
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {visibleFields.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {visibleFields.map((field) => (
              <div key={field.label} className="rounded-md border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{field.label}</p>
                <p className="mt-1 text-sm font-medium">{field.finding.value}</p>
                <div className="mt-2">
                  <CitationList citations={field.finding.citations} compact />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {visibleGroups.map((group) => (
          <div key={group.label} className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{group.label}</p>
            {group.findings.map((finding, index) => (
              <FindingCard key={`${group.label}-${index}`} finding={finding} />
            ))}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function GroundModelCard({ extraction }: { extraction: AiEngineeringReportExtraction }) {
  const unitNames: string[] = [];
  for (const borehole of extraction.groundModel.boreholes) {
    for (const unitDepth of borehole.unitDepths) {
      if (!unitNames.includes(unitDepth.unitName)) {
        unitNames.push(unitDepth.unitName);
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <HeaderWithBadge title="Ground Model" badge="Report-derived" />
        <CardDescription>
          Structured representation of the generalized subsurface profile, with borehole-by-borehole
          depth-to-base values preserved from the report.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {extraction.groundModel.siteWideInterpretation.value ? (
          <div className="rounded-md border p-3">
            <p className="text-sm font-medium">{extraction.groundModel.siteWideInterpretation.value}</p>
            <div className="mt-2">
              <CitationList citations={extraction.groundModel.siteWideInterpretation.citations} compact />
            </div>
          </div>
        ) : null}

        {extraction.groundModel.boreholes.length > 0 ? (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[760px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-3 py-2 font-medium text-muted-foreground">Borehole</th>
                  {unitNames.map((unitName) => (
                    <th key={unitName} className="px-3 py-2 font-medium text-muted-foreground">
                      {unitName}
                    </th>
                  ))}
                  <th className="px-3 py-2 font-medium text-muted-foreground">Source</th>
                </tr>
              </thead>
              <tbody>
                {extraction.groundModel.boreholes.map((borehole) => (
                  <tr key={borehole.boreholeId} className="border-b align-top last:border-0">
                    <td className="px-3 py-2 font-medium">{borehole.boreholeId}</td>
                    {unitNames.map((unitName) => {
                      const unitDepth = borehole.unitDepths.find((entry) => entry.unitName === unitName);
                      return (
                        <td key={`${borehole.boreholeId}-${unitName}`} className="px-3 py-2">
                          {unitDepth ? (
                            <div className="space-y-1">
                              <p>{unitDepth.rawDepthText}</p>
                              {unitDepth.weatheringNote ? (
                                <p className="text-muted-foreground">{unitDepth.weatheringNote}</p>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2">
                      <InlineCitationBadges citations={borehole.citations} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No structured ground-model rows were extracted.</p>
        )}
      </CardContent>
    </Card>
  );
}

function FindingGroupCard({
  title,
  description,
  groups,
  hideEmptyGroups = false,
}: {
  title: string;
  description: string;
  groups: Array<{ label: string; findings: AiExtractionFinding[] }>;
  hideEmptyGroups?: boolean;
}) {
  const visibleGroups = hideEmptyGroups
    ? groups.filter((group) => group.findings.length > 0)
    : groups;

  if (visibleGroups.length === 0) {
    return null;
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <HeaderWithBadge title={title} badge="Report-derived" />
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {visibleGroups.map((group) => (
          <div key={group.label} className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{group.label}</p>
            {group.findings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No findings extracted.</p>
            ) : (
              group.findings.map((finding, index) => (
                <FindingCard key={`${group.label}-${index}`} finding={finding} />
              ))
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function SingleListCard({
  title,
  description,
  findings,
}: {
  title: string;
  description: string;
  findings: AiExtractionFinding[];
}) {
  if (findings.length === 0) {
    return null;
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <HeaderWithBadge title={title} badge="Report-derived" />
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {findings.map((finding, index) => (
          <FindingCard key={`${title}-${index}`} finding={finding} />
        ))}
      </CardContent>
    </Card>
  );
}

function ShallowFoundationCard({
  table,
}: {
  table: NonNullable<AiEngineeringReportExtraction['shallowFoundationBearingTable']>;
}) {
  return (
    <Card>
      <CardHeader>
        <HeaderWithBadge title="Shallow Foundations" badge="Report-derived" />
        <CardDescription>
          Structured allowable bearing pressures preserved from the report, with assumptions and follow-up notes kept alongside the table.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{table.tableLabel}</Badge>
          {table.pageLabel ? <Badge variant="secondary">{table.pageLabel}</Badge> : null}
        </div>

        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[920px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-3 py-2 font-medium text-muted-foreground">Founding material</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">Square / circular</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">Strip</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">FoS</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">Min width (m)</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">Min depth (m)</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">Notes / assumptions</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">Source</th>
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, index) => (
                <tr key={`${row.foundingMaterial ?? 'row'}-${index}`} className="border-b align-top last:border-0">
                  <td className="px-3 py-2 font-medium">{row.foundingMaterial ?? `Row ${index + 1}`}</td>
                  <td className="px-3 py-2">{formatNumberCell(row.padOrSquareOrCircularAllowableKPa)}</td>
                  <td className="px-3 py-2">{formatNumberCell(row.stripAllowableKPa)}</td>
                  <td className="px-3 py-2">{formatNumberCell(row.factorOfSafety)}</td>
                  <td className="px-3 py-2">{formatNumberCell(row.minimumFoundingWidthM)}</td>
                  <td className="px-3 py-2">{formatNumberCell(row.minimumFoundingDepthM)}</td>
                  <td className="px-3 py-2">
                    <div className="space-y-1">
                      {row.notes ? <p>{row.notes}</p> : null}
                      {row.toeOfCuttingGeometryAssumption ? (
                        <p className="text-muted-foreground">{row.toeOfCuttingGeometryAssumption}</p>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <InlineCitationBadges citations={row.citations} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {table.expectedSettlementRange.value ? (
            <FindingLikeCard
              label="Expected settlement range"
              finding={table.expectedSettlementRange}
            />
          ) : null}
          {table.differentialSettlementAssumption.value ? (
            <FindingLikeCard
              label="Differential settlement assumption"
              finding={table.differentialSettlementAssumption}
            />
          ) : null}
          {table.engineeredFillBearingPressures ? (
            <div className="rounded-md border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Engineered fill preliminary bearing
              </p>
              <p className="mt-1 text-sm font-medium">
                {formatNumber(table.engineeredFillBearingPressures.padOrSquareOrCircularAllowableKPa)} /
                {' '}
                {formatNumber(table.engineeredFillBearingPressures.stripAllowableKPa)} kPa
              </p>
              {table.engineeredFillBearingPressures.notes ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  {table.engineeredFillBearingPressures.notes}
                </p>
              ) : null}
              <div className="mt-2">
                <CitationList citations={table.engineeredFillBearingPressures.citations} compact />
              </div>
            </div>
          ) : null}
          {table.footingInspectionRequirement.value ? (
            <FindingLikeCard
              label="Footing inspection requirement"
              finding={table.footingInspectionRequirement}
            />
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function BatterSlopeTableCard({
  table,
}: {
  table: NonNullable<AiEngineeringReportExtraction['batterSlopeTable']>;
}) {
  return (
    <SimpleStructuredTableCard
      title="Batter Slopes"
      description="Structured batter slope guidance captured from the report table."
      tableLabel={table.tableLabel}
      pageLabel={table.pageLabel}
      headers={['Material', 'Temporary', 'Permanent', 'Notes / assumptions', 'Source']}
      rows={table.rows.map((row, index) => [
        row.material ?? `Row ${index + 1}`,
        row.temporarySlope ?? '-',
        row.permanentSlope ?? '-',
        [row.notes, row.assumptions].filter(Boolean).join(' ') || '-',
        <InlineCitationBadges key={`cit-${index}`} citations={row.citations} />,
      ])}
    />
  );
}

function SoilNailBondStressTableCard({
  table,
}: {
  table: NonNullable<AiEngineeringReportExtraction['soilNailBondStressTable']>;
}) {
  return (
    <SimpleStructuredTableCard
      title="Soil Nails"
      description="Preliminary allowable bond stress values preserved as structured rows."
      tableLabel={table.tableLabel}
      pageLabel={table.pageLabel}
      headers={['Material', 'Allowable bond stress', 'Notes / assumptions', 'Source']}
      rows={table.rows.map((row, index) => [
        row.material ?? `Row ${index + 1}`,
        row.allowableBondStressKPa !== null ? `${row.allowableBondStressKPa.toLocaleString()} kPa` : '-',
        [row.notes, row.assumptions].filter(Boolean).join(' ') || '-',
        <InlineCitationBadges key={`cit-${index}`} citations={row.citations} />,
      ])}
    />
  );
}

function SimpleStructuredTableCard({
  title,
  description,
  tableLabel,
  pageLabel,
  headers,
  rows,
}: {
  title: string;
  description: string;
  tableLabel: string;
  pageLabel: string | null;
  headers: string[];
  rows: Array<Array<string | ReactNode>>;
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <HeaderWithBadge title={title} badge="Report-derived" />
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{tableLabel}</Badge>
          {pageLabel ? <Badge variant="secondary">{pageLabel}</Badge> : null}
        </div>

        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[640px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b bg-muted/30">
                {headers.map((header) => (
                  <th key={header} className="px-3 py-2 font-medium text-muted-foreground">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={`row-${rowIndex}`} className="border-b align-top last:border-0">
                  {row.map((cell, cellIndex) => (
                    <td key={`row-${rowIndex}-cell-${cellIndex}`} className="px-3 py-2">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function RetainingWallParametersCard({
  parameters,
  sectionFindings,
}: {
  parameters: AiEngineeringReportExtraction['retainingWallPreliminaryParameters'];
  sectionFindings: AiExtractionFinding[];
}) {
  const numericFields = [
    { label: 'Ka', finding: parameters.Ka },
    { label: 'Kp', finding: parameters.Kp },
    { label: 'K0', finding: parameters.K0 },
    { label: 'Bulk density (kN/m3)', finding: parameters.bulkDensityKNm3 },
    { label: 'Compaction pressure (kPa)', finding: parameters.compactionPressureKPa },
  ].filter((field) => field.finding.value !== null);

  return (
    <Card className="h-full">
      <CardHeader>
        <HeaderWithBadge title="Retaining Walls" badge="Report-derived" />
        <CardDescription>
          Preliminary retaining-wall parameters and pressure notes, kept separate from standards-reference content.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {numericFields.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {numericFields.map((field) => (
              <div key={field.label} className="rounded-md border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{field.label}</p>
                <p className="mt-1 text-sm font-medium">{formatNumber(field.finding.value)}</p>
                <div className="mt-2">
                  <CitationList citations={field.finding.citations} compact />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <NullableFindingBlock
          label="Rectangular pressure expression"
          finding={parameters.rectangularPressureExpression}
        />
        <NullableFindingBlock
          label="Adjacent footing / service pressure expression"
          finding={parameters.adjacentFootingPressureExpression}
        />
        <FindingListBlock
          label="Triangular pressure notes"
          findings={parameters.triangularPressureDistributionNotes}
        />
        <FindingListBlock
          label="Hydrostatic / drainage notes"
          findings={parameters.hydrostaticDrainageNotes}
        />
        <FindingListBlock label="Additional retaining-wall notes" findings={sectionFindings} />
      </CardContent>
    </Card>
  );
}

function SiteClassificationCard({
  extraction,
}: {
  extraction: AiEngineeringReportExtraction['siteClassificationResult'];
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <HeaderWithBadge title="Site Classification" badge="Report-derived" />
        <CardDescription>
          Report-derived site classification and expected ground movement when stated.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <NullableFindingBlock label="Classification" finding={extraction.classification} />
        <NullableFindingBlock
          label="Estimated ground movement"
          finding={extraction.estimatedGroundMovement}
        />
        <FindingListBlock label="Supporting notes" findings={extraction.notes} />
      </CardContent>
    </Card>
  );
}

function EarthquakeSiteFactorCard({
  extraction,
}: {
  extraction: AiEngineeringReportExtraction['earthquakeSiteFactor'];
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <HeaderWithBadge title="Earthquake Site Factor" badge="Report-derived" />
        <CardDescription>
          Site class and hazard factor preserved from the report when available.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <NullableFindingBlock label="Site sub-soil class" finding={extraction.siteSubsoilClass} />
        <NullableNumericFindingBlock label="Hazard factor Z" finding={extraction.hazardFactorZ} />
        <FindingListBlock label="Supporting notes" findings={extraction.notes} />
      </CardContent>
    </Card>
  );
}

function GeotechnicalParameterTablesCard({
  tables,
}: {
  tables: AiGeotechnicalParameterTable[];
}) {
  const visibleTables = tables.filter((table) => table.rows.length > 0);
  if (visibleTables.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <HeaderWithBadge title="Extracted Parameter Tables" badge="Report-derived" />
        <CardDescription>
          Structured rows parsed from report tables. Empty or ambiguous cells are left blank rather
          than invented.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {visibleTables.map((table) => {
          const visibleColumns = PARAMETER_TABLE_COLUMNS.filter((column) =>
            table.rows.some((row) => hasValue(row[column.key])),
          );

          return (
            <div key={table.tableKey} className="space-y-3 rounded-md border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">{table.tableLabel}</p>
                <Badge variant="outline">{formatTableType(table.tableType)}</Badge>
                {table.pageLabel ? <Badge variant="secondary">{table.pageLabel}</Badge> : null}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="px-2 py-2 font-medium text-muted-foreground">Row</th>
                      {visibleColumns.map((column) => (
                        <th
                          key={`${table.tableKey}-${column.key}`}
                          className="px-2 py-2 font-medium text-muted-foreground"
                        >
                          {column.label}
                        </th>
                      ))}
                      <th className="px-2 py-2 font-medium text-muted-foreground">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row, index) => (
                      <tr key={`${table.tableKey}-${index}`} className="border-b align-top last:border-0">
                        <td className="px-2 py-2 font-medium">{formatRowLabel(row, index)}</td>
                        {visibleColumns.map((column) => (
                          <td key={`${table.tableKey}-${index}-${column.key}`} className="px-2 py-2">
                            {formatParameterCell(row[column.key])}
                          </td>
                        ))}
                        <td className="px-2 py-2">
                          <InlineCitationBadges citations={row.citations} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function StandardsMappingCard({
  mapping,
}: {
  mapping: AiStandardsMapping;
}) {
  const hasNotes = mapping.notes.length > 0;
  const hasClauses = mapping.relevantClauses.length > 0;
  const hasParameterMappings = mapping.parameterMappings.length > 0;

  if (!hasNotes && !hasClauses && !hasParameterMappings) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <HeaderWithBadge title="AS 2159 Reference Mapping" badge="Reference-only" />
        <CardDescription>
          Separate standards-reference layer. It links extracted report facts to possible AS 2159
          concepts without replacing site-specific values.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{mapping.standard.replace('_', ' ')}</Badge>
        </div>

        {hasNotes ? (
          <div className="space-y-2">
            {mapping.notes.map((note, index) => (
              <p key={`note-${index}`} className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                {note}
              </p>
            ))}
          </div>
        ) : null}

        {hasClauses ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {mapping.relevantClauses.map((clause) => (
              <div key={clause.clause} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{clause.clause}</Badge>
                  <p className="text-sm font-medium">{clause.title}</p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{clause.summary}</p>
              </div>
            ))}
          </div>
        ) : null}

        {hasParameterMappings ? (
          <div className="space-y-3">
            {mapping.parameterMappings.map((entry, index) => (
              <div key={`${entry.extractedFieldPath}-${index}`} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{entry.extractedValueLabel}</p>
                  <Badge variant="outline">{entry.possibleAs2159Concept}</Badge>
                  <Badge variant="secondary">{Math.round(entry.confidence * 100)}% confidence</Badge>
                </div>
                <p className="mt-2 font-mono text-xs text-muted-foreground">
                  {entry.extractedFieldPath}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {entry.possibleAs2159Use.map((useTag) => (
                    <Badge key={`${entry.extractedFieldPath}-${useTag}`} variant="secondary">
                      {formatUseTag(useTag)}
                    </Badge>
                  ))}
                  {entry.relatedClauses.map((clause) => (
                    <Badge key={`${entry.extractedFieldPath}-${clause}`} variant="outline">
                      Clause {clause}
                    </Badge>
                  ))}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{entry.rationale}</p>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function HeaderWithBadge({ title, badge }: { title: string; badge: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <CardTitle className="text-base">{title}</CardTitle>
      <Badge variant={badge === 'Reference-only' ? 'outline' : 'secondary'}>{badge}</Badge>
    </div>
  );
}

function FindingCard({ finding }: { finding: AiExtractionFinding }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-sm font-medium">{finding.value}</p>
      <div className="mt-2">
        <CitationList citations={finding.citations} compact />
      </div>
    </div>
  );
}

function FindingLikeCard({
  label,
  finding,
}: {
  label: string;
  finding: AiNullableExtractionFinding;
}) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{finding.value}</p>
      <div className="mt-2">
        <CitationList citations={finding.citations} compact />
      </div>
    </div>
  );
}

function NullableFindingBlock({
  label,
  finding,
}: {
  label: string;
  finding: AiNullableExtractionFinding;
}) {
  if (!finding.value) {
    return null;
  }

  return <FindingLikeCard label={label} finding={finding} />;
}

function NullableNumericFindingBlock({
  label,
  finding,
}: {
  label: string;
  finding: AiNullableNumericFinding;
}) {
  if (finding.value === null) {
    return null;
  }

  return (
    <div className="rounded-md border p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{formatNumber(finding.value)}</p>
      <div className="mt-2">
        <CitationList citations={finding.citations} compact />
      </div>
    </div>
  );
}

function FindingListBlock({
  label,
  findings,
}: {
  label: string;
  findings: AiExtractionFinding[];
}) {
  if (findings.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      {findings.map((finding, index) => (
        <FindingCard key={`${label}-${index}`} finding={finding} />
      ))}
    </div>
  );
}

function CitationList({
  citations,
  compact = false,
}: {
  citations: AiExtractionCitation[];
  compact?: boolean;
}) {
  if (citations.length === 0) {
    return <p className="text-xs text-muted-foreground">No citation linked to this field.</p>;
  }

  return (
    <div className="space-y-2">
      {citations.map((citation) => (
        <CitationCard key={citation.id} citation={citation} compact={compact} />
      ))}
    </div>
  );
}

function InlineCitationBadges({ citations }: { citations: AiExtractionCitation[] }) {
  if (citations.length === 0) {
    return <span className="text-muted-foreground">No citation</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {citations.map((citation) => (
        <Badge key={citation.id} variant="secondary">
          {citation.pageLabel ?? citation.filename}
        </Badge>
      ))}
    </div>
  );
}

function CitationCard({
  citation,
  compact = false,
}: {
  citation: AiExtractionCitation;
  compact?: boolean;
}) {
  return (
    <div className={`rounded-md border ${compact ? 'p-2' : 'p-3'}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{citation.filename}</Badge>
        {citation.pageLabel ? <Badge variant="secondary">{citation.pageLabel}</Badge> : null}
        <Badge variant="secondary">score {citation.score.toFixed(3)}</Badge>
        {!compact && citation.query ? <Badge variant="warning">{citation.query}</Badge> : null}
      </div>
      <p className={`mt-2 text-muted-foreground ${compact ? 'text-xs' : 'text-sm'}`}>
        {citation.snippet}
      </p>
    </div>
  );
}

function dedupeFindingLists(...groups: AiExtractionFinding[][]) {
  const deduped: AiExtractionFinding[] = [];
  const seen = new Set<string>();

  for (const group of groups) {
    for (const finding of group) {
      const normalized = normalizeForMatching(finding.value);
      if (seen.has(normalized)) {
        continue;
      }
      seen.add(normalized);
      deduped.push(finding);
    }
  }

  return deduped;
}

function formatDocumentFamily(value: AiDocumentFamily | null) {
  if (!value) {
    return null;
  }

  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatTableType(value: AiGeotechnicalParameterTable['tableType']) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatRowLabel(row: AiGeotechnicalParameterTableRow, index: number) {
  return (
    row.rowLabel ??
    row.foundingStrata ??
    ([row.unitCode, row.unitDescription].filter(Boolean).join(' - ') || null) ??
    `Row ${index + 1}`
  );
}

function formatParameterCell(value: AiGeotechnicalParameterTableRow[ParameterColumnKey]) {
  if (!hasValue(value)) {
    return <span className="text-muted-foreground">-</span>;
  }

  if (typeof value === 'number') {
    return value.toLocaleString();
  }

  if (Array.isArray(value)) {
    return `${value.length}`;
  }

  return value;
}

function formatNumberCell(value: number | null) {
  return value === null ? <span className="text-muted-foreground">-</span> : value.toLocaleString();
}

function formatNumber(value: number | null) {
  return value === null ? '-' : value.toLocaleString();
}

function hasValue(value: unknown) {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return true;
}

function formatUseTag(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function normalizeForMatching(value: string) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

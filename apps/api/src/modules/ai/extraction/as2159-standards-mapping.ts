import type {
  EngineeringReportExtractionResult,
  StandardsClauseReference,
  StandardsMapping,
  StandardsParameterMapping,
  StandardsUseTag,
} from './report-extraction.schema';

type ClauseSeed = StandardsClauseReference;

const AS2159_CLAUSE_SEEDS: Record<string, ClauseSeed> = {
  '4.2': {
    clause: '4.2',
    title: 'Assessment of geotechnical parameters',
    summary:
      'Site-relevant parameter selection should be based on investigation data, variability, groundwater, and construction effects.',
  },
  '4.3': {
    clause: '4.3',
    title: 'Geotechnical strength design logic',
    summary:
      'Geotechnical strength is framed as factored ultimate geotechnical strength and links later testing and risk decisions back to Section 4.',
  },
  '4.3.3': {
    clause: '4.3.3',
    title: 'Assessment of design ultimate geotechnical strength',
    summary:
      'Design ultimate geotechnical strength may be assessed from site investigation data, installation data, or load testing.',
  },
  '4.4.1': {
    clause: '4.4.1',
    title: 'Compression',
    summary:
      'Compression strength uses shaft friction in compression (fm,s) and ultimate base pressure in compression (fb).',
  },
  '4.4.2': {
    clause: '4.4.2',
    title: 'Uplift',
    summary:
      'Uplift strength uses shaft friction in tension (fm,st) and, where relevant, base resistance in uplift (fbt).',
  },
  '6.2': {
    clause: '6.2',
    title: 'General durability principles',
    summary:
      'Durability classification depends on ground aggressivity and environmental exposure over the target design life.',
  },
  '6.3': {
    clause: '6.3',
    title: 'Acid sulfate soils',
    summary:
      'Aggressive or acid sulfate environments require specific durability attention and testing of actual and potential aggressiveness.',
  },
  '6.4': {
    clause: '6.4',
    title: 'Durability of concrete piles',
    summary:
      'Concrete pile durability depends on exposure classification, concrete strength, cover, and groundwater/soil aggressivity inputs.',
  },
  '8.2.4': {
    clause: '8.2.4',
    title: 'When testing is required',
    summary:
      'Serviceability and integrity testing requirements depend on risk, basic reduction factors, pile type, and verification strategy.',
  },
};

export function buildAs2159StandardsMapping(
  extraction: EngineeringReportExtractionResult,
): StandardsMapping | null {
  const parameterMappings: StandardsParameterMapping[] = [];

  for (const [tableIndex, table] of extraction.geotechnicalParameterTables.entries()) {
    if (table.tableType === 'GEOLOGICAL_UNIT_PARAMETERS') {
      parameterMappings.push({
        extractedFieldPath: `geotechnicalParameterTables[${tableIndex}]`,
        extractedValueLabel: `${table.tableLabel} (${table.pageLabel ?? 'page not tagged'})`,
        possibleAs2159Concept: 'site-derived geotechnical parameter set',
        possibleAs2159Use: [],
        relatedClauses: ['4.2', '4.3.3'],
        rationale:
          'The report table provides site-specific geological-unit parameters that can inform later Section 4 assessments, but it is still report data rather than an AS 2159 design output.',
        confidence: 0.83,
      });
    }

    if (table.tableType === 'PILE_FOUNDING_PARAMETERS') {
      for (const [rowIndex, row] of table.rows.entries()) {
        const rowLabel = row.rowLabel ?? row.foundingStrata ?? `Row ${rowIndex + 1}`;

        if (row.endBearingUltimateKPa !== null || row.endBearingAllowableKPa !== null) {
          parameterMappings.push({
            extractedFieldPath: `geotechnicalParameterTables[${tableIndex}].rows[${rowIndex}].endBearingUltimateKPa`,
            extractedValueLabel: buildPileValueLabel(
              rowLabel,
              'end bearing',
              row.endBearingUltimateKPa,
              row.endBearingAllowableKPa,
            ),
            possibleAs2159Concept: 'fb',
            possibleAs2159Use: ['compression'],
            relatedClauses: ['4.4.1'],
            rationale:
              'The report row gives pile founding end-bearing values in compression, which align conceptually with the base-pressure term fb used in AS 2159 compression design logic.',
            confidence: 0.94,
          });
        }

        if (
          row.shaftAdhesionCompressionUltimateKPa !== null ||
          row.shaftAdhesionCompressionAllowableKPa !== null
        ) {
          parameterMappings.push({
            extractedFieldPath: `geotechnicalParameterTables[${tableIndex}].rows[${rowIndex}].shaftAdhesionCompressionUltimateKPa`,
            extractedValueLabel: buildPileValueLabel(
              rowLabel,
              'shaft adhesion (compression)',
              row.shaftAdhesionCompressionUltimateKPa,
              row.shaftAdhesionCompressionAllowableKPa,
            ),
            possibleAs2159Concept: 'fm,s',
            possibleAs2159Use: ['compression'],
            relatedClauses: ['4.4.1'],
            rationale:
              'The report row gives pile shaft adhesion values for compression, which align conceptually with the fm,s shaft-friction term used in AS 2159 Clause 4.4.1.',
            confidence: 0.95,
          });
        }
      }
    }
  }

  extraction.geotechnicalBasis.pileRecommendations.forEach((finding, index) => {
    if (!containsAny(finding.value, ['uplift', 'tension', '70%'])) {
      return;
    }

    parameterMappings.push({
      extractedFieldPath: `geotechnicalBasis.pileRecommendations[${index}]`,
      extractedValueLabel: truncateLabel(finding.value),
      possibleAs2159Concept: 'fm,st',
      possibleAs2159Use: ['uplift'],
      relatedClauses: ['4.4.2'],
      rationale:
        'The report includes an explicit uplift/tension interpretation for pile shaft adhesion, which is conceptually relevant to the uplift shaft-friction term fm,st in Clause 4.4.2.',
      confidence: 0.88,
    });
  });

  extraction.geotechnicalBasis.foundingNotes.forEach((finding, index) => {
    if (!containsAny(finding.value, ['pile', 'rock', 'founding', 'embedded'])) {
      return;
    }

    parameterMappings.push({
      extractedFieldPath: `geotechnicalBasis.foundingNotes[${index}]`,
      extractedValueLabel: truncateLabel(finding.value),
      possibleAs2159Concept: 'pile founding basis in compression',
      possibleAs2159Use: ['compression'],
      relatedClauses: ['4.4.1'],
      rationale:
        'The report states the proposed founding basis and embedment/founding strata logic for piles, which is directly relevant context for Clause 4.4.1 compression checks.',
      confidence: 0.77,
    });
  });

  extraction.geotechnicalBasis.aggressivityDurabilityNotes.forEach((finding, index) => {
    if (!containsAny(finding.value, ['aggress', 'durab', 'sulfate', 'corrosion', 'acid sulfate'])) {
      return;
    }

    parameterMappings.push({
      extractedFieldPath: `geotechnicalBasis.aggressivityDurabilityNotes[${index}]`,
      extractedValueLabel: truncateLabel(finding.value),
      possibleAs2159Concept: 'pile durability exposure/aggressivity assessment',
      possibleAs2159Use: ['durability'],
      relatedClauses: ['6.2', '6.3', '6.4'],
      rationale:
        'The report note concerns aggressivity or durability inputs that AS 2159 uses to classify exposure and durability requirements for piles.',
      confidence: 0.9,
    });
  });

  extraction.geotechnicalBasis.furtherInvestigationNotes.forEach((finding, index) => {
    if (!containsAny(finding.value, ['testing', 'monitoring', 'investigation', 'further'])) {
      return;
    }

    parameterMappings.push({
      extractedFieldPath: `geotechnicalBasis.furtherInvestigationNotes[${index}]`,
      extractedValueLabel: truncateLabel(finding.value),
      possibleAs2159Concept: 'site verification and testing logic',
      possibleAs2159Use: ['testing'],
      relatedClauses: ['4.3.3', '8.2.4'],
      rationale:
        'The report calls for additional monitoring or testing, which is conceptually relevant to AS 2159 verification pathways and testing decision logic.',
      confidence: 0.72,
    });
  });

  if (parameterMappings.length === 0) {
    return null;
  }

  const relevantClauses = uniqueClauses(
    parameterMappings.flatMap((mapping) => mapping.relatedClauses),
  );

  return {
    standard: 'AS2159_2009',
    relevantClauses,
    parameterMappings,
    notes: [
      'AS 2159 entries below are reference mappings only and do not replace or overwrite report-derived site values.',
      'No AS 2159 strength reduction factors, capacities, or final pile design outputs were computed in this layer.',
    ],
  };
}

function uniqueClauses(clauseIds: string[]) {
  const seen = new Set<string>();
  const clauses: StandardsClauseReference[] = [];

  for (const clauseId of clauseIds) {
    if (seen.has(clauseId)) {
      continue;
    }
    seen.add(clauseId);
    const seed = AS2159_CLAUSE_SEEDS[clauseId];
    if (seed) {
      clauses.push(seed);
    }
  }

  return clauses;
}

function buildPileValueLabel(
  rowLabel: string,
  metricLabel: string,
  ultimate: number | null,
  allowable: number | null,
) {
  const parts = [`${rowLabel}: ${metricLabel}`];

  if (ultimate !== null) {
    parts.push(`ultimate ${ultimate} kPa`);
  }
  if (allowable !== null) {
    parts.push(`allowable ${allowable} kPa`);
  }

  return parts.join(', ');
}

function truncateLabel(value: string) {
  return value.length > 180 ? `${value.slice(0, 177)}...` : value;
}

function containsAny(value: string, patterns: string[]) {
  const haystack = normalizeForMatching(value);
  return patterns.some((pattern) => haystack.includes(normalizeForMatching(pattern)));
}

function normalizeForMatching(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

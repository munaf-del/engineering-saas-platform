type OmnidotsDatasetSnapshot = {
  connection?: {
    id?: string;
    displayName?: string | null;
  } | null;
  measuringPoint?: {
    id?: string;
    externalMeasuringPointId?: string;
    name?: string;
    timezone?: string | null;
  } | null;
  dateRange?: {
    dateFrom?: string;
    dateTo?: string;
    timezone?: string | null;
  } | null;
  selectedMetricKeys?: string[];
  metrics?: OmnidotsDatasetMetricSnapshot[];
};

type OmnidotsDatasetMetricSnapshot = {
  metricKey?: string;
  metricLabel?: string;
  unit?: string | null;
  sampleCount?: number;
  firstSampleAt?: string | null;
  lastSampleAt?: string | null;
  samples?: OmnidotsDatasetSampleSnapshot[];
};

type OmnidotsDatasetSampleSnapshot = {
  sampledAt?: string;
  xValue?: number | null;
  yValue?: number | null;
  zValue?: number | null;
  fdomX?: number | null;
  fdomY?: number | null;
  fdomZ?: number | null;
};

type OmnidotsAxisPeakSummary = {
  axis: 'x' | 'y' | 'z';
  value: number;
  timestamp: string;
  fdom: number | null;
};

type OmnidotsImportJobReference = {
  metricKey: string;
  id: string;
  status: string;
  completedAt: string | null;
};

export type OmnidotsDatasetPreviewRow = {
  metricKey: string;
  metricLabel: string;
  unit: string | null;
  measuringPointId: string | null;
  measuringPointLabel: string;
  sampleCount: number;
  importDateFrom: string | null;
  importDateTo: string | null;
  timezone: string | null;
  datasetId: string;
  importJobId: string | null;
  importJobStatus: string | null;
  highestVtopX: number | null;
  highestVtopXAt: string | null;
  highestVtopY: number | null;
  highestVtopYAt: string | null;
  highestVtopZ: number | null;
  highestVtopZAt: string | null;
  fdomX: number | null;
  fdomY: number | null;
  fdomZ: number | null;
  highestVdvX: number | null;
  highestVdvXAt: string | null;
  highestVdvY: number | null;
  highestVdvYAt: string | null;
  highestVdvZ: number | null;
  highestVdvZAt: string | null;
  highestVeffX: number | null;
  highestVeffXAt: string | null;
  highestVeffY: number | null;
  highestVeffYAt: string | null;
  highestVeffZ: number | null;
  highestVeffZAt: string | null;
};

export type OmnidotsLatestDatasetSummary = {
  id: string;
  connectionId: string | null;
  measuringPointId: string | null;
  measuringPointLabel: string;
  dateFrom: string;
  dateTo: string;
  timezone: string;
  datasetHash: string;
  createdAt: string;
  updatedAt: string;
  selectedMetricKeys: string[];
  sampleCount: number;
  previewRows: OmnidotsDatasetPreviewRow[];
};

export type OmnidotsImportedVibrationResultDraft = {
  metricKey: string;
  metricType: 'ppv' | 'vdv';
  observedAt: string | null;
  activityLabel: string;
  instrumentNote: string | null;
  ppvValue: string | null;
  vdvValue: string | null;
  dominantFrequencyHz: string | null;
  axisNote: string | null;
  complianceStatus: 'not_assessed';
  resultNote: string;
  dedupeSignature: string;
};

export type BuildImportedVibrationResultDraftsArgs = {
  datasetId: string;
  previewRows: OmnidotsDatasetPreviewRow[];
  existingResultNotes: string[];
};

export type BuildImportedVibrationResultDraftsResult = {
  drafts: OmnidotsImportedVibrationResultDraft[];
  skipped: Array<{
    metricKey: string;
    reason: string;
  }>;
};

export function buildOmnidotsLatestDatasetSummary(args: {
  createdAt: Date;
  datasetHash: string;
  dateFrom: Date;
  dateTo: Date;
  datasetId: string;
  snapshotJson: unknown;
  updatedAt: Date;
  importJobsByMetric: Map<string, OmnidotsImportJobReference>;
}) {
  const snapshot = coerceOmnidotsDatasetSnapshot(args.snapshotJson);
  if (!snapshot) {
    return null;
  }

  const previewRows = buildOmnidotsDatasetPreviewRows(
    args.datasetId,
    snapshot,
    args.importJobsByMetric,
  );

  return {
    id: args.datasetId,
    connectionId: snapshot.connection?.id ?? null,
    measuringPointId: snapshot.measuringPoint?.id ?? null,
    measuringPointLabel: snapshot.measuringPoint?.name?.trim() || 'Unnamed measuring point',
    dateFrom: args.dateFrom.toISOString(),
    dateTo: args.dateTo.toISOString(),
    timezone: snapshot.dateRange?.timezone?.trim() || 'UTC',
    datasetHash: args.datasetHash,
    createdAt: args.createdAt.toISOString(),
    updatedAt: args.updatedAt.toISOString(),
    selectedMetricKeys: Array.isArray(snapshot.selectedMetricKeys)
      ? snapshot.selectedMetricKeys.filter((metricKey): metricKey is string => !!metricKey)
      : previewRows.map((row) => row.metricKey),
    sampleCount: previewRows.reduce((total, row) => total + row.sampleCount, 0),
    previewRows,
  } satisfies OmnidotsLatestDatasetSummary;
}

export function buildOmnidotsImportedVibrationResultDrafts({
  datasetId,
  previewRows,
  existingResultNotes,
}: BuildImportedVibrationResultDraftsArgs): BuildImportedVibrationResultDraftsResult {
  const drafts: OmnidotsImportedVibrationResultDraft[] = [];
  const skipped: BuildImportedVibrationResultDraftsResult['skipped'] = [];
  const existingSignatures = new Set(
    existingResultNotes.flatMap((note) => extractOmnidotsSignatures(note)),
  );

  for (const row of previewRows) {
    if (row.metricKey === 'veff_max') {
      skipped.push({
        metricKey: row.metricKey,
        reason: 'Veff,max is previewed and snapshotted but not auto-mapped into authored rows.',
      });
      continue;
    }

    const dominantPeak =
      row.metricKey === 'vtop'
        ? resolveDominantAxisPeak([
            createAxisPeak('x', row.highestVtopX, row.highestVtopXAt, row.fdomX),
            createAxisPeak('y', row.highestVtopY, row.highestVtopYAt, row.fdomY),
            createAxisPeak('z', row.highestVtopZ, row.highestVtopZAt, row.fdomZ),
          ])
        : resolveDominantAxisPeak([
            createAxisPeak('x', row.highestVdvX, row.highestVdvXAt, null),
            createAxisPeak('y', row.highestVdvY, row.highestVdvYAt, null),
            createAxisPeak('z', row.highestVdvZ, row.highestVdvZAt, null),
          ]);

    if (!dominantPeak) {
      skipped.push({
        metricKey: row.metricKey,
        reason: 'No axis maximum was available for the imported metric.',
      });
      continue;
    }

    const dedupeSignature = buildOmnidotsDedupeSignature(datasetId, row.metricKey, dominantPeak);
    if (existingSignatures.has(dedupeSignature)) {
      skipped.push({
        metricKey: row.metricKey,
        reason: 'An authored vibration row already exists for this dataset summary item.',
      });
      continue;
    }

    existingSignatures.add(dedupeSignature);
    const metricType = row.metricKey === 'vdv' ? 'vdv' : 'ppv';
    const metricLabel = row.metricKey === 'vdv' ? 'VDV' : 'PPV';
    const importedValue = formatMetricValue(dominantPeak.value);
    const dominantFrequencyHz =
      row.metricKey === 'vtop' ? formatMetricValue(dominantPeak.fdom) : null;

    drafts.push({
      metricKey: row.metricKey,
      metricType,
      observedAt: dominantPeak.timestamp,
      activityLabel: buildImportedActivityLabel(row.measuringPointLabel, metricLabel),
      instrumentNote: buildImportedInstrumentNote(row),
      ppvValue: row.metricKey === 'vtop' ? importedValue : null,
      vdvValue: row.metricKey === 'vdv' ? importedValue : null,
      dominantFrequencyHz,
      axisNote: buildImportedAxisNote(row, dominantPeak),
      complianceStatus: 'not_assessed',
      resultNote: buildImportedResultNote(row, dominantPeak, dedupeSignature),
      dedupeSignature,
    });
  }

  return { drafts, skipped };
}

function buildOmnidotsDatasetPreviewRows(
  datasetId: string,
  snapshot: OmnidotsDatasetSnapshot,
  importJobsByMetric: Map<string, OmnidotsImportJobReference>,
) {
  const measuringPointLabel = snapshot.measuringPoint?.name?.trim() || 'Unnamed measuring point';
  const measuringPointId = snapshot.measuringPoint?.id ?? null;
  const importDateFrom = snapshot.dateRange?.dateFrom ?? null;
  const importDateTo = snapshot.dateRange?.dateTo ?? null;
  const timezone =
    snapshot.dateRange?.timezone?.trim() || snapshot.measuringPoint?.timezone || null;

  return (snapshot.metrics ?? [])
    .map((metric) => {
      const metricKey = metric.metricKey?.trim();
      if (!metricKey) {
        return null;
      }

      const importJob = importJobsByMetric.get(metricKey) ?? null;
      const xPeak = summarizeAxisPeak(metric.samples ?? [], 'x');
      const yPeak = summarizeAxisPeak(metric.samples ?? [], 'y');
      const zPeak = summarizeAxisPeak(metric.samples ?? [], 'z');

      return {
        metricKey,
        metricLabel: metric.metricLabel?.trim() || defaultMetricLabel(metricKey),
        unit: metric.unit?.trim() || null,
        measuringPointId,
        measuringPointLabel,
        sampleCount: metric.sampleCount ?? metric.samples?.length ?? 0,
        importDateFrom,
        importDateTo,
        timezone,
        datasetId,
        importJobId: importJob?.id ?? null,
        importJobStatus: importJob?.status ?? null,
        highestVtopX: metricKey === 'vtop' ? (xPeak?.value ?? null) : null,
        highestVtopXAt: metricKey === 'vtop' ? (xPeak?.timestamp ?? null) : null,
        highestVtopY: metricKey === 'vtop' ? (yPeak?.value ?? null) : null,
        highestVtopYAt: metricKey === 'vtop' ? (yPeak?.timestamp ?? null) : null,
        highestVtopZ: metricKey === 'vtop' ? (zPeak?.value ?? null) : null,
        highestVtopZAt: metricKey === 'vtop' ? (zPeak?.timestamp ?? null) : null,
        fdomX: metricKey === 'vtop' ? (xPeak?.fdom ?? null) : null,
        fdomY: metricKey === 'vtop' ? (yPeak?.fdom ?? null) : null,
        fdomZ: metricKey === 'vtop' ? (zPeak?.fdom ?? null) : null,
        highestVdvX: metricKey === 'vdv' ? (xPeak?.value ?? null) : null,
        highestVdvXAt: metricKey === 'vdv' ? (xPeak?.timestamp ?? null) : null,
        highestVdvY: metricKey === 'vdv' ? (yPeak?.value ?? null) : null,
        highestVdvYAt: metricKey === 'vdv' ? (yPeak?.timestamp ?? null) : null,
        highestVdvZ: metricKey === 'vdv' ? (zPeak?.value ?? null) : null,
        highestVdvZAt: metricKey === 'vdv' ? (zPeak?.timestamp ?? null) : null,
        highestVeffX: metricKey === 'veff_max' ? (xPeak?.value ?? null) : null,
        highestVeffXAt: metricKey === 'veff_max' ? (xPeak?.timestamp ?? null) : null,
        highestVeffY: metricKey === 'veff_max' ? (yPeak?.value ?? null) : null,
        highestVeffYAt: metricKey === 'veff_max' ? (yPeak?.timestamp ?? null) : null,
        highestVeffZ: metricKey === 'veff_max' ? (zPeak?.value ?? null) : null,
        highestVeffZAt: metricKey === 'veff_max' ? (zPeak?.timestamp ?? null) : null,
      } satisfies OmnidotsDatasetPreviewRow;
    })
    .filter((row): row is OmnidotsDatasetPreviewRow => row !== null);
}

function coerceOmnidotsDatasetSnapshot(value: unknown): OmnidotsDatasetSnapshot | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as OmnidotsDatasetSnapshot;
}

function summarizeAxisPeak(
  samples: OmnidotsDatasetSampleSnapshot[],
  axis: 'x' | 'y' | 'z',
): OmnidotsAxisPeakSummary | null {
  let currentPeak: OmnidotsAxisPeakSummary | null = null;

  for (const sample of samples) {
    const timestamp = typeof sample.sampledAt === 'string' ? sample.sampledAt : null;
    if (!timestamp) {
      continue;
    }

    const valueKey = axis === 'x' ? 'xValue' : axis === 'y' ? 'yValue' : ('zValue' as const);
    const fdomKey = axis === 'x' ? 'fdomX' : axis === 'y' ? 'fdomY' : ('fdomZ' as const);
    const value = sample[valueKey];

    if (typeof value !== 'number' || Number.isNaN(value)) {
      continue;
    }

    if (!currentPeak || value > currentPeak.value) {
      currentPeak = {
        axis,
        value,
        timestamp,
        fdom: typeof sample[fdomKey] === 'number' ? sample[fdomKey] : null,
      };
    }
  }

  return currentPeak;
}

function createAxisPeak(
  axis: 'x' | 'y' | 'z',
  value: number | null,
  timestamp: string | null,
  fdom: number | null,
) {
  if (value === null || !timestamp) {
    return null;
  }

  return {
    axis,
    value,
    timestamp,
    fdom,
  } satisfies OmnidotsAxisPeakSummary;
}

function resolveDominantAxisPeak(
  peaks: Array<OmnidotsAxisPeakSummary | null>,
): OmnidotsAxisPeakSummary | null {
  return peaks.reduce<OmnidotsAxisPeakSummary | null>((currentPeak, candidate) => {
    if (!candidate) {
      return currentPeak;
    }

    if (!currentPeak || candidate.value > currentPeak.value) {
      return candidate;
    }

    return currentPeak;
  }, null);
}

function buildImportedActivityLabel(measuringPointLabel: string, metricLabel: string) {
  return truncate(`Omnidots ${measuringPointLabel} ${metricLabel}`, 200);
}

function buildImportedInstrumentNote(row: OmnidotsDatasetPreviewRow) {
  return truncate(
    [
      'Imported from Omnidots Honeycomb',
      row.measuringPointLabel,
      row.unit ? `Unit ${row.unit}` : null,
    ]
      .filter(Boolean)
      .join(' · '),
    500,
  );
}

function buildImportedAxisNote(
  row: OmnidotsDatasetPreviewRow,
  dominantPeak: OmnidotsAxisPeakSummary,
) {
  const summaries =
    row.metricKey === 'vtop'
      ? [
          formatAxisSummary('X', row.highestVtopX, row.highestVtopXAt, row.fdomX),
          formatAxisSummary('Y', row.highestVtopY, row.highestVtopYAt, row.fdomY),
          formatAxisSummary('Z', row.highestVtopZ, row.highestVtopZAt, row.fdomZ),
        ]
      : row.metricKey === 'vdv'
        ? [
            formatAxisSummary('X', row.highestVdvX, row.highestVdvXAt, null),
            formatAxisSummary('Y', row.highestVdvY, row.highestVdvYAt, null),
            formatAxisSummary('Z', row.highestVdvZ, row.highestVdvZAt, null),
          ]
        : [];

  const leading =
    row.metricKey === 'vtop'
      ? `Dominant axis ${dominantPeak.axis.toUpperCase()} with PPV ${formatMetricValue(dominantPeak.value)} mm/s and Fdom ${formatMetricValue(dominantPeak.fdom)} Hz`
      : `Dominant axis ${dominantPeak.axis.toUpperCase()} with VDV ${formatMetricValue(dominantPeak.value)}`;

  return truncate([leading, ...summaries].filter(Boolean).join('. '), 2000);
}

function buildImportedResultNote(
  row: OmnidotsDatasetPreviewRow,
  dominantPeak: OmnidotsAxisPeakSummary,
  dedupeSignature: string,
) {
  return truncate(
    [
      dedupeSignature,
      'Created from the imported Omnidots dataset summary after explicit user confirmation.',
      `Dataset ${row.datasetId}.`,
      row.importJobId
        ? `Import job ${row.importJobId} (${row.importJobStatus ?? 'unknown'}).`
        : null,
      `Measuring point ${row.measuringPointLabel}.`,
      `Metric ${row.metricLabel} (${row.metricKey}).`,
      row.importDateFrom && row.importDateTo
        ? `Imported period ${row.importDateFrom} to ${row.importDateTo}${row.timezone ? ` ${row.timezone}` : ''}.`
        : null,
      `Dominant imported sample ${dominantPeak.timestamp}.`,
      'Compliance status remains Not assessed until a user confirms criterion, unit, and context compatibility.',
    ]
      .filter(Boolean)
      .join(' '),
    4000,
  );
}

function buildOmnidotsDedupeSignature(
  datasetId: string,
  metricKey: string,
  dominantPeak: OmnidotsAxisPeakSummary,
) {
  return `[Omnidots dataset ${datasetId} | metric ${metricKey} | axis ${dominantPeak.axis} | observed ${dominantPeak.timestamp}]`;
}

function extractOmnidotsSignatures(note: string) {
  const matches = note.match(/\[Omnidots dataset [^\]]+\]/g);
  return matches ?? [];
}

function formatAxisSummary(
  axisLabel: string,
  value: number | null,
  timestamp: string | null,
  fdom: number | null,
) {
  if (value === null || !timestamp) {
    return null;
  }

  return `${axisLabel} ${formatMetricValue(value)} at ${timestamp}${fdom === null ? '' : ` (Fdom ${formatMetricValue(fdom)} Hz)`}`;
}

function defaultMetricLabel(metricKey: string) {
  switch (metricKey) {
    case 'vtop':
      return 'Peak particle velocity (Vtop)';
    case 'vdv':
      return 'Vibration dose value';
    case 'veff_max':
      return 'Maximum Veff';
    default:
      return metricKey;
  }
}

function formatMetricValue(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return null;
  }

  return value.toFixed(3).replace(/\.?0+$/, '');
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1).trimEnd()}…` : value;
}

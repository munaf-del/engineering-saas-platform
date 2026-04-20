import type {
  MultiPileGeoArrSettings,
  MultiPileGeoRedundancyLevel,
  MultiPileGeoTestType,
} from './types/multi-pile.js';

export const MULTI_PILE_GEO_ARR_ITEMS = [
  {
    category: 'SITE',
    weighting: 2,
    name: 'Geological complexity of site',
    d1: 'Horizontal strata, well-defined soil and rock characteristics',
    d3: 'Some variability over site, but without abrupt changes in stratigraphy',
    d5: 'Highly variable profile or presence of karstic features or steeply dipping rock levels or faults present on site, or combinations of these',
  },
  {
    category: 'SITE',
    weighting: 2,
    name: 'Extent of ground investigation',
    d1: 'Extensive drilling investigation covering whole site to an adequate depth',
    d3: 'Some boreholes extending at least 5 pile diameters below the base of the proposed pile foundation level',
    d5: 'Very limited investigation with few shallow boreholes',
  },
  {
    category: 'SITE',
    weighting: 2,
    name: 'Amount and quality of geotechnical data',
    d1: 'Detailed information on strength and compressibility of the main strata',
    d3: 'CPT probes over full depth of proposed piles or boreholes confirming rock as proposed founding level for piles',
    d5: 'Limited amount of simple in situ testing (e.g., SPT) or index tests only',
  },
  {
    category: 'DESIGN',
    weighting: 1,
    name: 'Experience with similar foundations in similar geological conditions',
    d1: 'Extensive',
    d3: 'Limited',
    d5: 'None',
  },
  {
    category: 'DESIGN',
    weighting: 2,
    name: 'Method of assessment of geotechnical parameters for design',
    d1: 'Based on appropriate laboratory or in situ tests or relevant existing pile load test data',
    d3: 'Based on site-specific correlations or on conventional laboratory or in situ testing',
    d5: 'Based on non-site-specific correlations with (for example) SPT data',
  },
  {
    category: 'DESIGN',
    weighting: 1,
    name: 'Design method adopted',
    d1: 'Well-established and soundly based method or methods',
    d3: 'Simplified methods with well-established basis',
    d5: 'Simple empirical methods or sophisticated methods that are not well established',
  },
  {
    category: 'DESIGN',
    weighting: 2,
    name: 'Method of utilizing results of in situ test data and installation data',
    d1: 'Design values based on minimum measured values on piles loaded to failure',
    d3: 'Design methods based on average values',
    d5: 'Design values based on maximum measured values on test piles loaded up only to working load, or indirect measurements used during installation, and not calibrated to static loading tests',
  },
  {
    category: 'INSTALLATION',
    weighting: 2,
    name: 'Level of construction control',
    d1: 'Detailed with professional geotechnical supervision, construction processes that are well established and relatively straightforward',
    d3: 'Limited degree of professional geotechnical involvement in supervision, conventional construction procedures',
    d5: 'Very limited or no involvement by designer, construction processes that are not well established or complex',
  },
  {
    category: 'INSTALLATION',
    weighting: 0.5,
    name: 'Level of performance monitoring of the supported structure during and after construction',
    d1: 'Detailed measurements of movements and pile loads',
    d3: 'Correlation of installed parameters with on-site static load tests carried out in accordance with this Standard',
    d5: 'No monitoring',
  },
] as const;

const DEFAULT_IRR = 3;

function asRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function clampNumber(value: unknown, fallback: number, min: number, max: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, numeric));
}

export function phiFromARR(arr: number) {
  const rows = [
    { max: 1.5, low: 0.67, high: 0.76 },
    { max: 2.0, low: 0.61, high: 0.7 },
    { max: 2.5, low: 0.56, high: 0.64 },
    { max: 3.0, low: 0.52, high: 0.6 },
    { max: 3.5, low: 0.48, high: 0.56 },
    { max: 4.0, low: 0.45, high: 0.52 },
    { max: 4.5, low: 0.42, high: 0.49 },
    { max: Number.POSITIVE_INFINITY, low: 0.4, high: 0.47 },
  ];

  for (const row of rows) {
    if (arr <= row.max) {
      return row;
    }
  }

  return rows[rows.length - 1] ?? { max: Number.POSITIVE_INFINITY, low: 0.4, high: 0.47 };
}

export function bandFromARR(arr: number) {
  const bands = [1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5];
  let lower = 0;
  for (const upper of bands) {
    if (arr <= upper) {
      return lower === 0 ? `<= ${upper}` : `> ${lower} to ${upper}`;
    }
    lower = upper;
  }
  return '> 4.5';
}

export function geoTestingBenefit(testType: MultiPileGeoTestType, testPilePercentage: number) {
  const p = clampNumber(testPilePercentage, 0, 0, 100);
  let phiTf: number | null = null;
  if (testType === 'STATIC') phiTf = 0.9;
  else if (testType === 'RAPID') phiTf = 0.75;
  else if (testType === 'DYN_PREF') phiTf = 0.8;
  else if (testType === 'DYN_OTHER') phiTf = 0.75;
  else if (testType === 'BIDIR') phiTf = 0.85;

  let k = 0;
  if (testType === 'STATIC' || testType === 'RAPID' || testType === 'BIDIR') {
    k = p > 0 ? (1.33 * p) / (p + 3.3) : 0;
  } else if (testType === 'DYN_PREF' || testType === 'DYN_OTHER') {
    k = p > 0 ? (1.13 * p) / (p + 3.3) : 0;
  }

  return {
    testType,
    testPilePercentage: p,
    phiTf,
    testBenefitK: Math.min(1, Math.max(0, k)),
  };
}

function phiWithTesting(phiGb: number, phiTf: number | null, k: number) {
  const phiTfEffective = phiTf == null ? phiGb : phiTf;
  const phi = phiGb + (phiTfEffective - phiGb) * k;
  return Math.max(phiGb, phi);
}

export function defaultMultiPileGeoArrSettings(): MultiPileGeoArrSettings {
  return normalizeMultiPileGeoArrSettings(undefined);
}

export function normalizeMultiPileGeoArrSettings(raw: unknown): MultiPileGeoArrSettings {
  const source = asRecord(raw);
  const irrSource = Array.isArray(source.irrValues) ? source.irrValues : [];
  const irrValues = MULTI_PILE_GEO_ARR_ITEMS.map((_item, index) =>
    clampNumber(irrSource[index], DEFAULT_IRR, 1, 5),
  );
  const testType =
    source.testType === 'STATIC' ||
    source.testType === 'RAPID' ||
    source.testType === 'DYN_PREF' ||
    source.testType === 'DYN_OTHER' ||
    source.testType === 'BIDIR'
      ? source.testType
      : 'NONE';
  const weightTotal = MULTI_PILE_GEO_ARR_ITEMS.reduce((sum, item) => sum + item.weighting, 0);
  const weightedScore = MULTI_PILE_GEO_ARR_ITEMS.reduce(
    (sum, item, index) => sum + item.weighting * (irrValues[index] ?? DEFAULT_IRR),
    0,
  );
  const arrValue = weightTotal > 0 ? weightedScore / weightTotal : 0;
  const arrBand = bandFromARR(arrValue);
  const phiGb = phiFromARR(arrValue);
  const testing = geoTestingBenefit(testType, clampNumber(source.testPilePercentage, 0, 0, 100));
  const phiGLow = phiWithTesting(phiGb.low, testing.phiTf, testing.testBenefitK);
  const phiGHigh = phiWithTesting(phiGb.high, testing.phiTf, testing.testBenefitK);

  return {
    irrValues,
    testType,
    testPilePercentage: testing.testPilePercentage,
    weightTotal: Number(weightTotal.toFixed(3)),
    weightedScore: Number(weightedScore.toFixed(3)),
    arrValue: Number(arrValue.toFixed(3)),
    arrBand,
    phiTf: testing.phiTf == null ? null : Number(testing.phiTf.toFixed(3)),
    testBenefitK: Number(testing.testBenefitK.toFixed(3)),
    phiGbLow: Number(phiGb.low.toFixed(3)),
    phiGbHigh: Number(phiGb.high.toFixed(3)),
    phiGLow: Number(phiGLow.toFixed(3)),
    phiGHigh: Number(phiGHigh.toFixed(3)),
  };
}

function legacyTestType(
  value: unknown,
  fallback: MultiPileGeoTestType = 'NONE',
): MultiPileGeoTestType {
  return value === 'STATIC' ||
    value === 'RAPID' ||
    value === 'DYN_PREF' ||
    value === 'DYN_OTHER' ||
    value === 'BIDIR'
    ? value
    : fallback;
}

export function extractMultiPileGeoArrSettingsFromLegacyState(
  raw: unknown,
): MultiPileGeoArrSettings | null {
  const source = asRecord(raw);
  const explicit = asRecord(source.geoArrSettings);
  if (Object.keys(explicit).length > 0) {
    if (
      Array.isArray(explicit.irrValues) ||
      'testType' in explicit ||
      'testPilePercentage' in explicit
    ) {
      return normalizeMultiPileGeoArrSettings(explicit);
    }

    const defaults = defaultMultiPileGeoArrSettings();
    return {
      ...defaults,
      testType: legacyTestType(explicit.testType, defaults.testType),
      testPilePercentage: clampNumber(
        explicit.testPilePercentage,
        defaults.testPilePercentage,
        0,
        100,
      ),
      weightTotal: clampNumber(
        explicit.weightTotal,
        defaults.weightTotal,
        0,
        Number.POSITIVE_INFINITY,
      ),
      weightedScore: clampNumber(
        explicit.weightedScore,
        defaults.weightedScore,
        0,
        Number.POSITIVE_INFINITY,
      ),
      arrValue: clampNumber(explicit.arrValue, defaults.arrValue, 0, Number.POSITIVE_INFINITY),
      arrBand: typeof explicit.arrBand === 'string' ? explicit.arrBand : defaults.arrBand,
      phiTf:
        explicit.phiTf == null ? null : clampNumber(explicit.phiTf, 0, 0, Number.POSITIVE_INFINITY),
      testBenefitK: clampNumber(explicit.testBenefitK, defaults.testBenefitK, 0, 1),
      phiGbLow: clampNumber(explicit.phiGbLow, defaults.phiGbLow, 0, Number.POSITIVE_INFINITY),
      phiGbHigh: clampNumber(explicit.phiGbHigh, defaults.phiGbHigh, 0, Number.POSITIVE_INFINITY),
      phiGLow: clampNumber(explicit.phiGLow, defaults.phiGLow, 0, Number.POSITIVE_INFINITY),
      phiGHigh: clampNumber(explicit.phiGHigh, defaults.phiGHigh, 0, Number.POSITIVE_INFINITY),
    };
  }

  const legacyTest = asRecord(source.test);
  const legacyHasComputedValues =
    source.ARR !== undefined ||
    source.band !== undefined ||
    source.phiGbLow !== undefined ||
    source.phiGbHigh !== undefined ||
    source.phiGLow !== undefined ||
    source.phiGHigh !== undefined ||
    source.arrVal !== undefined ||
    source.arrBand !== undefined ||
    source.phiLow !== undefined ||
    source.phiHigh !== undefined ||
    Object.keys(legacyTest).length > 0;

  if (!legacyHasComputedValues) {
    return null;
  }

  const defaults = defaultMultiPileGeoArrSettings();
  return {
    ...defaults,
    testType: legacyTestType(legacyTest.type, defaults.testType),
    testPilePercentage: clampNumber(legacyTest.p, defaults.testPilePercentage, 0, 100),
    weightTotal: clampNumber(source.arrWtot, defaults.weightTotal, 0, Number.POSITIVE_INFINITY),
    weightedScore: clampNumber(
      source.arrScore,
      defaults.weightedScore,
      0,
      Number.POSITIVE_INFINITY,
    ),
    arrValue: clampNumber(
      source.ARR ?? source.arrVal,
      defaults.arrValue,
      0,
      Number.POSITIVE_INFINITY,
    ),
    arrBand:
      typeof (source.band ?? source.arrBand) === 'string'
        ? String(source.band ?? source.arrBand)
        : defaults.arrBand,
    phiTf:
      legacyTest.phi_tf == null
        ? null
        : clampNumber(legacyTest.phi_tf, 0, 0, Number.POSITIVE_INFINITY),
    testBenefitK: clampNumber(legacyTest.K, defaults.testBenefitK, 0, 1),
    phiGbLow: clampNumber(source.phiGbLow, defaults.phiGbLow, 0, Number.POSITIVE_INFINITY),
    phiGbHigh: clampNumber(source.phiGbHigh, defaults.phiGbHigh, 0, Number.POSITIVE_INFINITY),
    phiGLow: clampNumber(
      source.phiGLow ?? source.phiLow,
      defaults.phiGLow,
      0,
      Number.POSITIVE_INFINITY,
    ),
    phiGHigh: clampNumber(
      source.phiGHigh ?? source.phiHigh,
      defaults.phiGHigh,
      0,
      Number.POSITIVE_INFINITY,
    ),
  };
}

export function adoptedPhiForRedundancy(
  settings: Pick<MultiPileGeoArrSettings, 'phiGLow' | 'phiGHigh' | 'phiGbLow' | 'phiGbHigh'>,
  redundancy: MultiPileGeoRedundancyLevel,
) {
  if (redundancy === 'HIGH') {
    return settings.phiGHigh ?? settings.phiGbHigh;
  }
  return settings.phiGLow ?? settings.phiGbLow;
}

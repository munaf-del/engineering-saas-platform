import { describe, expect, it } from 'vitest';
import { resolveMultiPileStructProjectAssignmentIds } from './multi-pile-structural-resolution.js';

function projectSpecificsWithConcreteRows(rows: Array<Record<string, unknown>>) {
  return {
    structuralDefaults: {
      concreteClasses: rows,
      reinforcementGrades: [],
      tendonGrades: [],
      coverDurabilityClasses: [],
    },
  };
}

function projectSpecificsWithCoverRows(rows: Array<Record<string, unknown>>) {
  return {
    structuralDefaults: {
      concreteClasses: [],
      reinforcementGrades: [],
      tendonGrades: [],
      coverDurabilityClasses: rows,
    },
  };
}

describe('multi-pile structural concrete resolution', () => {
  it('preserves an explicitly selected concrete row id when multiple rows share the same preset', () => {
    const projectSpecifics = projectSpecificsWithConcreteRows([
      {
        id: 'conc_32',
        standardProfileId: 'conc_32',
        displayName: '32 MPa Concrete',
        fc_MPa: 32,
        Ec_MPa: 30100,
      },
      {
        id: 'conc_32_duplicate',
        standardProfileId: 'conc_32',
        displayName: '32 MPa Concrete (duplicate)',
        overrideStandardValues: true,
        fc_MPa: 32,
        Ec_MPa: 30100,
      },
    ]);

    const assignments = resolveMultiPileStructProjectAssignmentIds(
      {
        concreteClassId: 'conc_32',
        fc: 32,
        Ec: 30100,
      },
      projectSpecifics,
    );

    expect(assignments.concreteClassId).toBe('conc_32');
  });
});

describe('multi-pile structural cover resolution', () => {
  it('hydrates a cover row from a legacy profile hint when the real project row exists', () => {
    const projectSpecifics = projectSpecificsWithCoverRows([
      {
        id: 'cover_1',
        displayName: 'B2 / 50 year',
        sourceStandard: 'AS 3600',
        designLifeYears: 50,
        exposureClass: 'B2',
        minConcreteStrengthPrecast_MPa: '40',
        minConcreteStrengthCastInPlace_MPa: '40',
        nominalCover_mm: 65,
        crackWidthLimit_mm: 0.3,
      },
    ]);

    const assignments = resolveMultiPileStructProjectAssignmentIds(
      {
        profileId: '1',
        cover: 75,
      },
      projectSpecifics,
    );

    expect(assignments.coverDurabilityClassId).toBe('cover_1');
  });

  it('hydrates a custom project-owned cover row from durability fields even when type cover is higher', () => {
    const projectSpecifics = projectSpecificsWithCoverRows([
      {
        id: 'cover_b2_50y',
        displayName: 'B2 / 50 year',
        sourceStandard: 'AS 3600',
        designLifeYears: 50,
        exposureClass: 'B2',
        minConcreteStrengthPrecast_MPa: '40',
        minConcreteStrengthCastInPlace_MPa: '40',
        nominalCover_mm: 65,
        crackWidthLimit_mm: 0.3,
      },
      {
        id: 'cover_c1_50y',
        displayName: 'C1 / 50 year',
        sourceStandard: 'AS 3600',
        designLifeYears: 50,
        exposureClass: 'C1',
        minConcreteStrengthPrecast_MPa: '40',
        minConcreteStrengthCastInPlace_MPa: '40',
        nominalCover_mm: 65,
        crackWidthLimit_mm: 0.3,
      },
    ]);

    const assignments = resolveMultiPileStructProjectAssignmentIds(
      {
        cover: 75,
        designLifeYears: 50,
        exposureClass: 'B2',
        minConcreteStrengthPrecast_MPa: '40',
        minConcreteStrengthCastInPlace_MPa: '40',
        crackWidthLimit_mm: 0.3,
      },
      projectSpecifics,
    );

    expect(assignments.coverDurabilityClassId).toBe('cover_b2_50y');
  });

  it('keeps the cover unresolved when no deterministic real match exists', () => {
    const projectSpecifics = projectSpecificsWithCoverRows([
      {
        id: 'cover_1',
        displayName: 'B2 / 50 year',
        sourceStandard: 'AS 3600',
        designLifeYears: 50,
        exposureClass: 'B2',
        minConcreteStrengthPrecast_MPa: '40',
        minConcreteStrengthCastInPlace_MPa: '40',
        nominalCover_mm: 65,
        crackWidthLimit_mm: 0.3,
      },
    ]);

    const assignments = resolveMultiPileStructProjectAssignmentIds(
      {
        cover: 75,
      },
      projectSpecifics,
    );

    expect(assignments.coverDurabilityClassId).toBe('');
  });

  it('preserves an explicitly selected cover row id when multiple rows share the same preset', () => {
    const projectSpecifics = projectSpecificsWithCoverRows([
      {
        id: 'cover_mild_100y',
        displayName: 'Mild 100y',
        sourceStandard: 'AS 2159:2009',
        designLifeYears: 100,
        exposureClass: 'Mild',
        minConcreteStrengthPrecast_MPa: '50',
        minConcreteStrengthCastInPlace_MPa: '32',
        minCoverPrecast_mm: 30,
        minCoverCastInPlace_mm: 75,
        nominalCover_mm: 75,
        crackWidthLimit_mm: 0.3,
      },
      {
        id: 'cover_mild_100y_duplicate',
        displayName: 'Mild 100y duplicate',
        sourceStandard: 'AS 2159:2009',
        designLifeYears: 100,
        exposureClass: 'Mild',
        minConcreteStrengthPrecast_MPa: '50',
        minConcreteStrengthCastInPlace_MPa: '32',
        minCoverPrecast_mm: 30,
        minCoverCastInPlace_mm: 75,
        nominalCover_mm: 75,
        crackWidthLimit_mm: 0.3,
      },
    ]);

    const assignments = resolveMultiPileStructProjectAssignmentIds(
      {
        coverDurabilityClassId: 'cover_mild_100y',
        cover: 75,
      },
      projectSpecifics,
    );

    expect(assignments.coverDurabilityClassId).toBe('cover_mild_100y');
  });
});

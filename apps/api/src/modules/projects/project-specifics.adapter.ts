import {
  defaultMultiPileGeoArrSettings,
  extractMultiPileGeoArrSettingsFromLegacyState,
  MultiPileProjectConcreteClass,
  MultiPileProjectArrAssessment,
  MultiPileProjectCoverDurabilityClass,
  MultiPileProjectGeotechnicalBasis,
  MultiPileProjectGeotechnicalLibrary,
  MultiPileProjectGeotechnicalMaterial,
  MultiPileProjectIdentity,
  MultiPileProjectMapSource,
  MultiPileProjectGeoTemplateState,
  MultiPileProjectGeoUpliftMode,
  MultiPileProjectReference,
  MultiPileProjectReferenceDocumentType,
  MultiPileProjectReportMetadata,
  MultiPileProjectSpecifics,
  MultiPileProjectStatus,
  MultiPileProjectStructuralDefaults,
  MultiPileProjectReinforcementGrade,
  MultiPileProjectTendonGrade,
  normalizeMultiPileGeoArrSettings,
  projectConcretePresetById,
  projectTendonPresetById,
  normalizeProjectConcreteClass as normalizeSharedProjectConcreteClass,
  normalizeProjectCoverClass as normalizeSharedProjectCoverClass,
  normalizeProjectReinforcementGrade as normalizeSharedProjectReinforcementGrade,
  normalizeProjectTendonGrade as normalizeSharedProjectTendonGrade,
} from '@eng/shared';

const DEFAULT_PROJECT_IDENTITY: MultiPileProjectIdentity = {
  projectNumber: '',
  projectName: '',
  client: '',
  status: 'In Progress',
  address: '',
  latitude: '',
  longitude: '',
  mapAddress: '',
  notes: '',
  archived: false,
  projectLogo: '',
  mapSource: 'auto',
};

const DEFAULT_REPORT_METADATA: MultiPileProjectReportMetadata = {
  reportTitle: 'Project Design Justification',
  reportRevision: '',
  issueDate: '',
  preparedBy: '',
  checkedBy: '',
  purpose: '',
};

const DEFAULT_GEOTECHNICAL_LIBRARY: MultiPileProjectGeotechnicalLibrary = {
  activeReferenceId: '',
  templateState: 'empty',
  materials: [],
};

const DEFAULT_GEOTECHNICAL_BASIS: MultiPileProjectGeotechnicalBasis = {
  groundwaterDesignNotes: '',
  cfaUpliftMode: 'manual-entry',
  cfaUpliftFactor: 0.7,
  defaultSocketAssumptions: '',
  foundingNotes: '',
  commentary: '',
  arrAssessment: defaultMultiPileGeoArrSettings(),
};

type ProjectSpecificsFallback = {
  projectName: string;
  projectNumber?: string;
};

export function getProjectSpecificsFromProjectMetadata(
  metadata: unknown,
  fallback: ProjectSpecificsFallback,
): MultiPileProjectSpecifics | null {
  const record = objectValue(metadata);
  if (!record.projectSpecifics) {
    return null;
  }
  return normalizeProjectSpecifics(record.projectSpecifics, fallback);
}

export function getProjectSpecificsFromLegacyPileGroups(
  pileGroups: Array<{ metadata: unknown }>,
  fallback: ProjectSpecificsFallback,
): MultiPileProjectSpecifics | null {
  for (const pileGroup of pileGroups) {
    const metadata = objectValue(pileGroup.metadata);
    const multiPile = objectValue(metadata.multiPile);
    if (multiPile.projectSpecifics) {
      return normalizeProjectSpecifics(multiPile.projectSpecifics, fallback);
    }
    const legacyReferences = legacyProjectReferencesValue(multiPile.projectReferences);
    const legacyStructuralDefaults = legacyProjectStructuralDefaultsValue(multiPile);
    if (legacyReferences.length > 0 || legacyStructuralDefaults) {
      return normalizeProjectSpecifics(
        {
          ...(legacyReferences.length > 0 ? { references: legacyReferences } : {}),
          ...(legacyStructuralDefaults ? { structuralDefaults: legacyStructuralDefaults } : {}),
        },
        fallback,
      );
    }
  }
  return null;
}

export function getProjectGeotechnicalMaterialsFromLegacyPileGroups(
  pileGroups: Array<{ metadata: unknown }>,
  fallback: ProjectSpecificsFallback,
): MultiPileProjectGeotechnicalLibrary | null {
  for (const pileGroup of pileGroups) {
    const metadata = objectValue(pileGroup.metadata);
    const multiPile = objectValue(metadata.multiPile);
    if (!multiPile.projectSpecifics) {
      continue;
    }

    const projectSpecifics = normalizeProjectSpecifics(multiPile.projectSpecifics, fallback);
    if (hasProjectGeotechnicalMaterials(projectSpecifics.geotechnicalMaterials)) {
      return projectSpecifics.geotechnicalMaterials;
    }
  }

  return null;
}

export function getProjectGeotechnicalBasisFromLegacyPileGroups(
  pileGroups: Array<{ metadata: unknown }>,
  fallback: ProjectSpecificsFallback,
): MultiPileProjectGeotechnicalBasis | null {
  for (const pileGroup of pileGroups) {
    const metadata = objectValue(pileGroup.metadata);
    const multiPile = objectValue(metadata.multiPile);
    if (!multiPile.projectSpecifics) {
      continue;
    }

    const projectSpecifics = normalizeProjectSpecifics(multiPile.projectSpecifics, fallback);
    if (hasProjectGeotechnicalBasisFields(projectSpecifics.geotechnicalBasis)) {
      return projectSpecifics.geotechnicalBasis;
    }
  }

  return null;
}

export function getProjectArrAssessmentFromLegacyPileGroups(
  pileGroups: Array<{ metadata: unknown }>,
  fallback: ProjectSpecificsFallback,
): MultiPileProjectArrAssessment | null {
  for (const pileGroup of pileGroups) {
    const metadata = objectValue(pileGroup.metadata);
    const multiPile = objectValue(metadata.multiPile);

    if (multiPile.projectSpecifics) {
      const projectSpecifics = normalizeProjectSpecifics(multiPile.projectSpecifics, fallback);
      if (hasProjectArrAssessment(projectSpecifics.geotechnicalBasis.arrAssessment)) {
        return projectSpecifics.geotechnicalBasis.arrAssessment;
      }
    }

    const legacyArrAssessment = extractMultiPileGeoArrSettingsFromLegacyState(multiPile);
    if (legacyArrAssessment) {
      return legacyArrAssessment;
    }
  }

  return null;
}

export function getProjectStructuralDefaultsFromLegacyPileGroups(
  pileGroups: Array<{ metadata: unknown }>,
  fallback: ProjectSpecificsFallback,
): MultiPileProjectStructuralDefaults | null {
  for (const pileGroup of pileGroups) {
    const metadata = objectValue(pileGroup.metadata);
    const multiPile = objectValue(metadata.multiPile);

    if (multiPile.projectSpecifics) {
      const projectSpecifics = normalizeProjectSpecifics(multiPile.projectSpecifics, fallback);
      if (hasProjectStructuralDefaults(projectSpecifics.structuralDefaults)) {
        return projectSpecifics.structuralDefaults;
      }
    }

    const legacyStructuralDefaults = legacyProjectStructuralDefaultsValue(multiPile);
    if (legacyStructuralDefaults) {
      return normalizeProjectStructuralDefaults(legacyStructuralDefaults);
    }
  }

  return null;
}

export function getHydratedProjectMetadata(
  metadata: unknown,
  pileGroups: Array<{ metadata: unknown }>,
  fallback: ProjectSpecificsFallback,
): Record<string, unknown> {
  const base = objectValue(metadata);
  const projectSpecificsFromProjectMetadata = getProjectSpecificsFromProjectMetadata(
    base,
    fallback,
  );
  const legacyProjectSpecifics = getProjectSpecificsFromLegacyPileGroups(pileGroups, fallback);
  const legacyStructuralDefaults = getProjectStructuralDefaultsFromLegacyPileGroups(
    pileGroups,
    fallback,
  );
  const legacyGeotechnicalMaterials = getProjectGeotechnicalMaterialsFromLegacyPileGroups(
    pileGroups,
    fallback,
  );
  const legacyGeotechnicalBasis = getProjectGeotechnicalBasisFromLegacyPileGroups(
    pileGroups,
    fallback,
  );
  const legacyArrAssessment = getProjectArrAssessmentFromLegacyPileGroups(pileGroups, fallback);
  const projectSpecifics = mergeProjectSpecificsWithLegacyFallbacks(
    projectSpecificsFromProjectMetadata ??
      legacyProjectSpecifics ??
      normalizeProjectSpecifics(undefined, fallback),
    legacyProjectSpecifics,
    legacyStructuralDefaults,
    legacyGeotechnicalMaterials,
    legacyGeotechnicalBasis,
    legacyArrAssessment,
  );

  return {
    ...base,
    projectSpecifics,
  };
}

export function mergeProjectMetadataWithSpecifics(
  metadata: unknown,
  rawProjectSpecifics: unknown,
  fallback: ProjectSpecificsFallback,
): Record<string, unknown> {
  const base = objectValue(metadata);
  return {
    ...base,
    projectSpecifics: normalizeProjectSpecifics(rawProjectSpecifics, fallback),
  };
}

export function stripLegacyProjectSpecificsFromPileGroupMetadata(
  metadata: unknown,
): Record<string, unknown> {
  const base = objectValue(metadata);
  const multiPile = objectValue(base.multiPile);
  if (!('projectSpecifics' in multiPile)) {
    return base;
  }

  const { projectSpecifics: _removed, ...remainingMultiPile } = multiPile;
  return {
    ...base,
    multiPile: remainingMultiPile,
  };
}

export function normalizeProjectSpecifics(
  raw: unknown,
  fallback: ProjectSpecificsFallback,
): MultiPileProjectSpecifics {
  const record = objectValue(raw);
  const identity = normalizeProjectIdentity(record.identity, fallback);
  const reportMeta = normalizeProjectReportMeta(record.reportMeta);
  const references = normalizeProjectReferences(record.references);
  const structuralDefaults = normalizeProjectStructuralDefaults(record.structuralDefaults);
  const geotechnicalMaterials = normalizeProjectGeotechnical(
    record.geotechnicalMaterials ?? record.geotechnical,
    references,
  );
  const geotechnicalBasis = normalizeProjectGeotechnicalBasis(record.geotechnicalBasis);

  return {
    identity,
    reportMeta,
    references,
    structuralDefaults,
    geotechnicalMaterials,
    geotechnicalBasis,
  };
}

function mergeProjectSpecificsWithLegacyFallbacks(
  projectSpecifics: MultiPileProjectSpecifics,
  legacyProjectSpecifics: MultiPileProjectSpecifics | null,
  legacyStructuralDefaults: MultiPileProjectStructuralDefaults | null,
  legacyGeotechnicalMaterials: MultiPileProjectGeotechnicalLibrary | null,
  legacyGeotechnicalBasis: MultiPileProjectGeotechnicalBasis | null,
  legacyArrAssessment: MultiPileProjectArrAssessment | null,
): MultiPileProjectSpecifics {
  const references =
    projectSpecifics.references.length > 0
      ? projectSpecifics.references
      : (legacyProjectSpecifics?.references ?? projectSpecifics.references);
  const structuralDefaults = mergeProjectStructuralDefaultsWithLegacy(
    projectSpecifics.structuralDefaults,
    legacyStructuralDefaults ?? legacyProjectSpecifics?.structuralDefaults ?? null,
  );
  const geotechnicalMaterials = mergeProjectGeotechnicalMaterialsWithLegacy(
    projectSpecifics.geotechnicalMaterials,
    legacyGeotechnicalMaterials ?? legacyProjectSpecifics?.geotechnicalMaterials ?? null,
    references,
  );
  const geotechnicalBasis = mergeProjectGeotechnicalBasisWithLegacy(
    projectSpecifics.geotechnicalBasis,
    legacyGeotechnicalBasis ?? legacyProjectSpecifics?.geotechnicalBasis ?? null,
    legacyArrAssessment ?? legacyProjectSpecifics?.geotechnicalBasis.arrAssessment ?? null,
  );
  const referencesChanged = references !== projectSpecifics.references;
  const structuralDefaultsChanged = structuralDefaults !== projectSpecifics.structuralDefaults;
  const geotechnicalMaterialsChanged =
    geotechnicalMaterials !== projectSpecifics.geotechnicalMaterials;
  const geotechnicalBasisChanged = geotechnicalBasis !== projectSpecifics.geotechnicalBasis;

  if (
    !referencesChanged &&
    !structuralDefaultsChanged &&
    !geotechnicalMaterialsChanged &&
    !geotechnicalBasisChanged
  ) {
    return projectSpecifics;
  }
  return {
    ...projectSpecifics,
    references,
    structuralDefaults,
    geotechnicalMaterials,
    geotechnicalBasis,
  };
}

function mergeProjectStructuralDefaultsWithLegacy(
  structuralDefaults: MultiPileProjectStructuralDefaults,
  legacyStructuralDefaults: MultiPileProjectStructuralDefaults | null,
): MultiPileProjectStructuralDefaults {
  if (!legacyStructuralDefaults) {
    return structuralDefaults;
  }

  const concreteClasses =
    structuralDefaults.concreteClasses.length > 0
      ? structuralDefaults.concreteClasses
      : legacyStructuralDefaults.concreteClasses;
  const reinforcementGrades =
    structuralDefaults.reinforcementGrades.length > 0
      ? structuralDefaults.reinforcementGrades
      : legacyStructuralDefaults.reinforcementGrades;
  const tendonGrades =
    structuralDefaults.tendonGrades.length > 0
      ? structuralDefaults.tendonGrades
      : legacyStructuralDefaults.tendonGrades;
  const coverDurabilityClasses =
    structuralDefaults.coverDurabilityClasses.length > 0
      ? structuralDefaults.coverDurabilityClasses
      : legacyStructuralDefaults.coverDurabilityClasses;

  if (
    concreteClasses === structuralDefaults.concreteClasses &&
    reinforcementGrades === structuralDefaults.reinforcementGrades &&
    tendonGrades === structuralDefaults.tendonGrades &&
    coverDurabilityClasses === structuralDefaults.coverDurabilityClasses
  ) {
    return structuralDefaults;
  }

  return {
    concreteClasses,
    reinforcementGrades,
    tendonGrades,
    coverDurabilityClasses,
  };
}

function mergeProjectGeotechnicalMaterialsWithLegacy(
  geotechnicalMaterials: MultiPileProjectGeotechnicalLibrary,
  legacyGeotechnicalMaterials: MultiPileProjectGeotechnicalLibrary | null,
  references: MultiPileProjectReference[],
): MultiPileProjectGeotechnicalLibrary {
  if (!legacyGeotechnicalMaterials) {
    return geotechnicalMaterials;
  }

  const activeReferenceId =
    geotechnicalMaterials.activeReferenceId || legacyGeotechnicalMaterials.activeReferenceId;
  const materials = hasProjectGeotechnicalMaterials(geotechnicalMaterials)
    ? geotechnicalMaterials.materials
    : legacyGeotechnicalMaterials.materials;
  const templateState = hasProjectGeotechnicalMaterials(geotechnicalMaterials)
    ? geotechnicalMaterials.templateState
    : legacyGeotechnicalMaterials.templateState;

  if (
    activeReferenceId === geotechnicalMaterials.activeReferenceId &&
    materials === geotechnicalMaterials.materials &&
    templateState === geotechnicalMaterials.templateState
  ) {
    return geotechnicalMaterials;
  }

  return normalizeProjectGeotechnical(
    {
      ...geotechnicalMaterials,
      activeReferenceId,
      templateState,
      materials,
    },
    references,
  );
}

function mergeProjectGeotechnicalBasisWithLegacy(
  geotechnicalBasis: MultiPileProjectGeotechnicalBasis,
  legacyGeotechnicalBasis: MultiPileProjectGeotechnicalBasis | null,
  legacyArrAssessment: MultiPileProjectArrAssessment | null,
): MultiPileProjectGeotechnicalBasis {
  const base =
    !legacyGeotechnicalBasis || hasProjectGeotechnicalBasisFields(geotechnicalBasis)
      ? geotechnicalBasis
      : normalizeProjectGeotechnicalBasis(legacyGeotechnicalBasis);
  const arrAssessment = hasProjectArrAssessment(base.arrAssessment)
    ? base.arrAssessment
    : normalizeMultiPileGeoArrSettings(
        legacyArrAssessment ?? legacyGeotechnicalBasis?.arrAssessment ?? base.arrAssessment,
      );

  if (arrAssessment === base.arrAssessment) {
    return base;
  }

  return {
    ...base,
    arrAssessment,
  };
}

function hasProjectStructuralDefaults(
  structuralDefaults: MultiPileProjectStructuralDefaults,
): boolean {
  return (
    structuralDefaults.concreteClasses.length > 0 ||
    structuralDefaults.reinforcementGrades.length > 0 ||
    structuralDefaults.tendonGrades.length > 0 ||
    structuralDefaults.coverDurabilityClasses.length > 0
  );
}

function hasProjectGeotechnicalMaterials(
  geotechnicalMaterials: MultiPileProjectGeotechnicalLibrary,
): boolean {
  return geotechnicalMaterials.materials.length > 0;
}

function hasProjectGeotechnicalBasisFields(
  geotechnicalBasis: MultiPileProjectGeotechnicalBasis,
): boolean {
  return (
    geotechnicalBasis.groundwaterDesignNotes.length > 0 ||
    geotechnicalBasis.cfaUpliftMode !== DEFAULT_GEOTECHNICAL_BASIS.cfaUpliftMode ||
    Math.abs(geotechnicalBasis.cfaUpliftFactor - DEFAULT_GEOTECHNICAL_BASIS.cfaUpliftFactor) >
      1e-9 ||
    geotechnicalBasis.defaultSocketAssumptions.length > 0 ||
    geotechnicalBasis.foundingNotes.length > 0 ||
    geotechnicalBasis.commentary.length > 0
  );
}

function hasProjectArrAssessment(arrAssessment: MultiPileProjectArrAssessment): boolean {
  const defaults = DEFAULT_GEOTECHNICAL_BASIS.arrAssessment;
  return (
    arrAssessment.irrValues.some((value, index) => value !== defaults.irrValues[index]) ||
    arrAssessment.testType !== defaults.testType ||
    Math.abs(arrAssessment.testPilePercentage - defaults.testPilePercentage) > 1e-9
  );
}

function normalizeProjectIdentity(
  raw: unknown,
  fallback: ProjectSpecificsFallback,
): MultiPileProjectIdentity {
  const record = objectValue(raw);
  return {
    projectNumber: stringValue(
      record.projectNumber,
      fallback.projectNumber ?? DEFAULT_PROJECT_IDENTITY.projectNumber,
    ),
    projectName: stringValue(
      record.projectName,
      fallback.projectName || DEFAULT_PROJECT_IDENTITY.projectName,
    ),
    client: stringValue(record.client, DEFAULT_PROJECT_IDENTITY.client),
    status: projectStatusValue(record.status, DEFAULT_PROJECT_IDENTITY.status),
    address: stringValue(record.address, DEFAULT_PROJECT_IDENTITY.address),
    latitude: stringValue(record.latitude, DEFAULT_PROJECT_IDENTITY.latitude),
    longitude: stringValue(record.longitude, DEFAULT_PROJECT_IDENTITY.longitude),
    mapAddress: stringValue(record.mapAddress, DEFAULT_PROJECT_IDENTITY.mapAddress),
    notes: stringValue(record.notes, DEFAULT_PROJECT_IDENTITY.notes),
    archived:
      record.archived === undefined ? DEFAULT_PROJECT_IDENTITY.archived : Boolean(record.archived),
    projectLogo: stringValue(record.projectLogo, DEFAULT_PROJECT_IDENTITY.projectLogo),
    mapSource: projectMapSourceValue(record.mapSource, DEFAULT_PROJECT_IDENTITY.mapSource),
  };
}

function normalizeProjectReportMeta(raw: unknown): MultiPileProjectReportMetadata {
  const record = objectValue(raw);
  return {
    reportTitle: stringValue(record.reportTitle, DEFAULT_REPORT_METADATA.reportTitle),
    reportRevision: stringValue(record.reportRevision, DEFAULT_REPORT_METADATA.reportRevision),
    issueDate: stringValue(record.issueDate, DEFAULT_REPORT_METADATA.issueDate),
    preparedBy: stringValue(record.preparedBy, DEFAULT_REPORT_METADATA.preparedBy),
    checkedBy: stringValue(record.checkedBy, DEFAULT_REPORT_METADATA.checkedBy),
    purpose: stringValue(record.purpose, DEFAULT_REPORT_METADATA.purpose),
  };
}

function normalizeProjectReferences(raw: unknown): MultiPileProjectReference[] {
  const rows = Array.isArray(raw) ? raw : [];
  const seen = new Set<string>();
  let primaryGeotechnicalSet = false;
  let primaryStructuralSet = false;

  return rows.map((value, index) => {
    const row = objectValue(value);
    const id = uniqueId(seen, stringValue(row.id, `ref_${index + 1}`));
    const documentType = referenceDocumentTypeValue(row.documentType, 'Other');
    const active = row.active === undefined ? !Boolean(row.deleted) : Boolean(row.active);
    const reference: MultiPileProjectReference = {
      id,
      referenceId: stringValue(row.referenceId, ''),
      documentType,
      title: stringValue(row.title, ''),
      documentNumber: stringValue(row.documentNumber, stringValue(row.referenceNo, '')),
      revision: stringValue(row.revision, ''),
      issueDate: stringValue(row.issueDate, stringValue(row.date, '')),
      authorOrganisation: stringValue(
        row.authorOrganisation,
        stringValue(row.issuer, stringValue(row.author, '')),
      ),
      notes: stringValue(row.notes, ''),
      includeInReport: row.includeInReport === undefined ? true : Boolean(row.includeInReport),
      active,
      primaryGeotechnical:
        active &&
        documentType === 'Geotechnical Report' &&
        !primaryGeotechnicalSet &&
        Boolean(row.primaryGeotechnical),
      primaryStructuralReference:
        active &&
        documentType === 'Structural Drawing' &&
        !primaryStructuralSet &&
        Boolean(row.primaryStructuralReference ?? row.primaryStructuralDrawingSet),
    };

    if (reference.primaryGeotechnical) {
      primaryGeotechnicalSet = true;
    }
    if (reference.primaryStructuralReference) {
      primaryStructuralSet = true;
    }

    return reference;
  });
}

function normalizeProjectStructuralDefaults(raw: unknown): MultiPileProjectStructuralDefaults {
  const record = objectValue(raw);
  return {
    concreteClasses: normalizeProjectConcreteClasses(record.concreteClasses),
    reinforcementGrades: normalizeProjectReinforcementGrades(record.reinforcementGrades),
    tendonGrades: normalizeProjectTendonGrades(record.tendonGrades),
    coverDurabilityClasses: normalizeProjectCoverDurabilityClasses(record.coverDurabilityClasses),
  };
}

function normalizeProjectConcreteClasses(raw: unknown): MultiPileProjectConcreteClass[] {
  const rows = Array.isArray(raw) ? raw : [];
  const seen = new Set<string>();
  return rows.map((value, index) => {
    const source = objectValue(value);
    const presetHint = stringValue(source.standardProfileId ?? source.id, '');
    const normalized = normalizeSharedProjectConcreteClass(
      !source.standardProfileId && presetHint && projectConcretePresetById(presetHint)
        ? { ...source, standardProfileId: presetHint }
        : value,
      index,
    );
    return {
      ...normalized,
      id: uniqueId(seen, stringValue(normalized.id, `conc_${index + 1}`)),
    };
  });
}

function normalizeProjectReinforcementGrades(raw: unknown): MultiPileProjectReinforcementGrade[] {
  const rows = Array.isArray(raw) ? raw : [];
  const seen = new Set<string>();
  return rows.map((value, index) => {
    const normalized = normalizeSharedProjectReinforcementGrade(value, index);
    return {
      ...normalized,
      id: uniqueId(seen, stringValue(normalized.id, `reo_${index + 1}`)),
    };
  });
}

function normalizeProjectTendonGrades(raw: unknown): MultiPileProjectTendonGrade[] {
  const rows = Array.isArray(raw) ? raw : [];
  const seen = new Set<string>();
  return rows.map((value, index) => {
    const source = objectValue(value);
    const presetHint = stringValue(source.standardProfileId ?? source.id, '');
    const normalized = normalizeSharedProjectTendonGrade(
      !source.standardProfileId && presetHint && projectTendonPresetById(presetHint)
        ? { ...source, standardProfileId: presetHint }
        : value,
      index,
    );
    return {
      ...normalized,
      id: uniqueId(seen, stringValue(normalized.id, `tendon_${index + 1}`)),
    };
  });
}

function normalizeProjectCoverDurabilityClasses(
  raw: unknown,
): MultiPileProjectCoverDurabilityClass[] {
  const rows = Array.isArray(raw) ? raw : [];
  const seen = new Set<string>();
  return rows.map((value, index) => {
    const normalized = normalizeSharedProjectCoverClass(value, index);
    return {
      ...normalized,
      id: uniqueId(seen, stringValue(normalized.id, `cover_${index + 1}`)),
    };
  });
}

function normalizeProjectGeotechnical(
  raw: unknown,
  references: MultiPileProjectReference[],
): MultiPileProjectGeotechnicalLibrary {
  const record = objectValue(raw);
  const geotechnicalReferenceIds = new Set(
    references
      .filter((reference) => reference.active && reference.documentType === 'Geotechnical Report')
      .map((reference) => reference.id),
  );
  const primaryReferenceId =
    references.find((reference) => reference.active && reference.primaryGeotechnical)?.id ?? '';
  const requestedReferenceId = stringValue(record.activeReferenceId, '');
  const activeReferenceId = geotechnicalReferenceIds.has(requestedReferenceId)
    ? requestedReferenceId
    : primaryReferenceId;
  const materials = normalizeProjectGeotechnicalMaterials(record.materials, activeReferenceId);
  return {
    activeReferenceId,
    templateState: projectGeoTemplateStateValue(
      record.templateState,
      materials.length > 0 ? 'manual' : DEFAULT_GEOTECHNICAL_LIBRARY.templateState,
    ),
    materials,
  };
}

function normalizeProjectGeotechnicalMaterials(
  raw: unknown,
  fallbackReferenceId: string,
): MultiPileProjectGeotechnicalMaterial[] {
  const rows = Array.isArray(raw) ? raw : [];
  const seen = new Set<string>();
  return rows.map((value, index) => {
    const row = objectValue(value);
    return {
      id: uniqueId(seen, stringValue(row.id, `geo_${index + 1}`)),
      unitCode: stringValue(row.unitCode, ''),
      displayName: stringValue(row.displayName, ''),
      sourceReferenceId: stringValue(row.sourceReferenceId, fallbackReferenceId),
      sourceDocument: stringValue(row.sourceDocument, ''),
      sourceProject: stringValue(row.sourceProject, ''),
      sourceSite: stringValue(row.sourceSite, ''),
      sourceSection: stringValue(row.sourceSection, ''),
      sourceTable: stringValue(row.sourceTable, ''),
      notes: stringValue(row.notes, ''),
      gamma_b: nullableNumberValue(row.gamma_b ?? row.unitWeightKNm3 ?? row.unitWeight_kNm3),
      phi_prime: nullableNumberValue(row.phi_prime ?? row.phiPrimeDeg ?? row.phiPrime_deg),
      c_prime: nullableNumberValue(row.c_prime ?? row.cPrimeKPa ?? row.cPrime_kPa),
      cu: nullableNumberValue(row.cu ?? row.cuKPa ?? row.cu_kPa),
      E_MPa: nullableNumberValue(row.E_MPa),
      nu: nullableNumberValue(row.nu),
      Ka: nullableNumberValue(row.Ka ?? row.ka),
      Ko: nullableNumberValue(row.Ko ?? row.ko),
      Kp: nullableNumberValue(row.Kp ?? row.kpOrPassiveLimit ?? row.Kp_or_PassiveLimit),
      wallInterfaceActive: nullableNumberValue(
        row.wallInterfaceActive ?? row.wallInterfaceReductionActive,
      ),
      wallInterfacePassive: nullableNumberValue(
        row.wallInterfacePassive ?? row.wallInterfaceReductionPassive,
      ),
      pile_fms_comp_kPa: nullableNumberValue(
        row.pile_fms_comp_kPa ??
          row.pileUltimateShaftCompressionKPa ??
          row.pileUltimateShaftCompression_kPa,
      ),
      pile_fms_tension_kPa: nullableNumberValue(
        row.pile_fms_tension_kPa ?? row.pileUltimateShaftTensionKPa,
      ),
      pile_fb_ult_kPa: nullableNumberValue(
        row.pile_fb_ult_kPa ?? row.pileUltimateEndBearingKPa ?? row.pileUltimateEndBearing_kPa,
      ),
      pile_fms_allow_kPa: nullableNumberValue(
        row.pile_fms_allow_kPa ??
          row.pileAllowableShaftCompressionKPa ??
          row.pileAllowableShaftCompression_kPa,
      ),
      pile_fb_allow_kPa: nullableNumberValue(
        row.pile_fb_allow_kPa ?? row.pileAllowableEndBearingKPa ?? row.pileAllowableEndBearing_kPa,
      ),
      cfaUpliftTensionFactor: nullableNumberValue(row.cfaUpliftTensionFactor),
      includeInProject: row.includeInProject === undefined ? true : Boolean(row.includeInProject),
    };
  });
}

function normalizeProjectGeotechnicalBasis(raw: unknown): MultiPileProjectGeotechnicalBasis {
  const record = objectValue(raw);
  return {
    groundwaterDesignNotes: stringValue(
      record.groundwaterDesignNotes,
      DEFAULT_GEOTECHNICAL_BASIS.groundwaterDesignNotes,
    ),
    cfaUpliftMode: projectGeoUpliftModeValue(
      record.cfaUpliftMode,
      DEFAULT_GEOTECHNICAL_BASIS.cfaUpliftMode,
    ),
    cfaUpliftFactor: numberValue(
      record.cfaUpliftFactor,
      DEFAULT_GEOTECHNICAL_BASIS.cfaUpliftFactor,
      { min: 0 },
    ),
    defaultSocketAssumptions: stringValue(
      record.defaultSocketAssumptions,
      DEFAULT_GEOTECHNICAL_BASIS.defaultSocketAssumptions,
    ),
    foundingNotes: stringValue(record.foundingNotes, DEFAULT_GEOTECHNICAL_BASIS.foundingNotes),
    commentary: stringValue(record.commentary, DEFAULT_GEOTECHNICAL_BASIS.commentary),
    arrAssessment: normalizeMultiPileGeoArrSettings(
      record.arrAssessment ?? DEFAULT_GEOTECHNICAL_BASIS.arrAssessment,
    ),
  };
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown, fallback: string): string {
  const candidate = String(value ?? '').trim();
  return candidate || fallback;
}

function nullableNumberValue(value: unknown): number | null {
  if (value === '' || value === null || value === undefined) {
    return null;
  }
  const candidate = Number(value);
  return Number.isFinite(candidate) ? candidate : null;
}

function numberValue(value: unknown, fallback: number, opts?: { min?: number }): number {
  const candidate = Number(value);
  if (!Number.isFinite(candidate)) {
    return fallback;
  }
  if (opts?.min !== undefined && candidate < opts.min) {
    return opts.min;
  }
  return candidate;
}

function uniqueId(seen: Set<string>, base: string): string {
  let candidate = base || `generated_${seen.size + 1}`;
  let suffix = 2;
  while (seen.has(candidate)) {
    candidate = `${base}_${suffix++}`;
  }
  seen.add(candidate);
  return candidate;
}

function projectStatusValue(
  value: unknown,
  fallback: MultiPileProjectStatus,
): MultiPileProjectStatus {
  const candidate = String(value ?? '');
  if (
    candidate === 'In Progress' ||
    candidate === 'For Review' ||
    candidate === 'Issued' ||
    candidate === 'Construction' ||
    candidate === 'Hold'
  ) {
    return candidate;
  }
  return fallback;
}

function projectMapSourceValue(
  value: unknown,
  fallback: MultiPileProjectMapSource,
): MultiPileProjectMapSource {
  const candidate = String(value ?? '');
  if (candidate === 'auto' || candidate === 'address' || candidate === 'coords') {
    return candidate;
  }
  return fallback;
}

function referenceDocumentTypeValue(
  value: unknown,
  fallback: MultiPileProjectReferenceDocumentType,
): MultiPileProjectReferenceDocumentType {
  const candidate = String(value ?? '')
    .trim()
    .toLowerCase();
  if (candidate === 'geotechnical report') {
    return 'Geotechnical Report';
  }
  if (candidate === 'structural drawing') {
    return 'Structural Drawing';
  }
  if (candidate === 'architectural drawing') {
    return 'Architectural Drawing';
  }
  if (candidate === 'survey') {
    return 'Survey';
  }
  if (candidate === 'standard / code' || candidate === 'standard / specification') {
    return 'Standard / Code';
  }
  if (candidate === 'calculation note') {
    return 'Calculation Note';
  }
  if (candidate === 'other' || candidate === 'civil drawing') {
    return 'Other';
  }
  return fallback;
}

function legacyProjectReferencesValue(raw: unknown): unknown[] {
  return Array.isArray(raw) ? raw : [];
}

function legacyProjectStructuralDefaultsValue(
  multiPile: Record<string, unknown>,
): Record<string, unknown> | null {
  const directStructuralDefaults = objectValue(multiPile.structuralDefaults);
  if (hasLegacyProjectStructuralDefaultsValue(directStructuralDefaults)) {
    return directStructuralDefaults;
  }
  return null;
}

function hasLegacyProjectStructuralDefaultsValue(value: Record<string, unknown>): boolean {
  return (
    legacyStructuralDefaultRows(value.concreteClasses) > 0 ||
    legacyStructuralDefaultRows(value.reinforcementGrades) > 0 ||
    legacyStructuralDefaultRows(value.tendonGrades) > 0 ||
    legacyStructuralDefaultRows(value.coverDurabilityClasses) > 0
  );
}

function legacyStructuralDefaultRows(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

function projectGeoUpliftModeValue(
  value: unknown,
  fallback: MultiPileProjectGeoUpliftMode,
): MultiPileProjectGeoUpliftMode {
  const candidate = String(value ?? '');
  if (candidate === 'manual-entry' || candidate === 'ratio-to-compression') {
    return candidate;
  }
  return fallback;
}

function projectGeoTemplateStateValue(
  value: unknown,
  fallback: MultiPileProjectGeoTemplateState,
): MultiPileProjectGeoTemplateState {
  const candidate = String(value ?? '');
  if (
    candidate === 'empty' ||
    candidate === 'manual' ||
    candidate === 'seeded' ||
    candidate === 'imported'
  ) {
    return candidate;
  }
  return fallback;
}

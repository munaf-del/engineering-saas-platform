import { Injectable } from '@nestjs/common';
import { ParsedRow } from './import-parser.service';

export interface ValidationResult {
  valid: boolean;
  errors: RowError[];
  validRows: ParsedRow[];
}

export interface RowError {
  rowNumber: number;
  field?: string;
  message: string;
  severity: 'error' | 'warning';
}

type EntityType =
  | 'steel_section'
  | 'rebar_size'
  | 'material'
  | 'geotech_parameter'
  | 'standards_registry'
  | 'load_combination_rules'
  | 'pile_design_rules';

interface FieldSpec {
  required: boolean;
  type: 'string' | 'number';
}

const FIELD_SPECS: Record<EntityType, Record<string, FieldSpec>> = {
  steel_section: {
    designation: { required: true, type: 'string' },
    sectionType: { required: true, type: 'string' },
    massPerMetre: { required: true, type: 'number' },
    depth: { required: true, type: 'number' },
    flangeWidth: { required: true, type: 'number' },
    flangeThickness: { required: true, type: 'number' },
    webThickness: { required: true, type: 'number' },
    sectionArea: { required: false, type: 'number' },
    momentOfInertiaX: { required: false, type: 'number' },
    momentOfInertiaY: { required: false, type: 'number' },
  },
  rebar_size: {
    designation: { required: true, type: 'string' },
    barDiameter: { required: true, type: 'number' },
    nominalArea: { required: true, type: 'number' },
    massPerMetre: { required: true, type: 'number' },
    grade: { required: true, type: 'string' },
    ductilityClass: { required: true, type: 'string' },
  },
  material: {
    name: { required: true, type: 'string' },
    category: { required: true, type: 'string' },
    grade: { required: false, type: 'string' },
    sourceStandard: { required: true, type: 'string' },
    sourceEdition: { required: true, type: 'string' },
  },
  geotech_parameter: {
    name: { required: true, type: 'string' },
    classCode: { required: true, type: 'string' },
    sourceStandard: { required: true, type: 'string' },
    sourceEdition: { required: true, type: 'string' },
    unitWeight: { required: false, type: 'number' },
    cohesion: { required: false, type: 'number' },
    frictionAngle: { required: false, type: 'number' },
  },
  standards_registry: {
    code: { required: true, type: 'string' },
    title: { required: true, type: 'string' },
    category: { required: true, type: 'string' },
    edition: { required: true, type: 'string' },
    amendment: { required: false, type: 'string' },
    sourceEdition: { required: true, type: 'string' },
    effectiveDate: { required: true, type: 'string' },
    sourceDataset: { required: true, type: 'string' },
  },
  load_combination_rules: {
    ruleKey: { required: true, type: 'string' },
    clauseRef: { required: true, type: 'string' },
    description: { required: true, type: 'string' },
  },
  pile_design_rules: {
    ruleKey: { required: true, type: 'string' },
    clauseRef: { required: true, type: 'string' },
    description: { required: true, type: 'string' },
  },
};

@Injectable()
export class ImportValidatorService {
  validate(rows: ParsedRow[], entityType: EntityType): ValidationResult {
    const specs = FIELD_SPECS[entityType];
    if (!specs) {
      return {
        valid: false,
        errors: [{ rowNumber: 0, message: `Unknown entity type: ${entityType}`, severity: 'error' }],
        validRows: [],
      };
    }

    const errors: RowError[] = [];
    const validRows: ParsedRow[] = [];

    for (const row of rows) {
      const rowErrors = this.validateRow(row, specs, entityType);
      errors.push(...rowErrors);

      if (!rowErrors.some((e) => e.severity === 'error')) {
        validRows.push(row);
      }
    }

    return {
      valid: errors.filter((e) => e.severity === 'error').length === 0,
      errors,
      validRows,
    };
  }

  private validateRow(
    row: ParsedRow,
    specs: Record<string, FieldSpec>,
    entityType: EntityType,
  ): RowError[] {
    const errors: RowError[] = [];
    const { rowNumber, data } = row;

    for (const [field, spec] of Object.entries(specs)) {
      const val = data[field];

      if (spec.required && (val === undefined || val === null || val === '')) {
        errors.push({
          rowNumber,
          field,
          message: `Missing required field "${field}"`,
          severity: 'error',
        });
        continue;
      }

      if (val !== undefined && val !== '' && spec.type === 'number') {
        const num = Number(val);
        if (isNaN(num)) {
          errors.push({
            rowNumber,
            field,
            message: `Field "${field}" must be a number, got "${val}"`,
            severity: 'error',
          });
        }
      }
    }

    if (entityType === 'material' || entityType === 'geotech_parameter') {
      if (!data['sourceStandard'] && !data['source_standard']) {
        errors.push({
          rowNumber,
          field: 'sourceStandard',
          message: 'Missing required source standard for traceability',
          severity: 'error',
        });
      }
      if (!data['sourceEdition'] && !data['source_edition']) {
        errors.push({
          rowNumber,
          field: 'sourceEdition',
          message: 'Missing required source edition for traceability',
          severity: 'error',
        });
      }
    }

    if (entityType === 'standards_registry') {
      const validCategories = ['loading', 'concrete', 'steel', 'reinforcement', 'geotech', 'general'];
      const cat = data['category'];
      if (cat && !validCategories.includes(String(cat))) {
        errors.push({
          rowNumber,
          field: 'category',
          message: `Invalid category "${cat}". Must be one of: ${validCategories.join(', ')}`,
          severity: 'error',
        });
      }
      if (!data['sourceDataset'] && !data['source_dataset']) {
        errors.push({
          rowNumber,
          field: 'sourceDataset',
          message: 'Missing required sourceDataset for traceability',
          severity: 'error',
        });
      }
    }

    if (entityType === 'load_combination_rules' || entityType === 'pile_design_rules') {
      const meta = data['_yamlMeta'] as Record<string, unknown> | undefined;
      if (meta) {
        if (!meta['standardCode']) {
          errors.push({ rowNumber, field: 'standardCode', message: 'Missing required standardCode in YAML metadata', severity: 'error' });
        }
        if (!meta['version']) {
          errors.push({ rowNumber, field: 'version', message: 'Missing required version in YAML metadata', severity: 'error' });
        }
        if (!meta['effectiveDate']) {
          errors.push({ rowNumber, field: 'effectiveDate', message: 'Missing required effectiveDate in YAML metadata', severity: 'error' });
        }
        if (!meta['sourceDataset']) {
          errors.push({ rowNumber, field: 'sourceDataset', message: 'Missing required sourceDataset in YAML metadata', severity: 'error' });
        }
      }
      if (data['value'] === undefined && data['table'] === undefined && data['formula'] === undefined) {
        errors.push({
          rowNumber,
          field: 'value|table|formula',
          message: 'Each rule must have at least one of: value, table, or formula',
          severity: 'error',
        });
      }
    }

    return errors;
  }
}

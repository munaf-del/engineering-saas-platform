import { ImportValidatorService } from './import-validator.service';
import { ParsedRow } from './import-parser.service';

describe('ImportValidatorService', () => {
  let validator: ImportValidatorService;

  beforeEach(() => {
    validator = new ImportValidatorService();
  });

  describe('steel_section validation', () => {
    it('should pass valid steel section rows', () => {
      const rows: ParsedRow[] = [
        {
          rowNumber: 2,
          data: {
            designation: '200UB25.4',
            sectionType: 'UB',
            massPerMetre: 25.4,
            depth: 203,
            flangeWidth: 133,
            flangeThickness: 7.8,
            webThickness: 5.8,
          },
        },
      ];

      const result = validator.validate(rows, 'steel_section');
      expect(result.valid).toBe(true);
      expect(result.validRows.length).toBe(1);
      expect(result.errors.length).toBe(0);
    });

    it('should fail on missing required designation', () => {
      const rows: ParsedRow[] = [
        {
          rowNumber: 2,
          data: {
            sectionType: 'UB',
            massPerMetre: 25.4,
            depth: 203,
            flangeWidth: 133,
            flangeThickness: 7.8,
            webThickness: 5.8,
          },
        },
      ];

      const result = validator.validate(rows, 'steel_section');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'designation')).toBe(true);
    });

    it('should fail on non-numeric massPerMetre', () => {
      const rows: ParsedRow[] = [
        {
          rowNumber: 2,
          data: {
            designation: '200UB25.4',
            sectionType: 'UB',
            massPerMetre: 'abc',
            depth: 203,
            flangeWidth: 133,
            flangeThickness: 7.8,
            webThickness: 5.8,
          },
        },
      ];

      const result = validator.validate(rows, 'steel_section');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'massPerMetre')).toBe(true);
    });

    it('should validate multiple rows and report per-row errors', () => {
      const rows: ParsedRow[] = [
        {
          rowNumber: 2,
          data: {
            designation: '200UB25.4',
            sectionType: 'UB',
            massPerMetre: 25.4,
            depth: 203,
            flangeWidth: 133,
            flangeThickness: 7.8,
            webThickness: 5.8,
          },
        },
        {
          rowNumber: 3,
          data: {
            designation: '',
            sectionType: '',
            massPerMetre: '',
            depth: '',
            flangeWidth: '',
            flangeThickness: '',
            webThickness: '',
          },
        },
      ];

      const result = validator.validate(rows, 'steel_section');
      expect(result.valid).toBe(false);
      expect(result.validRows.length).toBe(1);
      expect(result.errors.filter((e) => e.rowNumber === 3).length).toBeGreaterThan(0);
    });
  });

  describe('rebar_size validation', () => {
    it('should pass valid rebar rows', () => {
      const rows: ParsedRow[] = [
        {
          rowNumber: 2,
          data: {
            designation: 'N12',
            barDiameter: 12,
            nominalArea: 113.1,
            massPerMetre: 0.888,
            grade: 'D500N',
            ductilityClass: 'N',
          },
        },
      ];

      const result = validator.validate(rows, 'rebar_size');
      expect(result.valid).toBe(true);
    });

    it('should fail on missing grade', () => {
      const rows: ParsedRow[] = [
        {
          rowNumber: 2,
          data: {
            designation: 'N12',
            barDiameter: 12,
            nominalArea: 113.1,
            massPerMetre: 0.888,
            ductilityClass: 'N',
          },
        },
      ];

      const result = validator.validate(rows, 'rebar_size');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'grade')).toBe(true);
    });
  });

  describe('material validation', () => {
    it('should fail on missing sourceStandard', () => {
      const rows: ParsedRow[] = [
        {
          rowNumber: 2,
          data: {
            name: 'N40 Concrete',
            category: 'concrete',
            sourceEdition: '2018',
          },
        },
      ];

      const result = validator.validate(rows, 'material');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'sourceStandard')).toBe(true);
    });

    it('should fail on missing sourceEdition', () => {
      const rows: ParsedRow[] = [
        {
          rowNumber: 2,
          data: {
            name: 'N40 Concrete',
            category: 'concrete',
            sourceStandard: 'AS 3600',
          },
        },
      ];

      const result = validator.validate(rows, 'material');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'sourceEdition')).toBe(true);
    });
  });

  describe('standards_registry validation', () => {
    it('should pass valid standards registry rows', () => {
      const rows: ParsedRow[] = [
        {
          rowNumber: 2,
          data: {
            code: 'PLACEHOLDER-STD',
            title: 'Placeholder Standard',
            category: 'loading',
            edition: '2024',
            sourceEdition: '2024',
            effectiveDate: '2024-01-01',
            sourceDataset: 'placeholder-dataset',
          },
        },
      ];

      const result = validator.validate(rows, 'standards_registry');
      expect(result.valid).toBe(true);
    });

    it('should fail on missing code', () => {
      const rows: ParsedRow[] = [
        {
          rowNumber: 2,
          data: {
            title: 'Placeholder',
            category: 'loading',
            edition: '2024',
            sourceEdition: '2024',
            effectiveDate: '2024-01-01',
            sourceDataset: 'test',
          },
        },
      ];

      const result = validator.validate(rows, 'standards_registry');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'code')).toBe(true);
    });

    it('should fail on invalid category', () => {
      const rows: ParsedRow[] = [
        {
          rowNumber: 2,
          data: {
            code: 'TEST',
            title: 'Test',
            category: 'invalid_category',
            edition: '2024',
            sourceEdition: '2024',
            effectiveDate: '2024-01-01',
            sourceDataset: 'test',
          },
        },
      ];

      const result = validator.validate(rows, 'standards_registry');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'category')).toBe(true);
    });

    it('should fail on missing sourceDataset', () => {
      const rows: ParsedRow[] = [
        {
          rowNumber: 2,
          data: {
            code: 'TEST',
            title: 'Test',
            category: 'loading',
            edition: '2024',
            sourceEdition: '2024',
            effectiveDate: '2024-01-01',
          },
        },
      ];

      const result = validator.validate(rows, 'standards_registry');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'sourceDataset')).toBe(true);
    });
  });

  describe('load_combination_rules validation', () => {
    it('should pass valid rule rows', () => {
      const rows: ParsedRow[] = [
        {
          rowNumber: 1,
          data: {
            ruleKey: 'gamma_g',
            clauseRef: '4.2.2',
            description: 'Placeholder factor',
            value: 1.0,
            _yamlMeta: {
              standardCode: 'PLACEHOLDER',
              version: '1.0',
              effectiveDate: '2024-01-01',
              sourceDataset: 'test',
            },
          },
        },
      ];

      const result = validator.validate(rows, 'load_combination_rules');
      expect(result.valid).toBe(true);
    });

    it('should fail on missing ruleKey', () => {
      const rows: ParsedRow[] = [
        {
          rowNumber: 1,
          data: {
            clauseRef: '4.2.2',
            description: 'Test',
            value: 1.0,
            _yamlMeta: {
              standardCode: 'TEST',
              version: '1.0',
              effectiveDate: '2024-01-01',
              sourceDataset: 'test',
            },
          },
        },
      ];

      const result = validator.validate(rows, 'load_combination_rules');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'ruleKey')).toBe(true);
    });

    it('should fail when rule has no value, table, or formula', () => {
      const rows: ParsedRow[] = [
        {
          rowNumber: 1,
          data: {
            ruleKey: 'gamma_g',
            clauseRef: '4.2.2',
            description: 'Test',
            _yamlMeta: {
              standardCode: 'TEST',
              version: '1.0',
              effectiveDate: '2024-01-01',
              sourceDataset: 'test',
            },
          },
        },
      ];

      const result = validator.validate(rows, 'load_combination_rules');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'value|table|formula')).toBe(true);
    });

    it('should fail on missing standardCode in YAML metadata', () => {
      const rows: ParsedRow[] = [
        {
          rowNumber: 1,
          data: {
            ruleKey: 'gamma_g',
            clauseRef: '4.2.2',
            description: 'Test',
            value: 1.0,
            _yamlMeta: {
              version: '1.0',
              effectiveDate: '2024-01-01',
              sourceDataset: 'test',
            },
          },
        },
      ];

      const result = validator.validate(rows, 'load_combination_rules');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'standardCode')).toBe(true);
    });
  });

  describe('pile_design_rules validation', () => {
    it('should pass valid pile design rule rows', () => {
      const rows: ParsedRow[] = [
        {
          rowNumber: 1,
          data: {
            ruleKey: 'phi_g',
            clauseRef: '4.3.1',
            description: 'Placeholder geotechnical factor',
            value: 0.5,
            _yamlMeta: {
              standardCode: 'PLACEHOLDER-2159',
              version: '1.0',
              effectiveDate: '2024-01-01',
              sourceDataset: 'test',
            },
          },
        },
      ];

      const result = validator.validate(rows, 'pile_design_rules');
      expect(result.valid).toBe(true);
    });
  });

  describe('unknown entity type', () => {
    it('should return invalid for unknown entity type', () => {
      const result = validator.validate([], 'unknown_type' as any);
      expect(result.valid).toBe(false);
    });
  });
});

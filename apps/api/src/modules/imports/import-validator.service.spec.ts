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

  describe('unknown entity type', () => {
    it('should return invalid for unknown entity type', () => {
      const result = validator.validate([], 'unknown_type' as any);
      expect(result.valid).toBe(false);
    });
  });
});

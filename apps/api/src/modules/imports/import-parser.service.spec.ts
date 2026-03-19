import { ImportParserService } from './import-parser.service';

describe('ImportParserService', () => {
  let parser: ImportParserService;

  beforeEach(() => {
    parser = new ImportParserService();
  });

  describe('CSV parsing', () => {
    it('should parse a valid CSV', async () => {
      const csv = 'designation,sectionType,massPerMetre\n200UB25.4,UB,25.4\n310UB40.4,UB,40.4';
      const rows = await parser.parse(Buffer.from(csv), 'csv', 'test.csv');

      expect(rows.length).toBe(2);
      expect(rows[0].rowNumber).toBe(2);
      expect(rows[0].data['designation']).toBe('200UB25.4');
      expect(rows[0].data['massPerMetre']).toBe(25.4);
    });

    it('should handle quoted CSV fields', async () => {
      const csv = 'name,description\n"Test, Item","Has ""quotes"" inside"';
      const rows = await parser.parse(Buffer.from(csv), 'csv', 'test.csv');

      expect(rows.length).toBe(1);
      expect(rows[0].data['name']).toBe('Test, Item');
      expect(rows[0].data['description']).toBe('Has "quotes" inside');
    });

    it('should reject CSV with only a header', async () => {
      const csv = 'designation,sectionType';
      await expect(
        parser.parse(Buffer.from(csv), 'csv', 'test.csv'),
      ).rejects.toThrow('at least one data row');
    });

    it('should coerce numeric strings to numbers', async () => {
      const csv = 'val\n42.5\ntrue\nhello';
      const rows = await parser.parse(Buffer.from(csv), 'csv', 'test.csv');

      expect(rows[0].data['val']).toBe(42.5);
      expect(rows[1].data['val']).toBe(true);
      expect(rows[2].data['val']).toBe('hello');
    });
  });

  describe('JSON parsing', () => {
    it('should parse a JSON array', async () => {
      const json = JSON.stringify([
        { designation: 'N12', barDiameter: 12 },
        { designation: 'N16', barDiameter: 16 },
      ]);
      const rows = await parser.parse(Buffer.from(json), 'json', 'test.json');

      expect(rows.length).toBe(2);
      expect(rows[0].data['designation']).toBe('N12');
    });

    it('should parse a JSON object with data array', async () => {
      const json = JSON.stringify({
        data: [{ designation: 'N20', barDiameter: 20 }],
      });
      const rows = await parser.parse(Buffer.from(json), 'json', 'test.json');

      expect(rows.length).toBe(1);
    });

    it('should reject invalid JSON', async () => {
      await expect(
        parser.parse(Buffer.from('not json'), 'json', 'test.json'),
      ).rejects.toThrow('Invalid JSON');
    });
  });
});

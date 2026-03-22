import { BadRequestException, Injectable, Logger } from '@nestjs/common';

export interface ParsedRow {
  rowNumber: number;
  data: Record<string, unknown>;
}

@Injectable()
export class ImportParserService {
  private readonly logger = new Logger(ImportParserService.name);

  async parse(
    buffer: Buffer,
    format: 'csv' | 'xlsx' | 'json' | 'yaml',
    fileName: string,
  ): Promise<ParsedRow[]> {
    switch (format) {
      case 'csv':
        return this.parseCsv(buffer);
      case 'xlsx':
        return this.parseXlsx(buffer);
      case 'json':
        return this.parseJson(buffer);
      case 'yaml':
        return this.parseYaml(buffer);
      default:
        throw new BadRequestException(`Unsupported format: ${format}`);
    }
  }

  private async parseCsv(buffer: Buffer): Promise<ParsedRow[]> {
    const text = buffer.toString('utf-8');
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

    if (lines.length < 2) {
      throw new BadRequestException('CSV must have a header row and at least one data row');
    }

    const headers = lines[0]!.split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    const rows: ParsedRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i]!);
      const data: Record<string, unknown> = {};

      for (let j = 0; j < headers.length; j++) {
        const raw = values[j]?.trim() ?? '';
        data[headers[j]!] = this.coerceValue(raw);
      }

      rows.push({ rowNumber: i + 1, data });
    }

    return rows;
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  }

  private async parseXlsx(buffer: Buffer): Promise<ParsedRow[]> {
    try {
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as any);

      const worksheet = workbook.worksheets[0];
      if (!worksheet || worksheet.rowCount < 2) {
        throw new BadRequestException('XLSX must have a header row and at least one data row');
      }

      const headerRow = worksheet.getRow(1);
      const headers: string[] = [];
      headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        headers[colNumber - 1] = String(cell.value ?? '').trim();
      });

      const rows: ParsedRow[] = [];
      for (let i = 2; i <= worksheet.rowCount; i++) {
        const row = worksheet.getRow(i);
        const data: Record<string, unknown> = {};
        let hasData = false;

        headers.forEach((header, idx) => {
          const cell = row.getCell(idx + 1);
          const val = cell.value;
          if (val !== null && val !== undefined && val !== '') {
            hasData = true;
          }
          data[header] = val ?? '';
        });

        if (hasData) {
          rows.push({ rowNumber: i, data });
        }
      }

      return rows;
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error('XLSX parse error', err);
      throw new BadRequestException('Failed to parse XLSX file. Ensure exceljs is installed.');
    }
  }

  private async parseJson(buffer: Buffer): Promise<ParsedRow[]> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(buffer.toString('utf-8'));
    } catch {
      throw new BadRequestException('Invalid JSON');
    }

    const items = Array.isArray(parsed) ? parsed : (parsed as Record<string, unknown>).data;
    if (!Array.isArray(items)) {
      throw new BadRequestException('JSON must be an array or { data: [...] }');
    }

    return items.map((item, idx) => ({
      rowNumber: idx + 1,
      data: item as Record<string, unknown>,
    }));
  }

  private async parseYaml(buffer: Buffer): Promise<ParsedRow[]> {
    let parsed: unknown;
    try {
      const yaml = await import('js-yaml');
      parsed = yaml.load(buffer.toString('utf-8'));
    } catch {
      throw new BadRequestException('Invalid YAML');
    }

    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const obj = parsed as Record<string, unknown>;
      if (Array.isArray(obj['rules'])) {
        return (obj['rules'] as unknown[]).map((item, idx) => ({
          rowNumber: idx + 1,
          data: {
            ...(typeof item === 'object' && item !== null ? (item as Record<string, unknown>) : {}),
            _yamlMeta: {
              standardCode: obj['standardCode'] ?? obj['standard_code'],
              version: obj['version'],
              effectiveDate: obj['effectiveDate'] ?? obj['effective_date'],
              sourceDataset: obj['sourceDataset'] ?? obj['source_dataset'],
            },
          },
        }));
      }
      if (Array.isArray(obj['data'])) {
        return (obj['data'] as unknown[]).map((item, idx) => ({
          rowNumber: idx + 1,
          data: item as Record<string, unknown>,
        }));
      }
      return [{ rowNumber: 1, data: obj }];
    }

    if (Array.isArray(parsed)) {
      return (parsed as unknown[]).map((item, idx) => ({
        rowNumber: idx + 1,
        data: item as Record<string, unknown>,
      }));
    }

    throw new BadRequestException('YAML must contain an object with rules/data or an array');
  }

  private coerceValue(raw: string): unknown {
    if (raw === '') return '';
    const num = Number(raw);
    if (!isNaN(num) && raw.trim() !== '') return num;
    if (raw.toLowerCase() === 'true') return true;
    if (raw.toLowerCase() === 'false') return false;
    return raw;
  }
}

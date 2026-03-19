import { Injectable } from '@nestjs/common';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

export interface TemplateInfo {
  entityType: string;
  format: string;
  fileName: string;
  headers: string[];
}

const TEMPLATE_DIR = join(__dirname, '..', '..', '..', '..', 'scripts', 'templates');

const TEMPLATES: Record<string, TemplateInfo> = {
  steel_section: {
    entityType: 'steel_section',
    format: 'csv',
    fileName: 'steel-sections-template.csv',
    headers: [
      'designation',
      'sectionType',
      'massPerMetre',
      'depth',
      'flangeWidth',
      'flangeThickness',
      'webThickness',
      'sectionArea',
      'momentOfInertiaX',
      'momentOfInertiaY',
      'sectionModulusX',
      'sectionModulusY',
      'plasticModulusX',
      'plasticModulusY',
      'radiusOfGyrationX',
      'radiusOfGyrationY',
    ],
  },
  rebar_size: {
    entityType: 'rebar_size',
    format: 'csv',
    fileName: 'rebar-sizes-template.csv',
    headers: [
      'designation',
      'barDiameter',
      'nominalArea',
      'massPerMetre',
      'grade',
      'ductilityClass',
      'standardRef',
    ],
  },
  material: {
    entityType: 'material',
    format: 'csv',
    fileName: 'materials-template.csv',
    headers: [
      'name',
      'category',
      'grade',
      'sourceStandard',
      'sourceEdition',
      'sourceAmendment',
      'properties_json',
    ],
  },
  geotech_parameter: {
    entityType: 'geotech_parameter',
    format: 'csv',
    fileName: 'geotech-parameters-template.csv',
    headers: [
      'name',
      'classCode',
      'sourceStandard',
      'sourceEdition',
      'sourceAmendment',
      'unitWeight',
      'unitWeight_unit',
      'cohesion',
      'cohesion_unit',
      'frictionAngle',
      'frictionAngle_unit',
    ],
  },
};

@Injectable()
export class ImportTemplatesService {
  getAvailableTemplates(): TemplateInfo[] {
    return Object.values(TEMPLATES);
  }

  getTemplate(entityType: string): { info: TemplateInfo; content: string } | null {
    const info = TEMPLATES[entityType];
    if (!info) return null;

    const filePath = join(TEMPLATE_DIR, info.fileName);
    if (existsSync(filePath)) {
      return { info, content: readFileSync(filePath, 'utf-8') };
    }

    return { info, content: info.headers.join(',') + '\n' };
  }

  generateCsvContent(entityType: string): string {
    const info = TEMPLATES[entityType];
    if (!info) return '';
    return info.headers.join(',') + '\n';
  }
}

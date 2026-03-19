import type { StandardEdition, StandardStatus } from '../types/standards.js';

interface StandardMetadata {
  code: string;
  title: string;
  edition: string;
  amendment?: string;
  effectiveDate: string;
  status: StandardStatus;
  note?: string;
}

/**
 * Metadata-only registry of Australian Standards referenced by the platform.
 * No copyrighted content — only identifiers, titles, and edition info.
 * Rule packs with actual factors and formulae are loaded separately via the import pipeline.
 */
export const STANDARDS_REGISTRY: StandardMetadata[] = [
  {
    code: 'AS/NZS 1170.0',
    title: 'Structural design actions, Part 0: General principles',
    edition: '2002',
    amendment: 'Amdt 5 (2021)',
    effectiveDate: '2002-06-04',
    status: 'current',
  },
  {
    code: 'AS/NZS 1170.1',
    title: 'Structural design actions, Part 1: Permanent, imposed and other actions',
    edition: '2002',
    amendment: 'Amdt 3 (2021)',
    effectiveDate: '2002-06-04',
    status: 'current',
  },
  {
    code: 'AS/NZS 1170.2',
    title: 'Structural design actions, Part 2: Wind actions',
    edition: '2021',
    effectiveDate: '2021-10-01',
    status: 'current',
  },
  {
    code: 'AS 1170.4',
    title: 'Structural design actions, Part 4: Earthquake actions in Australia',
    edition: '2024',
    effectiveDate: '2024-05-01',
    status: 'current',
  },
  {
    code: 'AS 3600',
    title: 'Concrete structures',
    edition: '2018',
    amendment: 'Amdt 2 (2021)',
    effectiveDate: '2018-06-29',
    status: 'current',
  },
  {
    code: 'AS 4100',
    title: 'Steel structures',
    edition: '2020',
    effectiveDate: '2020-10-23',
    status: 'current',
  },
  {
    code: 'AS/NZS 4671',
    title: 'Steel for the reinforcement of concrete',
    edition: '2019',
    effectiveDate: '2019-10-11',
    status: 'current',
  },
  {
    code: 'AS/NZS 3678',
    title: 'Structural steel: hot-rolled plates, floorplates and slabs',
    edition: '2016',
    effectiveDate: '2016-08-12',
    status: 'current',
  },
  {
    code: 'AS/NZS 3679.1',
    title: 'Structural steel, Part 1: Hot-rolled bars and sections',
    edition: '2016',
    effectiveDate: '2016-08-12',
    status: 'current',
  },
  {
    code: 'AS/NZS 3679.2',
    title: 'Structural steel, Part 2: Welded I sections',
    edition: '2016',
    effectiveDate: '2016-08-12',
    status: 'current',
  },
  {
    code: 'AS/NZS 1163',
    title: 'Cold-formed structural steel hollow sections',
    edition: '2016',
    effectiveDate: '2016-09-02',
    status: 'current',
  },
  {
    code: 'AS 2159',
    title: 'Piling: design and installation',
    edition: '2009',
    amendment: 'Amdt 1 (2010)',
    effectiveDate: '2009-09-18',
    status: 'current',
  },
  {
    code: 'AS 1726',
    title: 'Geotechnical site investigations',
    edition: '2017',
    effectiveDate: '2017-05-31',
    status: 'current',
  },
  {
    code: 'AS 1289',
    title: 'Methods of testing soils for engineering purposes (series)',
    edition: 'various',
    effectiveDate: '2000-01-01',
    status: 'current',
    note: 'Multi-part series covering soil testing methods',
  },
  {
    code: 'AS 3798',
    title: 'Guidelines on earthworks for commercial and residential developments',
    edition: '2007',
    effectiveDate: '2007-05-04',
    status: 'current',
  },
];

export function findStandard(code: string): StandardMetadata | undefined {
  return STANDARDS_REGISTRY.find((s) => s.code === code);
}

export function findStandardsByStatus(status: StandardStatus): StandardMetadata[] {
  return STANDARDS_REGISTRY.filter((s) => s.status === status);
}

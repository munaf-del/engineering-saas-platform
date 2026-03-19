export type UnitDimension =
  | 'length'
  | 'force'
  | 'stress'
  | 'moment'
  | 'area'
  | 'volume'
  | 'density'
  | 'unit_weight'
  | 'angle';

export interface UnitDefinition {
  symbol: string;
  name: string;
  dimension: UnitDimension;
  toSI: number;
}

const UNIT_MAP = {
  m: { symbol: 'm', name: 'metre', dimension: 'length', toSI: 1 },
  mm: { symbol: 'mm', name: 'millimetre', dimension: 'length', toSI: 0.001 },
  cm: { symbol: 'cm', name: 'centimetre', dimension: 'length', toSI: 0.01 },
  km: { symbol: 'km', name: 'kilometre', dimension: 'length', toSI: 1000 },

  N: { symbol: 'N', name: 'newton', dimension: 'force', toSI: 1 },
  kN: { symbol: 'kN', name: 'kilonewton', dimension: 'force', toSI: 1000 },
  MN: { symbol: 'MN', name: 'meganewton', dimension: 'force', toSI: 1e6 },

  Pa: { symbol: 'Pa', name: 'pascal', dimension: 'stress', toSI: 1 },
  kPa: { symbol: 'kPa', name: 'kilopascal', dimension: 'stress', toSI: 1000 },
  MPa: { symbol: 'MPa', name: 'megapascal', dimension: 'stress', toSI: 1e6 },
  GPa: { symbol: 'GPa', name: 'gigapascal', dimension: 'stress', toSI: 1e9 },

  'N·m': { symbol: 'N·m', name: 'newton-metre', dimension: 'moment', toSI: 1 },
  'kN·m': { symbol: 'kN·m', name: 'kilonewton-metre', dimension: 'moment', toSI: 1000 },

  'm²': { symbol: 'm²', name: 'square metre', dimension: 'area', toSI: 1 },
  'mm²': { symbol: 'mm²', name: 'square millimetre', dimension: 'area', toSI: 1e-6 },
  'cm²': { symbol: 'cm²', name: 'square centimetre', dimension: 'area', toSI: 1e-4 },

  'm³': { symbol: 'm³', name: 'cubic metre', dimension: 'volume', toSI: 1 },

  'kg/m³': { symbol: 'kg/m³', name: 'kilogram per cubic metre', dimension: 'density', toSI: 1 },

  'kN/m³': {
    symbol: 'kN/m³',
    name: 'kilonewton per cubic metre',
    dimension: 'unit_weight',
    toSI: 1000,
  },

  rad: { symbol: 'rad', name: 'radian', dimension: 'angle', toSI: 1 },
  deg: { symbol: 'deg', name: 'degree', dimension: 'angle', toSI: Math.PI / 180 },
} as const satisfies Record<string, UnitDefinition>;

export type UnitSymbol = keyof typeof UNIT_MAP;
export const UNITS = UNIT_MAP;

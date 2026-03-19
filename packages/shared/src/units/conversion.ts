import { UNITS, type UnitSymbol } from './definitions.js';

export function toSI(value: number, from: UnitSymbol): number {
  const unit = UNITS[from];
  return value * unit.toSI;
}

export function fromSI(valueSI: number, to: UnitSymbol): number {
  const unit = UNITS[to];
  return valueSI / unit.toSI;
}

export function convert(value: number, from: UnitSymbol, to: UnitSymbol): number {
  const fromDef = UNITS[from];
  const toDef = UNITS[to];
  if (fromDef.dimension !== toDef.dimension) {
    throw new Error(
      `Cannot convert between incompatible dimensions: ${fromDef.dimension} and ${toDef.dimension}`,
    );
  }
  return (value * fromDef.toSI) / toDef.toSI;
}

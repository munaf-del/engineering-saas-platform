import { describe, it, expect } from 'vitest';
import { toSI, fromSI, convert } from './conversion.js';

describe('unit conversion', () => {
  it('converts mm to SI (metres)', () => {
    expect(toSI(1500, 'mm')).toBeCloseTo(1.5);
  });

  it('converts SI (metres) to mm', () => {
    expect(fromSI(1.5, 'mm')).toBeCloseTo(1500);
  });

  it('converts kN to N', () => {
    expect(convert(50, 'kN', 'N')).toBeCloseTo(50000);
  });

  it('converts MPa to kPa', () => {
    expect(convert(25, 'MPa', 'kPa')).toBeCloseTo(25000);
  });

  it('converts degrees to radians', () => {
    expect(convert(180, 'deg', 'rad')).toBeCloseTo(Math.PI);
  });

  it('throws on incompatible dimensions', () => {
    expect(() => convert(1, 'mm', 'kN')).toThrow('incompatible dimensions');
  });
});

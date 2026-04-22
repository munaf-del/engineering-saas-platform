import { describe, expect, it } from 'vitest';
import {
  calculateAnchorAngleDeg,
  calculateAnchorPlanLengthMm,
  generatePilePositionsAlongBaseline,
} from './semantic-object-utils';

describe('semantic drafting object utilities', () => {
  it('calculates secant and soldier pile positions along a baseline including the endpoint', () => {
    const baseline = [
      { x: 0, y: 0 },
      { x: 6000, y: 0 },
    ];

    expect(generatePilePositionsAlongBaseline(baseline, 1500)).toEqual([
      { x: 0, y: 0 },
      { x: 1500, y: 0 },
      { x: 3000, y: 0 },
      { x: 4500, y: 0 },
      { x: 6000, y: 0 },
    ]);
    expect(generatePilePositionsAlongBaseline(baseline, 2000)).toEqual([
      { x: 0, y: 0 },
      { x: 2000, y: 0 },
      { x: 4000, y: 0 },
      { x: 6000, y: 0 },
    ]);
  });

  it('derives anchor angle and plan length from authored head and tail points', () => {
    const headPoint = { x: 0, y: 0 };
    const tailPoint = { x: 4000, y: -1000 };

    expect(calculateAnchorPlanLengthMm(headPoint, tailPoint)).toBeCloseTo(4123.1056, 3);
    expect(calculateAnchorAngleDeg(headPoint, tailPoint)).toBeCloseTo(-14.0362, 3);
  });
});

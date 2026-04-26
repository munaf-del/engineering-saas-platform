import { describe, expect, it } from 'vitest';
import {
  estimateDraftingLabelBounds,
  layoutDraftingLabels,
  type DraftingLabelCandidate,
} from './drafting-label-layout';

function candidate(overrides: Partial<DraftingLabelCandidate>): DraftingLabelCandidate {
  return {
    allowedPositions: ['top-right', 'bottom-right', 'left'],
    anchor: { x: 0, y: 0 },
    approximateBounds: { height: 100, width: 260 },
    canHide: true,
    canLeader: true,
    family: 'engineering',
    id: 'label-a',
    mode: 'engineering',
    objectType: 'pile',
    preferredPosition: 'top-right',
    priority: 500,
    selected: false,
    surface: 'editor',
    ...overrides,
  };
}

describe('layoutDraftingLabels', () => {
  it('places higher priority labels first and hides lower priority labels when no slot is available', () => {
    const result = layoutDraftingLabels(
      [
        candidate({
          allowedPositions: ['top-right'],
          id: 'low',
          priority: 100,
        }),
        candidate({
          allowedPositions: ['top-right'],
          id: 'dimension',
          objectType: 'dimension_chain',
          priority: 900,
        }),
      ],
      { padding: 120 },
    );

    expect(result.placed.map((label) => label.id)).toEqual(['dimension']);
    expect(result.hidden.map((label) => label.id)).toEqual(['low']);
  });

  it('moves colliding labels deterministically and creates a leader for moved labels', () => {
    const result = layoutDraftingLabels(
      [
        candidate({
          id: 'pile-1',
          priority: 700,
        }),
        candidate({
          anchor: { x: 10, y: 0 },
          id: 'pile-2',
          priority: 700,
        }),
      ],
      { padding: 80 },
    );

    const moved = result.placed.find((label) => label.id === 'pile-2');
    expect(result.metadata.collisionsAvoided).toBe(1);
    expect(moved?.position).toBe('bottom-right');
    expect(moved?.leader).toEqual({
      end: expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
      start: { x: 10, y: 0 },
    });
  });

  it('lets selected labels win over non-selected labels with a higher base priority', () => {
    const result = layoutDraftingLabels(
      [
        candidate({
          allowedPositions: ['top-right'],
          id: 'normal-dimension',
          objectType: 'dimension_chain',
          priority: 900,
        }),
        candidate({
          allowedPositions: ['top-right'],
          id: 'selected-service',
          objectType: 'service_crossing',
          priority: 500,
          selected: true,
        }),
      ],
      { padding: 120 },
    );

    expect(result.placed.map((label) => label.id)).toEqual(['selected-service']);
    expect(result.hidden.map((label) => label.id)).toEqual(['normal-dimension']);
  });

  it('forces non-hideable labels instead of dropping dimension reservations', () => {
    const result = layoutDraftingLabels(
      [
        candidate({
          allowedPositions: ['top-right'],
          canHide: false,
          id: 'dimension-1',
          objectType: 'dimension_chain',
          priority: 900,
        }),
        candidate({
          allowedPositions: ['top-right'],
          canHide: false,
          id: 'dimension-2',
          objectType: 'dimension_chain',
          priority: 900,
        }),
      ],
      { padding: 120 },
    );

    expect(result.placed).toHaveLength(2);
    expect(result.hidden).toHaveLength(0);
    expect(result.metadata.forcedCollisions).toBeGreaterThan(0);
  });

  it('uses text size and line count to estimate label bounds', () => {
    expect(estimateDraftingLabelBounds({ lines: ['BH-01', 'GL 12.5'], textSize: 100 })).toEqual({
      height: 180,
      width: 406,
    });
  });
});

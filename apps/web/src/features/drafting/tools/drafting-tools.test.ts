import { describe, expect, it } from 'vitest';
import { createEmptyDraftingModel } from '@eng/shared';
import { createExcavationLineObject } from './excavation-line-tool';
import { createLeaderNoteObject } from './leader-note-tool';
import { createMonitoringPointObject } from './monitoring-point-tool';
import { createPileObject } from './pile-tool';

describe('drafting object creation helpers', () => {
  it('creates typed engineering objects with expected defaults', () => {
    const model = createEmptyDraftingModel('drawing-1');
    const pile = createPileObject({ x: 1000, y: 2000 }, model);
    const monitoringPoint = createMonitoringPointObject({ x: 2000, y: 3000 }, model);
    const leaderNote = createLeaderNoteObject({ x: 3000, y: 4000 }, model);
    const excavationLine = createExcavationLineObject(
      { x: 0, y: 0 },
      model,
      [
        { x: 0, y: 0 },
        { x: 2500, y: 500 },
        { x: 4000, y: 1500 },
      ],
    );

    expect(pile.metadata.pileId).toBe('P1');
    expect(pile.layerId).toBe('piles');
    expect(monitoringPoint.metadata.monitoringType).toBe('vibration');
    expect(monitoringPoint.layerId).toBe('monitoring');
    expect(leaderNote.metadata.text).toBe('Draft note 1');
    expect(leaderNote.layerId).toBe('notes');
    expect(excavationLine.metadata.excavationId).toBe('EX1');
    expect(excavationLine.geometry.points).toHaveLength(3);
    expect(excavationLine.layerId).toBe('excavation');
  });
});

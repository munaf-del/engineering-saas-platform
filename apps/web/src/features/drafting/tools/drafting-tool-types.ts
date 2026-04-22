import type { DraftingImplementedObjectType, DraftingObject } from '@eng/shared';

export type DraftingCreateTool = DraftingImplementedObjectType;
export type DraftingTool = 'select' | 'pan' | DraftingCreateTool;

export const DRAFTING_CREATE_TOOLS: DraftingCreateTool[] = [
  'pile',
  'secant_pile_wall',
  'soldier_pile_wall',
  'anchor_tieback',
  'capping_beam',
  'waler',
  'excavation_line',
  'monitoring_point',
  'leader_note',
];

export function nextDraftingObjectSequence(
  objects: DraftingObject[],
  type: DraftingImplementedObjectType,
) {
  return objects.filter((object) => object.type === type).length + 1;
}

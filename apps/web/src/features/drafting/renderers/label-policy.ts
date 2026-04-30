import type { DraftingObject } from '@eng/shared';

export const DRAFTING_CANVAS_LABEL_MODES = ['minimal', 'engineering', 'full'] as const;

export type DraftingCanvasLabelMode = (typeof DRAFTING_CANVAS_LABEL_MODES)[number];

type LabelPolicyContext<T extends DraftingObject = DraftingObject> = {
  allObjects?: DraftingObject[];
  isSelected: boolean;
  labelMode?: DraftingCanvasLabelMode;
  object: T;
  surface?: 'editor' | 'sheet';
  viewScale?: number;
};

const GENERATED_LABEL_PATTERNS = [/^P-NEW/i, /^J-NEW/i, /^SR-NEW/i, /^SC-NEW/i];
const MIN_READABLE_LABEL_SCALE = 0.075;
const MIN_READABLE_SECONDARY_LABEL_SCALE = 0.12;

export function resolveEffectiveLabelMode({
  labelMode,
  surface,
}: Pick<LabelPolicyContext, 'labelMode' | 'surface'>): DraftingCanvasLabelMode {
  if (labelMode) {
    return labelMode;
  }

  return surface === 'sheet' ? 'engineering' : 'minimal';
}

export function shouldShowPrimaryCanvasLabel(context: LabelPolicyContext) {
  if (context.surface === 'sheet' || context.isSelected) {
    return true;
  }

  const mode = resolveEffectiveLabelMode(context);
  if (mode === 'engineering' || mode === 'full') {
    return true;
  }

  return (context.viewScale ?? 1) >= MIN_READABLE_LABEL_SCALE;
}

export function shouldShowSecondaryCanvasLabel(context: LabelPolicyContext) {
  if (context.surface === 'sheet' || context.isSelected) {
    return true;
  }

  const mode = resolveEffectiveLabelMode(context);
  if (mode === 'minimal') {
    return false;
  }

  return (context.viewScale ?? 1) >= MIN_READABLE_SECONDARY_LABEL_SCALE;
}

export function buildDraftingObjectLabelLines(context: LabelPolicyContext): string[] {
  const mode = resolveEffectiveLabelMode(context);
  const sourceLine = buildSourceLine(context.object, mode);

  switch (context.object.type) {
    case 'pile': {
      const primary = context.isSelected
        ? context.object.metadata.pileId
        : concisePileLabel(context.object.metadata.pileId, context.object.metadata);
      const lines = primary ? [primary] : [];
      if (mode !== 'minimal') {
        const diameter =
          Number.isFinite(context.object.geometry.diameterMm) &&
          context.object.geometry.diameterMm > 0
            ? `Dia ${context.object.geometry.diameterMm} mm`
            : null;
        lines.push(
          ...compactParts([
            context.object.metadata.pileTypeCode,
            context.object.metadata.pileType,
            diameter,
          ]),
        );
      }
      if (sourceLine) lines.push(sourceLine);
      return filterLabelLines(lines, context);
    }
    case 'secant_pile_wall':
      return filterLabelLines(
        [
          context.object.metadata.wallId,
          mode !== 'minimal' ? `${context.object.metadata.pileCount} piles` : null,
          mode !== 'minimal' ? `Dia ${context.object.parameters.pileDiameterMm} mm` : null,
          sourceLine,
        ],
        context,
      );
    case 'soldier_pile_wall':
      return filterLabelLines(
        [
          context.object.metadata.wallId,
          mode !== 'minimal' ? context.object.parameters.sectionLabel : null,
          mode !== 'minimal' ? `${context.object.metadata.pileCount} piles` : null,
          sourceLine,
        ],
        context,
      );
    case 'anchor_tieback':
      return filterLabelLines(
        [
          context.object.parameters.anchorId,
          mode !== 'minimal' && Number.isFinite(context.object.parameters.designLoadKn)
            ? `${context.object.parameters.designLoadKn} kN`
            : null,
          mode !== 'minimal' && context.object.metadata.associatedWallId
            ? context.object.metadata.associatedWallId
            : null,
          sourceLine,
        ],
        context,
      );
    case 'capping_beam':
      return filterLabelLines(
        [
          context.object.parameters.beamId,
          mode !== 'minimal' && context.object.parameters.levelRl !== undefined
            ? `RL ${context.object.parameters.levelRl}`
            : null,
          sourceLine,
        ],
        context,
      );
    case 'waler':
      return filterLabelLines(
        [
          context.object.parameters.walerId,
          mode !== 'minimal' ? context.object.parameters.sectionLabel : null,
          mode !== 'minimal' && context.object.parameters.levelRl !== undefined
            ? `RL ${context.object.parameters.levelRl}`
            : null,
          sourceLine,
        ],
        context,
      );
    case 'excavation_line':
      return filterLabelLines(
        [
          context.object.metadata.excavationId || context.object.name || null,
          mode !== 'minimal' && context.object.metadata.designLevel !== undefined
            ? `RL ${context.object.metadata.designLevel}`
            : null,
          sourceLine,
        ],
        context,
      );
    case 'service_run':
      return filterLabelLines(
        [
          knownText(context.object.parameters.serviceId),
          mode !== 'minimal' ? knownText(context.object.parameters.serviceType) : null,
          mode !== 'minimal' ? context.object.parameters.authority : null,
          mode !== 'minimal' && context.object.parameters.diameterMm
            ? `Dia ${context.object.parameters.diameterMm} mm`
            : null,
          sourceLine,
        ],
        context,
      );
    case 'service_crossing':
      return filterLabelLines(
        [
          knownText(context.object.parameters.crossingId),
          mode !== 'minimal' ? knownText(context.object.parameters.serviceType) : null,
          mode !== 'minimal' ? knownText(context.object.parameters.conflictType) : null,
          mode === 'full' ? knownText(context.object.parameters.riskStatus) : null,
          sourceLine,
        ],
        context,
      );
    case 'monitoring_point':
      return filterLabelLines(
        [
          context.object.metadata.pointId,
          mode !== 'minimal' ? knownText(context.object.metadata.monitoringType) : null,
          sourceLine,
        ],
        context,
      );
    case 'borehole':
      return filterLabelLines(
        [
          context.object.parameters.label || context.object.parameters.boreholeId,
          mode !== 'minimal' && context.object.parameters.groundLevelRl !== undefined
            ? `GL ${context.object.parameters.groundLevelRl}`
            : null,
          mode !== 'minimal' && context.object.parameters.terminationDepthM !== undefined
            ? `TD ${context.object.parameters.terminationDepthM} m`
            : null,
          sourceLine,
        ],
        context,
      );
    case 'structural_joint':
      return filterLabelLines(
        [
          context.isSelected
            ? context.object.parameters.label || context.object.parameters.jointId
            : concisePileLabel(
                context.object.parameters.label || context.object.parameters.jointId,
              ),
          mode !== 'minimal' &&
          (context.object.geometry.point.rl ?? context.object.geometry.point.z) !== undefined
            ? `RL ${(context.object.geometry.point.rl ?? context.object.geometry.point.z)?.toFixed(2)}`
            : null,
          sourceLine,
        ],
        context,
      );
    case 'geotech_surface':
      return filterLabelLines([context.object.parameters.name, sourceLine], context);
    case 'project_grid':
      return filterLabelLines(
        [
          context.object.metadata.gridId || context.object.name,
          mode !== 'minimal' ? 'Project grid reference' : null,
          sourceLine,
        ],
        context,
      );
    case 'draft_line':
    case 'draft_polyline':
    case 'draft_rectangle':
    case 'draft_circle':
    case 'draft_polygon':
      return context.isSelected || mode === 'full'
        ? filterLabelLines(
            [context.object.name ?? context.object.metadata?.notes, sourceLine],
            context,
          )
        : [];
    default:
      return [];
  }
}

export function buildFullAnnotationFooter(context: LabelPolicyContext) {
  if (resolveEffectiveLabelMode(context) !== 'full') {
    return null;
  }

  return buildSourceLine(context.object, 'full');
}

export function isReadableGeneratedLabel(label: string | undefined) {
  const trimmed = label?.trim();
  if (!trimmed) {
    return false;
  }

  return !GENERATED_LABEL_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function concisePileLabel(
  label: string | undefined,
  metadata?: { pileTypeCode?: string; pileType?: string },
) {
  const trimmed = label?.trim();
  if (!trimmed) {
    return metadata?.pileTypeCode ?? null;
  }

  if (!isReadableGeneratedLabel(trimmed)) {
    return metadata?.pileTypeCode ?? null;
  }

  return trimmed.length <= 12 ? trimmed : null;
}

function buildSourceLine(object: DraftingObject, mode: DraftingCanvasLabelMode) {
  if (mode === 'minimal') {
    return null;
  }

  const sourceRef = object.sourceRef;
  if (!sourceRef) {
    return null;
  }

  if (mode === 'engineering') {
    return sourceRef.sourceLabel && sourceRef.sourceLabel !== object.name
      ? sourceRef.sourceLabel
      : null;
  }

  return compactParts([sourceRef.sourceType, sourceRef.status, sourceRef.sourceLabel]).join(' · ');
}

function filterLabelLines(lines: Array<string | null | undefined>, context: LabelPolicyContext) {
  const [primary, ...secondary] = compactParts(lines);
  const result: string[] = [];

  if (primary && shouldShowPrimaryCanvasLabel(context)) {
    result.push(primary);
  }

  if (shouldShowSecondaryCanvasLabel(context)) {
    result.push(...secondary);
  }

  return result;
}

function compactParts(parts: Array<string | number | null | undefined>) {
  return parts
    .map((part) => (typeof part === 'number' ? String(part) : part?.trim()))
    .filter((part): part is string => Boolean(part));
}

function knownText(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === 'unknown' || trimmed === 'open') {
    return null;
  }
  return trimmed;
}

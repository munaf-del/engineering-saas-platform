export type DraftingLabelMode = 'minimal' | 'engineering' | 'full';
export type DraftingLabelSurface = 'editor' | 'sheet';

export type DraftingLabelPosition =
  | 'top'
  | 'right'
  | 'bottom'
  | 'left'
  | 'top-right'
  | 'top-left'
  | 'bottom-right'
  | 'bottom-left'
  | 'offset';

export type DraftingLabelPoint = {
  x: number;
  y: number;
};

export type DraftingLabelRect = {
  height: number;
  width: number;
  x: number;
  y: number;
};

export type DraftingLabelCandidate = {
  allowedPositions: DraftingLabelPosition[];
  anchor: DraftingLabelPoint;
  approximateBounds: {
    height: number;
    width: number;
  };
  canHide: boolean;
  canLeader: boolean;
  family: string;
  id: string;
  mode: DraftingLabelMode;
  offset?: DraftingLabelPoint;
  objectType: string;
  preferredPosition: DraftingLabelPosition;
  priority: number;
  selected?: boolean;
  surface: DraftingLabelSurface;
};

export type DraftingPlacedLabel = {
  bounds: DraftingLabelRect;
  collisionCount: number;
  family: string;
  hidden: false;
  id: string;
  leader?: {
    end: DraftingLabelPoint;
    start: DraftingLabelPoint;
  };
  mode: DraftingLabelMode;
  objectType: string;
  position: DraftingLabelPosition;
  priority: number;
  selected: boolean;
  surface: DraftingLabelSurface;
  x: number;
  y: number;
};

export type DraftingHiddenLabel = {
  family: string;
  hidden: true;
  id: string;
  objectType: string;
  priority: number;
  reason: 'empty' | 'collision';
  selected: boolean;
};

export type DraftingLabelPlacement = DraftingPlacedLabel | DraftingHiddenLabel;

export type DraftingLabelObstacle = {
  id: string;
  bounds: DraftingLabelRect;
};

export type DraftingLabelLayoutResult = {
  hidden: DraftingHiddenLabel[];
  metadata: {
    collisionsAvoided: number;
    forcedCollisions: number;
  };
  placed: DraftingPlacedLabel[];
};

export function estimateDraftingLabelBounds({
  lines,
  textSize,
}: {
  lines: string[];
  textSize: number;
}) {
  const longestLine = lines.reduce((longest, line) => Math.max(longest, line.length), 0);
  return {
    height: Math.max(textSize, lines.length * textSize * 0.9),
    width: Math.max(textSize * 2.4, longestLine * textSize * 0.58),
  };
}

export function layoutDraftingLabels(
  candidates: DraftingLabelCandidate[],
  options: {
    padding?: number;
    staticObstacles?: DraftingLabelObstacle[];
  } = {},
): DraftingLabelLayoutResult {
  const padding = options.padding ?? 80;
  const occupied: DraftingLabelObstacle[] = [...(options.staticObstacles ?? [])];
  const placed: DraftingPlacedLabel[] = [];
  const hidden: DraftingHiddenLabel[] = [];
  let collisionsAvoided = 0;
  let forcedCollisions = 0;

  const sorted = candidates
    .filter(
      (candidate) =>
        candidate.approximateBounds.width > 0 && candidate.approximateBounds.height > 0,
    )
    .sort((a, b) => {
      if (Boolean(a.selected) !== Boolean(b.selected)) {
        return a.selected ? -1 : 1;
      }
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.id.localeCompare(b.id);
    });

  for (const candidate of sorted) {
    const positions = uniquePositions([candidate.preferredPosition, ...candidate.allowedPositions]);
    const layouts = positions.map((position) => ({
      position,
      ...resolveLabelPosition(candidate, position),
    }));
    const openLayout = layouts.find((layout) =>
      occupied.every(
        (obstacle) =>
          isOwnObstacle(candidate, obstacle) ||
          !rectsIntersect(inflateRect(layout.bounds, padding), obstacle.bounds),
      ),
    );

    if (openLayout) {
      if (openLayout.position !== candidate.preferredPosition) {
        collisionsAvoided += 1;
      }
      const label = buildPlacedLabel(
        candidate,
        openLayout,
        openLayout.position !== candidate.preferredPosition,
      );
      placed.push(label);
      occupied.push({ id: label.id, bounds: label.bounds });
      continue;
    }

    const preferredLayout = layouts[0];
    if (candidate.canHide || !preferredLayout) {
      hidden.push({
        family: candidate.family,
        hidden: true,
        id: candidate.id,
        objectType: candidate.objectType,
        priority: candidate.priority,
        reason: 'collision',
        selected: Boolean(candidate.selected),
      });
      continue;
    }

    const collisionCount = preferredLayout
      ? occupied.filter((obstacle) =>
          isOwnObstacle(candidate, obstacle)
            ? false
            : rectsIntersect(inflateRect(preferredLayout.bounds, padding), obstacle.bounds),
        ).length
      : 0;
    forcedCollisions += collisionCount;
    const label = buildPlacedLabel(candidate, preferredLayout, false, collisionCount);
    placed.push(label);
    occupied.push({ id: label.id, bounds: label.bounds });
  }

  return {
    hidden,
    metadata: {
      collisionsAvoided,
      forcedCollisions,
    },
    placed,
  };
}

function buildPlacedLabel(
  candidate: DraftingLabelCandidate,
  layout: { bounds: DraftingLabelRect; position: DraftingLabelPosition; x: number; y: number },
  moved: boolean,
  collisionCount = 0,
): DraftingPlacedLabel {
  return {
    bounds: layout.bounds,
    collisionCount,
    family: candidate.family,
    hidden: false,
    id: candidate.id,
    leader: moved && candidate.canLeader ? buildLeader(candidate.anchor, layout.bounds) : undefined,
    mode: candidate.mode,
    objectType: candidate.objectType,
    position: layout.position,
    priority: candidate.priority,
    selected: Boolean(candidate.selected),
    surface: candidate.surface,
    x: layout.x,
    y: layout.y,
  };
}

function resolveLabelPosition(candidate: DraftingLabelCandidate, position: DraftingLabelPosition) {
  const { height, width } = candidate.approximateBounds;
  const offset = candidate.offset ?? { x: 360, y: 300 };
  let x = candidate.anchor.x + offset.x;
  let y = candidate.anchor.y - offset.y;

  switch (position) {
    case 'top':
      x = candidate.anchor.x - width / 2;
      y = candidate.anchor.y - offset.y - height / 2;
      break;
    case 'right':
      x = candidate.anchor.x + offset.x;
      y = candidate.anchor.y;
      break;
    case 'bottom':
      x = candidate.anchor.x - width / 2;
      y = candidate.anchor.y + offset.y + height / 2;
      break;
    case 'left':
      x = candidate.anchor.x - offset.x - width;
      y = candidate.anchor.y;
      break;
    case 'top-right':
      x = candidate.anchor.x + offset.x;
      y = candidate.anchor.y - offset.y;
      break;
    case 'top-left':
      x = candidate.anchor.x - offset.x - width;
      y = candidate.anchor.y - offset.y;
      break;
    case 'bottom-right':
      x = candidate.anchor.x + offset.x;
      y = candidate.anchor.y + offset.y;
      break;
    case 'bottom-left':
      x = candidate.anchor.x - offset.x - width;
      y = candidate.anchor.y + offset.y;
      break;
    case 'offset':
      x = candidate.anchor.x + offset.x;
      y = candidate.anchor.y + offset.y;
      break;
  }

  return {
    bounds: {
      height,
      width,
      x,
      y: y - height / 2,
    },
    x,
    y,
  };
}

function buildLeader(anchor: DraftingLabelPoint, bounds: DraftingLabelRect) {
  return {
    start: anchor,
    end: {
      x: clamp(anchor.x, bounds.x, bounds.x + bounds.width),
      y: clamp(anchor.y, bounds.y, bounds.y + bounds.height),
    },
  };
}

function rectsIntersect(a: DraftingLabelRect, b: DraftingLabelRect) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function isOwnObstacle(candidate: DraftingLabelCandidate, obstacle: DraftingLabelObstacle) {
  return obstacle.id.startsWith(`${candidate.id}:`);
}

function inflateRect(rect: DraftingLabelRect, padding: number) {
  return {
    height: rect.height + padding * 2,
    width: rect.width + padding * 2,
    x: rect.x - padding,
    y: rect.y - padding,
  };
}

function uniquePositions(positions: DraftingLabelPosition[]) {
  return positions.filter((position, index) => positions.indexOf(position) === index);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

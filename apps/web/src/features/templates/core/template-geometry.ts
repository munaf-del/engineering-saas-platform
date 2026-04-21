import type { TemplateRectMm, TemplateSafeArea } from './template-document';

export type TemplateInteractionMode = 'move' | 'nw' | 'ne' | 'sw' | 'se';

export type TemplateObjectSizeConstraint = {
  maxHeight: number;
  maxWidth: number;
  minHeight: number;
  minWidth: number;
};

type TemplateAnchor = 'bottom' | 'center' | 'left' | 'right' | 'top';

export function clampMm(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function clampInteger(value: number, min: number, max: number) {
  return Math.round(clampMm(value, min, max));
}

export function normalizeNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : typeof value === 'string' && Number.isFinite(Number.parseFloat(value))
      ? Number.parseFloat(value)
      : fallback;
}

export function asRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

export function sortTemplateObjectsByOrder<TObject extends { order: number }>(objects: TObject[]) {
  return objects.slice().sort((left, right) => left.order - right.order);
}

export function clampTemplateRect<TRect extends TemplateRectMm>(
  rect: TRect,
  safeArea: TemplateSafeArea,
  constraint: TemplateObjectSizeConstraint,
): TRect {
  const width = clampMm(rect.width, constraint.minWidth, constraint.maxWidth);
  const height = clampMm(rect.height, constraint.minHeight, constraint.maxHeight);

  return {
    ...rect,
    height,
    width,
    x: clampMm(rect.x, safeArea.x, Math.max(safeArea.x, safeArea.x + safeArea.width - width)),
    y: clampMm(rect.y, safeArea.y, Math.max(safeArea.y, safeArea.y + safeArea.height - height)),
  };
}

export function resolveTemplateObjectInteraction<TRect extends TemplateRectMm>(args: {
  constraint: TemplateObjectSizeConstraint;
  deltaX: number;
  deltaY: number;
  mode: TemplateInteractionMode;
  rect: TRect;
  safeArea: TemplateSafeArea;
}) {
  if (args.mode === 'move') {
    return clampTemplateRect(
      {
        ...args.rect,
        x: args.rect.x + args.deltaX,
        y: args.rect.y + args.deltaY,
      },
      args.safeArea,
      args.constraint,
    );
  }

  const right = args.rect.x + args.rect.width;
  const bottom = args.rect.y + args.rect.height;
  let left = args.rect.x;
  let top = args.rect.y;
  let width = args.rect.width;
  let height = args.rect.height;

  if (args.mode === 'nw' || args.mode === 'sw') {
    left = clampMm(left + args.deltaX, args.safeArea.x, right - args.constraint.minWidth);
    width = right - left;
  }

  if (args.mode === 'ne' || args.mode === 'se') {
    width = clampMm(
      width + args.deltaX,
      args.constraint.minWidth,
      Math.min(args.constraint.maxWidth, args.safeArea.x + args.safeArea.width - left),
    );
  }

  if (args.mode === 'nw' || args.mode === 'ne') {
    top = clampMm(top + args.deltaY, args.safeArea.y, bottom - args.constraint.minHeight);
    height = bottom - top;
  }

  if (args.mode === 'sw' || args.mode === 'se') {
    height = clampMm(
      height + args.deltaY,
      args.constraint.minHeight,
      Math.min(args.constraint.maxHeight, args.safeArea.y + args.safeArea.height - top),
    );
  }

  width = clampMm(width, args.constraint.minWidth, args.constraint.maxWidth);
  height = clampMm(height, args.constraint.minHeight, args.constraint.maxHeight);

  if (args.mode === 'nw' || args.mode === 'sw') {
    left = right - width;
  }

  if (args.mode === 'nw' || args.mode === 'ne') {
    top = bottom - height;
  }

  return clampTemplateRect(
    {
      ...args.rect,
      height,
      width,
      x: left,
      y: top,
    },
    args.safeArea,
    args.constraint,
  );
}

export function remapTemplateRectToSafeArea<TRect extends TemplateRectMm>(args: {
  constraint: TemplateObjectSizeConstraint;
  fromSafeArea: TemplateSafeArea;
  rect: TRect;
  toSafeArea: TemplateSafeArea;
}) {
  const scaleX = args.toSafeArea.width / Math.max(args.fromSafeArea.width, 1);
  const scaleY = args.toSafeArea.height / Math.max(args.fromSafeArea.height, 1);
  const nextWidth = clampMm(
    args.rect.width * scaleX,
    args.constraint.minWidth,
    args.constraint.maxWidth,
  );
  const nextHeight = clampMm(
    args.rect.height * scaleY,
    args.constraint.minHeight,
    args.constraint.maxHeight,
  );
  const horizontalAnchor = resolveHorizontalAnchor(args.rect, args.fromSafeArea);
  const verticalAnchor = resolveVerticalAnchor(args.rect, args.fromSafeArea);
  const leftRatio = (args.rect.x - args.fromSafeArea.x) / Math.max(args.fromSafeArea.width, 1);
  const rightDistance =
    args.fromSafeArea.x + args.fromSafeArea.width - (args.rect.x + args.rect.width);
  const rightRatio = rightDistance / Math.max(args.fromSafeArea.width, 1);
  const topRatio = (args.rect.y - args.fromSafeArea.y) / Math.max(args.fromSafeArea.height, 1);
  const bottomDistance =
    args.fromSafeArea.y + args.fromSafeArea.height - (args.rect.y + args.rect.height);
  const bottomRatio = bottomDistance / Math.max(args.fromSafeArea.height, 1);
  const centerXRatio =
    (args.rect.x + args.rect.width / 2 - args.fromSafeArea.x) /
    Math.max(args.fromSafeArea.width, 1);
  const centerYRatio =
    (args.rect.y + args.rect.height / 2 - args.fromSafeArea.y) /
    Math.max(args.fromSafeArea.height, 1);

  let x = args.toSafeArea.x + leftRatio * args.toSafeArea.width;
  let y = args.toSafeArea.y + topRatio * args.toSafeArea.height;

  if (horizontalAnchor === 'center') {
    x = args.toSafeArea.x + centerXRatio * args.toSafeArea.width - nextWidth / 2;
  } else if (horizontalAnchor === 'right') {
    x = args.toSafeArea.x + args.toSafeArea.width - nextWidth - rightRatio * args.toSafeArea.width;
  }

  if (verticalAnchor === 'center') {
    y = args.toSafeArea.y + centerYRatio * args.toSafeArea.height - nextHeight / 2;
  } else if (verticalAnchor === 'bottom') {
    y =
      args.toSafeArea.y + args.toSafeArea.height - nextHeight - bottomRatio * args.toSafeArea.height;
  }

  return clampTemplateRect(
    {
      ...args.rect,
      height: nextHeight,
      width: nextWidth,
      x,
      y,
    },
    args.toSafeArea,
    args.constraint,
  );
}

export function resizeTemplateRectWithAnchors<TRect extends TemplateRectMm>(args: {
  constraint: TemplateObjectSizeConstraint;
  nextHeight: number;
  nextWidth: number;
  rect: TRect;
  safeArea: TemplateSafeArea;
}) {
  const clampedWidth = clampMm(
    args.nextWidth,
    args.constraint.minWidth,
    args.constraint.maxWidth,
  );
  const clampedHeight = clampMm(
    args.nextHeight,
    args.constraint.minHeight,
    args.constraint.maxHeight,
  );
  const horizontalAnchor = resolveHorizontalAnchor(args.rect, args.safeArea);
  const verticalAnchor = resolveVerticalAnchor(args.rect, args.safeArea);
  let x = args.rect.x;
  let y = args.rect.y;

  if (horizontalAnchor === 'center') {
    x = args.rect.x + args.rect.width / 2 - clampedWidth / 2;
  } else if (horizontalAnchor === 'right') {
    x = args.rect.x + args.rect.width - clampedWidth;
  }

  if (verticalAnchor === 'center') {
    y = args.rect.y + args.rect.height / 2 - clampedHeight / 2;
  } else if (verticalAnchor === 'bottom') {
    y = args.rect.y + args.rect.height - clampedHeight;
  }

  return clampTemplateRect(
    {
      ...args.rect,
      height: clampedHeight,
      width: clampedWidth,
      x,
      y,
    },
    args.safeArea,
    args.constraint,
  );
}

function resolveHorizontalAnchor(rect: TemplateRectMm, safeArea: TemplateSafeArea): TemplateAnchor {
  const leftDistance = rect.x - safeArea.x;
  const rightDistance = safeArea.x + safeArea.width - (rect.x + rect.width);
  const centerDistance = Math.abs(rect.x + rect.width / 2 - (safeArea.x + safeArea.width / 2));

  if (centerDistance < safeArea.width * 0.08) {
    return 'center';
  }

  return leftDistance <= rightDistance ? 'left' : 'right';
}

function resolveVerticalAnchor(rect: TemplateRectMm, safeArea: TemplateSafeArea): TemplateAnchor {
  const topDistance = rect.y - safeArea.y;
  const bottomDistance = safeArea.y + safeArea.height - (rect.y + rect.height);
  const centerDistance = Math.abs(rect.y + rect.height / 2 - (safeArea.y + safeArea.height / 2));

  if (centerDistance < safeArea.height * 0.08) {
    return 'center';
  }

  return topDistance <= bottomDistance ? 'top' : 'bottom';
}

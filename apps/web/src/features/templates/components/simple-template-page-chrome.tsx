'use client';

import type { GenericTemplateChromeStyle } from '../core/generic-template-document';

export function SimpleTemplatePageChrome({ lineStyle }: { lineStyle: GenericTemplateChromeStyle }) {
  return (
    <div
      className="absolute inset-0 bg-white"
      style={{
        borderColor: lineStyle.color,
        borderStyle: 'solid',
        borderWidth: lineStyle.visible ? `${lineStyle.widthPx}px` : '0px',
      }}
    />
  );
}

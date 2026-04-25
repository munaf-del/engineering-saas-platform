import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DraftingInspectorDrawer } from './drafting-inspector-drawer';

const childrenByTab = {
  setup: <div>Setup compact content</div>,
  properties: <div>Selected pile P1 properties</div>,
  layers: <div>Layer controls</div>,
  sources: <div>Source coverage controls</div>,
  underlays: <div>PDF underlay controls</div>,
  sheets: <div>Sheet output controls</div>,
  transmittals: <div>Transmittal controls</div>,
  schedules: <div>Schedule content only when active</div>,
};

describe('DraftingInspectorDrawer', () => {
  it('renders a collapsed bottom drawer summary without active tab content', () => {
    const markup = renderToStaticMarkup(
      <DraftingInspectorDrawer
        activeTab="properties"
        childrenByTab={childrenByTab}
        expanded={false}
        objectCount={9}
        onExpandedChange={() => undefined}
        onTabChange={() => undefined}
        selectedObjectSummary="No object selected"
      />,
    );

    expect(markup).toContain('data-testid="drafting-inspector-drawer"');
    expect(markup).toContain('data-state="collapsed"');
    expect(markup).toContain('No object selected');
    expect(markup).toContain('Expand Inspector');
    expect(markup).not.toContain('Selected pile P1 properties');
    expect(markup).not.toContain('Schedule content only when active');
  });

  it('renders only the active expanded tab content in a compact drawer body', () => {
    const markup = renderToStaticMarkup(
      <DraftingInspectorDrawer
        activeTab="schedules"
        childrenByTab={childrenByTab}
        expanded
        objectCount={9}
        onExpandedChange={() => undefined}
        onTabChange={() => undefined}
        selectedObjectSummary="SW-01 · secant pile wall"
      />,
    );

    expect(markup).toContain('data-state="expanded"');
    expect(markup).toContain('data-testid="drafting-inspector-drawer-body"');
    expect(markup).toContain('Collapse Inspector');
    expect(markup).toContain('Schedule content only when active');
    expect(markup).not.toContain('Selected pile P1 properties');
  });
});

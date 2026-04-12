import type { ReactNode } from 'react';
import styles from './pricing-summary-print-document.module.css';
import type {
  PricingPileScheduleRow,
  PricingSectionElevationRow,
  PricingSummaryData,
  PricingTypeSummaryRow,
} from './pricing-summary';
import {
  MultiPileElevationSketch,
  MultiPileSectionSketch,
  canRenderMultiPileElevationSketch,
  canRenderMultiPileSectionSketch,
} from './struct-visuals';

const PILE_SCHEDULE_COLUMNS = [
  { label: 'Pile ID', width: '6%' },
  { label: 'Parent Joint', width: '6%' },
  { label: 'Pile Type', width: '8%' },
  { label: 'Diameter', width: '5%' },
  { label: 'Concrete Grade', width: '7%' },
  { label: 'Cover / Durability', width: '8%' },
  { label: 'Reinforcement Summary', width: '10%' },
  { label: 'Tendon Summary', width: '7%' },
  { label: 'Founding / Socket Material', width: '7%' },
  { label: 'Adopted Socket Length', width: '5%' },
  { label: 'Cage Length', width: '5%' },
  { label: 'Structural Section Summary', width: '10%' },
  { label: 'Elevation Summary', width: '9%' },
  { label: 'Status / Notes', width: '7%' },
] as const;

const TYPE_SUMMARY_COLUMNS = [
  { label: 'Pile Type', width: '9%' },
  { label: 'Count', width: '5%' },
  { label: 'Diameter', width: '7%' },
  { label: 'Concrete Grade', width: '9%' },
  { label: 'Reinforcement Summary', width: '12%' },
  { label: 'Tendon Summary', width: '8%' },
  { label: 'Cover / Durability', width: '10%' },
  { label: 'Typical Socket Material', width: '9%' },
  { label: 'Typical Socket Length', width: '7%' },
  { label: 'Typical Cage Length', width: '7%' },
  { label: 'Structural Section Summary', width: '9%' },
  { label: 'Elevation Summary', width: '8%' },
] as const;

export function PricingSummaryPrintDocument({
  data,
  groupName,
}: {
  data: PricingSummaryData;
  groupName?: string;
}) {
  return (
    <article className={styles.document} data-testid="pricing-summary-print-document">
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <div className={styles.eyebrow}>Multi-Pile Pricing Summary</div>
          <h1 className={styles.title}>{data.header.projectName}</h1>
          <p className={styles.subtitle}>
            Compact estimator pricing schedule from the current Multi-Pile pricing summary.
            {groupName ? ` ${groupName}` : ''}
          </p>
        </div>
        <div className={styles.summaryChips}>
          <SummaryChip label="Pile Count" value={`${data.header.pileCount}`} />
          <SummaryChip label="Active Pile Types" value={`${data.header.activePileTypeCount}`} />
          <SummaryChip label="Pile Schedule Rows" value={`${data.pileRows.length}`} />
          <SummaryChip label="Type Summary Rows" value={`${data.typeSummaryRows.length}`} />
        </div>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>Project Summary</h2>
        <div className={styles.metaGrid}>
          <SummaryField label="Project Number" value={data.header.projectNumber} />
          <SummaryField label="Project Name" value={data.header.projectName} />
          <SummaryField label="Client" value={data.header.client} />
          <SummaryField label="Location / Address" value={data.header.location} />
          <SummaryField label="Revision" value={data.header.revision} />
          <SummaryField label="Issue Date" value={data.header.issueDate} />
          <SummaryField label="Pile Count" value={`${data.header.pileCount}`} />
          <SummaryField
            label="Active Pile Type Count"
            value={`${data.header.activePileTypeCount}`}
          />
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeaderRow}>
          <h2 className={styles.sectionHeading}>Per-Pile Pricing Schedule</h2>
          <div className={styles.sectionNote}>
            One row per derived pile from the current pricing summary data.
          </div>
        </div>
        <div className={styles.tableShell}>
          {data.pileRows.length > 0 ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <colgroup>
                  {PILE_SCHEDULE_COLUMNS.map((column) => (
                    <col key={column.label} style={{ width: column.width }} />
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    {PILE_SCHEDULE_COLUMNS.map((column) => (
                      <th key={column.label}>{column.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.pileRows.map((row) => (
                    <PileScheduleRowView
                      key={`${row.pileId}-${row.parentJoint}-${row.pileTypeId}`}
                      row={row}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.emptyState}>No derived pile rows are available yet.</div>
          )}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeaderRow}>
          <h2 className={styles.sectionHeading}>Type Quantity Summary</h2>
          <div className={styles.sectionNote}>
            Grouped by pile type from the same pricing summary builder used by XLSX export.
          </div>
        </div>
        <div className={styles.tableShell}>
          {data.typeSummaryRows.length > 0 ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <colgroup>
                  {TYPE_SUMMARY_COLUMNS.map((column) => (
                    <col key={column.label} style={{ width: column.width }} />
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    {TYPE_SUMMARY_COLUMNS.map((column) => (
                      <th key={column.label}>{column.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.typeSummaryRows.map((row) => (
                    <TypeSummaryRowView key={row.pileTypeId} row={row} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.emptyState}>No active pile types are available yet.</div>
          )}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeaderRow}>
          <h2 className={styles.sectionHeading}>Pile Type Visual Summary</h2>
          <div className={styles.sectionNote}>
            Compact section and reinforcement elevation visuals from the same stored STRUCT type
            settings used in the app.
          </div>
        </div>
        {data.sectionElevationRows.length > 0 ? (
          <div className={styles.visualGrid}>
            {data.sectionElevationRows.map((row) => (
              <TypeVisualSummaryCard key={row.pileTypeId} row={row} />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>No pile type visual summaries are available yet.</div>
        )}
      </section>

      <footer className={styles.footer}>
        Pending values are shown where current project data, GEO outputs, or stored structural
        selections are not yet available.
      </footer>
    </article>
  );
}

function SummaryChip({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.summaryChip}>
      <span className={styles.summaryChipLabel}>{label}</span>
      <span className={styles.summaryChipValue}>{value}</span>
    </div>
  );
}

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.summaryField}>
      <div className={styles.summaryFieldLabel}>{label}</div>
      <div className={styles.summaryFieldValue}>{value}</div>
    </div>
  );
}

function PileScheduleRowView({ row }: { row: PricingPileScheduleRow }) {
  return (
    <tr>
      <td className={styles.identifierCell}>{row.pileId}</td>
      <td>{row.parentJoint}</td>
      <td>{row.pileType}</td>
      <td>{row.diameter}</td>
      <td>{row.concreteGrade}</td>
      <td>{row.coverDurability}</td>
      <td>{row.reinforcementSummary}</td>
      <td>{row.tendonSummary}</td>
      <td>{row.foundingSocketMaterial}</td>
      <td>{row.adoptedSocketLength}</td>
      <td>{row.cageLength}</td>
      <td>{row.structuralSectionSummary}</td>
      <td>{row.elevationSummary}</td>
      <td>{row.statusNotes}</td>
    </tr>
  );
}

function TypeSummaryRowView({ row }: { row: PricingTypeSummaryRow }) {
  return (
    <tr>
      <td className={styles.identifierCell}>{row.pileType}</td>
      <td>{row.count}</td>
      <td>{row.diameter}</td>
      <td>{row.concreteGrade}</td>
      <td>{row.reinforcementSummary}</td>
      <td>{row.tendonSummary}</td>
      <td>{row.coverDurability}</td>
      <td>{row.typicalSocketMaterial}</td>
      <td>{row.typicalSocketLength}</td>
      <td>{row.typicalCageLength}</td>
      <td>{row.structuralSectionSummary}</td>
      <td>{row.elevationSummary}</td>
    </tr>
  );
}

function TypeVisualSummaryCard({ row }: { row: PricingSectionElevationRow }) {
  const canRenderSectionVisual = canRenderMultiPileSectionSketch(
    row.pileTypeDefinition,
    row.structSettings,
  );
  const canRenderElevationVisual = canRenderMultiPileElevationSketch(
    row.pileTypeDefinition,
    row.structSettings,
  );

  return (
    <div className={styles.visualCard}>
      <h3 className={styles.visualTitle}>{row.pileType}</h3>
      <div className={styles.visualPair}>
        <VisualPanel title="Section Sketch">
          {canRenderSectionVisual && row.pileTypeDefinition && row.structSettings ? (
            <MultiPileSectionSketch
              type={row.pileTypeDefinition}
              settings={row.structSettings}
              className="max-w-[220px]"
            />
          ) : (
            <VisualFallback />
          )}
        </VisualPanel>

        <VisualPanel title="Reinforcement Elevation">
          {canRenderElevationVisual && row.pileTypeDefinition && row.structSettings ? (
            <MultiPileElevationSketch
              type={row.pileTypeDefinition}
              settings={row.structSettings}
              className="max-w-[220px]"
            />
          ) : (
            <VisualFallback />
          )}
        </VisualPanel>
      </div>

      <div className={styles.captionGrid}>
        <CaptionField label="Structural Section Summary" value={row.structuralSectionSummary} />
        <CaptionField label="Elevation Summary" value={row.elevationSummary} />
      </div>
    </div>
  );
}

function VisualPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={styles.visualPanel}>
      <div className={styles.visualPanelTitle}>{title}</div>
      <div className={styles.visualPanelBody}>{children}</div>
    </div>
  );
}

function VisualFallback() {
  return <div className={styles.visualFallback}>Text-only summary shown below</div>;
}

function CaptionField({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.captionField}>
      <div className={styles.captionLabel}>{label}</div>
      <div className={styles.captionValue}>{value}</div>
    </div>
  );
}

import type { ReactNode } from 'react';
import styles from './report-summary-print-document.module.css';
import type {
  MultiPileReportContextCard,
  MultiPileReportFullVerificationSchedule,
  MultiPileReportGoverningTraceRow,
  MultiPileReportJustificationAppendixData,
  MultiPileReportSummaryField,
  MultiPileReportStructTypeSummaryCard,
  MultiPileReportSummaryData,
} from './report-summary';

const PILE_TYPE_COLUMNS = [
  'Pile Type',
  'Count',
  'Diameter',
  'Concrete Grade',
  'Reinforcement Summary',
  'Tendon Summary',
  'Cover / Durability',
  'Typical Socket Material',
  'Typical Socket Length',
  'Typical Cage Length',
  'Structural Section Summary',
  'Elevation Summary',
  'GEO Status',
  'STRUCT Status',
] as const;

const VERIFICATION_COLUMNS = [
  'Pile',
  'Joint',
  'Pile Type',
  'GEO',
  'STRUCT',
  'Governing Source',
  'Source Detail',
  'Notes',
] as const;

const GEO_TYPE_COLUMNS = [
  'Pile Type',
  'Piles',
  'GEO Status',
  'Representative Basis',
  'Redundancy / phi_g',
  'Founding / Socket Material',
  'Adopted Socket Length',
  'Note',
] as const;

const REFERENCE_COLUMNS = [
  'Reference',
  'Document Type',
  'Document Number',
  'Revision',
  'Issue Date',
  'Author / Organisation',
  'Report Use',
  'Notes',
] as const;

const COMBINATION_BASIS_COLUMNS = [
  'Combination',
  'Source',
  'Include In Envelope',
  'Expression / Summary',
] as const;

const PRICING_SCHEDULE_COLUMNS = [
  'Pile ID',
  'Parent Joint',
  'Pile Type',
  'Diameter',
  'Concrete Grade',
  'Cover / Durability',
  'Reinforcement Summary',
  'Tendon Summary',
  'Founding / Socket Material',
  'Adopted Socket Length',
  'Cage Length',
  'Structural Section Summary',
  'Elevation Summary',
  'Status / Notes',
] as const;

const PRICING_TYPE_COLUMNS = [
  'Pile Type',
  'Count',
  'Diameter',
  'Concrete Grade',
  'Reinforcement Summary',
  'Tendon Summary',
  'Cover / Durability',
  'Typical Socket Material',
  'Typical Socket Length',
  'Typical Cage Length',
  'Structural Section Summary',
  'Elevation Summary',
] as const;

type PrintTone = 'default' | 'success' | 'warning' | 'danger' | 'muted';

const TONE_CLASS_BY_TONE = {
  default: '',
  success: styles.toneSuccess ?? '',
  warning: styles.toneWarning ?? '',
  danger: styles.toneDanger ?? '',
  muted: styles.toneMuted ?? '',
} as const satisfies Record<PrintTone, string>;

const VERIFICATION_TONE_BY_STATUS = {
  pass: 'success',
  warn: 'warning',
  fail: 'danger',
  unresolved: 'muted',
} as const satisfies Record<
  MultiPileReportSummaryData['pileVerificationSummary']['rows'][number]['status'],
  Exclude<PrintTone, 'default'>
>;

const REPORT_TITLE_META = {
  default: {
    eyebrow: 'Multi-Pile Report Summary',
    subtitle:
      'Compact engineering and client summary built from the current project metadata, authored Multi-Pile state, and latest stored GEO / STRUCT outputs.',
    modeLabel: 'Compact Summary',
  },
  pricing: {
    eyebrow: 'Multi-Pile Report + Pricing Appendix',
    subtitle:
      'Compact engineering summary with the optional pricing appendix appended after the default report body.',
    modeLabel: 'Summary + Pricing Appendix',
  },
  justification: {
    eyebrow: 'Multi-Pile Report + Justification Appendix',
    subtitle:
      'Compact engineering summary with a source-backed justification appendix appended after the default report body.',
    modeLabel: 'Summary + Justification Appendix',
  },
  full: {
    eyebrow: 'Multi-Pile Full Report',
    subtitle:
      'Compact engineering summary with the source-backed justification appendix and pricing appendix appended after the default report body.',
    modeLabel: 'Compact + Justification + Pricing',
  },
} as const satisfies Record<
  NonNullable<MultiPileReportSummaryData['appendixMode']> | 'default',
  {
    eyebrow: string;
    subtitle: string;
    modeLabel: string;
  }
>;

export function MultiPileReportSummaryPrintDocument({
  data,
}: {
  data: MultiPileReportSummaryData;
}) {
  const titleMeta = reportTitleMeta(data.appendixMode);

  return (
    <article className={styles.document} data-testid="multi-pile-report-summary-print-document">
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <div className={styles.eyebrow}>{titleMeta.eyebrow}</div>
          <h1 className={styles.title}>{data.header.projectName}</h1>
          <p className={styles.subtitle}>{titleMeta.subtitle}</p>
        </div>
        <div className={styles.summaryStrip}>
          <SummaryChip label="Project Number" value={data.header.projectNumber} />
          <SummaryChip label="Pile Count" value={`${data.header.pileCount}`} />
          <SummaryChip label="Active Pile Types" value={`${data.header.activePileTypeCount}`} />
          <SummaryChip label="Report Mode" value={titleMeta.modeLabel} />
          <SummaryChip label="Pile Group / Calculator" value={data.header.title} />
        </div>
      </header>

      <section className={styles.section}>
        <SectionHeading title="Report Header" />
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
          <SummaryField label="Pile Group / Calculator Title" value={data.header.title} />
        </div>
      </section>

      <section className={styles.section}>
        <SectionHeading title="Project Context Summary" />
        <CardGrid cards={data.projectContextSummary} />
      </section>

      <section className={styles.section}>
        <SectionHeading title="Load / Combination Summary" />
        <div className={styles.metaGrid}>
          <SummaryField
            label="Total Project Load Cases"
            value={`${data.loadCombinationSummary.projectLoadCaseCount}`}
          />
          <SummaryField
            label="Total Project Combinations"
            value={`${data.loadCombinationSummary.projectCombinationCount}`}
          />
          <SummaryField
            label="Selected Combinations in Multi-Pile"
            value={`${data.loadCombinationSummary.selectedCombinationCount}`}
          />
          <SummaryField
            label="Latest Run Summary"
            value={data.loadCombinationSummary.latestRunSummary}
          />
          <SummaryField
            label="Selected Combination Summary"
            value={data.loadCombinationSummary.selectedCombinationSummary}
          />
        </div>

        <div className={styles.tableSection}>
          <div className={styles.tableHeaderRow}>
            <div className={styles.tableTitle}>Latest Governing Combination Trace</div>
            <div className={styles.tableNote}>
              Compact project-wide trace from the latest stored envelope snapshot only.
            </div>
          </div>
          {data.loadCombinationSummary.governingTraceRows.length > 0 ? (
            <div className={styles.tableShell}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Value</th>
                    <th>Joint</th>
                    <th>Pile Type</th>
                    <th>Combination</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {data.loadCombinationSummary.governingTraceRows.map((row) => (
                    <GoverningTraceRowView key={row.key} row={row} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState text="No stored envelope trace is available yet. Run Envelope to populate this summary." />
          )}
        </div>
      </section>

      <section className={styles.section}>
        <SectionHeading title="Pile Type Summary" />
        {data.pileTypeSummaryRows.length > 0 ? (
          <div className={styles.tableShell}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {PILE_TYPE_COLUMNS.map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.pileTypeSummaryRows.map((row) => (
                  <tr key={row.pileType}>
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
                    <td>{row.geoStatus}</td>
                    <td>{row.structStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState text="No active pile types are currently available." />
        )}
      </section>

      <section className={styles.section}>
        <SectionHeading title="Pile Verification Summary" />
        <div className={styles.summaryStrip}>
          <SummaryChip
            label="Total Derived Piles"
            value={`${data.pileVerificationSummary.totalDerivedPiles}`}
          />
          <SummaryChip
            label="Pass"
            value={`${data.pileVerificationSummary.passCount}`}
            tone="success"
          />
          <SummaryChip
            label="Warn"
            value={`${data.pileVerificationSummary.warnCount}`}
            tone="warning"
          />
          <SummaryChip
            label="Fail"
            value={`${data.pileVerificationSummary.failCount}`}
            tone="danger"
          />
          <SummaryChip
            label="Unresolved"
            value={`${data.pileVerificationSummary.unresolvedCount}`}
            tone="muted"
          />
        </div>
        <p className={styles.modeNote}>{data.pileVerificationSummary.note}</p>
        {data.pileVerificationSummary.rows.length > 0 ? (
          <div className={styles.tableSection}>
            <div className={styles.tableHeaderRow}>
              <div className={styles.tableTitle}>Flagged Pile Rows</div>
              <div className={styles.tableNote}>
                Pass rows are intentionally omitted in compact mode.
              </div>
            </div>
            <VerificationRowsTable rows={data.pileVerificationSummary.rows} />
          </div>
        ) : (
          <EmptyState text={verificationEmptyText(data.pileVerificationSummary)} />
        )}
        {data.pileVerificationSummary.hiddenCount > 0 ? (
          <p className={styles.hiddenNote}>
            {data.pileVerificationSummary.hiddenCount} additional flagged / unresolved row(s) are
            omitted from the main body to keep the report readable.
          </p>
        ) : null}
      </section>

      <section className={styles.section}>
        <SectionHeading title="GEO Summary" />
        <CardGrid cards={data.geoSummary.cards} />
        <div className={styles.tableSection}>
          <div className={styles.tableHeaderRow}>
            <div className={styles.tableTitle}>Selected-Type GEO Snapshot</div>
            <div className={styles.tableNote}>
              Grouped by pile type and representative stored or authored GEO basis.
            </div>
          </div>
          {data.geoSummary.typeRows.length > 0 ? (
            <div className={styles.tableShell}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    {GEO_TYPE_COLUMNS.map((column) => (
                      <th key={column}>{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.geoSummary.typeRows.map((row) => (
                    <tr key={row.key}>
                      <td className={styles.identifierCell}>{row.pileType}</td>
                      <td>{row.pileCount}</td>
                      <td>{row.geoStatus}</td>
                      <td>{row.representativeBasis}</td>
                      <td>{`${row.redundancy} · ${row.phiG}`}</td>
                      <td>{row.foundingSocketMaterial}</td>
                      <td>{row.adoptedSocketLength}</td>
                      <td>{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState text="No active pile types are available for the GEO summary." />
          )}
        </div>
      </section>

      <section className={styles.section}>
        <SectionHeading title="STRUCT Summary" />
        <CardGrid cards={data.structSummary.cards} />
        {data.structSummary.typeCards.length > 0 ? (
          <div className={styles.structCardGrid}>
            {data.structSummary.typeCards.map((card) => (
              <StructSummaryCard key={card.pileType} card={card} />
            ))}
          </div>
        ) : (
          <EmptyState text="No active pile types are available for the STRUCT summary." />
        )}
      </section>

      {data.justificationAppendix ? (
        <JustificationAppendixSection data={data.justificationAppendix} />
      ) : null}

      {data.pricingAppendix ? (
        <section className={`${styles.section} ${styles.appendixSection}`}>
          <SectionHeading title="Pricing Summary Appendix" />
          <p className={styles.appendixIntro}>
            This appendix reuses the current shared pricing builder output without redesigning the
            pricing logic.
          </p>

          <div className={styles.metaGrid}>
            <SummaryField
              label="Project Number"
              value={data.pricingAppendix.header.projectNumber}
            />
            <SummaryField label="Project Name" value={data.pricingAppendix.header.projectName} />
            <SummaryField label="Client" value={data.pricingAppendix.header.client} />
            <SummaryField label="Location / Address" value={data.pricingAppendix.header.location} />
            <SummaryField label="Revision" value={data.pricingAppendix.header.revision} />
            <SummaryField label="Issue Date" value={data.pricingAppendix.header.issueDate} />
            <SummaryField label="Pile Count" value={`${data.pricingAppendix.header.pileCount}`} />
            <SummaryField
              label="Active Pile Type Count"
              value={`${data.pricingAppendix.header.activePileTypeCount}`}
            />
          </div>

          <div className={styles.tableSection}>
            <div className={styles.tableHeaderRow}>
              <div className={styles.tableTitle}>Per-Pile Pricing Schedule</div>
              <div className={styles.tableNote}>
                Current shared pricing builder output. Appendix only.
              </div>
            </div>
            {data.pricingAppendix.pileRows.length > 0 ? (
              <div className={styles.tableShell}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      {PRICING_SCHEDULE_COLUMNS.map((column) => (
                        <th key={column}>{column}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.pricingAppendix.pileRows.map((row) => (
                      <tr key={`${row.pileId}-${row.pileTypeId}`}>
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
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState text="No per-pile pricing rows are available yet." />
            )}
          </div>

          <div className={styles.tableSection}>
            <div className={styles.tableHeaderRow}>
              <div className={styles.tableTitle}>Type Quantity Summary</div>
              <div className={styles.tableNote}>
                Shared pricing builder type summary from the current SaaS state.
              </div>
            </div>
            {data.pricingAppendix.typeSummaryRows.length > 0 ? (
              <div className={styles.tableShell}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      {PRICING_TYPE_COLUMNS.map((column) => (
                        <th key={column}>{column}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.pricingAppendix.typeSummaryRows.map((row) => (
                      <tr key={row.pileTypeId}>
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
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState text="No pricing type quantity summary is available yet." />
            )}
          </div>
        </section>
      ) : null}
    </article>
  );
}

function JustificationAppendixSection({
  data,
}: {
  data: MultiPileReportJustificationAppendixData;
}) {
  return (
    <section className={`${styles.section} ${styles.appendixSection}`}>
      <SectionHeading title="Justification Appendix" />
      <p className={styles.appendixIntro}>
        Current project metadata, selected combinations, and latest stored GEO / STRUCT outputs
        only. No design commentary is added where the SaaS record is blank or pending.
      </p>

      <AppendixSubsection
        title="Report Header Reuse"
        content={
          <FieldGrid
            fields={[
              { label: 'Project Number', value: data.header.projectNumber },
              { label: 'Project Name', value: data.header.projectName },
              { label: 'Client', value: data.header.client },
              { label: 'Location / Address', value: data.header.location },
              { label: 'Revision', value: data.header.revision },
              { label: 'Issue Date', value: data.header.issueDate },
              { label: 'Pile Count', value: `${data.header.pileCount}` },
              { label: 'Active Pile Type Count', value: `${data.header.activePileTypeCount}` },
              { label: 'Pile Group / Calculator Title', value: data.header.title },
            ]}
          />
        }
      />

      <AppendixSubsection
        title="Project Context / Provenance Summary"
        content={<CardGrid cards={data.projectContextSummary} />}
      />

      <AppendixSubsection
        title="References / Report Provenance"
        content={
          <>
            <FieldGrid fields={data.reportProvenanceFields} />
            <div className={styles.tableSection}>
              <CardGrid cards={data.referenceSummaryCards} />
            </div>
            <div className={styles.tableSection}>
              <div className={styles.tableHeaderRow}>
                <div className={styles.tableTitle}>Active Project References</div>
                <div className={styles.tableNote}>
                  Current active references only, sorted by primary provenance role first.
                </div>
              </div>
              {data.referenceRows.length > 0 ? (
                <div className={styles.tableShell}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        {REFERENCE_COLUMNS.map((column) => (
                          <th key={column}>{column}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.referenceRows.map((row) => (
                        <tr key={row.key}>
                          <td className={styles.identifierCell}>{row.title}</td>
                          <td>{row.documentType}</td>
                          <td>{row.documentNumber}</td>
                          <td>{row.revision}</td>
                          <td>{row.issueDate}</td>
                          <td>{row.authorOrganisation}</td>
                          <td>{row.reportUse}</td>
                          <td>{row.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState text="No active project references are currently available." />
              )}
            </div>
          </>
        }
      />

      <AppendixSubsection
        title="GEO Basis Summary"
        content={
          <>
            <CardGrid cards={data.geoBasisCards} />
            <div className={styles.tableSection}>
              <div className={styles.tableHeaderRow}>
                <div className={styles.tableTitle}>Stored GEO Basis By Pile Type</div>
                <div className={styles.tableNote}>
                  Grouped by pile type and representative basis, with grouped GEO status rollups.
                </div>
              </div>
              <GeoTypeTable rows={data.geoTypeRows} />
            </div>
          </>
        }
      />

      <AppendixSubsection
        title="ARR Basis Summary"
        content={<CardGrid cards={data.arrBasisCards} />}
      />

      <AppendixSubsection
        title="Load / Combination Basis Summary"
        content={
          <>
            <CardGrid cards={data.loadBasisCards} />
            <div className={styles.tableSection}>
              <div className={styles.tableHeaderRow}>
                <div className={styles.tableTitle}>Selected Combination Basis</div>
                <div className={styles.tableNote}>
                  Current saved Multi-Pile selection only. No combination logic is regenerated here.
                </div>
              </div>
              {data.selectedCombinationRows.length > 0 ? (
                <div className={styles.tableShell}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        {COMBINATION_BASIS_COLUMNS.map((column) => (
                          <th key={column}>{column}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.selectedCombinationRows.map((row) => (
                        <tr key={row.key}>
                          <td className={styles.identifierCell}>{row.name}</td>
                          <td>{row.source}</td>
                          <td>{row.includeInEnvelope}</td>
                          <td>{row.expressionSummary}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState text="No selected Multi-Pile combinations are currently stored." />
              )}
            </div>
          </>
        }
      />

      <AppendixSubsection
        title="Latest Governing Combination Trace"
        content={
          data.governingTraceRows.length > 0 ? (
            <div className={styles.tableShell}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Value</th>
                    <th>Joint</th>
                    <th>Pile Type</th>
                    <th>Combination</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {data.governingTraceRows.map((row) => (
                    <GoverningTraceRowView key={row.key} row={row} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState text="No stored envelope trace is available yet. Run Envelope to populate this appendix section." />
          )
        }
      />

      <AppendixSubsection
        title="Pile Verification Focus"
        content={
          <>
            <div className={styles.summaryStrip}>
              <SummaryChip
                label="Total Derived Piles"
                value={`${data.pileVerificationFocus.summary.totalDerivedPiles}`}
              />
              <SummaryChip
                label="Pass"
                value={`${data.pileVerificationFocus.summary.passCount}`}
                tone="success"
              />
              <SummaryChip
                label="Warn"
                value={`${data.pileVerificationFocus.summary.warnCount}`}
                tone="warning"
              />
              <SummaryChip
                label="Fail"
                value={`${data.pileVerificationFocus.summary.failCount}`}
                tone="danger"
              />
              <SummaryChip
                label="Unresolved"
                value={`${data.pileVerificationFocus.summary.unresolvedCount}`}
                tone="muted"
              />
            </div>
            <p className={styles.modeNote}>{data.pileVerificationFocus.summary.note}</p>
            {data.pileVerificationFocus.groups.length > 0 ? (
              <div className={styles.structCardGrid}>
                {data.pileVerificationFocus.groups.map((group) => (
                  <div key={group.key} className={styles.structCard}>
                    <div className={styles.structCardHeader}>
                      <div>
                        <div className={styles.structCardLabel}>Pile Type</div>
                        <div className={styles.structCardTitle}>{group.pileType}</div>
                      </div>
                      <StatusLabel
                        text={
                          group.failCount > 0
                            ? `${group.failCount} fail`
                            : group.unresolvedCount > 0
                              ? `${group.unresolvedCount} unresolved`
                              : `${group.warnCount} warning`
                        }
                      />
                    </div>
                    <div className={styles.structMiniGrid}>
                      <MiniField label="Fail" value={`${group.failCount}`} />
                      <MiniField label="Warn" value={`${group.warnCount}`} />
                      <MiniField label="Unresolved" value={`${group.unresolvedCount}`} />
                      <MiniField label="Shown Rows" value={`${group.rows.length}`} />
                    </div>
                    <div className={styles.tableSection}>
                      <VerificationRowsTable rows={group.rows} rowKeyPrefix={group.key} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState text="No flagged, warning, failed, or unresolved pile rows are currently present." />
            )}
            {data.pileVerificationFocus.summary.hiddenCount > 0 ? (
              <p className={styles.hiddenNote}>
                {data.pileVerificationFocus.summary.hiddenCount} additional flagged / unresolved
                row(s) are omitted from the appendix detail to keep the report compact.
              </p>
            ) : null}
          </>
        }
      />

      {data.fullVerificationSchedule ? (
        <AppendixSubsection
          title="Detailed Pile Verification Schedule"
          content={<FullVerificationScheduleSection data={data.fullVerificationSchedule} />}
        />
      ) : null}

      <AppendixSubsection
        title="STRUCT Governing Basis / Worst-Case Summary By Pile Type"
        content={
          <>
            <CardGrid cards={data.structSummary.cards} />
            {data.structSummary.typeCards.length > 0 ? (
              <div className={styles.structCardGrid}>
                {data.structSummary.typeCards.map((card) => (
                  <StructSummaryCard key={card.pileType} card={card} />
                ))}
              </div>
            ) : (
              <EmptyState text="No active pile types are available for the STRUCT appendix summary." />
            )}
          </>
        }
      />

      <AppendixSubsection
        title="Open Issues / Pending Data / Unresolved Items"
        content={
          data.openIssues.length > 0 ? (
            <ul className={styles.issueList}>
              {data.openIssues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          ) : (
            <EmptyState text="No open issues are currently exposed by the stored report inputs." />
          )
        }
      />
    </section>
  );
}

function SectionHeading({ title }: { title: string }) {
  return <h2 className={styles.sectionHeading}>{title}</h2>;
}

function AppendixSubsection({ title, content }: { title: string; content: ReactNode }) {
  return (
    <div className={styles.tableSection}>
      <div className={styles.tableHeaderRow}>
        <div className={styles.tableTitle}>{title}</div>
      </div>
      {content}
    </div>
  );
}

function SummaryChip({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: PrintTone;
}) {
  return (
    <div className={`${styles.summaryChip} ${toneClass(tone)}`}>
      <div className={styles.summaryChipLabel}>{label}</div>
      <div className={styles.summaryChipValue}>{value}</div>
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

function FieldGrid({ fields }: { fields: MultiPileReportSummaryField[] }) {
  return (
    <div className={styles.metaGrid}>
      {fields.map((field) => (
        <SummaryField key={field.label} label={field.label} value={field.value} />
      ))}
    </div>
  );
}

function CardGrid({ cards }: { cards: MultiPileReportContextCard[] }) {
  return (
    <div className={styles.cardGrid}>
      {cards.map((card) => (
        <div key={card.label} className={`${styles.card} ${toneClass(card.tone)}`}>
          <div className={styles.cardLabel}>{card.label}</div>
          <div className={styles.cardValue}>{card.value}</div>
          <div className={styles.cardDetail}>{card.detail}</div>
        </div>
      ))}
    </div>
  );
}

function GoverningTraceRowView({ row }: { row: MultiPileReportGoverningTraceRow }) {
  return (
    <tr>
      <td className={styles.identifierCell}>{row.label}</td>
      <td>{row.value}</td>
      <td>{row.jointLabel}</td>
      <td>{row.pileTypeId}</td>
      <td>{row.combinationName}</td>
      <td>{row.source}</td>
    </tr>
  );
}

function GeoTypeTable({ rows }: { rows: MultiPileReportJustificationAppendixData['geoTypeRows'] }) {
  if (rows.length === 0) {
    return <EmptyState text="No active pile types are available for the GEO appendix summary." />;
  }

  return (
    <div className={styles.tableShell}>
      <table className={styles.table}>
        <thead>
          <tr>
            {GEO_TYPE_COLUMNS.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td className={styles.identifierCell}>{row.pileType}</td>
              <td>{row.pileCount}</td>
              <td>{row.geoStatus}</td>
              <td>{row.representativeBasis}</td>
              <td>{`${row.redundancy} · ${row.phiG}`}</td>
              <td>{row.foundingSocketMaterial}</td>
              <td>{row.adoptedSocketLength}</td>
              <td>{row.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VerificationRowsTable({
  rows,
  rowKeyPrefix = 'verification',
}: {
  rows: MultiPileReportSummaryData['pileVerificationSummary']['rows'];
  rowKeyPrefix?: string;
}) {
  return (
    <div className={styles.tableShell}>
      <table className={styles.table}>
        <thead>
          <tr>
            {VERIFICATION_COLUMNS.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${rowKeyPrefix}-${row.pileId}-${row.pileType}`}>
              <td className={styles.identifierCell}>
                <StatusPill status={row.status} />
                <div className={styles.cellMeta}>{row.pileId}</div>
              </td>
              <td>{row.jointLabel}</td>
              <td>{row.pileType}</td>
              <td>{row.geoStatus}</td>
              <td>{row.structStatus}</td>
              <td>{row.governingSource}</td>
              <td>{row.governingDetail}</td>
              <td>{row.noteSummary}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FullVerificationScheduleSection({
  data,
}: {
  data: MultiPileReportFullVerificationSchedule;
}) {
  return (
    <>
      <div className={styles.summaryStrip}>
        <SummaryChip label="Total Derived Piles" value={`${data.summary.totalDerivedPiles}`} />
        <SummaryChip label="Pass" value={`${data.summary.passCount}`} tone="success" />
        <SummaryChip label="Warn" value={`${data.summary.warnCount}`} tone="warning" />
        <SummaryChip label="Fail" value={`${data.summary.failCount}`} tone="danger" />
        <SummaryChip label="Unresolved" value={`${data.summary.unresolvedCount}`} tone="muted" />
      </div>
      <p className={styles.modeNote}>{data.summary.note}</p>
      {data.groups.length > 0 ? (
        <div className={styles.structCardGrid}>
          {data.groups.map((group) => (
            <VerificationScheduleGroupCard key={group.key} group={group} />
          ))}
        </div>
      ) : (
        <EmptyState text="No derived piles are currently available for the full verification schedule." />
      )}
    </>
  );
}

function VerificationScheduleGroupCard({
  group,
}: {
  group: MultiPileReportFullVerificationSchedule['groups'][number];
}) {
  return (
    <div className={styles.structCard}>
      <div className={styles.structCardHeader}>
        <div>
          <div className={styles.structCardLabel}>Pile Type</div>
          <div className={styles.structCardTitle}>{group.pileType}</div>
        </div>
        <StatusLabel text={verificationGroupStatusLabel(group)} />
      </div>
      <div className={styles.structMiniGrid}>
        <MiniField label="Total" value={`${group.totalDerivedPiles}`} />
        <MiniField label="Pass" value={`${group.passCount}`} />
        <MiniField label="Warn" value={`${group.warnCount}`} />
        <MiniField label="Fail" value={`${group.failCount}`} />
        <MiniField label="Unresolved" value={`${group.unresolvedCount}`} />
      </div>
      <div className={styles.tableSection}>
        <VerificationRowsTable rows={group.rows} rowKeyPrefix={group.key} />
      </div>
    </div>
  );
}

function StructSummaryCard({ card }: { card: MultiPileReportStructTypeSummaryCard }) {
  return (
    <div className={styles.structCard}>
      <div className={styles.structCardHeader}>
        <div>
          <div className={styles.structCardLabel}>Pile Type</div>
          <div className={styles.structCardTitle}>{card.pileType}</div>
        </div>
        <StatusLabel text={card.status} />
      </div>
      <div className={styles.structMiniGrid}>
        <MiniField label="Pile Count" value={`${card.pileCount}`} />
        <MiniField label="Representative Pile" value={card.representativePile} />
        <MiniField label="Worst Joint" value={card.worstJoint} />
        <MiniField label="Axial Util" value={card.axialUtil} />
        <MiniField label="P-M Util" value={card.pmUtil} />
        <MiniField label="Shear Util" value={card.shearUtil} />
        <MiniField label="Compliance Summary" value={card.complianceSummary} />
      </div>
      <div className={styles.structTraceBlock}>
        <div className={styles.structTraceLabel}>Governing Source / Combo</div>
        <div className={styles.structTraceValue}>{card.governingSource}</div>
        <div className={styles.structTraceMeta}>{card.governingCombo}</div>
      </div>
    </div>
  );
}

function MiniField({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.miniField}>
      <div className={styles.miniFieldLabel}>{label}</div>
      <div className={styles.miniFieldValue}>{value}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className={styles.emptyState}>{text}</div>;
}

function verificationEmptyText(summary: MultiPileReportSummaryData['pileVerificationSummary']) {
  if (summary.totalDerivedPiles === 0) {
    return 'No derived piles are currently available in the saved register.';
  }
  if (
    summary.mode === 'summary-only' &&
    summary.passCount === summary.totalDerivedPiles &&
    summary.warnCount === 0 &&
    summary.failCount === 0 &&
    summary.unresolvedCount === 0
  ) {
    return `All ${summary.totalDerivedPiles} derived pile(s) passed the stored GEO and STRUCT checks.`;
  }
  return 'No flagged verification rows are currently shown in the compact body.';
}

function StatusPill({ status }: { status: 'pass' | 'warn' | 'fail' | 'unresolved' }) {
  return (
    <span className={`${styles.statusPill} ${toneClass(VERIFICATION_TONE_BY_STATUS[status])}`}>
      {status}
    </span>
  );
}

function StatusLabel({ text }: { text: string }) {
  const normalized = text.toLowerCase();
  const tone = normalized.includes('fail')
    ? 'danger'
    : normalized.includes('warning')
      ? 'warning'
      : normalized.includes('pass')
        ? 'success'
        : 'muted';
  return <span className={`${styles.statusPill} ${toneClass(tone)}`}>{text}</span>;
}

function toneClass(tone: PrintTone | undefined) {
  return TONE_CLASS_BY_TONE[tone ?? 'default'];
}

function verificationGroupStatusLabel(
  group: MultiPileReportFullVerificationSchedule['groups'][number],
) {
  if (group.failCount > 0) {
    return `${group.failCount} fail`;
  }
  if (group.unresolvedCount > 0) {
    return `${group.unresolvedCount} unresolved`;
  }
  if (group.warnCount > 0) {
    return `${group.warnCount} warning`;
  }
  return 'All pass';
}

function reportTitleMeta(appendixMode: MultiPileReportSummaryData['appendixMode']) {
  return REPORT_TITLE_META[appendixMode ?? 'default'];
}

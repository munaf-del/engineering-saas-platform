import { PrismaClient } from '@prisma/client';

type WorkType =
  | 'general_construction'
  | 'bored_piling'
  | 'driven_piling'
  | 'rock_breaking'
  | 'blasting'
  | 'excavation'
  | 'dynamic_compaction';

type CriterionRowSeed = {
  rowKey: string;
  label: string;
  receiverType?: string;
  structureType?: string;
  timePeriod?: string;
  basisType: string;
  referenceBase?: string;
  relativeOffset?: string;
  criterionValue?: string;
  preferredValue?: string;
  maximumValue?: string;
  alertValue?: string;
  stopWorkValue?: string;
  absoluteMaxValue?: string;
  valueMin?: string;
  valueMax?: string;
  frequencyMinHz?: string;
  frequencyMaxHz?: string;
  weekdayStart?: string;
  weekdayEnd?: string;
  saturdayStart?: string;
  saturdayEnd?: string;
  sundayAllowed?: boolean;
  publicHolidayAllowed?: boolean;
  exceedanceAllowancePercent?: string;
  exceedanceWindowText?: string;
  unit?: string;
  sourceClause?: string;
  rowNotes?: string;
  sortOrder: number;
  workTypes: WorkType[];
};

type CriterionGroupSeed = {
  slug: string;
  title: string;
  criterionCategory: string;
  metric: string;
  locationBasis?: string;
  description?: string;
  sortOrder: number;
  rows: CriterionRowSeed[];
};

type StandardSourceSeed = {
  slug: string;
  name: string;
  shortName: string;
  publisher: string;
  jurisdiction: string;
  year: number;
  publicationStatus: string;
  legalStatus: string;
  instrumentType: string;
  sourceCitation: string;
  sourceUrl?: string;
  notes?: string;
  groups: CriterionGroupSeed[];
};

const broadConstructionWorkTypes: WorkType[] = [
  'general_construction',
  'bored_piling',
  'driven_piling',
  'rock_breaking',
  'excavation',
  'dynamic_compaction',
];

const vibrationWorkTypes: WorkType[] = [
  'bored_piling',
  'driven_piling',
  'rock_breaking',
  'blasting',
  'excavation',
  'dynamic_compaction',
];

const allWorkTypes: WorkType[] = [...broadConstructionWorkTypes, 'blasting'];

const noiseVibrationStandardSources: StandardSourceSeed[] = [
  {
    slug: 'nsw-epa-icng-2009',
    name: 'NSW EPA Interim Construction Noise Guideline',
    shortName: 'ICNG',
    publisher: 'NSW EPA',
    jurisdiction: 'NSW',
    year: 2009,
    publicationStatus: 'active',
    legalStatus: 'guidance_only',
    instrumentType: 'guidance_only',
    sourceCitation: 'NSW EPA, Interim Construction Noise Guideline, 2009.',
    notes:
      'Guidance-only unless incorporated into a consent, approval, licence, notice, or other enforceable instrument.',
    groups: [
      {
        slug: 'standard-construction-hours',
        title: 'Standard construction working hours',
        criterionCategory: 'working_hours',
        metric: 'none',
        locationBasis: 'any',
        description: 'Recommended standard construction and blasting hours from ICNG.',
        sortOrder: 10,
        rows: [
          {
            rowKey: 'general-construction-standard-hours',
            label: 'General construction standard hours',
            timePeriod: 'standard_hours',
            basisType: 'descriptive',
            weekdayStart: '07:00',
            weekdayEnd: '18:00',
            saturdayStart: '08:00',
            saturdayEnd: '13:00',
            sundayAllowed: false,
            publicHolidayAllowed: false,
            sourceClause: 'ICNG recommended standard hours',
            rowNotes: 'Monday to Friday 7 am-6 pm; Saturday 8 am-1 pm; no work Sundays or public holidays.',
            sortOrder: 10,
            workTypes: broadConstructionWorkTypes,
          },
          {
            rowKey: 'blasting-standard-hours',
            label: 'Blasting standard hours',
            timePeriod: 'blasting_hours',
            basisType: 'descriptive',
            weekdayStart: '09:00',
            weekdayEnd: '17:00',
            saturdayStart: '09:00',
            saturdayEnd: '13:00',
            sundayAllowed: false,
            publicHolidayAllowed: false,
            sourceClause: 'ICNG recommended blasting hours',
            rowNotes: 'Monday to Friday 9 am-5 pm; Saturday 9 am-1 pm; no blasting Sundays or public holidays.',
            sortOrder: 20,
            workTypes: ['blasting'],
          },
        ],
      },
      {
        slug: 'residential-airborne-management-levels',
        title: 'Residential airborne noise management levels',
        criterionCategory: 'airborne_noise_management',
        metric: 'laeq_15min',
        locationBasis: 'property_boundary',
        description: 'Residential construction noise management levels assessed as LAeq,15min.',
        sortOrder: 20,
        rows: [
          {
            rowKey: 'residential-standard-hours-noise-affected',
            label: 'Residential standard-hours noise affected management level',
            receiverType: 'residential',
            timePeriod: 'standard_hours',
            basisType: 'relative_to_rbl',
            referenceBase: 'RBL',
            relativeOffset: '10',
            unit: 'dB',
            sourceClause: 'ICNG Table 2',
            rowNotes: 'Noise affected management level during recommended standard hours.',
            sortOrder: 10,
            workTypes: broadConstructionWorkTypes,
          },
          {
            rowKey: 'residential-standard-hours-highly-noise-affected',
            label: 'Residential standard-hours highly noise affected level',
            receiverType: 'residential',
            timePeriod: 'standard_hours',
            basisType: 'absolute',
            criterionValue: '75',
            unit: 'dB(A)',
            sourceClause: 'ICNG Table 2',
            rowNotes: 'Highly noise affected threshold during recommended standard hours.',
            sortOrder: 20,
            workTypes: broadConstructionWorkTypes,
          },
          {
            rowKey: 'residential-outside-standard-hours-noise-affected',
            label: 'Residential outside-standard-hours noise affected management level',
            receiverType: 'residential',
            timePeriod: 'outside_standard_hours',
            basisType: 'relative_to_rbl',
            referenceBase: 'RBL',
            relativeOffset: '5',
            unit: 'dB',
            sourceClause: 'ICNG Table 2',
            rowNotes: 'Strong justification and feasible/reasonable mitigation expected for outside-hours works.',
            sortOrder: 30,
            workTypes: broadConstructionWorkTypes,
          },
        ],
      },
      {
        slug: 'sensitive-business-receiver-management-levels',
        title: 'Sensitive and business receiver management levels',
        criterionCategory: 'airborne_noise_management',
        metric: 'laeq_15min',
        locationBasis: 'any',
        description: 'Fixed LAeq,15min management levels for other land uses when in use.',
        sortOrder: 30,
        rows: [
          absoluteNoiseRow('educational-classrooms-internal', 'Classrooms / educational', 'educational', '45', 'Internal assessment at centre of occupied room.', 10),
          absoluteNoiseRow('hospital-wards-operating-theatres-internal', 'Hospital wards / operating theatres', 'hospital', '45', 'Internal assessment.', 20),
          absoluteNoiseRow('places-of-worship-internal', 'Places of worship', 'place_of_worship', '45', 'Internal assessment when in use.', 30),
          absoluteNoiseRow('active-recreation-external', 'Active recreation areas', 'active_recreation', '65', 'External assessment.', 40),
          absoluteNoiseRow('passive-recreation-external', 'Passive recreation areas', 'passive_recreation', '60', 'External assessment.', 50),
          absoluteNoiseRow('industrial-external-occupied-point', 'Industrial premises', 'industrial', '75', 'External assessment at the most affected occupied point.', 60),
          absoluteNoiseRow('office-retail-external-occupied-point', 'Offices / retail outlets', 'office_retail', '70', 'External assessment at the most affected occupied point.', 70),
        ],
      },
      {
        slug: 'residential-ground-borne-noise',
        title: 'Residential ground-borne noise management levels',
        criterionCategory: 'ground_borne_noise',
        metric: 'laeq_15min',
        locationBasis: 'internal',
        description: 'Internal ground-borne noise management levels for residences.',
        sortOrder: 40,
        rows: [
          {
            rowKey: 'residential-evening-ground-borne-noise',
            label: 'Residential evening ground-borne noise',
            receiverType: 'residential',
            timePeriod: 'evening',
            basisType: 'absolute',
            criterionValue: '40',
            unit: 'dB(A)',
            sourceClause: 'ICNG ground-borne noise management levels',
            rowNotes: 'Evening period: 6 pm-10 pm, internal.',
            sortOrder: 10,
            workTypes: broadConstructionWorkTypes,
          },
          {
            rowKey: 'residential-night-ground-borne-noise',
            label: 'Residential night ground-borne noise',
            receiverType: 'residential',
            timePeriod: 'night',
            basisType: 'absolute',
            criterionValue: '35',
            unit: 'dB(A)',
            sourceClause: 'ICNG ground-borne noise management levels',
            rowNotes: 'Night period: 10 pm-7 am, internal.',
            sortOrder: 20,
            workTypes: broadConstructionWorkTypes,
          },
        ],
      },
    ],
  },
  {
    slug: 'nsw-epa-draft-construction-noise-guideline',
    name: 'NSW EPA Draft Construction Noise Guideline',
    shortName: 'Draft Construction Noise Guideline',
    publisher: 'NSW EPA',
    jurisdiction: 'NSW',
    year: 2021,
    publicationStatus: 'draft_under_review',
    legalStatus: 'guidance_only',
    instrumentType: 'guidance_only',
    sourceCitation: 'NSW EPA, Draft Construction Noise Guideline, consultation draft under review.',
    notes:
      'Draft guidance and policy signal only unless a project instrument explicitly incorporates it. Special audible characteristic penalty logic is intentionally not modelled in this registry step.',
    groups: [
      {
        slug: 'standard-construction-hours',
        title: 'Draft standard construction working hours',
        criterionCategory: 'working_hours',
        metric: 'none',
        locationBasis: 'any',
        description: 'Draft guidance standard hours matching the ICNG baseline.',
        sortOrder: 10,
        rows: [
          {
            rowKey: 'general-construction-standard-hours',
            label: 'General construction standard hours',
            timePeriod: 'standard_hours',
            basisType: 'descriptive',
            weekdayStart: '07:00',
            weekdayEnd: '18:00',
            saturdayStart: '08:00',
            saturdayEnd: '13:00',
            sundayAllowed: false,
            publicHolidayAllowed: false,
            sourceClause: 'Draft Construction Noise Guideline standard hours',
            rowNotes: 'Weekday 0700-1800; Saturday 0800-1300; no work Sundays or public holidays.',
            sortOrder: 10,
            workTypes: broadConstructionWorkTypes,
          },
          {
            rowKey: 'blasting-standard-hours',
            label: 'Blasting standard hours',
            timePeriod: 'blasting_hours',
            basisType: 'descriptive',
            weekdayStart: '09:00',
            weekdayEnd: '17:00',
            saturdayStart: '09:00',
            saturdayEnd: '13:00',
            sundayAllowed: false,
            publicHolidayAllowed: false,
            sourceClause: 'Draft Construction Noise Guideline blasting hours',
            rowNotes: 'Weekday 0900-1700; Saturday 0900-1300; no blasting Sundays or public holidays.',
            sortOrder: 20,
            workTypes: ['blasting'],
          },
        ],
      },
      {
        slug: 'residential-airborne-management-levels',
        title: 'Draft residential airborne noise management levels',
        criterionCategory: 'airborne_noise_management',
        metric: 'laeq_15min',
        locationBasis: 'property_boundary',
        description: 'Draft residential LAeq,15min management levels.',
        sortOrder: 20,
        rows: [
          {
            rowKey: 'residential-standard-hours-noise-affected',
            label: 'Residential standard-hours noise affected management level',
            receiverType: 'residential',
            timePeriod: 'standard_hours',
            basisType: 'relative_to_rbl',
            referenceBase: 'RBL',
            relativeOffset: '10',
            unit: 'dB',
            sourceClause: 'Draft Construction Noise Guideline residential NMLs',
            rowNotes: 'Noise affected management level during standard hours.',
            sortOrder: 10,
            workTypes: broadConstructionWorkTypes,
          },
          {
            rowKey: 'residential-standard-hours-highly-noise-affected',
            label: 'Residential standard-hours highly noise affected level',
            receiverType: 'residential',
            timePeriod: 'standard_hours',
            basisType: 'absolute',
            criterionValue: '75',
            unit: 'dB(A)',
            sourceClause: 'Draft Construction Noise Guideline residential NMLs',
            rowNotes: 'Highly noise affected threshold during standard hours.',
            sortOrder: 20,
            workTypes: broadConstructionWorkTypes,
          },
          {
            rowKey: 'residential-outside-standard-hours-noise-affected',
            label: 'Residential outside-standard-hours noise affected management level',
            receiverType: 'residential',
            timePeriod: 'outside_standard_hours',
            basisType: 'relative_to_rbl',
            referenceBase: 'RBL',
            relativeOffset: '5',
            unit: 'dB',
            sourceClause: 'Draft Construction Noise Guideline residential NMLs',
            rowNotes: 'Noise affected management level outside standard hours.',
            sortOrder: 30,
            workTypes: broadConstructionWorkTypes,
          },
          {
            rowKey: 'residential-outside-standard-hours-highly-noise-affected',
            label: 'Residential outside-standard-hours highly noise affected level',
            receiverType: 'residential',
            timePeriod: 'outside_standard_hours',
            basisType: 'absolute',
            criterionValue: '65',
            unit: 'dB(A)',
            sourceClause: 'Draft Construction Noise Guideline residential NMLs',
            rowNotes: 'High-impact trigger for supplementary mitigation consideration outside standard hours.',
            sortOrder: 40,
            workTypes: broadConstructionWorkTypes,
          },
        ],
      },
    ],
  },
  {
    slug: 'nsw-assessing-vibration-technical-guideline',
    name: 'NSW Assessing vibration: a technical guideline',
    shortName: 'Assessing Vibration',
    publisher: 'NSW Department of Environment and Conservation',
    jurisdiction: 'NSW',
    year: 2006,
    publicationStatus: 'active',
    legalStatus: 'guidance_only',
    instrumentType: 'guidance_only',
    sourceCitation: 'NSW Department of Environment and Conservation, Assessing vibration: a technical guideline, 2006.',
    notes:
      'Amenity-focused vibration guidance. It does not itself prescribe building-damage PPV screening values.',
    groups: [
      {
        slug: 'intermittent-vibration-vdv-human-comfort',
        title: 'Intermittent vibration VDV human comfort criteria',
        criterionCategory: 'vibration_human_comfort',
        metric: 'vdv',
        locationBasis: 'occupied_point',
        description: 'Preferred and maximum vibration dose values by receiver type and time period.',
        sortOrder: 10,
        rows: [
          vdvRow('critical-areas-day', 'Critical areas daytime VDV', 'critical_area', 'day', '0.10', '0.20', 10),
          vdvRow('critical-areas-night', 'Critical areas night-time VDV', 'critical_area', 'night', '0.10', '0.20', 20),
          vdvRow('residences-day', 'Residences daytime VDV', 'residential', 'day', '0.20', '0.40', 30),
          vdvRow('residences-night', 'Residences night-time VDV', 'residential', 'night', '0.13', '0.26', 40),
          vdvRow('offices-schools-worship-day', 'Offices, schools, educational institutions and places of worship daytime VDV', 'educational', 'day', '0.40', '0.80', 50),
          vdvRow('offices-schools-worship-night', 'Offices, schools, educational institutions and places of worship night-time VDV', 'educational', 'night', '0.40', '0.80', 60),
          vdvRow('workshops-day', 'Workshops daytime VDV', 'workshop', 'day', '0.80', '1.60', 70),
          vdvRow('workshops-night', 'Workshops night-time VDV', 'workshop', 'night', '0.80', '1.60', 80),
        ],
      },
    ],
  },
  {
    slug: 'nsw-noise-policy-for-industry-2017',
    name: 'NSW Noise Policy for Industry',
    shortName: 'NPI',
    publisher: 'NSW EPA',
    jurisdiction: 'NSW',
    year: 2017,
    publicationStatus: 'active',
    legalStatus: 'guidance_only',
    instrumentType: 'guidance_only',
    sourceCitation: 'NSW EPA, Noise Policy for Industry, 2017.',
    notes:
      'Seeded here only to anchor NSW day/evening/night semantics used in reporting and RBL context.',
    groups: [
      {
        slug: 'day-evening-night-definitions',
        title: 'Day, evening and night time period definitions',
        criterionCategory: 'time_period_definition',
        metric: 'none',
        locationBasis: 'any',
        description: 'NSW NPI time period definitions used for reporting semantics.',
        sortOrder: 10,
        rows: [
          {
            rowKey: 'day',
            label: 'Day period',
            timePeriod: 'day',
            basisType: 'descriptive',
            weekdayStart: '07:00',
            weekdayEnd: '18:00',
            saturdayStart: '07:00',
            saturdayEnd: '18:00',
            sundayAllowed: true,
            publicHolidayAllowed: true,
            sourceClause: 'NPI time period definitions',
            rowNotes: 'Day is 7 am-6 pm Monday-Saturday and 8 am-6 pm Sundays and public holidays.',
            sortOrder: 10,
            workTypes: allWorkTypes,
          },
          {
            rowKey: 'evening',
            label: 'Evening period',
            timePeriod: 'evening',
            basisType: 'descriptive',
            weekdayStart: '18:00',
            weekdayEnd: '22:00',
            saturdayStart: '18:00',
            saturdayEnd: '22:00',
            sundayAllowed: true,
            publicHolidayAllowed: true,
            sourceClause: 'NPI time period definitions',
            rowNotes: 'Evening is 6 pm-10 pm.',
            sortOrder: 20,
            workTypes: allWorkTypes,
          },
          {
            rowKey: 'night',
            label: 'Night period',
            timePeriod: 'night',
            basisType: 'descriptive',
            sourceClause: 'NPI time period definitions',
            rowNotes:
              'Night is the remaining periods; glossary restatement is 10 pm-7 am Monday-Saturday and 10 pm-8 am Sundays/public holidays.',
            sortOrder: 30,
            workTypes: allWorkTypes,
          },
        ],
      },
    ],
  },
  {
    slug: 'anzec-blasting-criteria',
    name: 'ANZEC blasting criteria',
    shortName: 'ANZEC blasting',
    publisher: 'Australian and New Zealand Environment Council',
    jurisdiction: 'Australia',
    year: 1990,
    publicationStatus: 'active',
    legalStatus: 'guidance_only',
    instrumentType: 'guidance_only',
    sourceCitation: 'ANZEC, Technical basis for guidelines to minimise annoyance due to blasting overpressure and ground vibration, 1990.',
    notes:
      'Guidance-only criteria commonly adopted or adapted for construction blasting conditions.',
    groups: [
      {
        slug: 'airblast-overpressure',
        title: 'Airblast overpressure criteria',
        criterionCategory: 'blasting_airblast',
        metric: 'lin_peak',
        locationBasis: 'property_boundary',
        description: 'Amenity-focused airblast criterion and absolute maximum.',
        sortOrder: 10,
        rows: [
          {
            rowKey: 'airblast-overpressure',
            label: 'Airblast overpressure',
            basisType: 'absolute',
            criterionValue: '115',
            absoluteMaxValue: '120',
            exceedanceAllowancePercent: '5',
            exceedanceWindowText: '5% of blasts over 12 months',
            unit: 'dB Lin Peak',
            sourceClause: 'ANZEC blasting criteria',
            rowNotes: 'Standard criterion may be exceeded on up to 5% of blasts over 12 months; absolute maximum applies at any time.',
            sortOrder: 10,
            workTypes: ['blasting'],
          },
        ],
      },
      {
        slug: 'ground-vibration',
        title: 'Ground vibration criteria',
        criterionCategory: 'blasting_ground_vibration',
        metric: 'ppv',
        locationBasis: 'property_boundary',
        description: 'Amenity-focused PPV criterion, absolute maximum, and long-term goal.',
        sortOrder: 20,
        rows: [
          {
            rowKey: 'ground-vibration-standard',
            label: 'Ground vibration',
            basisType: 'absolute',
            criterionValue: '5',
            absoluteMaxValue: '10',
            exceedanceAllowancePercent: '5',
            exceedanceWindowText: '5% of blasts over 12 months',
            unit: 'mm/s PPV',
            sourceClause: 'ANZEC blasting criteria',
            rowNotes: 'Standard criterion may be exceeded on up to 5% of blasts over 12 months; absolute maximum applies at any time.',
            sortOrder: 10,
            workTypes: ['blasting'],
          },
          {
            rowKey: 'ground-vibration-long-term-goal',
            label: 'Ground vibration long-term goal',
            basisType: 'absolute',
            criterionValue: '2',
            unit: 'mm/s PPV',
            sourceClause: 'ANZEC blasting criteria',
            rowNotes: 'Long-term goal for ground vibration.',
            sortOrder: 20,
            workTypes: ['blasting'],
          },
        ],
      },
      {
        slug: 'blasting-hours',
        title: 'Blasting hours',
        criterionCategory: 'working_hours',
        metric: 'none',
        locationBasis: 'any',
        description: 'Recommended blasting time restrictions.',
        sortOrder: 30,
        rows: [
          {
            rowKey: 'blasting-hours',
            label: 'Blasting hours',
            timePeriod: 'blasting_hours',
            basisType: 'descriptive',
            weekdayStart: '09:00',
            weekdayEnd: '17:00',
            saturdayStart: '09:00',
            saturdayEnd: '13:00',
            sundayAllowed: false,
            publicHolidayAllowed: false,
            sourceClause: 'ANZEC blasting criteria',
            rowNotes: 'Blasting should generally only be permitted 9 am-5 pm Monday-Friday and 9 am-1 pm Saturday; not Sundays or public holidays.',
            sortOrder: 10,
            workTypes: ['blasting'],
          },
        ],
      },
    ],
  },
  {
    slug: 'din-4150-3',
    name: 'DIN 4150-3',
    shortName: 'DIN 4150-3',
    publisher: 'DIN',
    jurisdiction: 'International',
    year: 2016,
    publicationStatus: 'active',
    legalStatus: 'guidance_only',
    instrumentType: 'guidance_only',
    sourceCitation: 'DIN 4150-3, Structural vibration - Effects of vibration on structures.',
    notes:
      'Not NSW law, but commonly conditioned in NSW approvals for structural damage screening.',
    groups: [
      {
        slug: 'short-term-structural-ppv',
        title: 'Short-term structural PPV guideline values',
        criterionCategory: 'vibration_structural_damage',
        metric: 'ppv',
        locationBasis: 'any',
        description: 'DIN 4150-3 short-term vibration guideline values by structure type, location and frequency band.',
        sortOrder: 10,
        rows: [
          ...dinRows('commercial-industrial', 'Commercial / industrial / similar', 'commercial', '20', '20', '40', '40', '50', '40', 10),
          ...dinRows('residential-dwellings', 'Dwellings / residential / similar', 'residential', '5', '5', '15', '15', '20', '15', 50),
          ...dinRows('sensitive-heritage', 'Particularly sensitive / heritage / intrinsic value', 'heritage', '3', '3', '8', '8', '10', '8', 90),
        ],
      },
    ],
  },
  {
    slug: 'bs-7385-2',
    name: 'BS 7385-2',
    shortName: 'BS 7385-2',
    publisher: 'British Standards Institution',
    jurisdiction: 'International',
    year: 1993,
    publicationStatus: 'active',
    legalStatus: 'guidance_only',
    instrumentType: 'guidance_only',
    sourceCitation: 'BS 7385-2, Evaluation and measurement for vibration in buildings - Guide to damage levels from groundborne vibration.',
    notes:
      'Commonly used in NSW practice for cosmetic damage screening, but is not NSW law unless incorporated into a project instrument.',
    groups: [
      {
        slug: 'cosmetic-damage-ppv',
        title: 'Cosmetic damage guide values',
        criterionCategory: 'vibration_structural_damage',
        metric: 'ppv',
        locationBasis: 'foundation',
        description: 'BS 7385-2 guide values represented as queryable transient and continuous PPV rows.',
        sortOrder: 10,
        rows: [
          bsRow('reinforced-framed-transient', 'Reinforced / framed industrial and heavy commercial - transient', 'commercial', 'transient vibration', '50', undefined, undefined, '4', undefined, 10),
          bsRow('reinforced-framed-continuous', 'Reinforced / framed industrial and heavy commercial - continuous', 'commercial', 'continuous vibration', '25', undefined, undefined, '4', undefined, 20),
          bsRow('unreinforced-light-transient-4-15hz', 'Unreinforced / light framed residential or light commercial - transient 4-15 Hz', 'residential', 'transient vibration', undefined, '15', '20', '4', '15', 30),
          bsRow('unreinforced-light-transient-15-40hz', 'Unreinforced / light framed residential or light commercial - transient 15-40 Hz and above', 'residential', 'transient vibration', undefined, '20', '50', '15', '40', 40),
          bsRow('unreinforced-light-continuous-4-15hz', 'Unreinforced / light framed residential or light commercial - continuous 4-15 Hz', 'residential', 'continuous vibration', undefined, '7.5', '10', '4', '15', 50),
          bsRow('unreinforced-light-continuous-15-40hz', 'Unreinforced / light framed residential or light commercial - continuous 15-40 Hz and above', 'residential', 'continuous vibration', undefined, '10', '25', '15', '40', 60),
        ],
      },
    ],
  },
];

export async function seedNoiseVibrationStandards(prisma: PrismaClient) {
  let sourceCount = 0;
  let groupCount = 0;
  let rowCount = 0;

  for (const sourceSeed of noiseVibrationStandardSources) {
    const sourcePayload = sourceData(sourceSeed);
    const source = await prisma.noiseVibrationStandardSource.upsert({
      where: { slug: sourceSeed.slug },
      update: sourcePayload as any,
      create: sourcePayload as any,
    });
    sourceCount += 1;

    await prisma.noiseVibrationCriterionGroup.deleteMany({
      where: {
        standardSourceId: source.id,
        slug: { notIn: sourceSeed.groups.map((group) => group.slug) },
      },
    });

    for (const groupSeed of sourceSeed.groups) {
      const groupPayload = groupData(groupSeed);
      const group = await prisma.noiseVibrationCriterionGroup.upsert({
        where: {
          standardSourceId_slug: {
            standardSourceId: source.id,
            slug: groupSeed.slug,
          },
        },
        update: groupPayload as any,
        create: {
          ...(groupPayload as any),
          standardSourceId: source.id,
        },
      });
      groupCount += 1;

      await prisma.noiseVibrationCriterionRow.deleteMany({
        where: {
          criterionGroupId: group.id,
          rowKey: { notIn: groupSeed.rows.map((row) => row.rowKey) },
        },
      });

      for (const rowSeed of groupSeed.rows) {
        const { workTypes, ...rowSeedData } = rowSeed;
        const row = await prisma.noiseVibrationCriterionRow.upsert({
          where: {
            criterionGroupId_rowKey: {
              criterionGroupId: group.id,
              rowKey: rowSeed.rowKey,
            },
          },
          update: rowSeedData as any,
          create: {
            ...(rowSeedData as any),
            criterionGroupId: group.id,
          },
        });

        await prisma.noiseVibrationCriterionRowWorkType.deleteMany({
          where: { criterionRowId: row.id },
        });

        await prisma.noiseVibrationCriterionRowWorkType.createMany({
          data: Array.from(new Set(workTypes)).map((workType) => ({
            criterionRowId: row.id,
            workType,
          })) as any,
        });

        rowCount += 1;
      }
    }
  }

  return { sourceCount, groupCount, rowCount };
}

function sourceData(source: StandardSourceSeed) {
  return {
    slug: source.slug,
    name: source.name,
    shortName: source.shortName,
    publisher: source.publisher,
    jurisdiction: source.jurisdiction,
    year: source.year,
    publicationStatus: source.publicationStatus,
    legalStatus: source.legalStatus,
    instrumentType: source.instrumentType,
    sourceCitation: source.sourceCitation,
    sourceUrl: source.sourceUrl,
    notes: source.notes,
    isSeeded: true,
  };
}

function groupData(group: CriterionGroupSeed) {
  return {
    slug: group.slug,
    title: group.title,
    criterionCategory: group.criterionCategory,
    metric: group.metric,
    locationBasis: group.locationBasis,
    description: group.description,
    sortOrder: group.sortOrder,
  };
}

function absoluteNoiseRow(
  rowKey: string,
  label: string,
  receiverType: string,
  criterionValue: string,
  rowNotes: string,
  sortOrder: number,
): CriterionRowSeed {
  return {
    rowKey,
    label,
    receiverType,
    basisType: 'absolute',
    criterionValue,
    unit: 'dB(A)',
    sourceClause: 'ICNG other sensitive land uses and business receivers',
    rowNotes,
    sortOrder,
    workTypes: broadConstructionWorkTypes,
  };
}

function vdvRow(
  rowKey: string,
  label: string,
  receiverType: string,
  timePeriod: string,
  preferredValue: string,
  maximumValue: string,
  sortOrder: number,
): CriterionRowSeed {
  return {
    rowKey,
    label,
    receiverType,
    timePeriod,
    basisType: 'absolute',
    preferredValue,
    maximumValue,
    unit: 'm/s^1.75',
    sourceClause: 'Assessing vibration intermittent vibration VDV table',
    rowNotes: 'Daytime is 7 am-10 pm; night-time is 10 pm-7 am.',
    sortOrder,
    workTypes: vibrationWorkTypes,
  };
}

function dinRows(
  prefix: string,
  structureType: string,
  receiverType: string,
  foundationUnder10Hz: string,
  foundation10To50HzMin: string,
  foundation10To50HzMax: string,
  foundation50To100HzMin: string,
  foundation50To100HzMax: string,
  uppermostStorey: string,
  sortOrderBase: number,
): CriterionRowSeed[] {
  return [
    {
      rowKey: `${prefix}-foundation-under-10hz`,
      label: `${structureType} - foundation <10 Hz`,
      receiverType,
      structureType,
      basisType: 'frequency_banded',
      criterionValue: foundationUnder10Hz,
      frequencyMaxHz: '10',
      unit: 'mm/s',
      sourceClause: 'DIN 4150-3 short-term vibration table',
      rowNotes: 'Foundation PPV guideline value for short-term vibration.',
      sortOrder: sortOrderBase,
      workTypes: vibrationWorkTypes,
    },
    {
      rowKey: `${prefix}-foundation-10-50hz`,
      label: `${structureType} - foundation 10-50 Hz`,
      receiverType,
      structureType,
      basisType: 'frequency_banded',
      valueMin: foundation10To50HzMin,
      valueMax: foundation10To50HzMax,
      frequencyMinHz: '10',
      frequencyMaxHz: '50',
      unit: 'mm/s',
      sourceClause: 'DIN 4150-3 short-term vibration table',
      rowNotes: 'Foundation PPV guideline value for short-term vibration.',
      sortOrder: sortOrderBase + 10,
      workTypes: vibrationWorkTypes,
    },
    {
      rowKey: `${prefix}-foundation-50-100hz`,
      label: `${structureType} - foundation 50-100 Hz`,
      receiverType,
      structureType,
      basisType: 'frequency_banded',
      valueMin: foundation50To100HzMin,
      valueMax: foundation50To100HzMax,
      frequencyMinHz: '50',
      frequencyMaxHz: '100',
      unit: 'mm/s',
      sourceClause: 'DIN 4150-3 short-term vibration table',
      rowNotes: 'Foundation PPV guideline value for short-term vibration.',
      sortOrder: sortOrderBase + 20,
      workTypes: vibrationWorkTypes,
    },
    {
      rowKey: `${prefix}-uppermost-storey-all-frequencies`,
      label: `${structureType} - uppermost storey all frequencies`,
      receiverType,
      structureType,
      basisType: 'absolute',
      criterionValue: uppermostStorey,
      unit: 'mm/s',
      sourceClause: 'DIN 4150-3 short-term vibration table',
      rowNotes: 'Uppermost storey, plane of floor, all frequencies.',
      sortOrder: sortOrderBase + 30,
      workTypes: vibrationWorkTypes,
    },
  ];
}

function bsRow(
  rowKey: string,
  label: string,
  receiverType: string,
  structureType: string,
  criterionValue: string | undefined,
  valueMin: string | undefined,
  valueMax: string | undefined,
  frequencyMinHz: string | undefined,
  frequencyMaxHz: string | undefined,
  sortOrder: number,
): CriterionRowSeed {
  return {
    rowKey,
    label,
    receiverType,
    structureType,
    basisType: frequencyMaxHz ? 'frequency_banded' : 'absolute',
    criterionValue,
    valueMin,
    valueMax,
    frequencyMinHz,
    frequencyMaxHz,
    unit: 'mm/s',
    sourceClause: 'BS 7385-2 cosmetic damage guide values',
    rowNotes: `${structureType}; PPV guide value for cosmetic damage screening.`,
    sortOrder,
    workTypes: vibrationWorkTypes,
  };
}

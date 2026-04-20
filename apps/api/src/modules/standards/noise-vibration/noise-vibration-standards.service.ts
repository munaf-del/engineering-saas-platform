import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { NoiseVibrationCriteriaQueryDto } from './dto/noise-vibration-criteria-query.dto';

type CriterionRowWithContext = Prisma.NoiseVibrationCriterionRowGetPayload<{
  include: {
    workTypes: true;
    criterionGroup: {
      include: {
        standardSource: true;
      };
    };
  };
}>;

@Injectable()
export class NoiseVibrationStandardsService {
  constructor(private readonly prisma: PrismaService) {}

  async findSources() {
    const sources = await this.prisma.noiseVibrationStandardSource.findMany({
      include: {
        _count: {
          select: { criterionGroups: true },
        },
      },
      orderBy: [{ jurisdiction: 'asc' }, { year: 'asc' }, { shortName: 'asc' }],
    });

    return sources.map(({ _count, ...source }) => ({
      ...source,
      criterionGroupCount: _count.criterionGroups,
    }));
  }

  async findCriteria(query: NoiseVibrationCriteriaQueryDto) {
    const where = this.buildCriterionWhere(query);
    const rows = await this.prisma.noiseVibrationCriterionRow.findMany({
      where,
      include: criterionRowInclude,
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });

    return rows.map(serializeCriterionRow).sort(compareCriterionRows);
  }

  async findCriterionById(id: string) {
    const row = await this.prisma.noiseVibrationCriterionRow.findUnique({
      where: { id },
      include: criterionRowInclude,
    });

    if (!row) {
      throw new NotFoundException('Noise/vibration criterion row not found');
    }

    return serializeCriterionRow(row);
  }

  private buildCriterionWhere(query: NoiseVibrationCriteriaQueryDto) {
    const where: Prisma.NoiseVibrationCriterionRowWhereInput = {};
    const groupWhere: Prisma.NoiseVibrationCriterionGroupWhereInput = {};
    const sourceWhere: Prisma.NoiseVibrationStandardSourceWhereInput = {};

    if (query.receiverType) {
      where.receiverType = query.receiverType;
    }
    if (query.timePeriod) {
      where.timePeriod = query.timePeriod;
    }
    if (query.workType) {
      where.workTypes = { some: { workType: query.workType } };
    }
    if (query.criterionCategory) {
      groupWhere.criterionCategory = query.criterionCategory;
    }
    if (query.metric) {
      groupWhere.metric = query.metric;
    }
    if (query.sourceSlug) {
      sourceWhere.slug = query.sourceSlug;
    }
    if (query.legalStatus) {
      sourceWhere.legalStatus = query.legalStatus;
    }
    if (query.instrumentType) {
      sourceWhere.instrumentType = query.instrumentType;
    }
    if (query.publicationStatus) {
      sourceWhere.publicationStatus = query.publicationStatus;
    }
    if (query.jurisdiction) {
      sourceWhere.jurisdiction = query.jurisdiction;
    }

    if (Object.keys(sourceWhere).length > 0) {
      groupWhere.standardSource = { is: sourceWhere };
    }

    if (Object.keys(groupWhere).length > 0) {
      where.criterionGroup = { is: groupWhere };
    }

    const searchText = query.q?.trim();
    if (searchText) {
      where.OR = [
        { label: { contains: searchText, mode: 'insensitive' } },
        { structureType: { contains: searchText, mode: 'insensitive' } },
        { referenceBase: { contains: searchText, mode: 'insensitive' } },
        { sourceClause: { contains: searchText, mode: 'insensitive' } },
        { rowNotes: { contains: searchText, mode: 'insensitive' } },
        {
          criterionGroup: {
            is: {
              title: { contains: searchText, mode: 'insensitive' },
            },
          },
        },
        {
          criterionGroup: {
            is: {
              standardSource: {
                is: {
                  name: { contains: searchText, mode: 'insensitive' },
                },
              },
            },
          },
        },
        {
          criterionGroup: {
            is: {
              standardSource: {
                is: {
                  shortName: { contains: searchText, mode: 'insensitive' },
                },
              },
            },
          },
        },
      ];
    }

    return where;
  }
}

const criterionRowInclude = {
  workTypes: true,
  criterionGroup: {
    include: {
      standardSource: true,
    },
  },
} satisfies Prisma.NoiseVibrationCriterionRowInclude;

function serializeCriterionRow(row: CriterionRowWithContext) {
  const { criterionGroup, workTypes, ...criterionRow } = row;
  const { standardSource, ...group } = criterionGroup;

  return {
    ...criterionRow,
    relativeOffset: serializeDecimal(criterionRow.relativeOffset),
    criterionValue: serializeDecimal(criterionRow.criterionValue),
    preferredValue: serializeDecimal(criterionRow.preferredValue),
    maximumValue: serializeDecimal(criterionRow.maximumValue),
    alertValue: serializeDecimal(criterionRow.alertValue),
    stopWorkValue: serializeDecimal(criterionRow.stopWorkValue),
    absoluteMaxValue: serializeDecimal(criterionRow.absoluteMaxValue),
    valueMin: serializeDecimal(criterionRow.valueMin),
    valueMax: serializeDecimal(criterionRow.valueMax),
    frequencyMinHz: serializeDecimal(criterionRow.frequencyMinHz),
    frequencyMaxHz: serializeDecimal(criterionRow.frequencyMaxHz),
    exceedanceAllowancePercent: serializeDecimal(criterionRow.exceedanceAllowancePercent),
    workTypes: workTypes.map((workType) => workType.workType),
    group,
    source: standardSource,
  };
}

function serializeDecimal(value: Prisma.Decimal | null) {
  return value === null ? null : value.toString();
}

function compareCriterionRows(
  left: ReturnType<typeof serializeCriterionRow>,
  right: ReturnType<typeof serializeCriterionRow>,
) {
  return (
    left.source.jurisdiction.localeCompare(right.source.jurisdiction) ||
    left.source.year - right.source.year ||
    left.source.shortName.localeCompare(right.source.shortName) ||
    left.group.sortOrder - right.group.sortOrder ||
    left.sortOrder - right.sortOrder ||
    left.label.localeCompare(right.label)
  );
}
